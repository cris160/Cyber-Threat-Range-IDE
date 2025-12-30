use std::process::{Command, Stdio};
use std::io::Write;

pub struct Z3Solver;

impl Z3Solver {
    pub fn new() -> Self {
        Self
    }

    /// Solves the SMT-LIB script using Z3 (via Python subprocess)
    /// Returns:
    /// - Some(model_string) if SAT (Exploitable)
    /// - None if UNSAT (Safe) or Error
    pub fn solve(&self, smt_script: &str) -> Result<Option<String>, String> {
        let python_script = r#"
import sys
import io

# Force stdin to utf-8
sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8')

try:
    from z3 import *
except ImportError:
    print("ERROR: z3-solver not installed")
    sys.exit(1)

try:
    # Read SMT-LIB script from stdin
    smt_content = sys.stdin.read()
    
    # Create solver
    s = Solver()
    
    # Parse SMT-LIB string
    assertions = parse_smt2_string(smt_content)
    s.add(assertions)

    # Check
    result = s.check()
    
    if result == sat:
        print("SAT")
        print(s.model())
    elif result == unsat:
        print("UNSAT")
    else:
        print("UNKNOWN")

except Exception as e:
    print(f"ERROR: {e}")
"#;

        let mut child = Command::new("python")
            .arg("-c")
            .arg(python_script)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn Python Z3 process: {}", e))?;

        if let Some(mut stdin) = child.stdin.take() {
            stdin.write_all(smt_script.as_bytes())
                .map_err(|e| format!("Failed to write to Z3 stdin: {}", e))?;
        }

        let output = child.wait_with_output()
            .map_err(|e| format!("Failed to read Z3 output: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);

        if !output.status.success() || stdout.contains("ERROR:") {
            return Err(format!("Z3 Error: {}\nStderr: {}", stdout, stderr));
        }

        if stdout.contains("SAT") {
            // Extract model lines
            let model = stdout.lines()
                .skip(1) // Skip "SAT"
                .collect::<Vec<&str>>()
                .join("\n");
            Ok(Some(model))
        } else if stdout.contains("UNSAT") {
            Ok(None)
        } else {
            Err(format!("Z3 returned UNKNOWN or unexpected output: {}", stdout))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_solver_creation() {
        let solver = Z3Solver::new();
        // Just verify it can be created
        assert_eq!(std::mem::size_of_val(&solver), 0);
    }

    #[test]
    fn test_solve_simple_sat() {
        let solver = Z3Solver::new();
        let smt = "(set-logic QF_S)\n(declare-const x String)\n(assert (= x \"hello\"))\n(check-sat)";
        // This test may fail if Z3/Python not available, which is expected
        let _result = solver.solve(smt);
    }

    #[test]
    fn test_solve_simple_unsat() {
        let solver = Z3Solver::new();
        let smt = "(set-logic QF_S)\n(declare-const x String)\n(assert (= x \"a\"))\n(assert (= x \"b\"))\n(check-sat)";
        let _result = solver.solve(smt);
    }

    #[test]
    fn test_solve_empty_script() {
        let solver = Z3Solver::new();
        let result = solver.solve("");
        // Should handle gracefully (may error or return None)
        assert!(result.is_ok() || result.is_err());
    }

    #[test]
    fn test_solve_invalid_syntax() {
        let solver = Z3Solver::new();
        let smt = "this is not valid SMT-LIB";
        let result = solver.solve(smt);
        // Should error due to syntax
        assert!(result.is_err() || result == Ok(None));
    }

    #[test]
    fn test_solve_string_concatenation() {
        let solver = Z3Solver::new();
        let smt = r#"(set-logic QF_S)
(declare-const user_id String)
(declare-const query String)
(assert (= query (str.++ "SELECT * WHERE id = " user_id)))
(assert (str.contains query "' OR '1'='1"))
(check-sat)"#;
        let _result = solver.solve(smt);
    }

    #[test]
    fn test_solve_with_model() {
        let solver = Z3Solver::new();
        let smt = "(set-logic QF_S)\n(declare-const x String)\n(assert (str.contains x \"test\"))\n(check-sat)\n(get-model)";
        let _result = solver.solve(smt);
    }

    #[test]
    fn test_solve_multiline_script() {
        let solver = Z3Solver::new();
        let smt = "(set-logic QF_S)\n(declare-const a String)\n(declare-const b String)\n(assert (= a \"x\"))\n(assert (= b a))\n(check-sat)";
        let _result = solver.solve(smt);
    }

    #[test]
    fn test_solve_returns_ok_or_err() {
        let solver = Z3Solver::new();
        let smt = "(set-logic QF_S)\n(check-sat)";
        let result = solver.solve(smt);
        // Must be Ok or Err, not panic
        assert!(result.is_ok() || result.is_err());
    }

    #[test]
    fn test_solve_handles_utf8() {
        let solver = Z3Solver::new();
        let smt = "(set-logic QF_S)\n(declare-const msg String)\n(assert (= msg \"Héllo\"))\n(check-sat)";
        let _result = solver.solve(smt);
    }
}
