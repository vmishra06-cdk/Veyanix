import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { API_BASE_URL } from '../../config';
import Editor from '@monaco-editor/react';
import { 
  Play, Terminal, Cpu, Clock, Code, AlertTriangle, 
  Sparkles, ShieldAlert, FileCode, CheckCircle 
} from 'lucide-react';

const LANGUAGE_TEMPLATES: Record<string, string> = {
  python: `# Python Sandbox Runner
# Enforced Limits: 5s execution timeout, 64MB memory bounds.

def compute_primes(n):
    primes = []
    for num in range(2, n + 1):
        is_prime = True
        for i in range(2, int(num ** 0.5) + 1):
            if num % i == 0:
                is_prime = False
                break
        if is_prime:
            primes.append(num)
    return primes

print("Starting Prime Computation...")
result = compute_primes(200)
print(f"Discovered primes: {result}")
`,
  javascript: `// Node.js Sandbox Runner
// Enforced Limits: 5s execution timeout, 64MB memory bounds.

function calculateFactorial(num) {
  if (num === 0 || num === 1) return 1;
  return num * calculateFactorial(num - 1);
}

console.log("Starting Factorial Math...");
const ans = calculateFactorial(10);
console.log("Factorial(10) =", ans);
`
};

export const IDEApp: React.FC = () => {
  const fileSystemFiles = useSelector((state: RootState) => state.fileSystem.files);
  const filesOnly = fileSystemFiles.filter(f => !f.is_directory);

  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(LANGUAGE_TEMPLATES.python);
  
  // Execution Outputs
  const [running, setRunning] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState('Console initialized. Write code and click "Run".\n');
  const [metrics, setMetrics] = useState<any | null>(null);
  
  // Code Review & SAST Scanner
  const [activeRightPanel, setActiveRightPanel] = useState<'none' | 'review' | 'security'>('none');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewResult, setReviewResult] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  
  const token = localStorage.getItem('veyanix_token');
  const headers = { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  useEffect(() => {
    // Sync template when language changes
    setCode(LANGUAGE_TEMPLATES[language] || '');
  }, [language]);

  // Load a file from the workspace into the editor
  const handleLoadFile = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fileId = e.target.value;
    if (!fileId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/files/download/${fileId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.is_text) {
          setCode(data.content);
          // Auto detect language
          if (data.name.endsWith('.py')) setLanguage('python');
          else if (data.name.endsWith('.js')) setLanguage('javascript');
        } else {
          alert("Selected file is a binary file and cannot be edited in the IDE");
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Run code subprocess call
  const handleRunCode = async () => {
    setRunning(true);
    setConsoleOutput("[Running process...]\n");
    setMetrics(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/ide/run`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          language,
          code
        })
      });

      if (res.ok) {
        const data = await res.json();
        
        let output = "";
        if (data.stdout) output += data.stdout;
        if (data.stderr) output += data.stderr;
        if (!data.stdout && !data.stderr) output += "[Process completed with no output]";

        setConsoleOutput(output);
        setMetrics({
          success: data.success,
          exit_code: data.exit_code,
          time_ms: data.execution_time_ms,
          memory_kb: data.memory_usage_kb
        });
      } else {
        const err = await res.json();
        setConsoleOutput(`[Execution Engine Error: ${err.detail || 'Failed'}]`);
      }
    } catch (e) {
      setConsoleOutput("[Network Error: Server offline]");
    } finally {
      setRunning(false);
    }
  };

  // Trigger AI code reviewer
  const handleAIReview = async () => {
    setReviewLoading(true);
    setActiveRightPanel('review');
    setReviewResult("AI Agent is reviewing your source code lines...");

    try {
      // Create a temporary file to run review, or search if matching file exists
      // We can upload a mock code file or use form review endpoint
      const formData = new FormData();
      formData.append('name', `ide_code_${language === 'python' ? 'run.py' : 'run.js'}`);
      formData.append('path', `/ide_temp_${Date.now()}.${language === 'python' ? 'py' : 'js'}`);
      formData.append('is_directory', 'false');
      formData.append('is_encrypted', 'false');

      // Upload code block as file
      const uploadFormData = new FormData();
      const codeBlob = new Blob([code], { type: 'text/plain' });
      uploadFormData.append('file', codeBlob, `ide_code.${language === 'python' ? 'py' : 'js'}`);
      uploadFormData.append('path', `/ide_temp_${Date.now()}.${language === 'python' ? 'py' : 'js'}`);

      const uploadRes = await fetch(`${API_BASE_URL}/api/v1/files/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: uploadFormData
      });

      if (uploadRes.ok) {
        const fileData = await uploadRes.json();
        
        // Execute review on newly created temporary file ID
        const reviewRes = await fetch(`${API_BASE_URL}/api/v1/ai/review`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: new URLSearchParams({ file_id: fileData.id })
        });
        
        if (reviewRes.ok) {
          const data = await reviewRes.json();
          setReviewResult(data.review);
        } else {
          setReviewResult("AI Review engine returned an error.");
        }
        
        // Clean up temporary file
        await fetch(`${API_BASE_URL}/api/v1/files/${fileData.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else {
        setReviewResult("Failed to upload workspace text for review.");
      }
    } catch (e) {
      setReviewResult("Network error contacting code reviewer.");
    } finally {
      setReviewLoading(false);
    }
  };

  // Run regex-based Static vulnerability audit scan
  const handleSecurityScan = async () => {
    setScanLoading(true);
    setActiveRightPanel('security');
    setScanResult(null);

    try {
      // Upload code blob
      const uploadFormData = new FormData();
      const codeBlob = new Blob([code], { type: 'text/plain' });
      uploadFormData.append('file', codeBlob, `ide_scan.${language === 'python' ? 'py' : 'js'}`);
      uploadFormData.append('path', `/ide_scan_temp_${Date.now()}.${language === 'python' ? 'py' : 'js'}`);

      const uploadRes = await fetch(`${API_BASE_URL}/api/v1/files/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: uploadFormData
      });

      if (uploadRes.ok) {
        const fileData = await uploadRes.json();
        
        // Scan it
        const scanRes = await fetch(`${API_BASE_URL}/api/v1/security/scan/${fileData.id}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (scanRes.ok) {
          const data = await scanRes.json();
          setScanResult(data);
        }
        
        // Cleanup file
        await fetch(`${API_BASE_URL}/api/v1/files/${fileData.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setScanLoading(false);
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden h-full text-xs font-mono select-none">
      {/* Primary Code Area: Editor + Terminal console */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Editor controls Top toolbar */}
        <div className="h-11 border-b border-slate-900 bg-slate-950/50 px-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Language dropdown select */}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
            >
              <option value="python">Python 3.x</option>
              <option value="javascript">Node.js (JS)</option>
            </select>

            {/* Load file from storage selector */}
            <select
              onChange={handleLoadFile}
              defaultValue=""
              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-400 focus:outline-none max-w-[150px]"
            >
              <option value="" disabled>Load Workspace File</option>
              {filesOnly.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleAIReview}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-indigo-400 hover:text-indigo-300 rounded flex items-center space-x-1 transition-colors"
              title="Request AI review on code content"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Review</span>
            </button>
            <button
              onClick={handleSecurityScan}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-rose-400 hover:text-rose-350 rounded flex items-center space-x-1 transition-colors"
              title="Statically scan for coding vulnerability leaks"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Scan SAST</span>
            </button>
            
            <div className="h-4 w-[1px] bg-slate-800 mx-1" />

            <button
              onClick={handleRunCode}
              disabled={running}
              className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded flex items-center space-x-1.5 transition-colors font-semibold shadow-lg shadow-emerald-600/10"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Code</span>
            </button>
          </div>
        </div>

        {/* The Monaco Editor panel container */}
        <div className="flex-1 min-h-[300px] bg-slate-950/20 relative">
          <Editor
            height="100%"
            language={language}
            value={code}
            onChange={(val) => setCode(val || '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              fontFamily: 'Fira Code, Courier New, monospace',
              automaticLayout: true,
              padding: { top: 12 },
              lineNumbersMinChars: 3
            }}
            loading={<div className="p-4 text-slate-400">Loading IDE workspace modules...</div>}
          />
        </div>

        {/* Terminal/Stdout Terminal Console */}
        <div className="h-44 border-t border-slate-900 bg-slate-950 flex flex-col">
          <div className="h-8 border-b border-slate-900 px-4 flex items-center justify-between text-slate-400 text-[10px] select-none bg-slate-950/80">
            <div className="flex items-center space-x-1.5 font-semibold">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              <span>TERMINAL CONSOLE</span>
            </div>
            
            {/* Render sandbox performance graphs */}
            {metrics && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1 text-emerald-400">
                  <Clock className="w-3 h-3" />
                  <span>Time: {metrics.time_ms.toFixed(1)} ms</span>
                </div>
                <div className="flex items-center space-x-1 text-indigo-400">
                  <Cpu className="w-3 h-3" />
                  <span>Max RAM: {metrics.memory_kb > 1024 ? `${(metrics.memory_kb / 1024).toFixed(1)} MB` : `${metrics.memory_kb.toFixed(0)} KB`}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${metrics.success ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                  <span className={metrics.success ? 'text-emerald-400' : 'text-rose-400'}>
                    Exit Code: {metrics.exit_code}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="flex-1 p-3 overflow-y-auto font-mono text-[11px] text-slate-300 leading-normal selection:bg-indigo-900/50">
            <pre className="whitespace-pre-wrap">{consoleOutput}</pre>
          </div>
        </div>

      </div>

      {/* Auxiliary side panel: AI Code Review or Security Scan Results */}
      {activeRightPanel !== 'none' && (
        <div className="w-80 border-l border-slate-900 bg-slate-950/60 flex flex-col h-full animate-fade-in">
          <div className="h-11 border-b border-slate-900 px-4 flex items-center justify-between bg-slate-950/80 select-none">
            <span className="font-semibold text-slate-200">
              {activeRightPanel === 'review' ? 'AI Code Reviewer' : 'SAST Vulnerability Audit'}
            </span>
            <button 
              onClick={() => setActiveRightPanel('none')}
              className="text-slate-500 hover:text-slate-300 text-sm font-semibold"
            >
              ✕
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 leading-relaxed text-xs">
            {activeRightPanel === 'review' ? (
              /* Render Review text with basic markdown formatting */
              reviewLoading ? (
                <div className="flex items-center space-x-2 text-slate-400">
                  <span className="animate-pulse">AI is parsing syntax trees...</span>
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-slate-300 font-sans leading-normal">
                  {reviewResult}
                </div>
              )
            ) : (
              /* Render Static vulnerability list outcomes */
              scanLoading ? (
                <div className="flex items-center space-x-2 text-slate-400">
                  <span className="animate-pulse">Statically auditing code bytes...</span>
                </div>
              ) : scanResult ? (
                <div className="space-y-4 font-sans">
                  {/* Summary card */}
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wide font-mono">Security Score</div>
                      <div className={`text-xl font-bold font-mono ${
                        scanResult.health_score > 80 ? 'text-emerald-400' : scanResult.health_score > 50 ? 'text-amber-500' : 'text-rose-500'
                      }`}>
                        {scanResult.health_score} / 100
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wide font-mono">Vulnerabilities</div>
                      <div className="text-base font-semibold text-slate-200 font-mono">{scanResult.threat_count} found</div>
                    </div>
                  </div>

                  {/* Vulnerability details list */}
                  {scanResult.vulnerabilities.length === 0 ? (
                    <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-center text-emerald-400">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                      <div className="font-semibold text-xs">Safe Code Signature</div>
                      <div className="text-[10px] text-emerald-500/85 mt-1 leading-snug">Statically checked: no obvious leakage, eval run, or query injection indicators discovered.</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {scanResult.vulnerabilities.map((vuln: any, vIdx: number) => (
                        <div key={vIdx} className="p-3 bg-slate-900/40 border border-slate-850 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-200">{vuln.rule_name}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold font-mono ${
                              vuln.severity === 'CRITICAL' ? 'bg-red-950 text-red-400 border border-red-500/20' :
                              vuln.severity === 'HIGH' ? 'bg-amber-950 text-amber-400 border border-amber-500/20' : 'bg-slate-900 text-slate-400'
                            }`}>
                              {vuln.severity}
                            </span>
                          </div>
                          
                          <div className="text-[10px] text-slate-400 leading-snug">{vuln.description}</div>
                          
                          <div className="bg-slate-950 border border-slate-900 rounded p-1.5 font-mono text-[9px] text-rose-300 overflow-x-auto whitespace-pre leading-tight">
                            Line {vuln.line_number}: {vuln.matched_content}
                          </div>
                          
                          <div className="text-[10px] text-indigo-400 font-medium">
                            <span className="font-semibold">Fix suggestion:</span> {vuln.fix}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-slate-500 italic">No scan performed yet.</div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
