// Security Tools Database - Kali Linux Style
// Categories and tools based on Kali Linux tool collection

export type ToolCategory =
    | 'information-gathering'
    | 'vulnerability-analysis'
    | 'web-application'
    | 'database-assessment'
    | 'password-attacks'
    | 'wireless-attacks'
    | 'reverse-engineering'
    | 'exploitation'
    | 'sniffing-spoofing'
    | 'post-exploitation'
    | 'forensics'
    | 'reporting'
    | 'social-engineering';

export interface SecurityTool {
    id: string;
    name: string;
    description: string;
    category: ToolCategory;
    subcategory?: string;
    installCmd: string; // Scoop or other install command
    launchCmd: string;
    docsUrl: string;
    icon?: string;
    tags: string[];
}

export const TOOL_CATEGORIES: { id: ToolCategory; name: string; icon: string; count: number }[] = [
    { id: 'information-gathering', name: 'Information Gathering', icon: 'Search', count: 0 },
    { id: 'vulnerability-analysis', name: 'Vulnerability Analysis', icon: 'AlertTriangle', count: 0 },
    { id: 'web-application', name: 'Web Application Analysis', icon: 'Globe', count: 0 },
    { id: 'database-assessment', name: 'Database Assessment', icon: 'Database', count: 0 },
    { id: 'password-attacks', name: 'Password Attacks', icon: 'Key', count: 0 },
    { id: 'wireless-attacks', name: 'Wireless Attacks', icon: 'Wifi', count: 0 },
    { id: 'reverse-engineering', name: 'Reverse Engineering', icon: 'Code', count: 0 },
    { id: 'exploitation', name: 'Exploitation Tools', icon: 'Crosshair', count: 0 },
    { id: 'sniffing-spoofing', name: 'Sniffing & Spoofing', icon: 'Eye', count: 0 },
    { id: 'post-exploitation', name: 'Post Exploitation', icon: 'Terminal', count: 0 },
    { id: 'forensics', name: 'Forensics', icon: 'HardDrive', count: 0 },
    { id: 'reporting', name: 'Reporting Tools', icon: 'FileText', count: 0 },
    { id: 'social-engineering', name: 'Social Engineering', icon: 'Users', count: 0 },
];

