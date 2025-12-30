//! Project Indexer
//! 
//! Scans the workspace for Python files and builds a global symbol table
//! mapping function names to their file locations.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::fs;
use tree_sitter::{Parser, Language};

extern "C" { fn tree_sitter_python() -> Language; }

/// A symbol in the project
#[derive(Debug, Clone)]
pub struct Symbol {
    pub name: String,
    pub kind: SymbolKind,
    pub file_path: PathBuf,
    pub line: usize,
    pub module_path: String, // e.g., "utils.db" for utils/db.py
}

#[derive(Debug, Clone, PartialEq)]
pub enum SymbolKind {
    Function,
    Class,
    Variable,
}

/// Import statement representation
#[derive(Debug, Clone)]
pub struct ImportStatement {
    pub module: String,           // "utils.db" or "flask"
    pub names: Vec<ImportedName>, // [(name, alias)]
    pub is_from_import: bool,
}

#[derive(Debug, Clone)]
pub struct ImportedName {
    pub name: String,
    pub alias: Option<String>,
}

/// The Project Indexer
pub struct ProjectIndexer {
    /// All symbols indexed by name
    symbols: HashMap<String, Vec<Symbol>>,
    /// File imports cache: file_path -> imports in that file
    imports: HashMap<PathBuf, Vec<ImportStatement>>,
    /// Workspace root
    workspace_root: PathBuf,
    /// Tree-sitter parser
    parser: Parser,
}

impl ProjectIndexer {
    pub fn new(workspace_root: PathBuf) -> Result<Self, String> {
        let mut parser = Parser::new();
        let language = unsafe { tree_sitter_python() };
        parser.set_language(language).map_err(|e| e.to_string())?;
        
        Ok(Self {
            symbols: HashMap::new(),
            imports: HashMap::new(),
            workspace_root,
            parser,
        })
    }

    /// Index all Python files in the workspace
    pub fn index_workspace(&mut self) -> Result<usize, String> {
        let mut count = 0;
        let py_files = self.find_python_files(&self.workspace_root.clone())?;
        
        for file_path in py_files {
            if let Err(e) = self.index_file(&file_path) {
                eprintln!("Warning: Failed to index {:?}: {}", file_path, e);
                continue;
            }
            count += 1;
        }
        
        Ok(count)
    }

    /// Find all Python files in a directory recursively
    fn find_python_files(&self, dir: &Path) -> Result<Vec<PathBuf>, String> {
        let mut files = Vec::new();
        
        if !dir.is_dir() {
            return Ok(files);
        }
        
        let entries = fs::read_dir(dir).map_err(|e| e.to_string())?;
        
        for entry in entries.flatten() {
            let path = entry.path();
            
            // Skip common non-source directories
            let name = path.file_name().unwrap_or_default().to_string_lossy();
            if name.starts_with('.') || name == "node_modules" || name == "__pycache__" || name == "venv" || name == ".venv" {
                continue;
            }
            
            if path.is_dir() {
                files.extend(self.find_python_files(&path)?);
            } else if path.extension().map_or(false, |ext| ext == "py") {
                files.push(path);
            }
        }
        
        Ok(files)
    }

    /// Index a single Python file
    fn index_file(&mut self, file_path: &Path) -> Result<(), String> {
        let source = fs::read_to_string(file_path).map_err(|e| e.to_string())?;
        let tree = self.parser.parse(&source, None).ok_or("Failed to parse")?;
        let root = tree.root_node();
        let source_bytes = source.as_bytes();
        
        // Calculate module path from file path
        let module_path = self.path_to_module(file_path);
        
        // Extract function and class definitions
        self.extract_symbols(root, source_bytes, file_path, &module_path);
        
        // Extract import statements
        let imports = self.extract_imports(root, source_bytes);
        self.imports.insert(file_path.to_path_buf(), imports);
        
        Ok(())
    }

    /// Convert file path to Python module path
    fn path_to_module(&self, file_path: &Path) -> String {
        let relative = file_path.strip_prefix(&self.workspace_root).unwrap_or(file_path);
        let mut parts: Vec<&str> = relative
            .components()
            .filter_map(|c| c.as_os_str().to_str())
            .collect();
        
        // Remove .py extension from last part
        if let Some(last) = parts.last_mut() {
            if last.ends_with(".py") {
                *last = &last[..last.len() - 3];
            }
        }
        
        parts.join(".")
    }

