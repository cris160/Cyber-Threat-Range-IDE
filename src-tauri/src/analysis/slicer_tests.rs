// Comprehensive Unit Tests for BackwardSlicer

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

    // ===========================================
    // TAINT TRACKING TESTS
    // ===========================================

    #[test]
    fn test_user_input_is_tainted() {
        let source = r#"
user_id = request.args.get('id')
query = f"SELECT * FROM users WHERE id = {user_id}"
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.is_tainted("user_id"), "Variable from request.args.get should be tainted");
    }

    #[test]
    fn test_literal_is_not_tainted() {
        let source = r#"
status = "active"
query = f"SELECT * FROM users WHERE status = '{status}'"
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(!slicer.is_tainted("status"), "Literal string should not be tainted");
    }

    #[test]
    fn test_transitive_taint() {
        let source = r#"
user_input = request.form.get('name')
sanitized = user_input
query = f"SELECT * FROM users WHERE name = '{sanitized}'"
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.is_tainted("user_input"), "Original user input should be tainted");
        assert!(slicer.is_tainted("sanitized"), "Variable derived from tainted var should be tainted");
    }

    #[test]
    fn test_parameter_is_tainted() {
        let source = r#"
def get_user(user_id):
    query = f"SELECT * FROM users WHERE id = {user_id}"
    return query
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.is_tainted("user_id"), "Function parameters should be tainted");
    }

    #[test]
    fn test_multiple_params_tainted() {
        let source = r#"
def search_users(name, age, city):
    query = f"SELECT * FROM users WHERE name='{name}' AND age={age} AND city='{city}'"
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
        assert!(!slicer.is_tainted("username"), "Derived from literal should not be tainted");
    }

    #[test]
    fn test_mixed_taint() {
        let source = r#"
user_input = request.args.get('id')
constant = "users"
table_name = constant + user_input
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.is_tainted("table_name"), "Mixed literal + tainted should be tainted");
    }

    #[test]
    fn test_cycle_detection() {
        let source = r#"
a = b
b = c
c = a
"#;
        let (slicer, _) = create_slicer_with_source(source);
        // Should not crash with circular dependency
        let _ = slicer.is_tainted("a");
    }

    #[test]
    fn test_sys_argv_is_tainted() {
        let source = r#"
import sys
filename = sys.argv[1]
command = f"cat {filename}"
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.is_tainted("filename"), "sys.argv should be tainted");
    }

    #[test]
    fn test_input_function_is_tainted() {
        let source = r#"
name = input("Enter your name: ")
greeting = f"Hello {name}"
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.is_tainted("name"), "input() function should be tainted");
    }

    // ===========================================
    // DEFINITION COLLECTION TESTS
    // ===========================================

    #[test]
    fn test_collects_simple_assignment() {
        let source = r#"
x = 5
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(!slicer.definitions.is_empty(), "Should collect assignment");
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
        assert!(slicer.definitions.contains_key("a"));
        assert!(slicer.definitions.contains_key("b"));
        assert!(slicer.definitions.contains_key("c"));
    }

    #[test]
    fn test_collects_fstring_assignment() {
        let source = r#"
user_id = request.args.get('id')
query = f"SELECT * FROM users WHERE id = {user_id}"
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.definitions.contains_key("query"));
        assert!(slicer.definitions.contains_key("user_id"));
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
    fn test_collects_nested_function_params() {
        let source = r#"
def outer(x):
    def inner(y):
        z = x + y
    return inner
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.definitions.contains_key("x"));
        assert!(slicer.definitions.contains_key("y"));
    }

    // ===========================================
    // VALUE SOURCE ANALYSIS TESTS
    // ===========================================

    #[test]
    fn test_identifies_user_input_source() {
        let source = r#"
data = request.json.get('user')
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.tainted.contains("data"), "request.json.get should be flagged as user input");
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
    fn test_identifies_flask_args_input() {
        let source = r#"
search = request.args.get('q')
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.tainted.contains("search"));
    }

    // ===========================================
    // ENTRY POINT DETECTION TESTS
    // ===========================================

    #[test]
    fn test_flask_route_detected() {
        let source = r#"
from flask import Flask, request
app = Flask(__name__)

@app.route('/user')
def get_user():
    user_id = request.args.get('id')
"#;
        let (slicer, _) = create_slicer_with_source(source);
        // Flask routes are entry points
        assert!(slicer.tainted.contains("user_id"));
    }

    #[test]
    fn test_cli_entry_point_sys_argv() {
        let source = r#"
import sys
filename = sys.argv[1]
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.tainted.contains("filename"));
    }

    // ===========================================
    // EDGE CASES
    // ===========================================

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
# Another comment
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
        assert!(slicer.is_tainted("result"), "Derived from tainted var should be tainted");
    }

    #[test]
    fn test_list_comprehension() {
        let source = r#"
user_ids = request.json.get('ids')
queries = [f"SELECT * WHERE id={id}" for id in user_ids]
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.is_tainted("user_ids"));
    }

    #[test]
    fn test_multiple_assignment() {
        let source = r#"
a = b = c = request.args.get('data')
"#;
        let (slicer, _) = create_slicer_with_source(source);
        // At least one should be tracked
        assert!(!slicer.definitions.is_empty());
    }

    #[test]
    fn test_augmented_assignment() {
        let source = r#"
cmd = "ls"
user_input = request.args.get('path')
cmd += " " + user_input
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.is_tainted("cmd"), "Augmented assignment with tainted var should taint result");
    }

    #[test]
    fn test_class_attribute() {
        let source = r#"
class User:
    def __init__(self, user_id):
        self.id = user_id
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.is_tainted("user_id"), "Constructor params should be tainted");
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
    fn test_lambda_params() {
        let source = r#"
execute = lambda query: cursor.execute(query)
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.is_tainted("query"), "Lambda params should be tainted");
    }

    #[test]
    fn test_decorator_function() {
        let source = r#"
@app.route('/api/user')
@auth_required
def get_user(user_id):
    return {"id": user_id}
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.is_tainted("user_id"));
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
    fn test_with_statement() {
        let source = r#"
filename = request.args.get('file')
with open(filename) as f:
    data = f.read()
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.is_tainted("filename"));
    }

    #[test]
    fn test_try_except() {
        let source = r#"
try:
    user_id = request.args.get('id')
    query = f"SELECT * WHERE id = {user_id}"
except:
    query = "SELECT * FROM users"
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
        assert!(slicer.is_tainted("value"), "Ternary with tainted var should be tainted");
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
    fn test_tuple_unpacking() {
        let source = r#"
data = request.json.get('data')
x, y, z = data
"#;
        let (slicer, _) = create_slicer_with_source(source);
        assert!(slicer.is_tainted("data"));
    }
}
