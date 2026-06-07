import re
from typing import List, Dict, Any

# Security patterns to scan for
SECURITY_RULES = [
    {
        "id": "SEC-001",
        "name": "Hardcoded Secret / API Key",
        "severity": "CRITICAL",
        "pattern": r"(?:key|secret|password|passwd|token|apikey|api_key|private_key)\s*=\s*['\"][a-zA-Z0-9_\-\.\:\/]{12,}['\"]",
        "description": "Detected a string assignment that resembles an API key or password. Hardcoding credentials poses a severe leakage risk.",
        "fix": "Use environment variables or a secure vault configuration instead."
    },
    {
        "id": "SEC-002",
        "name": "Dangerous Process Execution / Injection",
        "pattern": r"(?:eval|exec|os\.system|subprocess\.Popen\(.*shell\s*=\s*True|subprocess\.run\(.*shell\s*=\s*True)\(",
        "severity": "HIGH",
        "description": "Detected dynamic execution of input text (eval/exec) or system shells with unvalidated inputs. Leads to Remote Code Execution (RCE).",
        "fix": "Avoid dynamic evaluation. If invoking subprocesses, pass arguments as lists with shell=False."
    },
    {
        "id": "SEC-003",
        "name": "SQL Injection Vulnerability",
        "pattern": r"(?:\.execute|\.raw)\(\s*f?['\"].*SELECT.*WHERE.*\+\s*\w+|\.execute\(\s*f['\"].*SELECT.*WHERE.*\{\w+\}",
        "severity": "HIGH",
        "description": "Detected dynamic SQL query construction string interpolation or concatenation. Allows attackers to execute arbitrary SQL commands.",
        "fix": "Use parameterized queries or ORM interfaces (e.g. engine, SQLAlchemy)."
    },
    {
        "id": "SEC-004",
        "name": "XSS (Cross-Site Scripting) Hook",
        "pattern": r"dangerouslySetInnerHTML\s*=|innerHTML\s*=",
        "severity": "MEDIUM",
        "description": "Detected direct HTML insertion hooks. Enables Cross-Site Scripting injections in user browsers.",
        "fix": "Sanitize inputs using DOMPurify or use standard templating engines that auto-escape strings."
    },
    {
        "id": "SEC-005",
        "name": "Insecure Randomness Source",
        "pattern": r"random\.random|random\.randint|random\.choice",
        "severity": "LOW",
        "description": "Detected standard pseudo-random number generator usage in critical paths. Not cryptographically secure.",
        "fix": "Use 'secrets' module for cryptographically strong security tokens."
    }
]

def scan_code_content(filename: str, content: str) -> Dict[str, Any]:
    """
    Statically analyzes source code content against regular expressions to detect 
    vulnerabilities, audit risks, and compute a total security score.
    """
    vulnerabilities: List[Dict[str, Any]] = []
    lines = content.splitlines()
    
    # Run matching for each rule
    for rule in SECURITY_RULES:
        regex = re.compile(rule["pattern"], re.IGNORECASE)
        for idx, line in enumerate(lines):
            # Clean comments to minimize false positives (basic check)
            clean_line = line.split("#")[0].split("//")[0]
            
            match = regex.search(clean_line)
            if match:
                vulnerabilities.append({
                    "rule_id": rule["id"],
                    "rule_name": rule["name"],
                    "severity": rule["severity"],
                    "line_number": idx + 1,
                    "matched_content": line.strip(),
                    "description": rule["description"],
                    "fix": rule["fix"]
                })
                
    # Calculate a simple threat score
    # CRITICAL = 40, HIGH = 25, MEDIUM = 10, LOW = 5
    score_weights = {
        "CRITICAL": 40,
        "HIGH": 25,
        "MEDIUM": 10,
        "LOW": 5
    }
    
    total_penalty = sum(score_weights.get(v["severity"], 5) for v in vulnerabilities)
    health_score = max(0, 100 - total_penalty)
    
    severity_level = "SAFE"
    if health_score < 50:
        severity_level = "DANGER"
    elif health_score < 85:
        severity_level = "WARNING"
        
    return {
        "filename": filename,
        "health_score": health_score,
        "severity_level": severity_level,
        "vulnerabilities": vulnerabilities,
        "scanned_lines": len(lines),
        "threat_count": len(vulnerabilities)
    }