    /// Extract function/class symbols from AST
    fn extract_symbols(&mut self, node: tree_sitter::Node, source: &[u8], file_path: &Path, module_path: &str) {
        match node.kind() {
            "function_definition" => {
                if let Some(name_node) = node.child_by_field_name("name") {
                    let name = name_node.utf8_text(source).unwrap_or("").to_string();
                    let symbol = Symbol {
                        name: name.clone(),
                        kind: SymbolKind::Function,
                        file_path: file_path.to_path_buf(),
                        line: node.start_position().row + 1,
                        module_path: module_path.to_string(),
                    };
                    self.symbols.entry(name).or_default().push(symbol);
                }
            }
            "class_definition" => {
                if let Some(name_node) = node.child_by_field_name("name") {
                    let name = name_node.utf8_text(source).unwrap_or("").to_string();
                    let symbol = Symbol {
                        name: name.clone(),
                        kind: SymbolKind::Class,
                        file_path: file_path.to_path_buf(),
                        line: node.start_position().row + 1,
                        module_path: module_path.to_string(),
                    };
                    self.symbols.entry(name).or_default().push(symbol);
                }
            }
            _ => {}
        }
        
        // Recurse
        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            self.extract_symbols(child, source, file_path, module_path);
        }
    }

    /// Extract import statements from AST
    fn extract_imports(&self, node: tree_sitter::Node, source: &[u8]) -> Vec<ImportStatement> {
        let mut imports = Vec::new();
        self.collect_imports(node, source, &mut imports);
        imports
    }

    fn collect_imports(&self, node: tree_sitter::Node, source: &[u8], imports: &mut Vec<ImportStatement>) {
        match node.kind() {
            "import_statement" => {
                // import foo, bar as baz
                let mut names = Vec::new();
                let mut cursor = node.walk();
                for child in node.children(&mut cursor) {
                    if child.kind() == "dotted_name" {
                        let name = child.utf8_text(source).unwrap_or("").to_string();
                        names.push(ImportedName { name, alias: None });
                    } else if child.kind() == "aliased_import" {
                        let name_node = child.child_by_field_name("name");
                        let alias_node = child.child_by_field_name("alias");
                        if let Some(n) = name_node {
                            let name = n.utf8_text(source).unwrap_or("").to_string();
                            let alias = alias_node.map(|a| a.utf8_text(source).unwrap_or("").to_string());
                            names.push(ImportedName { name, alias });
                        }
                    }
                }
                if !names.is_empty() {
                    imports.push(ImportStatement {
                        module: names[0].name.clone(),
                        names,
                        is_from_import: false,
                    });
                }
            }
            "import_from_statement" => {
                // from foo import bar, baz as qux
                let mut module = String::new();
                let mut names = Vec::new();
                let mut cursor = node.walk();
                
                for child in node.children(&mut cursor) {
                    if child.kind() == "dotted_name" && module.is_empty() {
                        module = child.utf8_text(source).unwrap_or("").to_string();
                    } else if child.kind() == "dotted_name" || child.kind() == "identifier" {
                        let name = child.utf8_text(source).unwrap_or("").to_string();
                        if name != "from" && name != "import" {
                            names.push(ImportedName { name, alias: None });
                        }
                    } else if child.kind() == "aliased_import" {
                        let name_node = child.child_by_field_name("name");
                        let alias_node = child.child_by_field_name("alias");
                        if let Some(n) = name_node {
                            let name = n.utf8_text(source).unwrap_or("").to_string();
                            let alias = alias_node.map(|a| a.utf8_text(source).unwrap_or("").to_string());
                            names.push(ImportedName { name, alias });
                        }
                    }
                }
                
                if !module.is_empty() {
                    imports.push(ImportStatement {
                        module,
                        names,
                        is_from_import: true,
                    });
                }
            }
            _ => {}
        }
        
        // Recurse (only top-level imports matter usually, but let's be thorough)
        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            self.collect_imports(child, source, imports);
        }
    }

    /// Resolve a function name to its definition location
    /// Given a file and a function name used in that file, find where it's defined
    pub fn resolve_symbol(&self, from_file: &Path, symbol_name: &str) -> Option<&Symbol> {
        // 1. Check if it's defined in the same file
        if let Some(symbols) = self.symbols.get(symbol_name) {
            for sym in symbols {
                if sym.file_path == from_file {
                    return Some(sym);
                }
            }
        }
        
        // 2. Check imports in from_file
        if let Some(file_imports) = self.imports.get(from_file) {
            for import in file_imports {
                for imported_name in &import.names {
                    let effective_name = imported_name.alias.as_ref().unwrap_or(&imported_name.name);
                    if effective_name == symbol_name {
                        // Found an import that matches. Now resolve the module.
                        let target_module = if import.is_from_import {
                            format!("{}.{}", import.module, imported_name.name)
                        } else {
                            imported_name.name.clone()
                        };
                        
                        // Try to find the symbol in our index
                        if let Some(symbols) = self.symbols.get(&imported_name.name) {
                            // Prioritize symbols from matching module path
                            for sym in symbols {
                                if sym.module_path.ends_with(&import.module) || import.module.ends_with(&sym.module_path) {
                                    return Some(sym);
                                }
                            }
                            // Fallback: return first match
                            return symbols.first();
                        }
                    }
                }
            }
        }
        
        // 3. Fallback: search globally
        self.symbols.get(symbol_name).and_then(|v| v.first())
    }

    /// Get all symbols in the index
    pub fn get_all_symbols(&self) -> &HashMap<String, Vec<Symbol>> {
        &self.symbols
    }

    /// Get imports for a specific file
    pub fn get_file_imports(&self, file_path: &Path) -> Option<&Vec<ImportStatement>> {
        self.imports.get(file_path)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[test]
    fn test_indexer_creation() {
        let temp_dir = env::temp_dir();
        let indexer = ProjectIndexer::new(temp_dir);
        assert!(indexer.is_ok());
    }
}
