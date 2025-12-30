//! Exploit Prover - Static Analysis Engine
//! 
//! This module provides symbolic execution-based vulnerability analysis.
//! It can mathematically prove whether a vulnerability is exploitable
//! and generate working Proof-of-Concept payloads.

pub mod python_parser;
pub mod slicer;
pub mod prover;
pub mod constraint_gen;
pub mod solver;

pub mod indexer;
pub use indexer::{ProjectIndexer, Symbol, SymbolKind};

pub mod cross_slicer;
pub use cross_slicer::{CrossFileSlicer, CrossFileAnalysisResult, CrossFileFlow};

#[cfg(test)]
pub mod integration_tests;

use serde::{Deserialize, Serialize};

/// Represents a detected sink (dangerous function call)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Sink {
    /// The type of vulnerability
    pub sink_type: SinkType,
    /// Line number in the source file
    pub line: usize,
    /// Column number
    pub column: usize,
    /// The actual code at this location
    pub code_snippet: String,
    /// Variables used in the sink that need taint analysis
    pub tainted_vars: Vec<String>,
}

/// Types of dangerous sinks we detect
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SinkType {
    SqlInjection,      // cursor.execute, raw SQL
    CommandInjection,  // os.system, subprocess
    CodeInjection,     // eval, exec
    PathTraversal,     // open() with user input
    Deserialization,   // pickle.loads
    Ssrf,              // requests.get
    Xxe,               // lxml.etree
}

impl SinkType {
    pub fn description(&self) -> &'static str {
        match self {
            SinkType::SqlInjection => "SQL Injection - User input in database query",
            SinkType::CommandInjection => "Command Injection - User input in shell command",
            SinkType::CodeInjection => "Code Injection - User input in eval/exec",
            SinkType::PathTraversal => "Path Traversal - User input in file path",
            SinkType::Deserialization => "Insecure Deserialization - Untrusted data in pickle",
            SinkType::Ssrf => "Server-Side Request Forgery - User input in network request",
            SinkType::Xxe => "XML External Entity - User input in XML parser",
        }
    }
}

/// Result of the exploit prover analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisResult {
    /// Whether we could complete the analysis
    pub success: bool,
    /// The vulnerability status
    pub status: ExploitStatus,
    /// Detected sinks in the code
    pub sinks: Vec<Sink>,
    /// If exploitable, the generated payload
    pub payload: Option<String>,
    /// Human-readable explanation
    pub explanation: String,
    /// The attack path from entry point to sink
    pub attack_path: Vec<PathNode>,
    /// Time taken for analysis in milliseconds
    pub analysis_time_ms: u64,
}

/// Status of exploit analysis
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ExploitStatus {
    /// Vulnerability is definitely exploitable
    Exploitable,
    /// Code is provably safe
    Safe,
    /// Analysis couldn't determine (timeout, complexity)
    Inconclusive,
    /// No sinks found in the analyzed code
    NoSinksFound,
}

/// A node in the attack path
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PathNode {
    pub line: usize,
    pub code: String,
    pub description: String,
}

impl Default for AnalysisResult {
    fn default() -> Self {
        Self {
            success: false,
            status: ExploitStatus::Inconclusive,
            sinks: vec![],
            payload: None,
            explanation: String::new(),
            attack_path: vec![],
            analysis_time_ms: 0,
        }
    }
}
