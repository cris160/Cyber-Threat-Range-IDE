use regex::Regex;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize)]
pub enum Severity {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Serialize)]
pub struct SecurityIssue {
    pub file: String,
    pub line: usize,
    pub severity: Severity,
    pub kind: String,
    pub message: String,
    pub cwe: Option<String>,
    pub fix_hint: Option<String>,
}

fn read_file_lines(path: &Path) -> Vec<String> {
    fs::read_to_string(path)
        .map(|content| content.lines().map(|l| l.to_string()).collect())
        .unwrap_or_default()
}

struct VulnerabilityPattern {
    name: &'static str,
    pattern: &'static str,
    severity: Severity,
    message: &'static str,
    cwe: Option<&'static str>,
    fix_hint: Option<&'static str>,
    file_extensions: Option<Vec<&'static str>>,
}

fn get_vulnerability_patterns() -> Vec<VulnerabilityPattern> {
    vec![
        // === CRITICAL SEVERITY ===
        
        // AWS Keys
        VulnerabilityPattern {
            name: "AWS Access Key",
            pattern: r"AKIA[0-9A-Z]{16}",
            severity: Severity::Critical,
            message: "AWS Access Key ID detected. This should never be in source code.",
            cwe: Some("CWE-798"),
            fix_hint: Some("Use AWS IAM roles or environment variables instead"),
            file_extensions: None,
        },
        
        // Private Keys
        VulnerabilityPattern {
            name: "Private Key",
            pattern: r"-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----",
            severity: Severity::Critical,
            message: "Private key detected in source code. This is a critical security risk.",
            cwe: Some("CWE-321"),
            fix_hint: Some("Store private keys in a secure key management system"),
            file_extensions: None,
        },
        
        // === HIGH SEVERITY ===
        
        // Hardcoded Secrets
        VulnerabilityPattern {
            name: "Hardcoded Secret",
            pattern: r#"(?i)(api[_-]?key|secret[_-]?key|auth[_-]?token|access[_-]?token|private[_-]?key|password)\s*[:=]\s*["'][^"']{8,}["']"#,
            severity: Severity::High,
            message: "Possible hardcoded credential or API key detected. Store secrets in environment variables or a secure vault.",
            cwe: Some("CWE-798"),
            fix_hint: Some("Use environment variables like process.env.API_KEY"),
            file_extensions: None,
        },
        
        // Dynamic Code Execution
        VulnerabilityPattern {
            name: "Dynamic Code Execution",
            pattern: r"\beval\s*\(",
            severity: Severity::High,
            message: "Use of eval() detected. This can lead to code injection vulnerabilities.",
            cwe: Some("CWE-95"),
            fix_hint: Some("Avoid eval. Use JSON.parse for data or safer alternatives"),
            file_extensions: None,
        },
        
        // SQL Injection
        VulnerabilityPattern {
            name: "SQL Injection Risk",
            pattern: r"(?i)(SELECT|INSERT|UPDATE|DELETE|DROP)\s+.*(\+|%s|%d|\$\{)",
            severity: Severity::High,
            message: "Possible SQL injection vulnerability. User input may be concatenated into SQL query.",
            cwe: Some("CWE-89"),
            fix_hint: Some("Use parameterized queries or prepared statements"),
            file_extensions: None,
        },
        
        // Command Injection - Python
        VulnerabilityPattern {
            name: "Command Injection Risk",
            pattern: r"(?i)os\.system\s*\([^)]*\+",
            severity: Severity::High,
            message: "Possible command injection. User input may be passed to shell commands.",
            cwe: Some("CWE-78"),
            fix_hint: Some("Use subprocess with shell=False and pass args as a list"),
            file_extensions: Some(vec!["py"]),
        },
        
        // Command Injection - subprocess
        VulnerabilityPattern {
            name: "Command Injection Risk",
            pattern: r"(?i)subprocess\.(call|run|Popen)\s*\([^)]*shell\s*=\s*True",
            severity: Severity::High,
            message: "subprocess with shell=True is dangerous. Command injection is possible.",
            cwe: Some("CWE-78"),
            fix_hint: Some("Use shell=False and pass command as a list of arguments"),
            file_extensions: Some(vec!["py"]),
        },
        
        // XSS - innerHTML
        VulnerabilityPattern {
            name: "Cross-Site Scripting (XSS)",
            pattern: r"\.innerHTML\s*=",
            severity: Severity::High,
            message: "Direct innerHTML assignment can lead to XSS vulnerabilities.",
            cwe: Some("CWE-79"),
            fix_hint: Some("Use textContent for plain text, or sanitize HTML with DOMPurify"),
            file_extensions: Some(vec!["js", "ts", "jsx", "tsx"]),
        },
        
        // XSS - document.write
        VulnerabilityPattern {
            name: "Cross-Site Scripting (XSS)",
            pattern: r"document\.write\s*\(",
            severity: Severity::High,
            message: "document.write can lead to XSS vulnerabilities.",
            cwe: Some("CWE-79"),
            fix_hint: Some("Use DOM manipulation methods instead"),
            file_extensions: Some(vec!["js", "ts", "jsx", "tsx", "html"]),
        },
        
        // Insecure Deserialization - Python pickle
        VulnerabilityPattern {
            name: "Insecure Deserialization",
            pattern: r"pickle\.(load|loads)\s*\(",
            severity: Severity::High,
            message: "Pickle deserialization can execute arbitrary code. Never unpickle untrusted data.",
            cwe: Some("CWE-502"),
            fix_hint: Some("Use JSON or another safe serialization format for untrusted data"),
            file_extensions: Some(vec!["py"]),
        },
        
        // Disabled TLS verification
        VulnerabilityPattern {
            name: "Disabled TLS Verification",
            pattern: r"(?i)(verify\s*=\s*False|rejectUnauthorized\s*:\s*false)",
            severity: Severity::High,
            message: "TLS certificate verification is disabled. This allows man-in-the-middle attacks.",
            cwe: Some("CWE-295"),
            fix_hint: Some("Enable TLS verification in production"),
            file_extensions: None,
        },
        
        // === MEDIUM SEVERITY ===
        
        // Shell Command Execution
        VulnerabilityPattern {
            name: "Shell Command Execution",
            pattern: r"\b(system|popen|exec|spawn|execSync|spawnSync)\s*\(",
            severity: Severity::Medium,
            message: "Shell/system command execution detected. Ensure inputs are validated.",
            cwe: Some("CWE-78"),
            fix_hint: Some("Validate and sanitize all inputs, use allowlists"),
            file_extensions: None,
        },
        
        // Dangerous React pattern
        VulnerabilityPattern {
            name: "Dangerous React Pattern",
            pattern: r"dangerouslySetInnerHTML",
            severity: Severity::Medium,
            message: "dangerouslySetInnerHTML can lead to XSS if not properly sanitized.",
            cwe: Some("CWE-79"),
            fix_hint: Some("Sanitize HTML with DOMPurify before using dangerouslySetInnerHTML"),
            file_extensions: Some(vec!["jsx", "tsx"]),
        },
        
        // Path Traversal
        VulnerabilityPattern {
            name: "Path Traversal Risk",
            pattern: r"(\.\./|\.\.\\)",
            severity: Severity::Medium,
            message: "Path traversal pattern detected. Validate file paths carefully.",
            cwe: Some("CWE-22"),
            fix_hint: Some("Use path.resolve and verify the path is within allowed directories"),
            file_extensions: None,
        },
        
        // Insecure YAML Loading
        VulnerabilityPattern {
            name: "Insecure YAML Loading",
            pattern: r"yaml\.load\s*\(",
            severity: Severity::Medium,
            message: "yaml.load without Loader is unsafe. Use yaml.safe_load instead.",
            cwe: Some("CWE-502"),
            fix_hint: Some("Replace with yaml.safe_load or specify Loader=yaml.SafeLoader"),
            file_extensions: Some(vec!["py"]),
        },
        
        // Insecure Random - JS
        VulnerabilityPattern {
            name: "Insecure Randomness",
            pattern: r"Math\.random\s*\(\)",
            severity: Severity::Medium,
            message: "Math.random is not cryptographically secure. Do not use for security purposes.",
            cwe: Some("CWE-338"),
            fix_hint: Some("Use crypto.getRandomValues or crypto.randomBytes for security"),
            file_extensions: Some(vec!["js", "ts", "jsx", "tsx"]),
        },
        
        // === LOW SEVERITY ===
        
        // Insecure Random - Python
        VulnerabilityPattern {
            name: "Insecure Randomness",
            pattern: r"\brandom\.(random|randint|choice|shuffle)\s*\(",
            severity: Severity::Low,
            message: "Python random module is not cryptographically secure.",
            cwe: Some("CWE-338"),
            fix_hint: Some("Use secrets module for security-sensitive randomness"),
            file_extensions: Some(vec!["py"]),
        },
        
        // Weak Hash Functions
        VulnerabilityPattern {
            name: "Weak Hash Function",
            pattern: r"(?i)\b(md5|sha1)\s*\(",
            severity: Severity::Low,
            message: "Weak hash function detected. MD5 and SHA1 are vulnerable to collision attacks.",
            cwe: Some("CWE-328"),
            fix_hint: Some("Use SHA-256 or SHA-3 for hashing, bcrypt or Argon2 for passwords"),
            file_extensions: None,
        },
        
        // HTTP URLs (not HTTPS)
        VulnerabilityPattern {
            name: "Insecure HTTP URL",
            pattern: r#"["']http://[^"']*[^localhost][^127.0.0.1][^"']*["']"#,
            severity: Severity::Low,
            message: "HTTP URL detected. Consider using HTTPS for secure communication.",
            cwe: Some("CWE-319"),
            fix_hint: Some("Use HTTPS instead of HTTP"),
            file_extensions: None,
        },
        
        // Console.log with sensitive data
        VulnerabilityPattern {
            name: "Sensitive Data in Logs",
            pattern: r"(?i)console\.(log|info|debug).*(?:password|secret|token|key)",
            severity: Severity::Low,
            message: "Possible sensitive data being logged. Remove before production.",
            cwe: Some("CWE-532"),
            fix_hint: Some("Remove sensitive data from log statements"),
            file_extensions: Some(vec!["js", "ts", "jsx", "tsx"]),
        },
        
        // TODO/FIXME security comments
        VulnerabilityPattern {
            name: "Security TODO",
            pattern: r"(?i)(TODO|FIXME|HACK|XXX).*(?:security|auth|password|secret|vulnerability|unsafe)",
            severity: Severity::Low,
            message: "Security-related TODO comment found. Address before deployment.",
            cwe: None,
            fix_hint: Some("Address the security concern mentioned in the comment"),
            file_extensions: None,
        },
    ]
}

