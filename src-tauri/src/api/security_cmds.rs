use serde::Serialize;
use std::path::PathBuf;

use crate::services::security::{self, SecurityIssue};

#[derive(Debug, Serialize)]
pub struct SecurityScanResult {
    pub issues: Vec<SecurityIssue>,
}

#[tauri::command]
pub async fn scan_file_for_issues(path: String) -> Result<SecurityScanResult, String> {
    let pb = PathBuf::from(&path);
    if !pb.exists() {
        return Err("File does not exist".into());
    }

    let issues = security::scan_file(&pb);
    Ok(SecurityScanResult { issues })
}

#[tauri::command]
pub async fn run_security_scan(workspace_root: String) -> Result<SecurityScanResult, String> {
    let pb = PathBuf::from(&workspace_root);
    if !pb.exists() {
        return Err("Workspace path does not exist".into());
    }

    let issues = security::scan_workspace(&pb);
    Ok(SecurityScanResult { issues })
}


