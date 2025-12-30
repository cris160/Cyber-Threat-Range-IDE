//! Python AST Parser using Tree-Sitter
//!
//! Parses Python source code and identifies dangerous sinks
//! (SQL injection points, command execution, etc.)

use tree_sitter::{Node, Parser, Tree};
use super::{Sink, SinkType};

/// Patterns that indicate dangerous sinks
const SQL_SINKS: &[&str] = &[
    "execute",
    "executemany", 
    "raw",
    "execute_sql",
];

const COMMAND_SINKS: &[&str] = &[
    "system",
    "popen",
    "call",
    "run",
    "check_output",
    "check_call",
    "Popen",
    "getoutput",
    "getstatusoutput",
];

const CODE_SINKS: &[&str] = &[
    "eval",
    "exec",
    "compile",
];

const PATH_SINKS: &[&str] = &[
    "open",
    "read_file",
    "write_file",
    "send_file",
    "remove",
    "unlink",
];

const DESERIALIZE_SINKS: &[&str] = &[
    "loads",  // pickle.loads, marshal.loads
    "load",   // pickle.load
    "yaml.load",
];

const SSRF_SINKS: &[&str] = &[
    "requests.get",
    "requests.post",
    "urlopen",        // urllib.request.urlopen
    "urlretrieve",
];

const XXE_SINKS: &[&str] = &[
    "parse",          // lxml.etree.parse
    "fromstring",     // lxml.etree.fromstring
];

const REGEX_SINKS: &[&str] = &[
    "compile",
    "match", 
    "search",
    "findall",
    "sub",
];

pub struct PythonParser {
    parser: Parser,
}

impl PythonParser {
    /// Create a new Python parser
    pub fn new() -> Result<Self, String> {
        let mut parser = Parser::new();
        parser
            .set_language(tree_sitter_python::language())
            .map_err(|e| format!("Failed to set Python language: {}", e))?;
        
        Ok(Self { parser })
    }

    /// Parse Python source code and return the AST
    pub fn parse(&mut self, source: &str) -> Result<Tree, String> {
        self.parser
            .parse(source, None)
            .ok_or_else(|| "Failed to parse Python source".to_string())
    }

    /// Find all dangerous sinks in the source code
    pub fn find_sinks(&mut self, source: &str) -> Result<Vec<Sink>, String> {
        let tree = self.parse(source)?;
        let root = tree.root_node();
        let source_bytes = source.as_bytes();
        
        let mut sinks = Vec::new();
        self.walk_tree(root, source_bytes, &mut sinks);
        
        Ok(sinks)
    }

