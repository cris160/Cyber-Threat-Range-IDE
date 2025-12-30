use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;
use portable_pty::{CommandBuilder, NativePtySystem, PtySize, PtySystem, MasterPty};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShellOutput {
    pub output: String,
    pub exit_code: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalSession {
    pub id: String,
    pub shell: String,
    pub cwd: String,
}

// Store active PTY sessions with buffered output
struct PtySession {
    #[allow(dead_code)]
    child: Box<dyn portable_pty::Child + Send>,
    writer: Box<dyn Write + Send>,
    #[allow(dead_code)]
    master: Box<dyn MasterPty + Send>,
    // Output buffer filled by reader thread
    output_buffer: Arc<Mutex<Vec<u8>>>,
    #[allow(dead_code)]
    cwd: String,
    #[allow(dead_code)]
    shell: String,
}

lazy_static::lazy_static! {
    static ref SESSIONS: Arc<Mutex<HashMap<String, PtySession>>> = Arc::new(Mutex::new(HashMap::new()));
}

#[tauri::command]
pub async fn create_terminal_session(cwd: Option<String>, shell: Option<String>) -> Result<TerminalSession, String> {
    let session_id = Uuid::new_v4().to_string();
    
    let pty_system = NativePtySystem::default();
    
    // Create PTY with appropriate size
    let pair = pty_system
        .openpty(PtySize {
            rows: 30,
            cols: 120,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to create PTY: {}", e))?;
        
    // Determine shell based on parameter or OS default
    let (shell_path, shell_args): (&str, Vec<&str>) = if cfg!(target_os = "windows") {
        match shell.as_deref() {
            Some("cmd") => ("cmd.exe", vec![]),
            Some("git-bash") => {
                // Try common Git Bash locations
                if std::path::Path::new("C:\\Program Files\\Git\\bin\\bash.exe").exists() {
                    ("C:\\Program Files\\Git\\bin\\bash.exe", vec!["--login", "-i"])
                } else if std::path::Path::new("C:\\Program Files (x86)\\Git\\bin\\bash.exe").exists() {
                    ("C:\\Program Files (x86)\\Git\\bin\\bash.exe", vec!["--login", "-i"])
                } else {
                    // Fallback to PowerShell if Git Bash not found
                    ("powershell.exe", vec!["-NoLogo", "-NoProfile"])
                }
            }
            _ => ("powershell.exe", vec!["-NoLogo", "-NoProfile"]) // Default to PowerShell
        }
    } else if cfg!(target_os = "macos") {
        ("/bin/zsh", vec!["-l"])
    } else {
        ("/bin/bash", vec!["-l"])
    };
    
    let working_dir = cwd.clone().unwrap_or_else(|| {
        std::env::current_dir()
            .ok()
            .and_then(|p| p.to_str().map(String::from))
            .unwrap_or_else(|| {
                dirs::home_dir()
                    .and_then(|p| p.to_str().map(String::from))
                    .unwrap_or_else(|| String::from("C:\\"))
            })
    });
    
    // Create command
    let mut cmd = CommandBuilder::new(shell_path);
    for arg in &shell_args {
        cmd.arg(*arg);
    }
    
    // Set working directory if it exists
    let path = std::path::Path::new(&working_dir);
    if path.exists() {
        cmd.cwd(&working_dir);
    }
    
    // Set environment variables
    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");
    
    // Spawn child process
    let child = pair.slave.spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn shell: {}", e))?;
    
    // Get reader for background thread
    let mut reader = pair.master.try_clone_reader()
        .map_err(|e| format!("Failed to clone reader: {}", e))?;
    
    let writer = pair.master.take_writer()
        .map_err(|e| format!("Failed to take writer: {}", e))?;
    
    let master = pair.master;
    
    // Create shared output buffer
    let output_buffer = Arc::new(Mutex::new(Vec::new()));
    let buffer_clone = output_buffer.clone();
    
    // Spawn background reader thread
    thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break, // EOF
                Ok(n) => {
                    if let Ok(mut buffer) = buffer_clone.lock() {
                        buffer.extend_from_slice(&buf[..n]);
                    }
                }
                Err(_) => break,
            }
        }
    });
    
    let session = PtySession {
        child,
        writer,
        master,
        output_buffer,
        cwd: working_dir.clone(),
        shell: shell_path.to_string(),
    };
    
    let mut sessions = SESSIONS.lock().unwrap();
    sessions.insert(session_id.clone(), session);
    
    Ok(TerminalSession {
        id: session_id,
        shell: shell_path.to_string(),
        cwd: working_dir,
    })
}

