use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use regex::Regex;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchMatch {
    pub line_number: usize,
    pub line_content: String,
    pub match_start: usize,
    pub match_end: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileResult {
    pub file_path: String,
    pub file_name: String,
    pub matches: Vec<SearchMatch>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub files: Vec<FileResult>,
    pub total_matches: usize,
    pub files_searched: usize,
}

#[derive(Debug, Deserialize)]
pub struct SearchOptions {
    pub query: String,
    pub path: String,
    pub case_sensitive: bool,
    pub use_regex: bool,
    pub whole_word: bool,
    pub include_patterns: Vec<String>,
    pub exclude_patterns: Vec<String>,
    pub max_results: usize,
}

fn should_include_file(file_path: &str, include_patterns: &[String], exclude_patterns: &[String]) -> bool {
    let file_name = Path::new(file_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("");

    // Check excludes first
    for pattern in exclude_patterns {
        if pattern.is_empty() {
            continue;
        }
        if file_path.contains(pattern) || file_name.contains(pattern) {
            return false;
        }
    }

    // If no includes, include all
    if include_patterns.is_empty() || include_patterns.iter().all(|p| p.is_empty()) {
        return true;
    }

    // Check includes
    for pattern in include_patterns {
        if pattern.is_empty() {
            continue;
        }
        // Handle glob-like patterns: *.rs, *.tsx
        if pattern.starts_with("*.") {
            let ext = &pattern[1..]; // .rs, .tsx
            if file_name.ends_with(ext) {
                return true;
            }
        } else if file_name.contains(pattern) || file_path.contains(pattern) {
            return true;
        }
    }

    false
}

fn search_in_file(
    file_path: &str,
    query: &str,
    case_sensitive: bool,
    use_regex: bool,
    whole_word: bool,
) -> Result<Vec<SearchMatch>, String> {
    let content = fs::read_to_string(file_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let mut matches = Vec::new();

    // Build the pattern
    let pattern = if use_regex {
        if case_sensitive {
            Regex::new(query).map_err(|e| format!("Invalid regex: {}", e))?
        } else {
            Regex::new(&format!("(?i){}", query)).map_err(|e| format!("Invalid regex: {}", e))?
        }
    } else {
        let escaped = regex::escape(query);
        let pattern_str = if whole_word {
            format!(r"\b{}\b", escaped)
        } else {
            escaped
        };
        if case_sensitive {
            Regex::new(&pattern_str).map_err(|e| format!("Regex error: {}", e))?
        } else {
            Regex::new(&format!("(?i){}", pattern_str)).map_err(|e| format!("Regex error: {}", e))?
        }
    };

    for (line_idx, line) in content.lines().enumerate() {
        for mat in pattern.find_iter(line) {
            matches.push(SearchMatch {
                line_number: line_idx + 1,
                line_content: line.to_string(),
                match_start: mat.start(),
                match_end: mat.end(),
            });
        }
    }

    Ok(matches)
}

fn walk_directory(
    dir: &Path,
    include_patterns: &[String],
    exclude_patterns: &[String],
    files: &mut Vec<String>,
    max_files: usize,
) {
    if files.len() >= max_files {
        return;
    }

    // Skip common non-code directories
    let skip_dirs = ["node_modules", ".git", "target", "dist", "build", ".next", "__pycache__", ".venv", "venv"];
    
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            if files.len() >= max_files {
                return;
            }

            let path = entry.path();
            let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
            
            if path.is_dir() {
                if !skip_dirs.contains(&name) && !name.starts_with('.') {
                    walk_directory(&path, include_patterns, exclude_patterns, files, max_files);
                }
            } else if path.is_file() {
                if let Some(path_str) = path.to_str() {
                    if should_include_file(path_str, include_patterns, exclude_patterns) {
                        files.push(path_str.to_string());
                    }
                }
            }
        }
    }
}

#[tauri::command]
pub async fn search_in_files(options: SearchOptions) -> Result<SearchResult, String> {
    if options.query.is_empty() {
        return Ok(SearchResult {
            files: vec![],
            total_matches: 0,
            files_searched: 0,
        });
    }

    let search_path = Path::new(&options.path);
    if !search_path.exists() {
        return Err("Search path does not exist".to_string());
    }

    let mut file_paths = Vec::new();
    let max_files = 5000; // Limit files to search

    if search_path.is_file() {
        file_paths.push(options.path.clone());
    } else {
        walk_directory(
            search_path,
            &options.include_patterns,
            &options.exclude_patterns,
            &mut file_paths,
            max_files,
        );
    }

    let files_searched = file_paths.len();
    let mut results: Vec<FileResult> = Vec::new();
    let mut total_matches = 0;
    let max_results = options.max_results.min(10000);

    for file_path in file_paths {
        if total_matches >= max_results {
            break;
        }

        match search_in_file(
            &file_path,
            &options.query,
            options.case_sensitive,
            options.use_regex,
            options.whole_word,
        ) {
            Ok(matches) if !matches.is_empty() => {
                let match_count = matches.len();
                let file_name = Path::new(&file_path)
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or(&file_path)
                    .to_string();

                results.push(FileResult {
                    file_path: file_path.clone(),
                    file_name,
                    matches,
                });
                total_matches += match_count;
            }
            _ => {}
        }
    }

    Ok(SearchResult {
        files: results,
        total_matches,
        files_searched,
    })
}

#[tauri::command]
pub async fn replace_in_files(
    search_query: String,
    replace_text: String,
    file_paths: Vec<String>,
    case_sensitive: bool,
    use_regex: bool,
    whole_word: bool,
) -> Result<usize, String> {
    if search_query.is_empty() {
        return Err("Search query is empty".to_string());
    }

    // Build the pattern
    let pattern = if use_regex {
        if case_sensitive {
            Regex::new(&search_query).map_err(|e| format!("Invalid regex: {}", e))?
        } else {
            Regex::new(&format!("(?i){}", search_query)).map_err(|e| format!("Invalid regex: {}", e))?
        }
    } else {
        let escaped = regex::escape(&search_query);
        let pattern_str = if whole_word {
            format!(r"\b{}\b", escaped)
        } else {
            escaped
        };
        if case_sensitive {
            Regex::new(&pattern_str).map_err(|e| format!("Regex error: {}", e))?
        } else {
            Regex::new(&format!("(?i){}", pattern_str)).map_err(|e| format!("Regex error: {}", e))?
        }
    };

    let mut total_replacements = 0;

    for file_path in file_paths {
        let content = fs::read_to_string(&file_path)
            .map_err(|e| format!("Failed to read {}: {}", file_path, e))?;
        
        let new_content = pattern.replace_all(&content, replace_text.as_str()).to_string();
        
        if new_content != content {
            let replacements = pattern.find_iter(&content).count();
            total_replacements += replacements;
            
            fs::write(&file_path, new_content)
                .map_err(|e| format!("Failed to write {}: {}", file_path, e))?;
        }
    }

    Ok(total_replacements)
}
