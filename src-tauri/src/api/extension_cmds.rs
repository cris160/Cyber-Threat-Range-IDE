use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::io::{Write, Read};

// Open VSX API response types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenVSXSearchResponse {
    pub offset: i32,
    pub totalSize: i32,
    pub extensions: Vec<OpenVSXExtension>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenVSXExtension {
    pub url: Option<String>,
    pub namespace: String,
    pub name: String,
    pub version: Option<String>,
    pub timestamp: Option<String>,
    pub displayName: Option<String>,
    pub description: Option<String>,
    pub downloadCount: Option<i64>,
    pub averageRating: Option<f64>,
    pub reviewCount: Option<i64>,
    #[serde(default)]
    pub categories: Vec<String>,
    pub files: Option<OpenVSXFiles>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenVSXFiles {
    pub download: Option<String>,
    pub icon: Option<String>,
}

// Simplified extension for frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketplaceExtension {
    pub id: String,
    pub name: String,
    pub display_name: String,
    pub description: String,
    pub author: String,
    pub version: String,
    pub categories: Vec<String>,
    pub downloads: i64,
    pub rating: f64,
    pub icon: Option<String>,
    pub download_url: Option<String>,
}

// Local extension info (from manifest.json)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionManifest {
    pub name: String,
    #[serde(rename = "displayName")]
    pub display_name: Option<String>,
    pub version: String,
    pub description: Option<String>,
    pub author: Option<String>,
    pub publisher: Option<String>,
    pub icon: Option<String>,
    pub categories: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledExtension {
    pub id: String,
    pub name: String,
    pub display_name: String,
    pub version: String,
    pub description: String,
    pub author: String,
    pub enabled: bool,
    pub path: String,
    pub categories: Vec<String>,
    pub icon: Option<String>,
}

// Get extensions directory
fn get_extensions_dir() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let ext_dir = home.join(".ctr").join("extensions");
    
    if !ext_dir.exists() {
        fs::create_dir_all(&ext_dir)
            .map_err(|e| format!("Failed to create extensions directory: {}", e))?;
    }
    
    Ok(ext_dir)
}

// Get extension state file path
fn get_state_file() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let state_dir = home.join(".ctr");
    
    if !state_dir.exists() {
        fs::create_dir_all(&state_dir)
            .map_err(|e| format!("Failed to create .ctr directory: {}", e))?;
    }
    
    Ok(state_dir.join("extension_state.json"))
}

fn load_disabled_extensions() -> Vec<String> {
    match get_state_file() {
        Ok(path) => {
            if path.exists() {
                fs::read_to_string(&path)
                    .ok()
                    .and_then(|s| serde_json::from_str(&s).ok())
                    .unwrap_or_default()
            } else {
                Vec::new()
            }
        }
        Err(_) => Vec::new()
    }
}

fn save_disabled_extensions(disabled: &[String]) -> Result<(), String> {
    let path = get_state_file()?;
    let json = serde_json::to_string_pretty(disabled)
        .map_err(|e| format!("Failed to serialize state: {}", e))?;
    fs::write(&path, json)
        .map_err(|e| format!("Failed to write state file: {}", e))?;
    Ok(())
}

/// Search Open VSX marketplace
#[tauri::command]
pub async fn fetch_marketplace() -> Result<Vec<MarketplaceExtension>, String> {
    search_marketplace("".to_string()).await
}