// Tool database - organized by category
export const SECURITY_TOOLS: SecurityTool[] = [
    // === INFORMATION GATHERING ===
    { id: 'nmap', name: 'Nmap', description: 'Network exploration and security auditing', category: 'information-gathering', installCmd: 'scoop install nmap', launchCmd: 'nmap', docsUrl: 'https://nmap.org/docs.html', tags: ['network', 'scanner', 'port'] },
    { id: 'masscan', name: 'Masscan', description: 'Fast TCP port scanner', category: 'information-gathering', installCmd: 'scoop install masscan', launchCmd: 'masscan', docsUrl: 'https://github.com/robertdavidgraham/masscan', tags: ['network', 'scanner', 'fast'] },
    { id: 'dnsenum', name: 'DNSenum', description: 'DNS enumeration tool', category: 'information-gathering', installCmd: 'pip install dnsenum', launchCmd: 'dnsenum', docsUrl: 'https://github.com/fwaeytens/dnsenum', tags: ['dns', 'enumeration'] },
    { id: 'dnsrecon', name: 'DNSRecon', description: 'DNS reconnaissance tool', category: 'information-gathering', installCmd: 'pip install dnsrecon', launchCmd: 'dnsrecon', docsUrl: 'https://github.com/darkoperator/dnsrecon', tags: ['dns', 'recon'] },
    { id: 'fierce', name: 'Fierce', description: 'DNS reconnaissance tool', category: 'information-gathering', installCmd: 'pip install fierce', launchCmd: 'fierce', docsUrl: 'https://github.com/mschwager/fierce', tags: ['dns', 'scanner'] },
    { id: 'theharvester', name: 'theHarvester', description: 'Email, subdomain and people harvester', category: 'information-gathering', installCmd: 'pip install theharvester', launchCmd: 'theHarvester', docsUrl: 'https://github.com/laramies/theHarvester', tags: ['osint', 'email', 'subdomain'] },
    { id: 'sublist3r', name: 'Sublist3r', description: 'Subdomain enumeration tool', category: 'information-gathering', installCmd: 'pip install sublist3r', launchCmd: 'sublist3r', docsUrl: 'https://github.com/aboul3la/Sublist3r', tags: ['subdomain', 'enumeration'] },
    { id: 'amass', name: 'Amass', description: 'In-depth Attack Surface Mapping', category: 'information-gathering', installCmd: 'scoop install amass', launchCmd: 'amass', docsUrl: 'https://github.com/OWASP/Amass', tags: ['osint', 'subdomain', 'recon'] },
    { id: 'recon-ng', name: 'Recon-ng', description: 'Full-featured reconnaissance framework', category: 'information-gathering', installCmd: 'pip install recon-ng', launchCmd: 'recon-ng', docsUrl: 'https://github.com/lanmaster53/recon-ng', tags: ['framework', 'osint', 'recon'] },
    { id: 'maltego', name: 'Maltego', description: 'Interactive data mining tool', category: 'information-gathering', installCmd: 'manual', launchCmd: 'maltego', docsUrl: 'https://www.maltego.com/documentation/', tags: ['osint', 'visualization', 'graph'] },
    { id: 'shodan', name: 'Shodan CLI', description: 'Search engine for Internet-connected devices', category: 'information-gathering', installCmd: 'pip install shodan', launchCmd: 'shodan', docsUrl: 'https://cli.shodan.io/', tags: ['osint', 'iot', 'search'] },
    { id: 'censys', name: 'Censys', description: 'Search engine for devices and networks', category: 'information-gathering', installCmd: 'pip install censys', launchCmd: 'censys', docsUrl: 'https://censys.io/docs', tags: ['osint', 'search'] },
    { id: 'whatweb', name: 'WhatWeb', description: 'Web scanner to identify technologies', category: 'information-gathering', installCmd: 'gem install whatweb', launchCmd: 'whatweb', docsUrl: 'https://github.com/urbanadventurer/WhatWeb', tags: ['web', 'fingerprint'] },
    { id: 'wafw00f', name: 'wafw00f', description: 'Web Application Firewall detector', category: 'information-gathering', installCmd: 'pip install wafw00f', launchCmd: 'wafw00f', docsUrl: 'https://github.com/EnableSecurity/wafw00f', tags: ['web', 'waf', 'detection'] },
    { id: 'enum4linux', name: 'enum4linux', description: 'Windows/Samba enumeration tool', category: 'information-gathering', installCmd: 'git clone https://github.com/CiscoCXSecurity/enum4linux', launchCmd: 'enum4linux', docsUrl: 'https://github.com/CiscoCXSecurity/enum4linux', tags: ['windows', 'smb', 'enumeration'] },

    // === VULNERABILITY ANALYSIS ===
    { id: 'nikto', name: 'Nikto', description: 'Web server scanner', category: 'vulnerability-analysis', installCmd: 'scoop install nikto', launchCmd: 'nikto', docsUrl: 'https://cirt.net/Nikto2', tags: ['web', 'scanner', 'vulnerability'] },
    { id: 'openvas', name: 'OpenVAS', description: 'Open Vulnerability Assessment Scanner', category: 'vulnerability-analysis', installCmd: 'manual', launchCmd: 'openvas', docsUrl: 'https://www.openvas.org/', tags: ['vulnerability', 'scanner', 'enterprise'] },
    { id: 'nessus', name: 'Nessus', description: 'Vulnerability scanner', category: 'vulnerability-analysis', installCmd: 'manual', launchCmd: 'nessus', docsUrl: 'https://www.tenable.com/products/nessus', tags: ['vulnerability', 'scanner', 'commercial'] },
    { id: 'nuclei', name: 'Nuclei', description: 'Fast vulnerability scanner', category: 'vulnerability-analysis', installCmd: 'scoop install nuclei', launchCmd: 'nuclei', docsUrl: 'https://nuclei.projectdiscovery.io/', tags: ['vulnerability', 'scanner', 'templates'] },
    { id: 'wpscan', name: 'WPScan', description: 'WordPress vulnerability scanner', category: 'vulnerability-analysis', installCmd: 'gem install wpscan', launchCmd: 'wpscan', docsUrl: 'https://wpscan.com/docs', tags: ['wordpress', 'cms', 'scanner'] },
    { id: 'joomscan', name: 'JoomScan', description: 'Joomla vulnerability scanner', category: 'vulnerability-analysis', installCmd: 'git clone https://github.com/OWASP/joomscan', launchCmd: 'joomscan', docsUrl: 'https://github.com/OWASP/joomscan', tags: ['joomla', 'cms', 'scanner'] },
    { id: 'droopescan', name: 'Droopescan', description: 'CMS vulnerability scanner', category: 'vulnerability-analysis', installCmd: 'pip install droopescan', launchCmd: 'droopescan', docsUrl: 'https://github.com/droope/droopescan', tags: ['drupal', 'cms', 'scanner'] },
    { id: 'lynis', name: 'Lynis', description: 'Security auditing tool for Unix', category: 'vulnerability-analysis', installCmd: 'scoop install lynis', launchCmd: 'lynis', docsUrl: 'https://cisofy.com/lynis/', tags: ['audit', 'hardening', 'unix'] },
    { id: 'testssl', name: 'testssl.sh', description: 'SSL/TLS testing tool', category: 'vulnerability-analysis', installCmd: 'git clone https://github.com/drwetter/testssl.sh', launchCmd: 'testssl.sh', docsUrl: 'https://testssl.sh/', tags: ['ssl', 'tls', 'crypto'] },
    { id: 'sslyze', name: 'SSLyze', description: 'SSL configuration scanner', category: 'vulnerability-analysis', installCmd: 'pip install sslyze', launchCmd: 'sslyze', docsUrl: 'https://github.com/nabla-c0d3/sslyze', tags: ['ssl', 'tls', 'scanner'] },

    // === WEB APPLICATION ANALYSIS ===
    { id: 'burpsuite', name: 'Burp Suite', description: 'Web vulnerability scanner and proxy', category: 'web-application', installCmd: 'manual', launchCmd: 'burpsuite', docsUrl: 'https://portswigger.net/burp/documentation', tags: ['proxy', 'scanner', 'web'] },
    { id: 'zaproxy', name: 'OWASP ZAP', description: 'Web app security scanner', category: 'web-application', installCmd: 'scoop install zap', launchCmd: 'zap', docsUrl: 'https://www.zaproxy.org/docs/', tags: ['proxy', 'scanner', 'owasp'] },
    { id: 'sqlmap', name: 'SQLMap', description: 'Automatic SQL injection tool', category: 'web-application', installCmd: 'pip install sqlmap', launchCmd: 'sqlmap', docsUrl: 'https://sqlmap.org/', tags: ['sql', 'injection', 'database'] },
    { id: 'gobuster', name: 'Gobuster', description: 'Directory/DNS bruteforcer', category: 'web-application', installCmd: 'scoop install gobuster', launchCmd: 'gobuster', docsUrl: 'https://github.com/OJ/gobuster', tags: ['bruteforce', 'directory', 'dns'] },
    { id: 'dirbuster', name: 'DirBuster', description: 'Directory bruteforce tool', category: 'web-application', installCmd: 'manual', launchCmd: 'dirbuster', docsUrl: 'https://github.com/KajanM/DirBuster', tags: ['bruteforce', 'directory'] },
    { id: 'ffuf', name: 'ffuf', description: 'Fast web fuzzer', category: 'web-application', installCmd: 'scoop install ffuf', launchCmd: 'ffuf', docsUrl: 'https://github.com/ffuf/ffuf', tags: ['fuzzing', 'bruteforce', 'fast'] },
    { id: 'wfuzz', name: 'Wfuzz', description: 'Web application fuzzer', category: 'web-application', installCmd: 'pip install wfuzz', launchCmd: 'wfuzz', docsUrl: 'https://wfuzz.readthedocs.io/', tags: ['fuzzing', 'bruteforce'] },
    { id: 'xsstrike', name: 'XSStrike', description: 'XSS detection suite', category: 'web-application', installCmd: 'pip install xsstrike', launchCmd: 'xsstrike', docsUrl: 'https://github.com/s0md3v/XSStrike', tags: ['xss', 'injection'] },
    { id: 'dalfox', name: 'Dalfox', description: 'XSS scanning and analysis', category: 'web-application', installCmd: 'scoop install dalfox', launchCmd: 'dalfox', docsUrl: 'https://github.com/hahwul/dalfox', tags: ['xss', 'scanner'] },
    { id: 'commix', name: 'Commix', description: 'Command injection exploiter', category: 'web-application', installCmd: 'pip install commix', launchCmd: 'commix', docsUrl: 'https://github.com/commixproject/commix', tags: ['injection', 'command'] },
    { id: 'httpx', name: 'httpx', description: 'Fast HTTP toolkit', category: 'web-application', installCmd: 'scoop install httpx', launchCmd: 'httpx', docsUrl: 'https://github.com/projectdiscovery/httpx', tags: ['http', 'toolkit', 'fast'] },

    // === PASSWORD ATTACKS ===
    { id: 'hashcat', name: 'Hashcat', description: 'Advanced password recovery', category: 'password-attacks', installCmd: 'scoop install hashcat', launchCmd: 'hashcat', docsUrl: 'https://hashcat.net/wiki/', tags: ['password', 'hash', 'gpu'] },
    { id: 'john', name: 'John the Ripper', description: 'Password cracker', category: 'password-attacks', installCmd: 'scoop install john', launchCmd: 'john', docsUrl: 'https://www.openwall.com/john/doc/', tags: ['password', 'cracker'] },
    { id: 'hydra', name: 'Hydra', description: 'Network logon cracker', category: 'password-attacks', installCmd: 'scoop install hydra', launchCmd: 'hydra', docsUrl: 'https://github.com/vanhauser-thc/thc-hydra', tags: ['bruteforce', 'login', 'network'] },
    { id: 'medusa', name: 'Medusa', description: 'Parallel password cracker', category: 'password-attacks', installCmd: 'git clone https://github.com/jmk-foofus/medusa', launchCmd: 'medusa', docsUrl: 'https://github.com/jmk-foofus/medusa', tags: ['bruteforce', 'parallel'] },
    { id: 'ncrack', name: 'Ncrack', description: 'Network authentication cracker', category: 'password-attacks', installCmd: 'scoop install ncrack', launchCmd: 'ncrack', docsUrl: 'https://nmap.org/ncrack/', tags: ['bruteforce', 'network'] },
    { id: 'crunch', name: 'Crunch', description: 'Wordlist generator', category: 'password-attacks', installCmd: 'git clone https://github.com/crunchsec/crunch', launchCmd: 'crunch', docsUrl: 'https://github.com/crunchsec/crunch', tags: ['wordlist', 'generator'] },
    { id: 'cewl', name: 'CeWL', description: 'Custom wordlist generator', category: 'password-attacks', installCmd: 'gem install cewl', launchCmd: 'cewl', docsUrl: 'https://github.com/digininja/CeWL', tags: ['wordlist', 'spider'] },
    { id: 'ophcrack', name: 'Ophcrack', description: 'Windows password cracker', category: 'password-attacks', installCmd: 'manual', launchCmd: 'ophcrack', docsUrl: 'https://ophcrack.sourceforge.io/', tags: ['windows', 'rainbow', 'tables'] },
    { id: 'mimikatz', name: 'Mimikatz', description: 'Windows credential extraction', category: 'password-attacks', installCmd: 'manual', launchCmd: 'mimikatz', docsUrl: 'https://github.com/gentilkiwi/mimikatz/wiki', tags: ['windows', 'credentials', 'dump'] },

    // === EXPLOITATION TOOLS ===
    { id: 'metasploit', name: 'Metasploit', description: 'Penetration testing framework', category: 'exploitation', installCmd: 'manual', launchCmd: 'msfconsole', docsUrl: 'https://docs.metasploit.com/', tags: ['framework', 'exploit', 'payload'] },
    { id: 'searchsploit', name: 'SearchSploit', description: 'Exploit database search', category: 'exploitation', installCmd: 'git clone https://github.com/offensive-security/exploitdb', launchCmd: 'searchsploit', docsUrl: 'https://www.exploit-db.com/searchsploit', tags: ['exploit', 'database', 'search'] },
    { id: 'msfvenom', name: 'MSFVenom', description: 'Payload generator', category: 'exploitation', installCmd: 'included with metasploit', launchCmd: 'msfvenom', docsUrl: 'https://docs.metasploit.com/docs/using-metasploit/basics/how-to-use-msfvenom.html', tags: ['payload', 'generator', 'shellcode'] },
    { id: 'crackmapexec', name: 'CrackMapExec', description: 'Network exploitation swiss army knife', category: 'exploitation', installCmd: 'pip install crackmapexec', launchCmd: 'crackmapexec', docsUrl: 'https://wiki.porchetta.industries/', tags: ['network', 'smb', 'ad'] },
    { id: 'impacket', name: 'Impacket', description: 'Network protocol tools', category: 'exploitation', installCmd: 'pip install impacket', launchCmd: 'impacket-scripts', docsUrl: 'https://github.com/SecureAuthCorp/impacket', tags: ['network', 'protocols', 'smb'] },
    { id: 'evil-winrm', name: 'Evil-WinRM', description: 'WinRM shell for pentesting', category: 'exploitation', installCmd: 'gem install evil-winrm', launchCmd: 'evil-winrm', docsUrl: 'https://github.com/Hackplayers/evil-winrm', tags: ['windows', 'winrm', 'shell'] },
    { id: 'covenant', name: 'Covenant', description: '.NET C2 framework', category: 'exploitation', installCmd: 'manual', launchCmd: 'covenant', docsUrl: 'https://github.com/cobbr/Covenant', tags: ['c2', 'framework', 'dotnet'] },
    { id: 'sliver', name: 'Sliver', description: 'Cross-platform C2 framework', category: 'exploitation', installCmd: 'scoop install sliver', launchCmd: 'sliver', docsUrl: 'https://github.com/BishopFox/sliver', tags: ['c2', 'framework', 'implant'] },

    // === SNIFFING & SPOOFING ===
    { id: 'wireshark', name: 'Wireshark', description: 'Network protocol analyzer', category: 'sniffing-spoofing', installCmd: 'scoop install wireshark', launchCmd: 'wireshark', docsUrl: 'https://www.wireshark.org/docs/', tags: ['network', 'packets', 'analysis'] },
    { id: 'tcpdump', name: 'tcpdump', description: 'Command-line packet analyzer', category: 'sniffing-spoofing', installCmd: 'scoop install tcpdump', launchCmd: 'tcpdump', docsUrl: 'https://www.tcpdump.org/manpages/tcpdump.1.html', tags: ['network', 'packets', 'cli'] },
    { id: 'ettercap', name: 'Ettercap', description: 'MITM attack suite', category: 'sniffing-spoofing', installCmd: 'manual', launchCmd: 'ettercap', docsUrl: 'https://www.ettercap-project.org/docs.html', tags: ['mitm', 'arp', 'spoofing'] },
    { id: 'bettercap', name: 'Bettercap', description: 'Swiss army knife for network attacks', category: 'sniffing-spoofing', installCmd: 'scoop install bettercap', launchCmd: 'bettercap', docsUrl: 'https://www.bettercap.org/docs/', tags: ['mitm', 'network', 'wifi'] },
    { id: 'responder', name: 'Responder', description: 'LLMNR/NBT-NS poisoner', category: 'sniffing-spoofing', installCmd: 'git clone https://github.com/lgandx/Responder', launchCmd: 'Responder.py', docsUrl: 'https://github.com/lgandx/Responder', tags: ['llmnr', 'ntlm', 'poisoning'] },
    { id: 'mitmproxy', name: 'mitmproxy', description: 'Interactive HTTPS proxy', category: 'sniffing-spoofing', installCmd: 'pip install mitmproxy', launchCmd: 'mitmproxy', docsUrl: 'https://docs.mitmproxy.org/', tags: ['proxy', 'https', 'mitm'] },

    // === WIRELESS ATTACKS ===
    { id: 'aircrack-ng', name: 'Aircrack-ng', description: 'WiFi security auditing tools', category: 'wireless-attacks', installCmd: 'scoop install aircrack-ng', launchCmd: 'aircrack-ng', docsUrl: 'https://www.aircrack-ng.org/documentation.html', tags: ['wifi', 'wep', 'wpa'] },
    { id: 'wifite', name: 'Wifite', description: 'Automated wireless attacker', category: 'wireless-attacks', installCmd: 'pip install wifite', launchCmd: 'wifite', docsUrl: 'https://github.com/derv82/wifite2', tags: ['wifi', 'automated'] },
    { id: 'fern-wifi', name: 'Fern Wifi Cracker', description: 'GUI wireless auditing', category: 'wireless-attacks', installCmd: 'manual', launchCmd: 'fern-wifi-cracker', docsUrl: 'https://github.com/savio-code/fern-wifi-cracker', tags: ['wifi', 'gui'] },
    { id: 'kismet', name: 'Kismet', description: 'Wireless network detector', category: 'wireless-attacks', installCmd: 'manual', launchCmd: 'kismet', docsUrl: 'https://www.kismetwireless.net/docs/', tags: ['wifi', 'detection', 'monitoring'] },
    { id: 'reaver', name: 'Reaver', description: 'WPS brute force attack', category: 'wireless-attacks', installCmd: 'git clone https://github.com/t6x/reaver-wps-fork-t6x', launchCmd: 'reaver', docsUrl: 'https://github.com/t6x/reaver-wps-fork-t6x', tags: ['wps', 'bruteforce'] },

    // === FORENSICS ===
    { id: 'autopsy', name: 'Autopsy', description: 'Digital forensics platform', category: 'forensics', installCmd: 'manual', launchCmd: 'autopsy', docsUrl: 'https://www.autopsy.com/documentation/', tags: ['disk', 'forensics', 'gui'] },
    { id: 'volatility', name: 'Volatility', description: 'Memory forensics framework', category: 'forensics', installCmd: 'pip install volatility3', launchCmd: 'vol', docsUrl: 'https://volatility3.readthedocs.io/', tags: ['memory', 'forensics', 'analysis'] },
    { id: 'binwalk', name: 'Binwalk', description: 'Firmware analysis tool', category: 'forensics', installCmd: 'pip install binwalk', launchCmd: 'binwalk', docsUrl: 'https://github.com/ReFirmLabs/binwalk', tags: ['firmware', 'extraction'] },
    { id: 'foremost', name: 'Foremost', description: 'File carving tool', category: 'forensics', installCmd: 'manual', launchCmd: 'foremost', docsUrl: 'https://github.com/korczis/foremost', tags: ['carving', 'recovery'] },
    { id: 'exiftool', name: 'ExifTool', description: 'Metadata extraction tool', category: 'forensics', installCmd: 'scoop install exiftool', launchCmd: 'exiftool', docsUrl: 'https://exiftool.org/', tags: ['metadata', 'images'] },
    { id: 'sleuthkit', name: 'Sleuth Kit', description: 'Disk investigation tools', category: 'forensics', installCmd: 'scoop install sleuthkit', launchCmd: 'fls', docsUrl: 'https://www.sleuthkit.org/sleuthkit/docs.php', tags: ['disk', 'filesystem'] },

    // === REVERSE ENGINEERING ===
    { id: 'ghidra', name: 'Ghidra', description: 'NSA reverse engineering tool', category: 'reverse-engineering', installCmd: 'scoop install ghidra', launchCmd: 'ghidra', docsUrl: 'https://ghidra-sre.org/', tags: ['disassembler', 'decompiler', 'nsa'] },
    { id: 'radare2', name: 'Radare2', description: 'Reverse engineering framework', category: 'reverse-engineering', installCmd: 'scoop install radare2', launchCmd: 'r2', docsUrl: 'https://book.rada.re/', tags: ['disassembler', 'debugger'] },
    { id: 'ida', name: 'IDA Pro', description: 'Interactive Disassembler', category: 'reverse-engineering', installCmd: 'manual', launchCmd: 'ida', docsUrl: 'https://hex-rays.com/ida-pro/', tags: ['disassembler', 'commercial'] },
    { id: 'x64dbg', name: 'x64dbg', description: 'Windows debugger', category: 'reverse-engineering', installCmd: 'scoop install x64dbg', launchCmd: 'x64dbg', docsUrl: 'https://x64dbg.com/', tags: ['debugger', 'windows'] },
    { id: 'ollydbg', name: 'OllyDbg', description: 'Windows 32-bit debugger', category: 'reverse-engineering', installCmd: 'manual', launchCmd: 'ollydbg', docsUrl: 'http://www.ollydbg.de/', tags: ['debugger', 'x86'] },
    { id: 'dnspy', name: 'dnSpy', description: '.NET debugger and assembly editor', category: 'reverse-engineering', installCmd: 'scoop install dnspy', launchCmd: 'dnSpy', docsUrl: 'https://github.com/dnSpy/dnSpy', tags: ['dotnet', 'decompiler'] },

    // === SOCIAL ENGINEERING ===
    { id: 'setoolkit', name: 'SET', description: 'Social Engineering Toolkit', category: 'social-engineering', installCmd: 'git clone https://github.com/trustedsec/social-engineer-toolkit', launchCmd: 'setoolkit', docsUrl: 'https://github.com/trustedsec/social-engineer-toolkit', tags: ['phishing', 'toolkit'] },
    { id: 'gophish', name: 'GoPhish', description: 'Phishing framework', category: 'social-engineering', installCmd: 'scoop install gophish', launchCmd: 'gophish', docsUrl: 'https://docs.getgophish.com/', tags: ['phishing', 'campaign'] },
    { id: 'king-phisher', name: 'King Phisher', description: 'Phishing campaign toolkit', category: 'social-engineering', installCmd: 'git clone https://github.com/rsmusllp/king-phisher', launchCmd: 'king-phisher', docsUrl: 'https://github.com/rsmusllp/king-phisher', tags: ['phishing', 'server'] },
    { id: 'evilginx2', name: 'Evilginx2', description: 'MITM attack framework', category: 'social-engineering', installCmd: 'go install github.com/kgretzky/evilginx2@latest', launchCmd: 'evilginx2', docsUrl: 'https://github.com/kgretzky/evilginx2', tags: ['phishing', 'mitm', '2fa'] },

    // === POST EXPLOITATION ===
    { id: 'empire', name: 'Empire', description: 'Post-exploitation framework', category: 'post-exploitation', installCmd: 'git clone https://github.com/BC-SECURITY/Empire', launchCmd: 'empire', docsUrl: 'https://bc-security.gitbook.io/empire-wiki/', tags: ['c2', 'powershell'] },
    { id: 'bloodhound', name: 'BloodHound', description: 'Active Directory mapper', category: 'post-exploitation', installCmd: 'manual', launchCmd: 'bloodhound', docsUrl: 'https://bloodhound.readthedocs.io/', tags: ['ad', 'graph', 'attack-path'] },
    { id: 'powersploit', name: 'PowerSploit', description: 'PowerShell post-exploitation', category: 'post-exploitation', installCmd: 'git clone https://github.com/PowerShellMafia/PowerSploit', launchCmd: 'powershell', docsUrl: 'https://github.com/PowerShellMafia/PowerSploit', tags: ['powershell', 'windows'] },
    { id: 'chisel', name: 'Chisel', description: 'TCP/UDP tunneling', category: 'post-exploitation', installCmd: 'scoop install chisel', launchCmd: 'chisel', docsUrl: 'https://github.com/jpillora/chisel', tags: ['tunnel', 'pivot'] },
    { id: 'ligolo-ng', name: 'Ligolo-ng', description: 'Tunneling/pivoting tool', category: 'post-exploitation', installCmd: 'go install github.com/nicocha30/ligolo-ng@latest', launchCmd: 'ligolo-ng', docsUrl: 'https://github.com/nicocha30/ligolo-ng', tags: ['tunnel', 'pivot'] },

    // === REPORTING ===
    { id: 'cherrytree', name: 'CherryTree', description: 'Hierarchical note taking', category: 'reporting', installCmd: 'scoop install cherrytree', launchCmd: 'cherrytree', docsUrl: 'https://www.giuspen.com/cherrytree/', tags: ['notes', 'documentation'] },
    { id: 'dradis', name: 'Dradis', description: 'Collaboration and reporting', category: 'reporting', installCmd: 'manual', launchCmd: 'dradis', docsUrl: 'https://dradisframework.com/ce/documentation/', tags: ['reporting', 'collaboration'] },
    { id: 'pipal', name: 'Pipal', description: 'Password analyzer', category: 'reporting', installCmd: 'gem install pipal', launchCmd: 'pipal', docsUrl: 'https://github.com/digininja/pipal', tags: ['password', 'analysis'] },
];

// Update category counts
TOOL_CATEGORIES.forEach(cat => {
    cat.count = SECURITY_TOOLS.filter(t => t.category === cat.id).length;
});

export function getToolsByCategory(category: ToolCategory): SecurityTool[] {
    return SECURITY_TOOLS.filter(t => t.category === category);
}

export function searchTools(query: string): SecurityTool[] {
    const q = query.toLowerCase();
    return SECURITY_TOOLS.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.includes(q))
    );
}
