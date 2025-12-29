# CTR - Cyber Threat Range IDE

CTR (Code-Text-Rust) is a specialized Integrated Development Environment (IDE) designed for security research, secure coding, and ethical hacking training. It combines a modern code editor with integrated security tools, allowing developers to identify, simulate, and fix vulnerabilities within a single workflow.

## Table of Contents

1.  [Installation](#installation)
2.  [Getting Started](#getting-started)
3.  [Security Features](#security-features)
    *   [Security Dashboard](#security-dashboard)
    *   [Vulnerability Scanner](#vulnerability-scanner)
    *   [Exploit Simulator](#exploit-simulator)
    *   [CTF Challenges](#ctf-challenges)
4.  [Interface & Customization](#interface--customization)
    *   [Hacker Mode](#hacker-mode)
    *   [Code Editor](#code-editor)
5.  [Troubleshooting](#troubleshooting)

---

## Installation

### Windows Installer
The easiest way to install CTR is using the provided MSI installer.
1.  Navigate to the `release` directory.
2.  Double-click `CTR_0.1.0_x64_en-US.msi`.
3.  Follow the on-screen prompts to complete the installation.
4.  Launch "Cyber Threat Range" from your Start Menu or Desktop.

### Building from Source
To build the application locally, you will need Node.js and Rust installed.

1.  Clone the repository.
2.  Install frontend dependencies:
    ```bash
    npm install
    ```
3.  Run the development server:
    ```bash
    npm run dev
    ```
4.  Build a release package:
    ```bash
    npm run build
    ```

---

## Getting Started

1.  **Open a Project**: Use **File > Open Folder** (or `Ctrl+O`) to load your project directory.
2.  **Explore Files**: The File Explorer on the left sidebar allows you to navigate and manage your project files.
3.  **Edit Code**: Double-click any file to open it in the editor.

---

## Security Features

### Security Dashboard
Access the Dashboard by clicking the **Grid icon** in the primary Activity Bar.

The dashboard provides a high-level overview of your project's security posture:
*   **Security Score**: A calculated metric (0-100) based on the number and severity of active vulnerabilities. A score of 100 indicates no detected issues.
*   **Threat Heatmap**: A visual grid representing the "attack surface" of your application. Red blocks indicate areas with critical vulnerabilities.
*   **Activity Feed**: A real-time log of security scans, exploit attempts, and resolved issues.

### Vulnerability Scanner
Access the Scanner by clicking the **Shield icon** in the Activity Bar.

*   **Scanning**: You can trigger a scan for the entire Workspace or just the Active File.
*   **Issue List**: Detected vulnerabilities are categorized by severity (Critical, High, Medium, Low).
*   **Details**: Click on an issue to view its description, associated CWE (Common Weakness Enumeration) ID, and a suggested fix.
*   **Locate**: Clicking the "Locate" button will automatically open the file and scroll to the vulnerable line of code.

### Exploit Simulator
Access the Simulator by clicking the **Target icon** in the Activity Bar.

The Exploit Simulator allows you to safely test your code against common attack vectors.
1.  **Load Target**: Open a code file (e.g., `server.js` or `auth.py`) in the active editor tab. The simulator will automatically load its content.
2.  **Select Payload**: Choose an attack type from the dropdown menu (e.g., SQL Injection, XSS, Path Traversal).
3.  **Execute**: Click "Run Simulation".
4.  **Analyze**: Watch the visualization to see how the payload travels through the mock application flow and whether it successfully exploits the vulnerability.

**Note**: This is a logical simulation engine designed for educational purposes. It does not execute malicious binaries on your host machine.

### CTF Challenges
The Capture The Flag (CTF) module is a training ground for secure coding.
1.  Navigate to the **Challenges** tab within the Security Panel.
2.  Select a challenge (e.g., "Fix SQL Injection").
3.  Read the briefing and the hint.
4.  Modify your code to patch the vulnerability.
5.  Click **Verify Fix**. The system will run a real verification scan against your workspace. If the vulnerability is resolved, you will be awarded points and the next challenge will unlock.

---

## Interface & Customization

### Hacker Mode
Toggle the **HACK** switch in the top-right corner to activate Hacker Mode.
*   **Visuals**: Changes the theme to a high-contrast, terminal-style aesthetic with digital rain and scanline effects.
*   **Audio**: Enables sound effects for typing, clicks, and system alerts.
*   **Performance**: Can be toggled off at any time for a standard, distraction-free environment.

### Code Editor
The integrated editor is powered by Monaco (the same engine as VS Code).
*   **Shortcuts**: Supports standard industry keyboard shortcuts (Ctrl+S to save, Ctrl+F to find).
*   **IntelliSense**: Basic syntax highlighting and code completion is available for major languages (Rust, Python, JavaScript, TypeScript).

---

## Troubleshooting

### Scanner Not Detecting Issues
*   Ensure you have opened a valid workspace folder.
*   Verify that the file extension is supported (`.js`, `.ts`, `.py`, `.rs`).
*   Check the console logs (Help > Toggle Developer Tools) for any backend connection errors.

### Terminal Issues
*   If the integrated terminal becomes unresponsive, try closing the terminal tab and opening a new one.
*   Ensure that the correct shell (PowerShell on Windows) is available in your system path.

---

## License

This project is licensed under the MIT License.
