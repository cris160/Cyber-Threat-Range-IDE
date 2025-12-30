use super::PathNode;

/// Generates SMT-LIB constraints from an attack path
pub struct ConstraintGenerator;

impl ConstraintGenerator {
    pub fn new() -> Self {
        Self
    }

    /// Convert a sequence of path nodes into an SMT-LIB script
    pub fn generate_smt(&self, nodes: &[PathNode], sink_var: &str) -> String {
        let mut script = String::new();
        script.push_str("(set-logic QF_S)\n"); // Logic for Strings
        
        let mut declared = Vec::new();

        for node in nodes {
            if let Some((lhs, _rhs)) = node.code.split_once('=') {
                let var_name = lhs.trim();
                if !declared.contains(&var_name.to_string()) && is_valid_var_name(var_name) {
                    script.push_str(&format!("(declare-const {} String)\n", var_name));
                    declared.push(var_name.to_string());
                }
            }
        }

        for node in nodes {
            if let Some((lhs, rhs)) = node.code.split_once('=') {
                let var_name = lhs.trim();
                let expr = rhs.trim();
                
                if expr.starts_with('f') && (expr.contains('"') || expr.contains('\'')) {
                    let smt_expr = self.parse_f_string(expr);
                    script.push_str(&format!("(assert (= {} {}))\n", var_name, smt_expr));
                }
                else if expr.starts_with('"') || expr.starts_with('\'') {
                    let clean_str = expr.trim_matches(|c| c == 'f' || c == '"' || c == '\'');
                    script.push_str(&format!("(assert (= {} \"{}\"))\n", var_name, clean_str));
                }
                else if declared.contains(&expr.to_string()) {
                    script.push_str(&format!("(assert (= {} {}))\n", var_name, expr));
                }
            }
        }

        let target = if declared.contains(&sink_var.to_string()) {
            sink_var.to_string()
        } else {
            declared.last().cloned().unwrap_or(sink_var.to_string())
        };

        script.push_str(&format!("(assert (str.contains {} \"' OR '1'='1\"))\n", target));
        script.push_str("(check-sat)\n");
        script.push_str("(get-model)\n");

        script
    }

    fn parse_f_string(&self, expr: &str) -> String {
        let content = expr.trim_start_matches('f').trim_matches(|c| c == '"' || c == '\'');
        
        let parts: Vec<&str> = content.split('{').collect();
        if parts.len() <= 1 {
            return format!("\"{}\"", content);
        }

        let mut smt_concat = String::from("(str.++");
        
        if !parts[0].is_empty() {
             smt_concat.push_str(&format!(" \"{}\"", parts[0]));
        }

        for part in &parts[1..] {
            if let Some((var, literal)) = part.split_once('}') {
                smt_concat.push_str(&format!(" {}", var.trim()));
                if !literal.is_empty() {
                    smt_concat.push_str(&format!(" \"{}\"", literal));
                }
            }
        }
        
        smt_concat.push(')');
        smt_concat
    }
}