    /// Recursively walk the AST looking for dangerous patterns
    fn walk_tree(&self, node: Node, source: &[u8], sinks: &mut Vec<Sink>) {
        // Check if this is a function call
        if node.kind() == "call" {
            if let Some(sink) = self.check_call_node(node, source) {
                sinks.push(sink);
            }
        }

        // Recurse into children
        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            self.walk_tree(child, source, sinks);
        }
    }

    /// Check if a call node represents a dangerous sink
    fn check_call_node(&self, node: Node, source: &[u8]) -> Option<Sink> {
        // Get the function being called
        let function_node = node.child_by_field_name("function")?;
        let function_text = self.node_text(function_node, source);

        // Check for different sink types
        let sink_type = self.classify_sink(&function_text)?;

        // Get the arguments to find tainted variables
        let args_node = node.child_by_field_name("arguments")?;
        
        // REFINEMENT: Handling Parameterized Queries
        // If it's a SQL sink (cursor.execute), check if it has multiple arguments.
        // If the first argument is a string literal (or simple string), and variables are only in the second argument,
        // then it is SAFE.
        
        let tainted_vars = if sink_type == SinkType::SqlInjection {
            self.extract_sql_tainted_vars(args_node, source)
        } else {
            self.extract_variables(args_node, source)
        };
        
        if tainted_vars.is_empty() {
             return None; // No user input involved in the dangerous part
        }

        // Get the code snippet
        let code_snippet = self.node_text(node, source);

        Some(Sink {
            sink_type,
            line: node.start_position().row + 1, // 1-indexed
            column: node.start_position().column,
            code_snippet,
            tainted_vars,
        })
    }
    
    /// Extract tainted variables specifically for SQL sinks (handling parameterized queries)
    fn extract_sql_tainted_vars(&self, args_node: Node, source: &[u8]) -> Vec<String> {
        let mut vars = Vec::new();
        let mut cursor = args_node.walk();
        
        // Get all actual argument nodes (skipping punctuation)
        let mut args = Vec::new();
        for child in args_node.named_children(&mut cursor) {
             args.push(child);
        }
        
        if args.is_empty() {
            return vars;
        }

        // The first argument is the SQL query (or the statement being executed).
        let first_arg = args[0];
        
        // Check if the first argument is a string literal (safe) or contains variables (unsafe).
        let query_vars = self.extract_variables(first_arg, source);
        vars.extend(query_vars);
        
        vars
    }

    /// Extract variable names from an arguments node or expression
    fn extract_variables(&self, node: Node, source: &[u8]) -> Vec<String> {
        let mut vars = Vec::new();

        // Handle the node itself
        match node.kind() {
            "identifier" => {
                vars.push(self.node_text(node, source));
                return vars;
            }
            "string" | "concatenated_string" | "formatted_string" => {
                // Check for f-strings with embedded expressions
                self.extract_fstring_vars(node, source, &mut vars);
                return vars;
            }
            _ => {}
        }

        // Recurse into children
        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            let nested = self.extract_variables(child, source);
            vars.extend(nested);
        }

        vars
    }

    /// Extract variables from f-strings
    fn extract_fstring_vars(&self, node: Node, source: &[u8], vars: &mut Vec<String>) {
        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            if child.kind() == "interpolation" || child.kind() == "format_expression" {
                let nested = self.extract_variables(child, source);
                vars.extend(nested);
            } else {
               if child.kind() == "concatenated_string" || child.kind() == "string" {
                     self.extract_fstring_vars(child, source, vars);
               }
            }
        }
    }

    /// Classify what type of sink this function call represents
    fn classify_sink(&self, function_name: &str) -> Option<SinkType> {
        // Get the last part of the function name (e.g., "cursor.execute" -> "execute")
        let method_name = function_name.split('.').last().unwrap_or(function_name);

        if SQL_SINKS.contains(&method_name) {
            // Check if it looks like SQL (contains cursor, connection, db)
            if function_name.contains("cursor") 
                || function_name.contains("execute")
                || function_name.contains("db")
                || function_name.contains("connection") {
                return Some(SinkType::SqlInjection);
            }
        }

        if COMMAND_SINKS.contains(&method_name) {
            if function_name.contains("os.") 
                || function_name.contains("subprocess")
                || method_name == "system"
                || method_name == "popen"
                || method_name == "getoutput"
                || method_name == "getstatusoutput" {
                return Some(SinkType::CommandInjection);
            }
        }

        if CODE_SINKS.contains(&method_name) {
            return Some(SinkType::CodeInjection);
        }

        // Fix: Add check for Path Traversal sinks
        if PATH_SINKS.contains(&method_name) {
            return Some(SinkType::PathTraversal);
        }

        if DESERIALIZE_SINKS.contains(&method_name) {
            if function_name.contains("pickle") || function_name.contains("marshal") || function_name.contains("yaml") {
                return Some(SinkType::Deserialization);
            }
        }

        for sink in SSRF_SINKS {
             if function_name.ends_with(sink) {
                 return Some(SinkType::Ssrf);
             }
        }

        for sink in XXE_SINKS {
             if function_name.ends_with(sink) && (function_name.contains("lxml") || function_name.contains("etree")) {
                 return Some(SinkType::Xxe);
             }
        }

        for sink in REGEX_SINKS {
             if function_name.ends_with(sink) && function_name.contains("re.") {
                 return Some(SinkType::CodeInjection);
             }
        }

        // Direct matches
        match method_name {
            "eval" | "exec" => Some(SinkType::CodeInjection),
            "system" => Some(SinkType::CommandInjection),
            _ => None,
        }
    }



    /// Get the text content of a node
    fn node_text(&self, node: Node, source: &[u8]) -> String {
        node.utf8_text(source).unwrap_or("").to_string()
    }
}

