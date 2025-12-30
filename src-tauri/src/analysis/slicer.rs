//! Backward Slicer
//! 
//! Performs backward slicing from a sink to find all code paths
//! that could lead to it with tainted (user-controlled) data.

use tree_sitter::{Node, Tree};
use super::{Sink, PathNode};
use std::collections::{HashMap, HashSet};

/// Entry points that represent user-controllable input
const FLASK_ENTRY_POINTS: &[&str] = &[
    "request.args",
    "request.form",
    "request.data",
    "request.json",
    "request.files",
    "request.values",
    "request.cookies",
    "request.headers",
];

const FASTAPI_ENTRY_POINTS: &[&str] = &[
    // FastAPI uses function parameters annotated with Query, Path, Body
    // We'll detect these by looking at route decorator functions
];

const CLI_ENTRY_POINTS: &[&str] = &[
    "sys.argv",
    "args.",  // argparse
    "input(",
];

/// Represents a variable definition/assignment
#[derive(Debug, Clone)]
pub struct VariableDefinition {
    pub name: String,
    pub line: usize,
    pub value_source: ValueSource,
    pub dependencies: Vec<String>, // Other variables this depends on
}

/// Where a variable's value comes from
#[derive(Debug, Clone, PartialEq)]
pub enum ValueSource {
    /// A literal value (safe)
    Literal,
    /// User input (dangerous)
    UserInput(String), // The source expression
    /// Depends on other variables
    Derived,
    /// Function parameter
    Parameter,
    /// Unknown
    Unknown,
}

/// The backward slicer
pub struct BackwardSlicer {
    /// All variable definitions found
    definitions: HashMap<String, Vec<VariableDefinition>>,
    /// Variables known to be tainted
    tainted: HashSet<String>,
    /// The slice path
    path: Vec<PathNode>,
}

impl BackwardSlicer {
    pub fn new() -> Self {
        Self {
            definitions: HashMap::new(),
            tainted: HashSet::new(),
            path: Vec::new(),
        }
    }

    /// Check if a variable is tainted (user-controlled)
    pub fn is_tainted(&self, var_name: &str) -> bool {
        // Fix: Use recursive check to handle derived values
        self.is_tainted_recursive(var_name, &mut HashSet::new())
    }

    /// Analyze the code and build a definition map
    pub fn analyze(&mut self, source: &str, tree: &Tree) {
        // Pre-seed known global entry points for direct usage
        self.tainted.insert("request".to_string());
        
        let root = tree.root_node();
        let source_bytes = source.as_bytes();
        
        self.collect_definitions(root, source_bytes);
        self.identify_entry_points(source);
    }

