import React, { useState, useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { Desktop } from './components/Desktop/Desktop';
import { Shield, Lock, User, Mail, Sparkles, Key } from 'lucide-react';
import { API_BASE_URL } from './config';

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  
  // Form variables
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Validate existing session tokens on boot
  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('veyanix_token');
      if (!token) return;
      
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('veyanix_token');
          localStorage.removeItem('veyanix_role');
          localStorage.removeItem('veyanix_username');
          localStorage.removeItem('veyanix_user_id');
          setIsAuthenticated(false);
        }
      } catch (e) {
        console.error("Token validation failed:", e);
      }
    };
    
    validateToken();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('veyanix_token', data.access_token);
        localStorage.setItem('veyanix_role', data.role);
        localStorage.setItem('veyanix_username', data.username);
        localStorage.setItem('veyanix_user_id', data.user_id);
        
        setIsAuthenticated(true);
      } else {
        const err = await res.json();
        setMessage({ text: err.detail || "Incorrect username or password", type: 'error' });
      }
    } catch (e) {
      setMessage({ text: "Cannot connect to server. Ensure FastAPI is running.", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) return;
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      if (res.ok) {
        setMessage({ text: "Account registered successfully! Please log in.", type: 'success' });
        setAuthTab('login');
        setPassword('');
      } else {
        const err = await res.json();
        setMessage({ text: err.detail || "Registration failed", type: 'error' });
      }
    } catch (e) {
      setMessage({ text: "Connection error", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Perform logout
  const handleLogout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
  };

  if (!isAuthenticated) {
    return (
      <div className="w-screen h-screen bg-slate-950 flex items-center justify-center relative select-none font-sans overflow-hidden">
        {/* Background glowing rings */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08),transparent_65%)] pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full filter blur-[140px] pointer-events-none orb-1" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full filter blur-[150px] pointer-events-none orb-2" />
        <div className="absolute top-1/3 right-1/3 w-[450px] h-[450px] bg-cyan-500/10 rounded-full filter blur-[130px] pointer-events-none orb-3" />

        {/* Authentication Card */}
        <div className="w-96 p-6 rounded-2xl glass-window border-slate-800 shadow-2xl relative z-10 animate-scale-in">
          {/* Platform branding */}
          <div className="flex flex-col items-center justify-center mb-6 text-center">
            <div className="p-3.5 bg-indigo-600/15 border border-indigo-500/20 text-indigo-400 rounded-2xl mb-3 animate-pulse">
              <Shield className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold font-sans tracking-widest text-slate-100">VEYANIX CORE</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-1">Autonomous Intelligence Operating System</p>
          </div>

          {/* Tab buttons */}
          <div className="flex border-b border-slate-900 pb-2 mb-4">
            <button
              onClick={() => setAuthTab('login')}
              className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                authTab === 'login' ? 'bg-indigo-950/40 text-indigo-300 border border-indigo-500/20' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              System Login
            </button>
            <button
              onClick={() => setAuthTab('register')}
              className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                authTab === 'register' ? 'bg-indigo-950/40 text-indigo-300 border border-indigo-500/20' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Provision Account
            </button>
          </div>

          {/* Feedback alerts */}
          {message && (
            <div className={`p-2.5 rounded-lg border text-xs font-medium mb-4 animate-fade-in ${
              message.type === 'success' 
                ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400' 
                : 'bg-rose-950/30 border-rose-500/20 text-rose-400'
            }`}>
              {message.text}
            </div>
          )}

          {/* Render target form */}
          {authTab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wide">Operator Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wide">Secret Pass Key</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl font-semibold text-xs transition-colors shadow-lg shadow-indigo-600/10 flex items-center justify-center space-x-1.5"
              >
                <span>Initialize Boot Sequence</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wide">Operator Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose username"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wide">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wide">Secret Pass Key</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create password"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl font-semibold text-xs transition-colors"
              >
                <span>Register Operator Credentials</span>
              </button>
            </form>
          )}

          {/* Default developer details tip box */}
          <div className="mt-5 pt-3.5 border-t border-slate-900/60 flex items-start space-x-2 text-[9px] text-slate-500 leading-normal">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-400">Pre-seeded Profiles:</span> Login as <code className="text-slate-350">admin</code> (pass: <code className="text-slate-350">admin123</code>) to inspect system audits, or <code className="text-slate-350">developer</code> (pass: <code className="text-slate-350">dev123</code>) for sandboxed coding.
            </div>
          </div>

        </div>
      </div>
    );
  }

  // Renders workspace when authenticated
  return (
    <Provider store={store}>
      <Desktop />
    </Provider>
  );
};
export default App;