#[tauri::command]
pub async fn write_to_terminal(session_id: String, data: String) -> Result<(), String> {
    let mut sessions = SESSIONS.lock().unwrap();
    
    let session = sessions.get_mut(&session_id)
        .ok_or_else(|| format!("Session {} not found", session_id))?;
    
    session.writer.write_all(data.as_bytes())
        .map_err(|e| format!("Failed to write to terminal: {}", e))?;
    
    session.writer.flush()
        .map_err(|e| format!("Failed to flush terminal: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn read_from_terminal(session_id: String, _timeout_ms: Option<u64>) -> Result<String, String> {
    let sessions = SESSIONS.lock().unwrap();
    
    let session = sessions.get(&session_id)
        .ok_or_else(|| format!("Session {} not found", session_id))?;
    
    // Drain the output buffer
    let data = {
        let mut buffer = session.output_buffer.lock().unwrap();
        let data = buffer.clone();
        buffer.clear();
        data
    };
    
    Ok(String::from_utf8_lossy(&data).to_string())
}

#[tauri::command]
pub async fn close_terminal_session(session_id: String) -> Result<(), String> {
    let mut sessions = SESSIONS.lock().unwrap();
    
    if let Some(mut session) = sessions.remove(&session_id) {
        // Try to kill the child process
        let _ = session.child.kill();
        let _ = session.child.wait();
    }
    
    Ok(())
}

#[tauri::command]
pub async fn resize_terminal(session_id: String, rows: u16, cols: u16) -> Result<(), String> {
    let sessions = SESSIONS.lock().unwrap();
    
    let session = sessions.get(&session_id)
        .ok_or_else(|| format!("Session {} not found", session_id))?;
    
    session.master.resize(PtySize {
        rows,
        cols,
        pixel_width: 0,
        pixel_height: 0,
    }).map_err(|e| format!("Failed to resize: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn list_terminal_sessions() -> Result<Vec<String>, String> {
    let sessions = SESSIONS.lock().unwrap();
    Ok(sessions.keys().cloned().collect())
}

#[tauri::command]
pub async fn execute_command(command: String, cwd: Option<String>) -> Result<ShellOutput, String> {
    use std::process::{Command, Stdio};
    
    let shell = if cfg!(target_os = "windows") {
        "cmd"
    } else {
        "sh"
    };
        
    let shell_arg = if cfg!(target_os = "windows") {
        "/C"
    } else {
        "-c"
    };
    
    let mut cmd = Command::new(shell);
    cmd.arg(shell_arg)
        .arg(&command)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    
    if let Some(dir) = cwd {
        let path = std::path::Path::new(&dir);
        if path.exists() {
            cmd.current_dir(&dir);
        }
    }
    
    let output = cmd.output()
        .map_err(|e| format!("Failed to execute command: {}", e))?;
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let combined_output = if stderr.is_empty() {
        stdout.to_string()
    } else if stdout.is_empty() {
        stderr.to_string()
    } else {
        format!("{}\n{}", stdout, stderr)
    };
    
    Ok(ShellOutput {
        output: combined_output,
        exit_code: output.status.code(),
    })
}

#[tauri::command]
pub async fn get_shell_info() -> Result<String, String> {
    if cfg!(target_os = "windows") {
        Ok("PowerShell".to_string())
    } else if cfg!(target_os = "macos") {
        Ok("zsh".to_string())
    } else {
        Ok("bash".to_string())
    }
}

#[tauri::command]
pub async fn get_current_directory() -> Result<String, String> {
    std::env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| format!("Failed to get current directory: {}", e))
}

#[tauri::command]
pub async fn change_directory(path: String) -> Result<(), String> {
    std::env::set_current_dir(&path)
        .map_err(|e| format!("Failed to change directory: {}", e))
}