    /// Collect all variable definitions in the code
    fn collect_definitions(&mut self, node: Node, source: &[u8]) {
        match node.kind() {
            "assignment" | "augmented_assignment" => {
                self.process_assignment(node, source);
            }
            "function_definition" | "lambda" => {
                self.process_function_params(node, source);
            }
            _ => {}
        }

        // Recurse
        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            self.collect_definitions(child, source);
        }
    }

    /// Process an assignment statement
    fn process_assignment(&mut self, node: Node, source: &[u8]) {
        // Get left side (variable name or pattern)
        if let Some(left) = node.child_by_field_name("left") {
            // Support tuple unpacking by extracting all identifiers from left side
            // e.g. "a, b = tup" -> targets ["a", "b"]
            let targets = self.extract_identifiers(left, source);
            
            // Get right side (value)
            if let Some(right) = node.child_by_field_name("right") {
                let value_text = self.node_text(right, source);
                let (value_source, initial_deps) = self.analyze_value(right, source, &value_text);
                
                for var_name in targets {
                    let mut deps = initial_deps.clone();
                    
                    // CRITICAL FIX: Augmented assignment (+=) depends on previous value
                    // cmd += input  =>  cmd = cmd + input
                    if node.kind() == "augmented_assignment" {
                        deps.push(var_name.clone());
                    }

                    let def = VariableDefinition {
                        name: var_name.clone(),
                        line: node.start_position().row + 1,
                        value_source: value_source.clone(),
                        dependencies: deps,
                    };
                    
                    self.definitions
                        .entry(var_name)
                        .or_insert_with(Vec::new)
                        .push(def);
                }
            }
        }
    }

    /// Process function parameters (potential entry points)
    fn process_function_params(&mut self, node: Node, source: &[u8]) {
        if let Some(params) = node.child_by_field_name("parameters") {
            let mut cursor = params.walk();
            for param in params.children(&mut cursor) {
                // Handle various parameter node types
                match param.kind() {
                    "identifier" | "typed_parameter" => {
                        let param_name = self.node_text(param, source);
                        let def = VariableDefinition {
                            name: param_name.clone(),
                            line: param.start_position().row + 1,
                            value_source: ValueSource::Parameter,
                            dependencies: vec![],
                        };
                        self.definitions
                            .entry(param_name)
                            .or_insert_with(Vec::new)
                            .push(def);
                    }
                    "default_parameter" | "typed_default_parameter" => {
                        // Handle parameters with default values
                        if let Some(name_node) = param.child_by_field_name("name") {
                            let param_name = self.node_text(name_node, source);
                            let def = VariableDefinition {
                                name: param_name.clone(),
                                line: param.start_position().row + 1,
                                value_source: ValueSource::Parameter,
                                dependencies: vec![],
                            };
                            self.definitions
                                .entry(param_name)
                                .or_insert_with(Vec::new)
                                .push(def);
                        }
                    }
                    "list_splat_pattern" | "dictionary_splat_pattern" => {
                        // Handle *args and **kwargs
                        if let Some(name_node) = param.child(0) {
                            let param_name = self.node_text(name_node, source);
                            let def = VariableDefinition {
                                name: param_name.clone(),
                                line: param.start_position().row + 1,
                                value_source: ValueSource::Parameter,
                                dependencies: vec![],
                            };
                            self.definitions
                                .entry(param_name)
                                .or_insert_with(Vec::new)
                                .push(def);
                        }
                    }
                    _ => {}
                }
            }
        }
    }

    /// Analyze a value expression to determine its source
    fn analyze_value(&self, node: Node, source: &[u8], value_text: &str) -> (ValueSource, Vec<String>) {
        // Check if it's a user input source
        for entry_point in FLASK_ENTRY_POINTS.iter().chain(CLI_ENTRY_POINTS.iter()) {
            if value_text.contains(entry_point) {
                return (ValueSource::UserInput(entry_point.to_string()), vec![]);
            }
        }

        // Check if it's a literal
        match node.kind() {
            "integer" | "float" | "true" | "false" | "none" => {
                return (ValueSource::Literal, vec![]);
            }
            _ => {}
        }

        // Extract dependencies (other variables used in the expression)
        let deps = self.extract_identifiers(node, source);
        
        if deps.is_empty() {
            (ValueSource::Literal, vec![])
        } else {
            (ValueSource::Derived, deps)
        }
    }

    /// Extract all identifier references from an expression
    fn extract_identifiers(&self, node: Node, source: &[u8]) -> Vec<String> {
        let mut ids = Vec::new();
        
        if node.kind() == "identifier" {
            ids.push(self.node_text(node, source));
        } else if node.kind() == "attribute" {
             // For attributes like 'obj.attr', treat as a single identifier for simplified slicing
             ids.push(self.node_text(node, source));
        }
        
        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            ids.extend(self.extract_identifiers(child, source));
        }
        
        ids
    }

    /// Identify which variables are directly from user input
    fn identify_entry_points(&mut self, source: &str) {
        for (var_name, defs) in &self.definitions {
            for def in defs {
                match &def.value_source {
                    ValueSource::UserInput(_) => {
                        self.tainted.insert(var_name.clone());
                    }
                    // CRITICAL FIX: Auto-taint function parameters
                    // Function params represent external input in security analysis
                    ValueSource::Parameter => {
                        self.tainted.insert(var_name.clone());
                    }
                    _ => {}
                }
            }
        }
        
        // Also look for inline patterns
        for entry_point in FLASK_ENTRY_POINTS.iter().chain(CLI_ENTRY_POINTS.iter()) {
            if source.contains(entry_point) {
                // Mark any variable assigned from this as tainted
                for (var_name, defs) in &self.definitions {
                    for def in defs {
                        if let ValueSource::UserInput(src) = &def.value_source {
                            if src.contains(entry_point) {
                                self.tainted.insert(var_name.clone());
                            }
                        }
                    }
                }
            }
        }
    }

    /// Trace backwards from a sink to find if it's reachable from user input
    pub fn trace_to_entry_point(&mut self, sink: &Sink, source: &str) -> Option<Vec<PathNode>> {
        self.path.clear();
        
        // Add the sink as the starting point
        self.path.push(PathNode {
            line: sink.line,
            code: sink.code_snippet.clone(),
            description: format!("SINK: {}", sink.sink_type.description()),
        });

        // Check if any of the tainted variables reach the sink
        for var in &sink.tainted_vars {
            if self.is_tainted_recursive(var, &mut HashSet::new()) {
                // Found a path! Build the trace
                self.build_trace(var, source);
                return Some(self.path.clone());
            }
        }

        None
    }

    fn is_tainted_recursive(&self, var_name: &str, visited: &mut HashSet<String>) -> bool {
        if visited.contains(var_name) {
            return false; // Avoid cycles
        }
        visited.insert(var_name.to_string());

        // Direct taint
        if self.tainted.contains(var_name) {
            return true;
        }

        // Check dependencies
        if let Some(defs) = self.definitions.get(var_name) {
            for def in defs {
                match &def.value_source {
                    ValueSource::UserInput(_) => return true,
                    ValueSource::Parameter => return true, // Conservative: treat params as tainted
                    ValueSource::Derived => {
                        for dep in &def.dependencies {
                            if self.is_tainted_recursive(dep, visited) {
                                return true;
                            }
                        }
                    }
                    _ => {}
                }
            }
        }

        false
    }

    /// Build the trace path from entry point to sink
    fn build_trace(&mut self, var_name: &str, source: &str) {
        let mut visited = HashSet::new();
        self.build_trace_recursive(var_name, source, &mut visited);
    }

    fn build_trace_recursive(&mut self, var_name: &str, source: &str, visited: &mut HashSet<(String, usize)>) {
        // Clone to avoid borrow conflict during recursion
        let defs = match self.definitions.get(var_name) {
            Some(d) => d.clone(),
            None => return,
        };

        for def in defs {
            // Cycle detection
            if visited.contains(&(var_name.to_string(), def.line)) {
                continue;
            }
            visited.insert((var_name.to_string(), def.line));
            
            let code = if def.line > 0 {
                 // Fallback: try to read line from source string directly
                 source.lines().nth(def.line - 1).unwrap_or("").trim().to_string()
            } else {
                format!("{} = ...", var_name)
            };

            let description = match &def.value_source {
                ValueSource::UserInput(src) => format!("ENTRY: User input from {}", src),
                ValueSource::Parameter => "ENTRY: Function parameter (potentially user-controlled)".to_string(),
                ValueSource::Derived => "FLOW: Variable derivation".to_string(),
                _ => "FLOW: Data transformation".to_string(),
            };
            
            // Only add if not already in path (to avoid duplicates in display, though visited handles recursion)
            if !self.path.iter().any(|p| p.line == def.line) {
                self.path.push(PathNode {
                    line: def.line,
                    code,
                    description,
                });
            }

            // Recurse for dependencies
            let deps_to_trace: Vec<String> = def.dependencies.iter()
                .filter(|dep| self.tainted.contains(*dep) || self.is_tainted_recursive(dep, &mut HashSet::new()))
                .cloned()
                .collect();
            
            for dep in deps_to_trace {
                self.build_trace_recursive(&dep, source, visited);
            }
        }
    }

    fn node_text(&self, node: Node, source: &[u8]) -> String {
        node.utf8_text(source).unwrap_or("").to_string()
    }
}