/// Search Open VSX with query
#[tauri::command]
pub async fn search_marketplace(query: String) -> Result<Vec<MarketplaceExtension>, String> {
    let search_url = if query.is_empty() {
        "https://open-vsx.org/api/-/search?size=50&sortBy=downloadCount&sortOrder=desc".to_string()
    } else {
        format!(
            "https://open-vsx.org/api/-/search?query={}&size=50&sortBy=relevance",
            urlencoding::encode(&query)
        )
    };
    
    let response = reqwest::get(&search_url)
        .await
        .map_err(|e| format!("Failed to fetch from Open VSX: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("Open VSX returned status: {}", response.status()));
    }
    
    let search_result: OpenVSXSearchResponse = response.json()
        .await
        .map_err(|e| format!("Failed to parse Open VSX response: {}", e))?;
    
    let extensions: Vec<MarketplaceExtension> = search_result.extensions
        .into_iter()
        .map(|ext| MarketplaceExtension {
            id: format!("{}.{}", ext.namespace, ext.name),
            name: ext.name.clone(),
            display_name: ext.displayName.unwrap_or(ext.name),
            description: ext.description.unwrap_or_default(),
            author: ext.namespace,
            version: ext.version.unwrap_or_else(|| "1.0.0".to_string()),
            categories: ext.categories,
            downloads: ext.downloadCount.unwrap_or(0),
            rating: ext.averageRating.unwrap_or(0.0),
            icon: ext.files.and_then(|f| f.icon),
            download_url: None, // Will be fetched when installing
        })
        .collect();
    
    Ok(extensions)
}

/// Get extension details from Open VSX
#[tauri::command]
pub async fn get_extension_details(namespace: String, name: String) -> Result<MarketplaceExtension, String> {
    let url = format!("https://open-vsx.org/api/{}/{}", namespace, name);
    
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Failed to fetch extension details: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("Extension not found: {}.{}", namespace, name));
    }
    
    let ext: OpenVSXExtension = response.json()
        .await
        .map_err(|e| format!("Failed to parse extension: {}", e))?;
    
    Ok(MarketplaceExtension {
        id: format!("{}.{}", ext.namespace, ext.name),
        name: ext.name.clone(),
        display_name: ext.displayName.unwrap_or(ext.name),
        description: ext.description.unwrap_or_default(),
        author: ext.namespace,
        version: ext.version.unwrap_or_else(|| "1.0.0".to_string()),
        categories: ext.categories,
        downloads: ext.downloadCount.unwrap_or(0),
        rating: ext.averageRating.unwrap_or(0.0),
        icon: ext.files.as_ref().and_then(|f| f.icon.clone()),
        download_url: ext.files.and_then(|f| f.download),
    })
}

/// Install extension from Open VSX
#[tauri::command]
pub async fn install_from_marketplace(id: String) -> Result<InstalledExtension, String> {
    // Parse namespace.name
    let parts: Vec<&str> = id.split('.').collect();
    if parts.len() < 2 {
        return Err("Invalid extension ID format. Expected: namespace.name".to_string());
    }
    let namespace = parts[0];
    let name = parts[1..].join(".");
    
    // Get extension details to get download URL
    let url = format!("https://open-vsx.org/api/{}/{}", namespace, name);
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Failed to fetch extension: {}", e))?;
    
    let ext: OpenVSXExtension = response.json()
        .await
        .map_err(|e| format!("Failed to parse extension: {}", e))?;
    
    let download_url = ext.files
        .and_then(|f| f.download)
        .ok_or("Extension has no download URL")?;
    
    let ext_dir = get_extensions_dir()?;
    let target_dir = ext_dir.join(&id);
    
    // Download the .vsix file
    let response = reqwest::get(&download_url)
        .await
        .map_err(|e| format!("Failed to download extension: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("Download failed with status: {}", response.status()));
    }
    
    let bytes = response.bytes()
        .await
        .map_err(|e| format!("Failed to read download: {}", e))?;
    
    // .vsix is just a zip file
    let temp_zip = ext_dir.join(format!("{}.vsix", id));
    let mut file = fs::File::create(&temp_zip)
        .map_err(|e| format!("Failed to create temp file: {}", e))?;
    file.write_all(&bytes)
        .map_err(|e| format!("Failed to write temp file: {}", e))?;
    drop(file);
    
    // Extract vsix (zip)
    let file = fs::File::open(&temp_zip)
        .map_err(|e| format!("Failed to open vsix: {}", e))?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| format!("Failed to read vsix archive: {}", e))?;
    
    // Create target directory
    if target_dir.exists() {
        fs::remove_dir_all(&target_dir)
            .map_err(|e| format!("Failed to remove existing extension: {}", e))?;
    }
    fs::create_dir_all(&target_dir)
        .map_err(|e| format!("Failed to create extension directory: {}", e))?;
    
    // Extract files
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .map_err(|e| format!("Failed to read archive entry: {}", e))?;
        
        let outpath = match file.enclosed_name() {
            Some(path) => target_dir.join(path),
            None => continue,
        };
        
        if file.name().ends_with('/') {
            fs::create_dir_all(&outpath).ok();
        } else {
            if let Some(parent) = outpath.parent() {
                fs::create_dir_all(parent).ok();
            }
            let mut outfile = fs::File::create(&outpath)
                .map_err(|e| format!("Failed to create file: {}", e))?;
            std::io::copy(&mut file, &mut outfile)
                .map_err(|e| format!("Failed to extract file: {}", e))?;
        }
    }
    
    // Clean up temp file
    fs::remove_file(&temp_zip).ok();
    
    // Try to find and parse package.json (VS Code extension manifest)
    let manifest_path = target_dir.join("extension").join("package.json");
    let alt_manifest_path = target_dir.join("package.json");
    
    let (display_name, version, description, author, categories) = 
        if manifest_path.exists() {
            parse_vscode_manifest(&manifest_path)?
        } else if alt_manifest_path.exists() {
            parse_vscode_manifest(&alt_manifest_path)?
        } else {
            (name.clone(), ext.version.unwrap_or_else(|| "1.0.0".to_string()), 
             ext.description.unwrap_or_default(), namespace.to_string(), vec![])
        };
    
    Ok(InstalledExtension {
        id: id.clone(),
        name: name.clone(),
        display_name,
        version,
        description,
        author,
        enabled: true,
        path: target_dir.to_string_lossy().to_string(),
        categories,
        icon: None,
    })
}