fn is_valid_var_name(name: &str) -> bool {
    if name.is_empty() {
        return false;
    }
    // Variable names cannot start with a digit
    let first_char = name.chars().next().unwrap();
    if first_char.is_numeric() {
        return false;
    }
    name.chars().all(|c| c.is_alphanumeric() || c == '_')
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_smt_basic() {
        let gen = ConstraintGenerator::new();
        let nodes = vec![
            PathNode {
                line: 1,
                code: "user_id = request.args.get('id')".to_string(),
                description: "User input".to_string(),
            },
            PathNode {
                line: 2,
                code: "query = f\"SELECT * FROM users WHERE id = {user_id}\"".to_string(),
                description: "Query construction".to_string(),
            },
        ];
        let result = gen.generate_smt(&nodes, "query");
        assert!(result.contains("(set-logic QF_S)"));
        assert!(result.contains("(declare-const"));
        assert!(result.contains("(check-sat)"));
    }

    #[test]
    fn test_generate_smt_declares_variables() {
        let gen = ConstraintGenerator::new();
        let nodes = vec![PathNode {
            line: 1,
            code: "user_id = input()".to_string(),
            description: "Input".to_string(),
        }];
        let result = gen.generate_smt(&nodes, "user_id");
        assert!(result.contains("(declare-const user_id String)"));
    }

    #[test]
    fn test_generate_smt_handles_fstring() {
        let gen = ConstraintGenerator::new();
        let nodes = vec![PathNode {
            line: 1,
            code: "query = f\"SELECT {id}\"".to_string(),
            description: "Query".to_string(),
        }];
        let result = gen.generate_smt(&nodes, "query");
        assert!(result.contains("str.++") || result.contains("query"));
    }

    #[test]
    fn test_parse_fstring_simple() {
        let gen = ConstraintGenerator::new();
        let result = gen.parse_f_string("f\"Hello {name}\"");
        assert!(result.contains("str.++"));
        assert!(result.contains("name"));
    }

    #[test]
    fn test_parse_fstring_multiple_vars() {
        let gen = ConstraintGenerator::new();
        let result = gen.parse_f_string("f\"SELECT {col} FROM {table}\"");
        assert!(result.contains("col"));
        assert!(result.contains("table"));
    }

    #[test]
    fn test_is_valid_var_name() {
        assert!(is_valid_var_name("user_id"));
        assert!(is_valid_var_name("var123"));
        assert!(!is_valid_var_name(""));
        assert!(!is_valid_var_name("123abc"));
        assert!(!is_valid_var_name("user-id"));
    }

    #[test]
    fn test_generate_smt_empty_path() {
        let gen = ConstraintGenerator::new();
        let result = gen.generate_smt(&[], "query");
        assert!(result.contains("(check-sat)"));
    }

    #[test]
    fn test_generate_smt_no_duplicates() {
        let gen = ConstraintGenerator::new();
        let nodes = vec![
            PathNode {
                line: 1,
                code: "x = input()".to_string(),
                description: "Input".to_string(),
            },
            PathNode {
                line: 2,
                code: "y = x".to_string(),
                description: "Assign".to_string(),
            },
        ];
        let result = gen.generate_smt(&nodes, "y");
        let count = result.matches("(declare-const x String)").count();
        assert_eq!(count, 1, "Should only declare x once");
    }

    #[test]
    fn test_generate_smt_literal_string() {
        let gen = ConstraintGenerator::new();
        let nodes = vec![PathNode {
            line: 1,
            code: "status = \"active\"".to_string(),
            description: "Literal".to_string(),
        }];
        let result = gen.generate_smt(&nodes, "status");
        assert!(result.contains("active"));
    }

    #[test]
    fn test_generate_smt_chained_assignment() {
        let gen = ConstraintGenerator::new();
        let nodes = vec![
            PathNode {
                line: 1,
                code: "a = input()".to_string(),
                description: "Input".to_string(),
            },
            PathNode {
                line: 2,
                code: "b = a".to_string(),
                description: "Chain".to_string(),
            },
        ];
        let result = gen.generate_smt(&nodes, "b");
        assert!(result.contains("(assert (= b a))"));
    }

    #[test]
    fn test_generate_smt_contains_goal() {
        let gen = ConstraintGenerator::new();
        let nodes = vec![PathNode {
            line: 1,
            code: "query = input()".to_string(),
            description: "Input".to_string(),
        }];
        let result = gen.generate_smt(&nodes, "query");
        assert!(result.contains("str.contains"));
        assert!(result.contains("' OR '1'='1"));
    }

    #[test]
    fn test_parse_fstring_no_variables() {
        let gen = ConstraintGenerator::new();
        let result = gen.parse_f_string("f\"SELECT * FROM users\"");
        assert!(result.contains("SELECT * FROM users"));
    }

    #[test]
    fn test_parse_fstring_trailing_literal() {
        let gen = ConstraintGenerator::new();
        let result = gen.parse_f_string("f\"Value: {x} end\"");
        assert!(result.contains("x"));
        assert!(result.contains("end"));
    }

    #[test]
    fn test_generate_smt_complex_path() {
        let gen = ConstraintGenerator::new();
        let nodes = vec![
            PathNode {
                line: 1,
                code: "user_id = request.args.get('id')".to_string(),
                description: "Input".to_string(),
            },
            PathNode {
                line: 2,
                code: "sanitized = user_id".to_string(),
                description: "Pass through".to_string(),
            },
            PathNode {
                line: 3,
                code: "query = f\"SELECT * WHERE id = {sanitized}\"".to_string(),
                description: "Query".to_string(),
            },
        ];
        let result = gen.generate_smt(&nodes, "query");
        assert!(result.contains("user_id"));
        assert!(result.contains("sanitized"));
        assert!(result.contains("query"));
    }
}
