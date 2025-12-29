use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessOutput {
    pub output: String,
    pub is_complete: bool,
    pub exit_code: Option<i32>,
}

// Global store for running processes
lazy_static::lazy_static! {
    static ref PROCESSES: Arc<Mutex<HashMap<String, Arc<Mutex<Child>>>>> = 
        Arc::new(Mutex::new(HashMap::new()));
}

/// Get the command to run a file based on its extension
fn get_run_command(file_path: &str) -> Result<(String, Vec<String>), String> {
    let extension = std::path::Path::new(file_path)
        .extension()
        .and_then(|e| e.to_str())
        .ok_or("File has no extension")?;

    match extension.to_lowercase().as_str() {
        "py" => Ok(("python".to_string(), vec![file_path.to_string()])),
        "js" | "mjs" | "jsx" => Ok(("node".to_string(), vec![file_path.to_string()])),
        "ts" | "tsx" => {
            // Check if ts-node is available, otherwise fall back to error
            let ts_node_check = std::process::Command::new(if cfg!(target_os = "windows") { "where" } else { "which" })
                .arg("ts-node")
                .output();
            
            if ts_node_check.map_or(false, |r| r.status.success()) {
                Ok(("ts-node".to_string(), vec![file_path.to_string()]))
            } else {
                Err("TypeScript support requires ts-node. Install with: npm install -g ts-node".to_string())
            }
        }
        "rs" => {
            // For Rust, we need to compile first, but for interactive mode, this is tricky
            // For now, return an error suggesting to use the regular code runner
            Err("Rust files should be run using the regular code runner (not interactive mode)".to_string())
        }
        "c" => {
            // For C, we need to compile first
            Err("C files should be run using the regular code runner (not interactive mode)".to_string())
        }
        "cpp" | "cc" | "cxx" => {
            // For C++, we need to compile first
            Err("C++ files should be run using the regular code runner (not interactive mode)".to_string())
        }
        "java" => {
            // For Java, we need to compile first
            Err("Java files should be run using the regular code runner (not interactive mode)".to_string())
        }
        "go" => Ok(("go".to_string(), vec!["run".to_string(), file_path.to_string()])),
        "rb" => Ok(("ruby".to_string(), vec![file_path.to_string()])),
        "php" => Ok(("php".to_string(), vec![file_path.to_string()])),
        "sh" | "bash" => Ok(("bash".to_string(), vec![file_path.to_string()])),
        _ => Err(format!("Unsupported file type: .{}", extension)),
    }
}

/// Start an interactive process
#[tauri::command]
pub async fn start_interactive_process(
    app_handle: AppHandle,
    file_path: String,
) -> Result<String, String> {
    let (command, args) = get_run_command(&file_path)?;

    // Check if command exists
    let check_cmd = if cfg!(target_os = "windows") { "where" } else { "which" };
    let check_result = Command::new(check_cmd)
        .arg(&command)
        .output();

    if check_result.is_err() || !check_result.unwrap().status.success() {
        return Err(format!(
            "{} is not installed or not in PATH. Please install it first.",
            command
        ));
    }

    // Start the process with piped stdin, stdout, and stderr
    let mut child = Command::new(&command)
        .args(&args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start process: {}", e))?;

    // Generate unique process ID
    let process_id = format!("proc_{}", child.id());

    // Get handles for stdout and stderr
    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

    // Store the child process
    let child_arc = Arc::new(Mutex::new(child));
    PROCESSES.lock().unwrap().insert(process_id.clone(), child_arc.clone());

    // Spawn thread to read stdout
    let app_handle_stdout = app_handle.clone();
    let process_id_stdout = process_id.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(line) = line {
                let _ = app_handle_stdout.emit(
                    "process-output",
                    ProcessOutput {
                        output: format!("{}\n", line),
                        is_complete: false,
                        exit_code: None,
                    },
                );
            }
        }
    });

    // Spawn thread to read stderr
    let app_handle_stderr = app_handle.clone();
    let process_id_stderr = process_id.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(line) = line {
                let _ = app_handle_stderr.emit(
                    "process-output",
                    ProcessOutput {
                        output: format!("{}\n", line),
                        is_complete: false,
                        exit_code: None,
                    },
                );
            }
        }
    });

    // Spawn thread to wait for process completion
    let app_handle_wait = app_handle.clone();
    let process_id_wait = process_id.clone();
    thread::spawn(move || {
        // Wait for the process to complete
        if let Some(child_arc) = PROCESSES.lock().unwrap().get(&process_id_wait) {
            if let Ok(mut child) = child_arc.lock() {
                if let Ok(status) = child.wait() {
                    let _ = app_handle_wait.emit(
                        "process-output",
                        ProcessOutput {
                            output: String::new(),
                            is_complete: true,
                            exit_code: status.code(),
                        },
                    );

                    // Clean up
                    PROCESSES.lock().unwrap().remove(&process_id_wait);
                }
            }
        }
    });

    Ok(process_id)
}

/// Send input to a running process
#[tauri::command]
pub async fn send_process_input(
    process_id: String,
    input: String,
) -> Result<(), String> {
    let processes = PROCESSES.lock().unwrap();
    let child_arc = processes
        .get(&process_id)
        .ok_or("Process not found")?;

    let mut child = child_arc.lock().unwrap();
    
    if let Some(stdin) = child.stdin.as_mut() {
        stdin
            .write_all(input.as_bytes())
            .map_err(|e| format!("Failed to write to stdin: {}", e))?;
        
        stdin
            .flush()
            .map_err(|e| format!("Failed to flush stdin: {}", e))?;
        
        Ok(())
    } else {
        Err("Process stdin not available".to_string())
    }
}

/// Stop a running interactive process
#[tauri::command]
pub async fn stop_interactive_process(
    process_id: String,
) -> Result<(), String> {
    let mut processes = PROCESSES.lock().unwrap();
    
    if let Some(child_arc) = processes.remove(&process_id) {
        if let Ok(mut child) = child_arc.lock() {
            child
                .kill()
                .map_err(|e| format!("Failed to kill process: {}", e))?;
        }
        Ok(())
    } else {
        Err("Process not found".to_string())
    }
}

/// List all running interactive processes
#[tauri::command]
pub async fn list_interactive_processes() -> Result<Vec<String>, String> {
    let processes = PROCESSES.lock().unwrap();
    Ok(processes.keys().cloned().collect())
}
