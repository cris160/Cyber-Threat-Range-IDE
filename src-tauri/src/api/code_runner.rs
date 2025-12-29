use serde::{Deserialize, Serialize};
use std::process::Command;
use std::path::Path;
use std::fs;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeRunResult {
    pub output: String,
    pub error: Option<String>,
    pub exit_code: Option<i32>,
    pub execution_time_ms: u128,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanguageConfig {
    pub name: String,
    pub extensions: Vec<String>,
    pub compile_cmd: Option<String>,
    pub run_cmd: String,
    pub repl_cmd: Option<String>,
}

/// Get language configuration based on file extension
fn get_language_config(extension: &str) -> Option<LanguageConfig> {
    match extension.to_lowercase().as_str() {
        "py" => Some(LanguageConfig {
            name: "Python".to_string(),
            extensions: vec!["py".to_string()],
            compile_cmd: None,
            run_cmd: "python".to_string(),
            repl_cmd: Some("python -i".to_string()),
        }),
        "js" | "mjs" => Some(LanguageConfig {
            name: "JavaScript".to_string(),
            extensions: vec!["js".to_string(), "mjs".to_string()],
            compile_cmd: None,
            run_cmd: "node".to_string(),
            repl_cmd: Some("node".to_string()),
        }),
        "ts" | "tsx" => Some(LanguageConfig {
            name: "TypeScript".to_string(),
            extensions: vec!["ts".to_string(), "tsx".to_string()],
            compile_cmd: None,
            run_cmd: "ts-node".to_string(),
            repl_cmd: Some("ts-node".to_string()),
        }),
        "jsx" => Some(LanguageConfig {
            name: "JavaScript".to_string(),
            extensions: vec!["jsx".to_string()],
            compile_cmd: None,
            run_cmd: "node".to_string(),
            repl_cmd: Some("node".to_string()),
        }),
        "rs" => Some(LanguageConfig {
            name: "Rust".to_string(),
            extensions: vec!["rs".to_string()],
            compile_cmd: Some("rustc".to_string()),
            run_cmd: "".to_string(), // Binary will be run directly
            repl_cmd: None,
        }),
        "c" | "h" => Some(LanguageConfig {
            name: "C".to_string(),
            extensions: vec!["c".to_string(), "h".to_string()],
            compile_cmd: Some("gcc".to_string()),
            run_cmd: "".to_string(), // Binary will be run directly
            repl_cmd: None,
        }),
        "cpp" | "cc" | "cxx" | "hpp" | "hh" => Some(LanguageConfig {
            name: "C++".to_string(),
            extensions: vec!["cpp".to_string(), "cc".to_string(), "cxx".to_string(), "hpp".to_string(), "hh".to_string()],
            compile_cmd: Some("g++".to_string()),
            run_cmd: "".to_string(), // Binary will be run directly
            repl_cmd: None,
        }),
        "java" => Some(LanguageConfig {
            name: "Java".to_string(),
            extensions: vec!["java".to_string()],
            compile_cmd: Some("javac".to_string()),
            run_cmd: "java".to_string(),
            repl_cmd: Some("jshell".to_string()),
        }),
        "go" => Some(LanguageConfig {
            name: "Go".to_string(),
            extensions: vec!["go".to_string()],
            compile_cmd: Some("go build".to_string()),
            run_cmd: "".to_string(), // Binary will be run directly
            repl_cmd: None,
        }),
        "rb" => Some(LanguageConfig {
            name: "Ruby".to_string(),
            extensions: vec!["rb".to_string()],
            compile_cmd: None,
            run_cmd: "ruby".to_string(),
            repl_cmd: Some("irb".to_string()),
        }),
        "php" => Some(LanguageConfig {
            name: "PHP".to_string(),
            extensions: vec!["php".to_string()],
            compile_cmd: None,
            run_cmd: "php".to_string(),
            repl_cmd: Some("php -a".to_string()),
        }),
        "sh" | "bash" => Some(LanguageConfig {
            name: "Shell".to_string(),
            extensions: vec!["sh".to_string(), "bash".to_string()],
            compile_cmd: None,
            run_cmd: "bash".to_string(),
            repl_cmd: Some("bash".to_string()),
        }),
        _ => None,
    }
}

/// Helper function to run Go code using go run
fn run_with_go_run(file_path: &str, start_time: std::time::Instant) -> Result<CodeRunResult, String> {
    let run_result = Command::new("go")
        .args(&["run", file_path])
        .output();

    match run_result {
        Ok(result) => {
            let output = String::from_utf8_lossy(&result.stdout).to_string();
            let error_output = if !result.status.success() {
                String::from_utf8_lossy(&result.stderr).to_string()
            } else {
                String::new()
            };

            Ok(CodeRunResult {
                output,
                error: if error_output.is_empty() { None } else { Some(error_output) },
                exit_code: result.status.code(),
                execution_time_ms: start_time.elapsed().as_millis() as u128,
            })
        }
        Err(e) => Err(format!("Execution failed: {}", e)),
    }
}

/// Run a code file
#[tauri::command]
pub async fn run_code_file(file_path: String) -> Result<CodeRunResult, String> {
    use std::time::Instant;

    let start_time = Instant::now();

    // Check if file exists
    if !Path::new(&file_path).exists() {
        return Err("File does not exist".to_string());
    }

    // Get file extension
    let extension = Path::new(&file_path)
        .extension()
        .and_then(|e| e.to_str())
        .ok_or("File has no extension")?;

    let config = get_language_config(extension)
        .ok_or(format!("Unsupported language: .{}", extension))?;

    let mut output = String::new();
    let mut error_output = String::new();
    let mut exit_code = None;

    // Handle compilation if needed
    if let Some(_compile_cmd) = &config.compile_cmd {
        let compile_result = if config.name == "Java" {
            // Special handling for Java - compile to class file
            Command::new("javac")
                .arg(&file_path)
                .output()
        } else if config.name == "Go" {
            // For Go, we'll use go run instead of separate compile/run
            return run_with_go_run(&file_path, start_time);
        } else if config.name == "Rust" {
            // Compile Rust file
            let output_path = format!("{}.exe", file_path.trim_end_matches(".rs"));
            Command::new("rustc")
                .args(&["-o", &output_path, &file_path])
                .output()
        } else if config.name == "C" {
            // Compile C file
            let output_path = format!("{}.exe", file_path.trim_end_matches(".c"));
            Command::new("gcc")
                .args(&["-o", &output_path, &file_path])
                .output()
        } else if config.name == "C++" {
            // Compile C++ file
            let output_path = format!("{}.exe", file_path.trim_end_matches(&format!(".{}", extension)));
            Command::new("g++")
                .args(&["-o", &output_path, &file_path])
                .output()
        } else {
            // Generic compilation
            Command::new("rustc") // fallback
                .args(&["-o", &format!("{}.exe", file_path), &file_path])
                .output()
        };

        match compile_result {
            Ok(result) => {
                if !result.status.success() {
                    error_output = String::from_utf8_lossy(&result.stderr).to_string();
                    if error_output.is_empty() {
                        error_output = String::from_utf8_lossy(&result.stdout).to_string();
                    }
                    return Ok(CodeRunResult {
                        output: String::new(),
                        error: Some(error_output),
                        exit_code: result.status.code(),
                        execution_time_ms: start_time.elapsed().as_millis() as u128,
                    });
                }
            }
            Err(e) => return Err(format!("Compilation failed: {}", e)),
        }
    }

    // Run the code
    let run_result = if config.run_cmd.is_empty() {
        // Run compiled binary directly
        let binary_path = if config.name == "Rust" {
            format!("{}.exe", file_path.trim_end_matches(".rs"))
        } else if config.name == "C" {
            format!("{}.exe", file_path.trim_end_matches(".c"))
        } else if config.name == "C++" {
            let ext_to_trim = match extension {
                "cpp" => ".cpp",
                "cc" => ".cc",
                "cxx" => ".cxx",
                _ => ".cpp",
            };
            format!("{}.exe", file_path.trim_end_matches(ext_to_trim))
        } else {
            format!("{}.exe", file_path)
        };

        Command::new(&binary_path)
            .output()
    } else {
        // Run with interpreter/compiler
        let mut cmd = if config.name == "TypeScript" {
            // Check if ts-node is available, otherwise use tsc + node
            let ts_node_check = Command::new(if cfg!(target_os = "windows") { "where" } else { "which" })
                .arg("ts-node")
                .output();
            
            if ts_node_check.map_or(false, |r| r.status.success()) {
                Command::new("ts-node")
            } else {
                // Use tsc to compile to JS, then run with node
                let js_file = format!("{}.js", file_path.trim_end_matches(&format!(".{}", extension)));
                let tsc_result = Command::new("tsc")
                    .args(&[&file_path, "--outFile", &js_file, "--target", "ES2020", "--module", "commonjs"])
                    .output();
                
                match tsc_result {
                    Ok(result) if result.status.success() => {
                        Command::new("node")
                    }
                    _ => {
                        return Ok(CodeRunResult {
                            output: String::new(),
                            error: Some("TypeScript compilation failed. Install ts-node or tsc.".to_string()),
                            exit_code: Some(1),
                            execution_time_ms: start_time.elapsed().as_millis() as u128,
                        });
                    }
                }
            }
        } else {
            Command::new(&config.run_cmd)
        };
        
        if config.name == "Java" {
            let class_name = Path::new(&file_path)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("Main");
            cmd.arg(class_name);
        } else if config.name == "TypeScript" {
            // For TypeScript with tsc+node, run the compiled JS file
            let ts_node_check = Command::new(if cfg!(target_os = "windows") { "where" } else { "which" })
                .arg("ts-node")
                .output();
            
            if !ts_node_check.map_or(false, |r| r.status.success()) {
                let js_file = format!("{}.js", file_path.trim_end_matches(&format!(".{}", extension)));
                cmd.arg(js_file);
            } else {
                cmd.arg(&file_path);
            }
        } else {
            cmd.arg(&file_path);
        }
        cmd.output()
    };

    match run_result {
        Ok(result) => {
            output = String::from_utf8_lossy(&result.stdout).to_string();
            if !result.status.success() {
                error_output = String::from_utf8_lossy(&result.stderr).to_string();
            }
            exit_code = result.status.code();

            Ok(CodeRunResult {
                output,
                error: if error_output.is_empty() { None } else { Some(error_output) },
                exit_code,
                execution_time_ms: start_time.elapsed().as_millis() as u128,
            })
        }
        Err(e) => Err(format!("Execution failed: {}", e)),
    }
}

/// Run a code snippet
#[tauri::command]
pub async fn run_code_snippet(language: String, code: String) -> Result<CodeRunResult, String> {
    use std::time::Instant;

    let start_time = Instant::now();

    // Create a temporary file
    let temp_dir = std::env::temp_dir();
    let file_extension = match language.to_lowercase().as_str() {
        "python" => "py",
        "javascript" => "js",
        "typescript" => "ts",
        "rust" => "rs",
        "c" => "c",
        "cpp" => "cpp",
        "java" => "java",
        "go" => "go",
        "ruby" => "rb",
        "php" => "php",
        "shell" => "sh",
        _ => return Err(format!("Unsupported language: {}", language)),
    };

    let temp_file = temp_dir.join(format!("temp_code_{}.{}", std::process::id(), file_extension));
    fs::write(&temp_file, &code).map_err(|e| format!("Failed to write temp file: {}", e))?;

    // Run the temp file
    let result = run_code_file(temp_file.to_string_lossy().to_string()).await;

    // Clean up temp file
    let _ = fs::remove_file(&temp_file);

    // Adjust execution time (subtract file I/O time)
    match result {
        Ok(mut res) => {
            res.execution_time_ms = start_time.elapsed().as_millis() as u128;
            Ok(res)
        }
        Err(e) => Err(e),
    }
}

/// Get list of supported languages
#[tauri::command]
pub fn get_supported_languages() -> Vec<String> {
    vec![
        "python".to_string(),
        "javascript".to_string(),
        "typescript".to_string(),
        "rust".to_string(),
        "c".to_string(),
        "cpp".to_string(),
        "java".to_string(),
        "go".to_string(),
        "ruby".to_string(),
        "php".to_string(),
        "shell".to_string(),
    ]
}

/// Check if a language is available on the system
#[tauri::command]
pub fn check_language_available(language: String) -> Result<bool, String> {
    let check_cmd = if cfg!(target_os = "windows") { "where" } else { "which" };

    match language.to_lowercase().as_str() {
        "python" => {
            let result = Command::new(check_cmd).arg("python").output();
            Ok(result.map_or(false, |r| r.status.success()))
        }
        "javascript" => {
            let result = Command::new(check_cmd).arg("node").output();
            Ok(result.map_or(false, |r| r.status.success()))
        }
        "typescript" => {
            // Check for ts-node first, then tsc
            let ts_node_result = Command::new(check_cmd).arg("ts-node").output();
            if ts_node_result.map_or(false, |r| r.status.success()) {
                Ok(true)
            } else {
                // Check for tsc (TypeScript compiler) as alternative
                let tsc_result = Command::new(check_cmd).arg("tsc").output();
                Ok(tsc_result.map_or(false, |r| r.status.success()))
            }
        }
        "rust" => {
            let result = Command::new(check_cmd).arg("rustc").output();
            Ok(result.map_or(false, |r| r.status.success()))
        }
        "c" => {
            let result = Command::new(check_cmd).arg("gcc").output();
            Ok(result.map_or(false, |r| r.status.success()))
        }
        "cpp" => {
            let result = Command::new(check_cmd).arg("g++").output();
            Ok(result.map_or(false, |r| r.status.success()))
        }
        "java" => {
            // Need both javac (compiler) and java (runtime)
            let javac_result = Command::new(check_cmd).arg("javac").output();
            let java_result = Command::new(check_cmd).arg("java").output();
            Ok(javac_result.map_or(false, |r| r.status.success()) &&
               java_result.map_or(false, |r| r.status.success()))
        }
        "go" => {
            let result = Command::new(check_cmd).arg("go").output();
            Ok(result.map_or(false, |r| r.status.success()))
        }
        "ruby" => {
            let result = Command::new(check_cmd).arg("ruby").output();
            Ok(result.map_or(false, |r| r.status.success()))
        }
        "php" => {
            let result = Command::new(check_cmd).arg("php").output();
            Ok(result.map_or(false, |r| r.status.success()))
        }
        "shell" => {
            // Check for bash on Windows, sh on Unix
            let shell_cmd = if cfg!(target_os = "windows") { "bash" } else { "sh" };
            let result = Command::new(check_cmd).arg(shell_cmd).output();
            Ok(result.map_or(false, |r| r.status.success()))
        }
        _ => Ok(false),
    }
}
