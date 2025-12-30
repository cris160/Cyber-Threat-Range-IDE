// Git commands implementation using git2 crate
use git2::{Repository, StatusOptions, IndexAddOption};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitStatus {
    pub branch: String,
    pub modified: Vec<String>,
    pub added: Vec<String>,
    pub deleted: Vec<String>,
    pub untracked: Vec<String>,
    pub renamed: Vec<(String, String)>,
    pub ahead: usize,
    pub behind: usize,
    pub is_clean: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitCommitInfo {
    pub hash: String,
    pub message: String,
    pub author: String,
    pub timestamp: i64,
}

/// Get the git status for a repository
#[tauri::command]
pub async fn git_status(repo_path: String) -> Result<GitStatus, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    // Get current branch
    let head = repo.head()
        .map_err(|e| format!("Failed to get HEAD: {}", e))?;
    let branch = head.shorthand()
        .unwrap_or("(detached)")
        .to_string();
    
    // Get status
    let mut opts = StatusOptions::new();
    opts.include_untracked(true);
    opts.recurse_untracked_dirs(true);
    
    let statuses = repo.statuses(Some(&mut opts))
        .map_err(|e| format!("Failed to get statuses: {}", e))?;
    
    let mut modified = Vec::new();
    let mut added = Vec::new();
    let mut deleted = Vec::new();
    let mut untracked = Vec::new();
    let mut renamed = Vec::new();
    
    for entry in statuses.iter() {
        let status = entry.status();
        let path = entry.path().unwrap_or("").to_string();
        
        if status.is_wt_modified() || status.is_index_modified() {
            modified.push(path);
        } else if status.is_wt_new() {
            untracked.push(path);
        } else if status.is_wt_deleted() || status.is_index_deleted() {
            deleted.push(path);
        } else if status.is_index_new() {
            added.push(path);
        } else if status.is_index_renamed() {
            if let Some(diff) = entry.head_to_index() {
                let old_path = diff.old_file().path()
                    .and_then(|p| p.to_str())
                    .unwrap_or("")
                    .to_string();
                let new_path = diff.new_file().path()
                    .and_then(|p| p.to_str())
                    .unwrap_or("")
                    .to_string();
                renamed.push((old_path, new_path));
            }
        }
    }
    
    // Check ahead/behind
    let (ahead, behind) = get_ahead_behind(&repo, &branch).unwrap_or((0, 0));
    
    let is_clean = modified.is_empty() && 
                   added.is_empty() && 
                   deleted.is_empty() && 
                   untracked.is_empty() &&
                   renamed.is_empty();
    
    Ok(GitStatus {
        branch,
        modified,
        added,
        deleted,
        untracked,
        renamed,
        ahead,
        behind,
        is_clean,
    })
}

/// Commit staged changes
#[tauri::command]
pub async fn git_commit(repo_path: String, message: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    // Get signature
    let sig = repo.signature()
        .map_err(|e| format!("Failed to get signature: {}", e))?;
    
    // Get tree from index
    let mut index = repo.index()
        .map_err(|e| format!("Failed to get index: {}", e))?;
    let tree_id = index.write_tree()
        .map_err(|e| format!("Failed to write tree: {}", e))?;
    let tree = repo.find_tree(tree_id)
        .map_err(|e| format!("Failed to find tree: {}", e))?;
    
    // Get parent commit
    let parent_commit = repo.head()
        .ok()
        .and_then(|h| h.target())
        .and_then(|oid| repo.find_commit(oid).ok());
    
    // Create commit
    let parents = if let Some(ref parent) = parent_commit {
        vec![parent]
    } else {
        vec![]
    };
    
    let oid = repo.commit(
        Some("HEAD"),
        &sig,
        &sig,
        &message,
        &tree,
        &parents,
    ).map_err(|e| format!("Failed to create commit: {}", e))?;
    
    Ok(oid.to_string())
}

/// Stage files for commit
#[tauri::command]
pub async fn git_add(repo_path: String, paths: Vec<String>) -> Result<(), String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let mut index = repo.index()
        .map_err(|e| format!("Failed to get index: {}", e))?;
    
    if paths.is_empty() || paths.contains(&String::from(".")) {
        // Add all files
        index.add_all(["."].iter(), IndexAddOption::DEFAULT, None)
            .map_err(|e| format!("Failed to add all files: {}", e))?;
    } else {
        // Add specific files
        for path in &paths {
            index.add_path(Path::new(path))
                .map_err(|e| format!("Failed to add {}: {}", path, e))?;
        }
    }
    
    index.write()
        .map_err(|e| format!("Failed to write index: {}", e))?;
    
    Ok(())
}