impl Default for PythonParser {
    fn default() -> Self {
        Self::new().expect("Failed to create Python parser")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ===========================================
    // SQL INJECTION TESTS (True Positives)
    // ===========================================

    #[test]
    fn test_sqli_fstring_basic() {
        let source = r#"
def get_user(user_id):
    query = f"SELECT * FROM users WHERE id = {user_id}"
    cursor.execute(query)
"#;
        let mut parser = PythonParser::new().unwrap();
        let sinks = parser.find_sinks(source).unwrap();
        assert!(!sinks.is_empty(), "Should detect f-string SQL injection");
        assert_eq!(sinks[0].sink_type, SinkType::SqlInjection);
    }

    #[test]
    fn test_sqli_format_method() {
        let source = r#"
def get_user(user_id):
    query = "SELECT * FROM users WHERE id = {}".format(user_id)
    cursor.execute(query)
"#;
        let mut parser = PythonParser::new().unwrap();
        let sinks = parser.find_sinks(source).unwrap();
        assert!(!sinks.is_empty(), "Should detect .format() SQL injection");
    }

    #[test]
    fn test_sqli_percent_format() {
        let source = r#"
def get_user(user_id):
    query = "SELECT * FROM users WHERE id = %s" % user_id
    cursor.execute(query)
"#;
        let mut parser = PythonParser::new().unwrap();
        let sinks = parser.find_sinks(source).unwrap();
        assert!(!sinks.is_empty(), "Should detect % format SQL injection");
    }

    #[test]
    fn test_sqli_concatenation() {
        let source = r#"
def get_user(user_id):
    query = "SELECT * FROM users WHERE id = " + user_id
    cursor.execute(query)
"#;
        let mut parser = PythonParser::new().unwrap();
        let sinks = parser.find_sinks(source).unwrap();
        assert!(!sinks.is_empty(), "Should detect concatenation SQL injection");
    }

    #[test]
    fn test_sqli_simple_var() {
        let source = r#"
def get_user_simple(q):
    cursor.execute(q)
"#;
        let mut parser = PythonParser::new().unwrap();
        let sinks = parser.find_sinks(source).unwrap();
        assert!(!sinks.is_empty(), "Should detect variable-based SQL injection");
        assert!(sinks[0].tainted_vars.contains(&"q".to_string()));
    }

    #[test]
    fn test_sqli_multiline_query() {
        let source = r#"
def get_user(user_id):
    query = f"""
        SELECT * FROM users 
        WHERE id = {user_id}
        AND active = 1
    """
    cursor.execute(query)
"#;
        let mut parser = PythonParser::new().unwrap();
        let sinks = parser.find_sinks(source).unwrap();
        assert!(!sinks.is_empty(), "Should detect multiline f-string SQL");
    }

    #[test]
    fn test_sqli_executemany() {
        let source = r#"
def insert_users(data):
    query = f"INSERT INTO users VALUES ({data})"
    cursor.executemany(query, data)
"#;
        let mut parser = PythonParser::new().unwrap();
        let sinks = parser.find_sinks(source).unwrap();
        assert!(!sinks.is_empty(), "Should detect executemany SQL injection");
    }

    // ===========================================
    // SQL INJECTION TESTS (True Negatives - Safe)
    // ===========================================

    #[test]
    fn test_sqli_safe_parameterized_tuple() {
        let source = r#"
def get_user(user_id):
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
"#;
        let mut parser = PythonParser::new().unwrap();
        let sinks = parser.find_sinks(source).unwrap();
        // Should still detect the sink, but tainted_vars should be empty (safe)
        // The prover should then mark this as Safe
        if !sinks.is_empty() {
            // If params are detected, tainted_vars should NOT contain user_id
            assert!(!sinks[0].tainted_vars.contains(&"user_id".to_string()));
        }
    }

    #[test]
    fn test_sqli_safe_parameterized_dict() {
        let source = r#"
def get_user(user_id):
    cursor.execute("SELECT * FROM users WHERE id = :id", {"id": user_id})
"#;
        let mut parser = PythonParser::new().unwrap();
        let sinks = parser.find_sinks(source).unwrap();
        // Parameterized with dict - should be safe
        assert!(sinks.is_empty() || sinks[0].tainted_vars.is_empty());
    }

    #[test]
    fn test_sqli_safe_literal_only() {
        let source = r#"
def get_all_users():
    cursor.execute("SELECT * FROM users")
"#;
        let mut parser = PythonParser::new().unwrap();
        let sinks = parser.find_sinks(source).unwrap();
        // Literal-only query - tainted_vars should be empty
        if !sinks.is_empty() {
            assert!(sinks[0].tainted_vars.is_empty(), "Literal-only query should have no tainted vars");
        }
    }

    // ===========================================
    // COMMAND INJECTION TESTS (True Positives)
    // ===========================================

    #[test]
    fn test_cmdi_os_system_fstring() {
        let source = r#"
import os
def ping(host):
    os.system(f"ping {host}")
"#;
        let mut parser = PythonParser::new().unwrap();
        let sinks = parser.find_sinks(source).unwrap();
        assert!(!sinks.is_empty());
        assert_eq!(sinks[0].sink_type, SinkType::CommandInjection);
    }

    #[test]
    fn test_cmdi_os_popen() {
        let source = r#"
import os
def run_cmd(cmd):
    os.popen(cmd)
"#;
        let mut parser = PythonParser::new().unwrap();
        let sinks = parser.find_sinks(source).unwrap();
        assert!(!sinks.is_empty());
        assert_eq!(sinks[0].sink_type, SinkType::CommandInjection);
    }

    #[test]
    fn test_cmdi_subprocess_call() {
        let source = r#"
import subprocess
def run_cmd(cmd):
    subprocess.call(cmd, shell=True)
"#;
        let mut parser = PythonParser::new().unwrap();
        let sinks = parser.find_sinks(source).unwrap();
        assert!(!sinks.is_empty());
        assert_eq!(sinks[0].sink_type, SinkType::CommandInjection);
    }

    #[test]
    fn test_cmdi_subprocess_run() {
        let source = r#"
import subprocess
def run_cmd(cmd):
    subprocess.run(cmd, shell=True)
"#;
        let mut parser = PythonParser::new().unwrap();
        let sinks = parser.find_sinks(source).unwrap();
        assert!(!sinks.is_empty());
        assert_eq!(sinks[0].sink_type, SinkType::CommandInjection);
    }

    #[test]
    fn test_cmdi_subprocess_popen() {
        let source = r#"
import subprocess
def run_cmd(cmd):
    subprocess.Popen(cmd, shell=True)
"#;
        let mut parser = PythonParser::new().unwrap();
        let sinks = parser.find_sinks(source).unwrap();
        assert!(!sinks.is_empty());
        assert_eq!(sinks[0].sink_type, SinkType::CommandInjection);
    }

    #[test]
    fn test_cmdi_subprocess_check_output() {
        let source = r#"
import subprocess
def run_cmd(cmd):
    subprocess.check_output(cmd, shell=True)
"#;
        let mut parser = PythonParser::new().unwrap();
        let sinks = parser.find_sinks(source).unwrap();
        assert!(!sinks.is_empty());
        assert_eq!(sinks[0].sink_type, SinkType::CommandInjection);
    }

    // ===========================================
    // CODE INJECTION TESTS (True Positives)
    // ===========================================

    #[test]
    fn test_codei_eval_basic() {
        let source = r#"
def run_expr(expr):
    result = eval(expr)
"#;
        let mut parser = PythonParser::new().unwrap();
        let sinks = parser.find_sinks(source).unwrap();
        assert!(!sinks.is_empty());
        assert_eq!(sinks[0].sink_type, SinkType::CodeInjection);
    }

    #[test]
    fn test_codei_exec_basic() {
        let source = r#"
def run_code(code):
    exec(code)
"#;
        let mut parser = PythonParser::new().unwrap();
        let sinks = parser.find_sinks(source).unwrap();
        assert!(!sinks.is_empty());
        assert_eq!(sinks[0].sink_type, SinkType::CodeInjection);
    }

    #[test]
    fn test_codei_compile() {
        let source = r#"
def compile_code(code):
    compiled = compile(code, "<string>", "exec")
"#;
        let mut parser = PythonParser::new().unwrap();
        let sinks = parser.find_sinks(source).unwrap();
        assert!(!sinks.is_empty());
        assert_eq!(sinks[0].sink_type, SinkType::CodeInjection);
    }

    // ===========================================
    // DESERIALIZATION TESTS (True Positives)
    // ===========================================

    #[test]
    fn test_deser_pickle_loads() {
        let source = r#"
import pickle
def load_data(data):
    obj = pickle.loads(data)
"#;
        let mut parser = PythonParser::new().unwrap();
        let sinks = parser.find_sinks(source).unwrap();
        assert!(!sinks.is_empty());
        assert_eq!(sinks[0].sink_type, SinkType::Deserialization);
    }

    #[test]
    fn test_deser_pickle_load() {
        let source = r#"
import pickle
def load_file(f):
    obj = pickle.load(f)
"#;
        let mut parser = PythonParser::new().unwrap();
        let sinks = parser.find_sinks(source).unwrap();
        assert!(!sinks.is_empty());
        assert_eq!(sinks[0].sink_type, SinkType::Deserialization);
    }

    #[test]
    fn test_deser_yaml_load() {
        let source = r#"
import yaml
def load_yaml(data):
    obj = yaml.load(data)
"#;
        let mut parser = PythonParser::new().unwrap();
        let sinks = parser.find_sinks(source).unwrap();
        assert!(!sinks.is_empty());
        assert_eq!(sinks[0].sink_type, SinkType::Deserialization);
    }

    #[test]
    fn test_deser_marshal_loads() {
        let source = r#"
import marshal
def load_bytecode(data):
    obj = marshal.loads(data)
"#;
        let mut parser = PythonParser::new().unwrap();
        let sinks = parser.find_sinks(source).unwrap();
        assert!(!sinks.is_empty());
        assert_eq!(sinks[0].sink_type, SinkType::Deserialization);
    }

    // ===========================================
    // EDGE CASES
    // ===========================================

    #[test]
    fn test_no_sinks_in_safe_code() {
        let source = r#"
def add(a, b):
    return a + b

def greet(name):
    return f"Hello, {name}!"
"#;
        let mut parser = PythonParser::new().unwrap();
        let sinks = parser.find_sinks(source).unwrap();
        assert!(sinks.is_empty(), "Safe code should have no sinks");
    }

    #[test]
    fn test_empty_source() {
        let source = "";
        let mut parser = PythonParser::new().unwrap();
        let sinks = parser.find_sinks(source).unwrap();
        assert!(sinks.is_empty(), "Empty source should have no sinks");
    }

    #[test]
    fn test_comments_only() {
        let source = r#"
# This is a comment
# cursor.execute(query) - this should NOT be detected
"#;
        let mut parser = PythonParser::new().unwrap();
        let sinks = parser.find_sinks(source).unwrap();
        assert!(sinks.is_empty(), "Comments should not be detected as sinks");
    }

    #[test]
    fn test_string_literal_containing_sink() {
        let source = r#"
help_text = "Use cursor.execute(query) to run SQL"
"#;
        let mut parser = PythonParser::new().unwrap();
        let sinks = parser.find_sinks(source).unwrap();
        assert!(sinks.is_empty(), "String literals should not be detected as sinks");
    }

    #[test]
    fn test_multiple_sinks_in_one_file() {
        let source = r#"
def vulnerable1(user_id):
    cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")

def vulnerable2(cmd):
    os.system(cmd)

def vulnerable3(expr):
    eval(expr)
"#;
        let mut parser = PythonParser::new().unwrap();
        let sinks = parser.find_sinks(source).unwrap();
        assert_eq!(sinks.len(), 3, "Should detect all 3 sinks");
    }

    #[test]
    fn test_nested_function_sink() {
        let source = r#"
def outer():
    def inner(query):
        cursor.execute(query)
    return inner
"#;
        let mut parser = PythonParser::new().unwrap();
        let sinks = parser.find_sinks(source).unwrap();
        assert!(!sinks.is_empty(), "Should detect sink in nested function");
    }

    #[test]
    fn test_class_method_sink() {
        let source = r#"
class Database:
    def execute_query(self, query):
        self.cursor.execute(query)
"#;
        let mut parser = PythonParser::new().unwrap();
        let sinks = parser.find_sinks(source).unwrap();
        assert!(!sinks.is_empty(), "Should detect sink in class method");
    }

    #[test]
    fn test_async_function_sink() {
        let source = r#"
async def get_user(user_id):
    query = f"SELECT * FROM users WHERE id = {user_id}"
    await cursor.execute(query)
"#;
        let mut parser = PythonParser::new().unwrap();
        let sinks = parser.find_sinks(source).unwrap();
        assert!(!sinks.is_empty(), "Should detect sink in async function");
    }

    #[test]
    fn test_lambda_with_sink() {
        let source = r#"
execute = lambda q: cursor.execute(q)
"#;
        let mut parser = PythonParser::new().unwrap();
        let sinks = parser.find_sinks(source).unwrap();
        assert!(!sinks.is_empty(), "Should detect sink in lambda");
    }

    // ===========================================
    // SINK LINE NUMBER ACCURACY
    // ===========================================

    #[test]
    fn test_line_number_accuracy() {
        let source = r#"
# Line 1
# Line 2
# Line 3
def get_user(user_id):  # Line 4
    query = f"SELECT * FROM users WHERE id = {user_id}"  # Line 5
    cursor.execute(query)  # Line 6
"#;
        let mut parser = PythonParser::new().unwrap();
        let sinks = parser.find_sinks(source).unwrap();
        assert!(!sinks.is_empty());
        // Line 6 in the original (1-indexed), but tree-sitter is 0-indexed
        assert!(sinks[0].line >= 6 && sinks[0].line <= 7, "Line number should be around 6-7");
    }
}
