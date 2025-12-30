//! Exploit Prover Tauri Commands
//! 
//! Exposes the Exploit Prover analysis engine to the frontend.

use serde::{Deserialize, Serialize};
use crate::analysis::{AnalysisResult, prover::ExploitProver};

/// Request to analyze source code
#[derive(Debug, Deserialize)]
pub struct AnalyzeRequest {
    /// The source code to analyze
    pub source: String,
    /// Optional: specific line to focus on
    pub target_line: Option<usize>,
    /// The file path (for context)
    pub file_path: Option<String>,
}

/// Analyze Python source code for exploitable vulnerabilities
#[tauri::command]
pub async fn prove_exploitability(request: AnalyzeRequest) -> Result<AnalysisResult, String> {
    // Run the analysis in a blocking task to not block the async runtime
    let result = tokio::task::spawn_blocking(move || {
        let mut prover = ExploitProver::new()?;
        
        if let Some(line) = request.target_line {
            Ok(prover.analyze_at_line(&request.source, line))
        } else {
            Ok(prover.analyze(&request.source))
        }
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?;
    
    result
}

/// Quick scan to just detect sinks without full analysis
#[tauri::command]
pub async fn quick_scan_sinks(source: String) -> Result<Vec<SinkInfo>, String> {
    use crate::analysis::python_parser::PythonParser;
    
    let result = tokio::task::spawn_blocking(move || {
        let mut parser = PythonParser::new()?;
        let sinks = parser.find_sinks(&source)?;
        
        Ok(sinks.into_iter().map(|s| SinkInfo {
            sink_type: format!("{:?}", s.sink_type),
            line: s.line,
            column: s.column,
            code: s.code_snippet,
            description: s.sink_type.description().to_string(),
        }).collect())
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?;
    
    result
}

/// Simplified sink info for quick scans
#[derive(Debug, Serialize)]
pub struct SinkInfo {
    pub sink_type: String,
    pub line: usize,
    pub column: usize,
    pub code: String,
    pub description: String,
}

/// Index the workspace for cross-file analysis
#[tauri::command]
pub async fn index_workspace(workspace_path: String) -> Result<WorkspaceIndexResult, String> {
    use crate::analysis::ProjectIndexer;
    use std::path::PathBuf;
    
    let result = tokio::task::spawn_blocking(move || {
        let mut indexer = ProjectIndexer::new(PathBuf::from(&workspace_path))?;
        let file_count = indexer.index_workspace()?;
        
        let symbols: Vec<SymbolInfo> = indexer
            .get_all_symbols()
            .iter()
            .flat_map(|(name, syms)| {
                syms.iter().map(|s| SymbolInfo {
                    name: name.clone(),
                    kind: format!("{:?}", s.kind),
                    file_path: s.file_path.to_string_lossy().to_string(),
                    line: s.line,
                    module_path: s.module_path.clone(),
                })
            })
            .collect();
        
        Ok(WorkspaceIndexResult {
            files_indexed: file_count,
            symbols_found: symbols.len(),
            symbols,
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?;
    
    result
}

/// Result of workspace indexing
#[derive(Debug, Serialize)]
pub struct WorkspaceIndexResult {
    pub files_indexed: usize,
    pub symbols_found: usize,
    pub symbols: Vec<SymbolInfo>,
}

/// Info about a symbol in the workspace
#[derive(Debug, Serialize)]
pub struct SymbolInfo {
    pub name: String,
    pub kind: String,
    pub file_path: String,
    pub line: usize,
    pub module_path: String,
}

/// Analyze a file with cross-file taint tracking
#[tauri::command]
pub async fn analyze_cross_file(file_path: String, workspace_path: String) -> Result<CrossFileResult, String> {
    use crate::analysis::CrossFileSlicer;
    use std::path::PathBuf;
    
    let result = tokio::task::spawn_blocking(move || {
        let mut slicer = CrossFileSlicer::new(PathBuf::from(&workspace_path))?;
        slicer.index_workspace()?;
        
        let analysis = slicer.analyze_file(&PathBuf::from(&file_path))?;
        
        Ok(CrossFileResult {
            sinks_found: analysis.sinks.len(),
            cross_file_flows: analysis.cross_file_flows.len(),
            attack_path: analysis.attack_path.iter().map(|n| CrossFilePathInfo {
                file_path: n.file_path.to_string_lossy().to_string(),
                line: n.line,
                code: n.code.clone(),
                node_type: n.node_type.clone(),
                is_sink: n.is_sink,
            }).collect(),
            flows: analysis.cross_file_flows.iter().map(|f| CrossFileFlowInfo {
                caller_file: f.caller_file.to_string_lossy().to_string(),
                caller_line: f.caller_line,
                callee_file: f.callee_file.to_string_lossy().to_string(),
                callee_line: f.callee_line,
                function_called: f.function_called.clone(),
                tainted_args: f.tainted_args.clone(),
            }).collect(),
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?;
    
    result
}

/// Result of cross-file analysis
#[derive(Debug, Serialize)]
pub struct CrossFileResult {
    pub sinks_found: usize,
    pub cross_file_flows: usize,
    pub attack_path: Vec<CrossFilePathInfo>,
    pub flows: Vec<CrossFileFlowInfo>,
}

/// Info about a node in the cross-file attack path
#[derive(Debug, Serialize)]
pub struct CrossFilePathInfo {
    pub file_path: String,
    pub line: usize,
    pub code: String,
    pub node_type: String,
    pub is_sink: bool,
}

/// Info about a cross-file taint flow
#[derive(Debug, Serialize)]
pub struct CrossFileFlowInfo {
    pub caller_file: String,
    pub caller_line: usize,
    pub callee_file: String,
    pub callee_line: usize,
    pub function_called: String,
    pub tainted_args: Vec<String>,
}