fn parse_vscode_manifest(path: &PathBuf) -> Result<(String, String, String, String, Vec<String>), String> {
    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read manifest: {}", e))?;
    
    let json: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse manifest: {}", e))?;
    
    let display_name = json.get("displayName")
        .or_else(|| json.get("name"))
        .and_then(|v| v.as_str())
        .unwrap_or("Unknown")
        .to_string();
    
    let version = json.get("version")
        .and_then(|v| v.as_str())
        .unwrap_or("1.0.0")
        .to_string();
    
    let description = json.get("description")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    
    let author = json.get("publisher")
        .or_else(|| json.get("author"))
        .and_then(|v| v.as_str())
        .unwrap_or("Unknown")
        .to_string();
    
    let categories = json.get("categories")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
        .unwrap_or_default();
    
    Ok((display_name, version, description, author, categories))
}

/// List all installed extensions
#[tauri::command]
pub async fn list_installed_extensions() -> Result<Vec<InstalledExtension>, String> {
    let ext_dir = get_extensions_dir()?;
    let disabled = load_disabled_extensions();
    let mut extensions = Vec::new();
    
    if let Ok(entries) = fs::read_dir(&ext_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let id = path.file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .to_string();
                
                // Try to find package.json in various locations
                let manifest_paths = vec![
                    path.join("extension").join("package.json"),
                    path.join("package.json"),
                    path.join("manifest.json"),
                ];
                
                let mut found = false;
                for manifest_path in manifest_paths {
                    if manifest_path.exists() {
                        if let Ok((display_name, version, description, author, categories)) = 
                            parse_vscode_manifest(&manifest_path) {
                            extensions.push(InstalledExtension {
                                id: id.clone(),
                                name: id.clone(),
                                display_name,
                                version,
                                description,
                                author,
                                enabled: !disabled.contains(&id),
                                path: path.to_string_lossy().to_string(),
                                categories,
                                icon: None,
                            });
                            found = true;
                            break;
                        }
                    }
                }
                
                // If no manifest found, still list the extension
                if !found {
                    extensions.push(InstalledExtension {
                        id: id.clone(),
                        name: id.clone(),
                        display_name: id.clone(),
                        version: "Unknown".to_string(),
                        description: "".to_string(),
                        author: "Unknown".to_string(),
                        enabled: !disabled.contains(&id),
                        path: path.to_string_lossy().to_string(),
                        categories: vec![],
                        icon: None,
                    });
                }
            }
        }
    }
    
    Ok(extensions)
}

/// Enable an extension
#[tauri::command]
pub async fn enable_extension(id: String) -> Result<(), String> {
    let mut disabled = load_disabled_extensions();
    disabled.retain(|x| x != &id);
    save_disabled_extensions(&disabled)?;
    Ok(())
}

/// Disable an extension
#[tauri::command]
pub async fn disable_extension(id: String) -> Result<(), String> {
    let mut disabled = load_disabled_extensions();
    if !disabled.contains(&id) {
        disabled.push(id);
    }
    save_disabled_extensions(&disabled)?;
    Ok(())
}

/// Uninstall an extension
#[tauri::command]
pub async fn uninstall_extension(id: String) -> Result<(), String> {
    let ext_dir = get_extensions_dir()?;
    let target_dir = ext_dir.join(&id);
    
    if target_dir.exists() {
        fs::remove_dir_all(&target_dir)
            .map_err(|e| format!("Failed to remove extension: {}", e))?;
    }
    
    let mut disabled = load_disabled_extensions();
    disabled.retain(|x| x != &id);
    save_disabled_extensions(&disabled)?;
    
    Ok(())
}