impl Default for BackwardSlicer {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tree_sitter::Parser;
    use tree_sitter_python::language;

    fn create_slicer_with_source(source: &str) -> (BackwardSlicer, Tree) {
        let mut parser = Parser::new();
        parser.set_language(language()).unwrap();
        let tree = parser.parse(source, None).unwrap();
        let mut slicer = BackwardSlicer::new();
        slicer.analyze(source, &tree);
        (slicer, tree)
    }

    #[test]
    fn test_user_input_is_tainted() {
        let source = r#"
user_id = request.args.get('id')
query = f"SELECT * FROM users WHERE id = {user_id}"
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.is_tainted("user_id"));
    }

    #[test]
    fn test_literal_is_not_tainted() {
        let source = r#"
status = "active"
query = f"SELECT * FROM users WHERE status = '{status}'"
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(!slicer.is_tainted("status"));
    }

    #[test]
    fn test_transitive_taint() {
        let source = r#"
user_input = request.form.get('name')
sanitized = user_input
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.is_tainted("user_input"));
        assert!(slicer.is_tainted("sanitized"));
    }

    #[test]
    fn test_parameter_is_tainted() {
        let source = r#"
def get_user(user_id):
    query = f"SELECT * FROM users WHERE id = {user_id}"
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.is_tainted("user_id"));
    }

    #[test]
    fn test_multiple_params_tainted() {
        let source = r#"
def search_users(name, age, city):
    query = "test"
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.is_tainted("name"));
        assert!(slicer.is_tainted("age"));
        assert!(slicer.is_tainted("city"));
    }

    #[test]
    fn test_derived_from_literal() {
        let source = r#"
base = "admin"
username = base + "_user"
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(!slicer.is_tainted("username"));
    }

    #[test]
    fn test_mixed_taint() {
        let source = r#"
user_input = request.args.get('id')
constant = "users"
table_name = constant + user_input
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.is_tainted("table_name"));
    }

    #[test]
    fn test_cycle_detection() {
        let source = r#"
a = b
b = c
c = a
"#;
        let (slicer, _) = create_slicer_with_source(source);
        let _ = slicer.is_tainted("a"); // Should not crash
    }

    #[test]
    fn test_sys_argv_is_tainted() {
        let source = r#"
import sys
filename = sys.argv[1]
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.is_tainted("filename"));
    }

    #[test]
    fn test_input_function_is_tainted() {
        let source = r#"
name = input("Enter your name: ")
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.is_tainted("name"));
    }

    #[test]
    fn test_collects_simple_assignment() {
        let source = r#"
x = 5
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(!slicer.definitions.is_empty());
        assert!(slicer.definitions.contains_key("x"));
    }

    #[test]
    fn test_collects_multiple_assignments() {
        let source = r#"
a = 1
b = 2
c = 3
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert_eq!(slicer.definitions.len(), 3);
    }

    #[test]
    fn test_collects_function_params() {
        let source = r#"
def process_data(input_data, sanitize=False):
    result = input_data.strip()
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.definitions.contains_key("input_data"));
        assert!(slicer.definitions.contains_key("sanitize"));
    }

    #[test]
    fn test_identifies_flask_form_input() {
        let source = r#"
username = request.form['username']
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.tainted.contains("username"));
    }

    #[test]
    fn test_empty_source() {
        let source = "";
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.definitions.is_empty());
        assert!(slicer.tainted.is_empty());
    }

    #[test]
    fn test_only_comments() {
        let source = r#"
# This is a comment
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.definitions.is_empty());
    }

    #[test]
    fn test_complex_expression() {
        let source = r#"
user_input = request.args.get('x')
result = (user_input * 2) + 10
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.is_tainted("result"));
    }

    #[test]
    fn test_augmented_assignment() {
        let source = r#"
cmd = "ls"
user_input = request.args.get('path')
cmd += " " + user_input
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.is_tainted("cmd"));
    }

    #[test]
    fn test_class_attribute() {
        let source = r#"
class User:
    def __init__(self, user_id):
        self.id = user_id
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.is_tainted("user_id"));
    }

    #[test]
    fn test_lambda_params() {
        let source = r#"
execute = lambda query: cursor.execute(query)
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.is_tainted("query"));
    }

    #[test]
    fn test_async_function_param() {
        let source = r#"
async def fetch_user(user_id):
    query = f"SELECT * FROM users WHERE id = {user_id}"
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.is_tainted("user_id"));
    }

    #[test]
    fn test_for_loop_iterator() {
        let source = r#"
user_ids = request.json.get('ids')
for user_id in user_ids:
    query = f"SELECT * WHERE id = {user_id}"
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.is_tainted("user_ids"));
    }

    #[test]
    fn test_if_condition() {
        let source = r#"
user_type = request.args.get('type')
if user_type == 'admin':
    query = f"SELECT * FROM admins WHERE type = '{user_type}'"
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.is_tainted("user_type"));
    }

    #[test]
    fn test_ternary_expression() {
        let source = r#"
user_input = request.args.get('x')
value = user_input if user_input else "default"
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.is_tainted("value"));
    }

    #[test]
    fn test_dictionary_value() {
        let source = r#"
user_id = request.args.get('id')
data = {"id": user_id, "name": "test"}
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.is_tainted("user_id"));
    }

    #[test]
    fn test_list_element() {
        let source = r#"
user_id = request.args.get('id')
ids = [user_id, 2, 3]
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.is_tainted("user_id"));
    }

    #[test]
    fn test_global_variable() {
        let source = r#"
global_user_id = None

def set_user(user_id):
    global global_user_id
    global_user_id = user_id
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.is_tainted("user_id"));
    }

    #[test]
    fn test_nested_function_params() {
        let source = r#"
def outer(x):
    def inner(y):
        z = x + y
    return inner
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.is_tainted("x"));
        assert!(slicer.is_tainted("y"));
    }

    #[test]
    fn test_decorator_function() {
        let source = r#"
@app.route('/api/user')
def get_user(user_id):
    return {"id": user_id}
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.is_tainted("user_id"));
    }
}