/// Push changes to remote using system git (for authentication support)
#[tauri::command]
pub async fn git_push(repo_path: String, remote_name: Option<String>) -> Result<String, String> {
    let remote = remote_name.unwrap_or_else(|| "origin".to_string());
    
    // Get current branch using git2 (for display)
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    let head = repo.head()
        .map_err(|e| format!("Failed to get HEAD: {}", e))?;
    let branch = head.shorthand()
        .ok_or_else(|| "Not on a branch".to_string())?
        .to_string();
    
    // Use system git for push (leverages user's credentials)
    let output = std::process::Command::new("git")
        .args(["push", &remote, &branch])
        .current_dir(&repo_path)
        .output()
        .map_err(|e| format!("Failed to run git push: {}", e))?;
    
    if output.status.success() {
        Ok(format!("Pushed to {}/{}", remote, branch))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        // Git often writes success messages to stderr
        if stderr.contains("->") || stdout.contains("->") {
            Ok(format!("Pushed to {}/{}", remote, branch))
        } else {
            Err(format!("Push failed: {}{}", stderr, stdout))
        }
    }
}

/// Pull changes from remote using system git (for authentication support)
#[tauri::command]
pub async fn git_pull(repo_path: String, remote_name: Option<String>) -> Result<String, String> {
    let remote = remote_name.unwrap_or_else(|| "origin".to_string());
    
    // Use system git for pull (leverages user's credentials)
    let output = std::process::Command::new("git")
        .args(["pull", &remote])
        .current_dir(&repo_path)
        .output()
        .map_err(|e| format!("Failed to run git pull: {}", e))?;
    
    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        if stdout.contains("Already up to date") || stdout.contains("Already up-to-date") {
            Ok("Already up to date".to_string())
        } else {
            Ok(format!("Pulled from {}", remote))
        }
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Pull failed: {}", stderr))
    }
}

/// Get list of branches
#[tauri::command]
pub async fn git_list_branches(repo_path: String) -> Result<Vec<String>, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let branches = repo.branches(Some(git2::BranchType::Local))
        .map_err(|e| format!("Failed to list branches: {}", e))?;
    
    let mut branch_names = Vec::new();
    for branch in branches {
        let (branch, _) = branch.map_err(|e| format!("Failed to get branch: {}", e))?;
        if let Some(name) = branch.name().map_err(|e| format!("Invalid UTF-8: {}", e))? {
            branch_names.push(name.to_string());
        }
    }
    
    Ok(branch_names)
}

/// Create a new branch
#[tauri::command]
pub async fn git_create_branch(repo_path: String, branch_name: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let head = repo.head()
        .map_err(|e| format!("Failed to get HEAD: {}", e))?;
    let target = head.peel_to_commit()
        .map_err(|e| format!("Failed to get commit: {}", e))?;
    
    repo.branch(&branch_name, &target, false)
        .map_err(|e| format!("Failed to create branch: {}", e))?;
    
    Ok(())
}

/// Switch to a different branch
#[tauri::command]
pub async fn git_checkout_branch(repo_path: String, branch_name: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let (object, reference) = repo.revparse_ext(&branch_name)
        .map_err(|e| format!("Failed to find branch: {}", e))?;
    
    repo.checkout_tree(&object, Some(git2::build::CheckoutBuilder::new().force()))
        .map_err(|e| format!("Failed to checkout: {}", e))?;
    
    repo.set_head(reference.unwrap().name().unwrap())
        .map_err(|e| format!("Failed to set HEAD: {}", e))?;
    
    Ok(())
}

/// Get commit history
#[tauri::command]
pub async fn git_log(repo_path: String, limit: Option<usize>) -> Result<Vec<GitCommitInfo>, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let mut revwalk = repo.revwalk()
        .map_err(|e| format!("Failed to create revwalk: {}", e))?;
    revwalk.push_head()
        .map_err(|e| format!("Failed to push HEAD: {}", e))?;
    
    let limit = limit.unwrap_or(50);
    let mut commits = Vec::new();
    
    for (i, oid) in revwalk.enumerate() {
        if i >= limit {
            break;
        }
        
        let oid = oid.map_err(|e| format!("Failed to get OID: {}", e))?;
        let commit = repo.find_commit(oid)
            .map_err(|e| format!("Failed to find commit: {}", e))?;
        
        commits.push(GitCommitInfo {
            hash: oid.to_string(),
            message: commit.message().unwrap_or("").to_string(),
            author: commit.author().name().unwrap_or("").to_string(),
            timestamp: commit.time().seconds(),
        });
    }
    
    Ok(commits)
}

/// Initialize a new git repository
#[tauri::command]
pub async fn git_init(repo_path: String) -> Result<(), String> {
    Repository::init(&repo_path)
        .map_err(|e| format!("Failed to initialize repository: {}", e))?;
    Ok(())
}

/// Clone a repository
#[tauri::command]
pub async fn git_clone(url: String, dest_path: String) -> Result<(), String> {
    Repository::clone(&url, &dest_path)
        .map_err(|e| format!("Failed to clone repository: {}", e))?;
    Ok(())
}

// Helper function to get ahead/behind counts
fn get_ahead_behind(repo: &Repository, branch: &str) -> Result<(usize, usize), git2::Error> {
    let local = repo.revparse_single(&format!("refs/heads/{}", branch))?.id();
    let remote = match repo.revparse_single(&format!("refs/remotes/origin/{}", branch)) {
        Ok(obj) => obj.id(),
        Err(_) => return Ok((0, 0)), // No remote tracking branch
    };
    
    let (ahead, behind) = repo.graph_ahead_behind(local, remote)?;
    Ok((ahead, behind))
}
