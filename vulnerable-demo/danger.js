// DANGER: This file contains intentional vulnerabilities for testing the Security Scanner

const AWS_ACCESS_KEY_ID = "AKIA1234567890ABCDEF"; // Critical: Hardcoded AWS Key

function login(username, password) {
    // High: SQL Injection
    const query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'";
    execute(query);
}

function runUserCode(code) {
    // High: Arbitrary Code Execution
    eval(code);
}

function render(userInput) {
    // Medium: XSS
    document.body.innerHTML = "<div>" + userInput + "</div>";
}