fn scan_lines(path: &Path, lines: &[String]) -> Vec<SecurityIssue> {
    let mut issues = Vec::new();
    let patterns = get_vulnerability_patterns();
    
    let file_ext = path.extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase());

    for pattern_def in &patterns {
        // Check if this pattern applies to this file type
        if let Some(ref exts) = pattern_def.file_extensions {
            if let Some(ref ext) = file_ext {
                if !exts.contains(&ext.as_str()) {
                    continue;
                }
            } else {
                continue;
            }
        }
        
        if let Ok(re) = Regex::new(pattern_def.pattern) {
            for (idx, line) in lines.iter().enumerate() {
                let line_no = idx + 1;
                
                if re.is_match(line) {
                    issues.push(SecurityIssue {
                        file: path.to_string_lossy().to_string(),
                        line: line_no,
                        severity: pattern_def.severity.clone(),
                        kind: pattern_def.name.to_string(),
                        message: pattern_def.message.to_string(),
                        cwe: pattern_def.cwe.map(String::from),
                        fix_hint: pattern_def.fix_hint.map(String::from),
                    });
                }
            }
        }
    }

    issues
}

pub fn scan_file(path: &Path) -> Vec<SecurityIssue> {
    let lines = read_file_lines(path);
    scan_lines(path, &lines)
}

