import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { API_BASE_URL } from '../../config';
import { 
  ShieldAlert, ShieldCheck, Lock, Unlock, Eye, Trash2, 
  Terminal, UserCheck, AlertTriangle, Key, Clock, Shield 
} from 'lucide-react';

interface AuditLogItem {
  id: string;
  user_id: string;
  action: string;
  ip_address: string;
  details: any;
  created_at: string;
}

export const SecurityApp: React.FC = () => {
  const fileSystemFiles = useSelector((state: RootState) => state.fileSystem.files);
  const filesOnly = fileSystemFiles.filter(f => !f.is_directory);
  
  const [activeTab, setActiveTab] = useState<'vulnerabilities' | 'audits' | 'rbac'>('vulnerabilities');
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  
  // Vulnerability states
  const [scanFileId, setScanFileId] = useState('');
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [scanLoading, setScanLoading] = useState(false);

  const token = localStorage.getItem('veyanix_token');
  const userRole = localStorage.getItem('veyanix_role') || 'developer';
  const headers = { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Fetch admin audit logs on tab selection
  const fetchAuditLogs = async () => {
    if (userRole !== 'admin') {
      setAuditError("Access Denied. Audit log files are restricted to 'admin' credentials.");
      return;
    }
    setAuditLoading(true);
    setAuditError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/security/audits`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      } else {
        const err = await res.json();
        setAuditError(err.detail || "Authentication failure fetching logs.");
      }
    } catch (e) {
      setAuditError("Network failure connecting to audit daemon.");
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'audits') {
      fetchAuditLogs();
    }
  }, [activeTab]);

  // Run SAST scan over selected file
  const handleScanFile = async () => {
    if (!scanFileId) return;
    setScanLoading(true);
    setScanResult(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/security/scan/${scanFileId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setScanResult(data);
      } else {
        alert("Scan execution failed.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setScanLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full select-none text-xs font-sans bg-slate-950/20">
      
      {/* Sub-tab navigation */}
      <div className="flex border-b border-slate-900 bg-slate-950/45 px-3 py-1">
        <button
          onClick={() => setActiveTab('vulnerabilities')}
          className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'vulnerabilities' 
              ? 'bg-indigo-950/40 text-indigo-300 border border-indigo-500/20' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>SAST Vulnerabilities</span>
        </button>
        <button
          onClick={() => setActiveTab('audits')}
          className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ml-2 ${
            activeTab === 'audits' 
              ? 'bg-indigo-950/40 text-indigo-300 border border-indigo-500/20' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Audit Trail Logs</span>
        </button>
        <button
          onClick={() => setActiveTab('rbac')}
          className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ml-2 ${
            activeTab === 'rbac' 
              ? 'bg-indigo-950/40 text-indigo-300 border border-indigo-500/20' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>RBAC Settings</span>
        </button>
      </div>

      {/* Main Workspace content */}
      <div className="flex-1 overflow-auto p-4 min-h-0 flex flex-col">
        
        {activeTab === 'vulnerabilities' && (
          /* Tab 1: SAST Code scanner */
          <div className="space-y-4 flex-1 flex flex-col min-h-0">
            <div className="flex items-center space-x-3 bg-slate-900/40 border border-slate-900 p-3 rounded-xl">
              <Shield className="w-8 h-8 text-indigo-400" />
              <div>
                <h4 className="font-semibold text-slate-200 text-xs">Static Application Security Testing (SAST)</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Static analysis scans file streams for hardcoded API secret keys, process command injections, and dynamic SQL query assemblies.
                </p>
              </div>
            </div>

            {/* Select file form */}
            <div className="flex items-center space-x-2.5 p-3 bg-slate-950/45 border border-slate-900 rounded-xl">
              <select
                value={scanFileId}
                onChange={(e) => setScanFileId(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
              >
                <option value="">Select File to Scan</option>
                {filesOnly.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <button
                onClick={handleScanFile}
                disabled={!scanFileId || scanLoading}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded font-semibold text-xs flex items-center space-x-1 transition-colors"
              >
                <span>Trigger Security Audit</span>
              </button>
            </div>

            {/* Scan results container */}
            <div className="flex-1 min-h-[150px] overflow-y-auto bg-slate-950/70 border border-slate-900 rounded-2xl p-4">
              {scanLoading ? (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <span className="animate-pulse">Parsing file byte arrays for threat indicators...</span>
                </div>
              ) : scanResult ? (
                <div className="space-y-4 font-sans">
                  {/* Summary bar */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-mono">Scanned: </span>
                      <span className="text-slate-200 font-semibold">{scanResult.filename}</span>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <span className="text-slate-400 text-[10px] uppercase font-mono">Threat Score: </span>
                        <span className={`font-mono font-bold text-sm ${
                          scanResult.health_score > 80 ? 'text-emerald-400' : scanResult.health_score > 55 ? 'text-amber-500' : 'text-rose-500'
                        }`}>
                          {scanResult.health_score}/100
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        scanResult.severity_level === 'SAFE' ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-500/20' :
                        scanResult.severity_level === 'WARNING' ? 'bg-amber-950/30 text-amber-400 border border-amber-500/20' : 'bg-rose-950/30 text-rose-500 border border-rose-500/20'
                      }`}>
                        {scanResult.severity_level}
                      </span>
                    </div>
                  </div>

                  {/* Threat logs */}
                  {scanResult.vulnerabilities.length === 0 ? (
                    <div className="p-6 text-center text-slate-500">
                      <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-80" />
                      <div className="font-semibold text-slate-200 text-xs">No threats discovered</div>
                      <div className="text-[10px] text-slate-400 mt-1">Statically verified. File complies with core system security policies.</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {scanResult.vulnerabilities.map((vuln: any, idx: number) => (
                        <div key={idx} className="p-3 bg-slate-900/35 border border-slate-900 rounded-xl space-y-2 leading-relaxed">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-200">{vuln.rule_name}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold font-mono ${
                              vuln.severity === 'CRITICAL' ? 'bg-red-950 text-red-400 border border-red-500/20' :
                              vuln.severity === 'HIGH' ? 'bg-amber-950 text-amber-400 border border-amber-500/20' : 'bg-slate-900 text-slate-400'
                            }`}>
                              {vuln.severity}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">{vuln.description}</p>
                          <div className="bg-slate-950 border border-slate-900 rounded p-1.5 font-mono text-[9px] text-rose-300 truncate">
                            Line {vuln.line_number}: {vuln.matched_content}
                          </div>
                          <div className="text-[10px] text-indigo-400 font-medium">
                            <span className="font-semibold">Remedy:</span> {vuln.fix}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <ShieldAlert className="w-12 h-12 stroke-[1.2] mb-2 opacity-30" />
                  <span className="text-xs">Audit scan logs will display here</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'audits' && (
          /* Tab 2: Admin audit logs trail */
          <div className="flex-1 flex flex-col min-h-0">
            {auditError ? (
              /* Shield alert overlays if guest/developer attempts to check logs */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-950/80 border border-slate-900 rounded-2xl">
                <ShieldAlert className="w-14 h-14 text-rose-500 mb-3 animate-pulse" />
                <h4 className="font-bold text-slate-200 text-sm">Role-Based Access Lock</h4>
                <p className="text-[11px] text-slate-400 max-w-sm mt-1 mb-4 leading-relaxed">
                  {auditError}
                </p>
                <div className="text-[10px] text-indigo-400 font-mono bg-indigo-950/40 border border-indigo-500/20 px-3 py-1.5 rounded-lg max-w-xs leading-normal">
                  To view system security audits, login as: <br />
                  <span className="font-bold">Username:</span> admin / <span className="font-bold">Password:</span> admin123
                </div>
              </div>
            ) : auditLoading ? (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                <span className="animate-pulse">Decrypting system logs database...</span>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="h-8 border-b border-slate-900 px-4 flex items-center justify-between text-slate-400 text-[10px] select-none bg-slate-950/40">
                  <span className="font-semibold">WRITE-AHEAD SYSTEM AUDIT TRAIL</span>
                  <span className="text-emerald-400 font-semibold font-mono">Secured Log Stream</span>
                </div>
                
                <div className="flex-1 overflow-auto border border-slate-900 rounded-b-2xl bg-slate-950/70">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950 text-[10px] text-slate-500 uppercase tracking-wide border-b border-slate-900">
                        <th className="p-3 font-semibold font-mono">Timestamp</th>
                        <th className="p-3 font-semibold font-mono">Action</th>
                        <th className="p-3 font-semibold font-mono">Operator ID</th>
                        <th className="p-3 font-semibold font-mono">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/50 font-mono text-[11px] text-slate-300">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-900/10">
                          <td className="p-3 whitespace-nowrap text-slate-450">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="p-3 font-bold text-indigo-400">
                            {log.action}
                          </td>
                          <td className="p-3 text-[10px] text-slate-500">
                            {log.user_id ? log.user_id.slice(0, 8) + '...' : 'System'}
                          </td>
                          <td className="p-3 truncate max-w-xs text-slate-400" title={JSON.stringify(log.details)}>
                            {JSON.stringify(log.details)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'rbac' && (
          /* Tab 3: RBAC Configuration guide */
          <div className="space-y-4 leading-relaxed text-slate-350 font-sans">
            <h4 className="font-bold text-slate-200 text-xs border-b border-slate-900 pb-1.5">Role-Based Access Control Policies</h4>
            
            <div className="space-y-3">
              <div className="p-3 bg-slate-900/40 border border-slate-900 rounded-xl flex items-start space-x-3">
                <div className="p-1.5 bg-indigo-950/50 border border-indigo-500/20 text-indigo-400 rounded-lg font-bold font-mono">A</div>
                <div>
                  <h5 className="font-semibold text-slate-200 text-xs">Administrator Role</h5>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Authorized to view audit logs, perform vector re-indexing, clean temp cache files, register users, and override configurations.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-900/40 border border-slate-900 rounded-xl flex items-start space-x-3">
                <div className="p-1.5 bg-emerald-950/50 border border-emerald-500/20 text-emerald-400 rounded-lg font-bold font-mono">D</div>
                <div>
                  <h5 className="font-semibold text-slate-200 text-xs">Developer Role (Default)</h5>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Authorized to upload, edit, encrypt, and restore files. Allowed to write and execute code sandbox scripts and chat with the AI assistant.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-900/40 border border-slate-900 rounded-xl flex items-start space-x-3">
                <div className="p-1.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg font-bold font-mono">G</div>
                <div>
                  <h5 className="font-semibold text-slate-200 text-xs">Guest Role</h5>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Authorized only to view/download non-encrypted files. Prohibited from running sandbox code scripts or dispatching worker queue tasks.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-950/80 border border-slate-900 rounded-xl flex items-center space-x-2">
              <Key className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] text-slate-400">
                Active Session Token Role: <strong className="font-mono text-indigo-400 uppercase">{userRole}</strong>
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
