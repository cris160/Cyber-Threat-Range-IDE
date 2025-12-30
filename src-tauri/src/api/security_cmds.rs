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

#[derive(Debug, Serialize, serde::Deserialize)]
pub struct JuiceShopChallenge {
    pub id: u32,
    pub key: String,
    pub name: String,
    pub description: String,
    pub difficulty: u32,
    pub category: String,
}

#[derive(Debug, serde::Deserialize)]
struct JuiceShopResponse {
    status: String,
    data: Vec<JuiceShopChallenge>,
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

#[tauri::command]
pub async fn fetch_juice_shop_challenges(url: String) -> Result<Vec<JuiceShopChallenge>, String> {
     let client = reqwest::Client::new();
     let res = client.get(&url)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;
        
     let body = res.text().await.map_err(|e| format!("Failed to get text: {}", e))?;
     
     // Juice Shop API returns { status: "success", data: [...] }
     let response: JuiceShopResponse = serde_json::from_str(&body)
        .map_err(|e| format!("Failed to parse JSON: {} | Body snippet: '{}'", e, &body.chars().take(200).collect::<String>()))?;
        
     Ok(response.data)
}