pub fn scan_workspace(root: &Path) -> Vec<SecurityIssue> {
    let mut issues = Vec::new();

    fn collect_files(dir: &Path, out: &mut Vec<PathBuf>) {
        // Skip common directories that shouldn't be scanned
        let skip_dirs = ["node_modules", ".git", "target", "build", "dist", "__pycache__", ".venv", "venv"];
        
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    let dir_name = path.file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("");
                    
                    if !skip_dirs.contains(&dir_name) {
                        collect_files(&path, out);
                    }
                } else {
                    out.push(path);
                }
            }
        }
    }

    let mut files: Vec<PathBuf> = Vec::new();
    collect_files(root, &mut files);

    for file in files.into_iter().filter(|p| {
        if let Some(ext) = p.extension().and_then(|e| e.to_str()) {
            matches!(
                ext.to_ascii_lowercase().as_str(),
                "ts" | "tsx" | "js" | "jsx" | "py" | "rs" | "c" | "cpp" | "java" | "go" | "rb" | "php" | "html"
            )
        } else {
            false
        }
    }) {
        issues.extend(scan_file(&file));
    }

    // Sort by severity (Critical > High > Medium > Low)
    issues.sort_by(|a, b| {
        let severity_order = |s: &Severity| match s {
            Severity::Critical => 0,
            Severity::High => 1,
            Severity::Medium => 2,
            Severity::Low => 3,
        };
        severity_order(&a.severity).cmp(&severity_order(&b.severity))
    });

    issues
}
