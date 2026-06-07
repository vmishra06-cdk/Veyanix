import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { 
  MessageSquare, Send, Sparkles, Database, Network, ChevronDown, 
  ChevronUp, CheckSquare, Square, FileText, Cpu, AlertCircle, HelpCircle
} from 'lucide-react';

interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
  sources?: string[];
  timestamp: Date;
}

export const AIChatApp: React.FC = () => {
  const fileSystemFiles = useSelector((state: RootState) => state.fileSystem.files);
  const filesOnly = fileSystemFiles.filter(f => !f.is_directory);

  const [activeTab, setActiveTab] = useState<'chat' | 'graph'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'assistant',
      text: "Hello! I am Veyanix Core. You can chat with me, select workspace files to search using Vector RAG context, or check out the Semantic Knowledge Graph of your files.",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  
  // RAG Context selection
  const [selectedRagFiles, setSelectedRagFiles] = useState<string[]>([]);
  const [showFileSelector, setShowFileSelector] = useState(false);
  
  // Knowledge Graph nodes and edges
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [graphLoading, setGraphLoading] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const token = localStorage.getItem('veyanix_token');
  const headers = { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (activeTab === 'graph') {
      fetchSemanticGraph();
    }
  }, [activeTab, fileSystemFiles]);

  const fetchSemanticGraph = async () => {
    setGraphLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/ai/semantic-graph', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGraphData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGraphLoading(false);
    }
  };

  // Toggle checklist for RAG indexing
  const handleToggleRagFile = (id: string) => {
    setSelectedRagFiles(prev => 
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );
  };

  // Chat message submission
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = inputText;
    setInputText('');
    
    // Add user message locally
    setMessages(prev => [...prev, {
      sender: 'user',
      text: userMsg,
      timestamp: new Date()
    }]);
    
    setLoading(true);

    try {
      const res = await fetch('http://localhost:8000/api/v1/ai/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: userMsg,
          rag_files: selectedRagFiles
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, {
          sender: 'assistant',
          text: data.response,
          sources: data.sources_used,
          timestamp: new Date()
        }]);
        
        // Update graph data silently if links are returned
        if (data.semantic_links && data.semantic_links.length > 0) {
          fetchSemanticGraph();
        }
      } else {
        const err = await res.json();
        setMessages(prev => [...prev, {
          sender: 'assistant',
          text: `[Error: ${err.detail || 'Could not fetch response'}]`,
          timestamp: new Date()
        }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, {
        sender: 'assistant',
        text: "[Network Error: Server appears to be offline]",
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full select-none text-sm font-sans bg-slate-950/30">
      {/* Tab select header bar */}
      <div className="flex border-b border-slate-900 bg-slate-950/45 px-3 py-1">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'chat' 
              ? 'bg-indigo-950/40 text-indigo-300 border border-indigo-500/20' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Core AI Assistant</span>
        </button>
        <button
          onClick={() => setActiveTab('graph')}
          className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ml-2 ${
            activeTab === 'graph' 
              ? 'bg-indigo-950/40 text-indigo-300 border border-indigo-500/20' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          <span>Knowledge Graph</span>
        </button>
      </div>

      {activeTab === 'chat' ? (
        /* Chat View Workspace */
        <div className="flex-1 flex flex-col min-h-0">
          
          {/* RAG Context Selector Accordion */}
          <div className="border-b border-slate-900 bg-slate-950/15">
            <button
              onClick={() => setShowFileSelector(!showFileSelector)}
              className="w-full px-4 py-2 flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                <span>RAG Context Search: {selectedRagFiles.length} files selected</span>
              </div>
              {showFileSelector ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            
            {showFileSelector && (
              <div className="px-4 pb-3 max-h-36 overflow-y-auto space-y-1.5 border-t border-slate-900/50 pt-2 animate-fade-in">
                {filesOnly.length === 0 ? (
                  <div className="text-xs text-slate-500 italic p-1">No files in cloud storage. Upload text or code files first.</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {filesOnly.map((file) => {
                      const isChecked = selectedRagFiles.includes(file.id);
                      return (
                        <div 
                          key={file.id}
                          onClick={() => handleToggleRagFile(file.id)}
                          className={`flex items-center space-x-2 p-1.5 rounded-lg border cursor-pointer select-none transition-colors text-xs ${
                            isChecked 
                              ? 'bg-indigo-950/20 border-indigo-500/30 text-indigo-300' 
                              : 'bg-slate-950/40 border-slate-900 text-slate-400 hover:border-slate-800'
                          }`}
                        >
                          {isChecked ? <CheckSquare className="w-3.5 h-3.5 text-indigo-400" /> : <Square className="w-3.5 h-3.5" />}
                          <FileText className="w-3.5 h-3.5" />
                          <span className="truncate flex-1">{file.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Messages Scrolling Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, index) => (
              <div 
                key={index}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-md ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : 'bg-slate-900/95 border border-slate-800 text-slate-200 rounded-bl-none'
                }`}>
                  <div className="flex items-center space-x-1.5 text-[10px] opacity-40 mb-1 font-mono">
                    <Cpu className="w-3 h-3" />
                    <span>{msg.sender === 'user' ? 'User Client' : 'Gemini 1.5 Flash'}</span>
                  </div>
                  
                  <div className="text-xs leading-relaxed whitespace-pre-wrap font-sans">
                    {msg.text}
                  </div>

                  {/* Sources tag list */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800 flex flex-wrap gap-1.5">
                      <span className="text-[9px] text-indigo-400 font-semibold uppercase mt-0.5">RAG Context:</span>
                      {msg.sources.map((src, sIdx) => (
                        <span key={sIdx} className="text-[9px] bg-indigo-950/40 text-indigo-300 border border-indigo-500/20 px-1.5 py-0.5 rounded font-mono">
                          {src}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-900 border border-slate-800 text-slate-400 rounded-2xl rounded-bl-none px-4 py-3 flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-xs font-semibold pl-1">AI agent is reasoning...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat text box form */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-900 bg-slate-950/35 flex space-x-2">
            <input
              type="text"
              placeholder={selectedRagFiles.length > 0 ? "Ask a question about selected files..." : "Message Veyanix Core AI..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
              disabled={loading}
            />
            <button 
              type="submit"
              disabled={loading || !inputText.trim()}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl transition-all shadow-lg shadow-indigo-600/10 flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : (
        /* Knowledge Graph View */
        <div className="flex-1 flex flex-col overflow-hidden p-4 relative min-h-0 bg-slate-950/10">
          <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-3 bg-slate-900/50 border border-slate-800 p-2.5 rounded-xl">
            <AlertCircle className="w-4 h-4 text-indigo-400" />
            <span>Map shows semantic relationships between workspace document nodes. Connections are calculated using cosine similarity on derived vector matrices.</span>
          </div>

          {graphLoading ? (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <span className="animate-pulse">Building semantic index relationships...</span>
            </div>
          ) : graphData.nodes.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <Network className="w-16 h-16 stroke-[1.2] mb-2 opacity-30" />
              <span className="text-xs">No indexed document nodes to visualize</span>
            </div>
          ) : (
            <div className="flex-1 border border-slate-900 rounded-2xl bg-slate-950/70 p-4 relative overflow-hidden flex items-center justify-center">
              
              {/* Dynamic Semantic SVG Map links */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {/* Render Edges */}
                {graphData.edges.map((edge, idx) => {
                  // Find coordinates for source and target nodes (mock placement for rendering)
                  const count = graphData.nodes.length;
                  const getPos = (id: string) => {
                    const nodeIdx = graphData.nodes.findIndex(n => n.id === id);
                    if (nodeIdx === -1) return { x: 100, y: 100 };
                    // Distribute nodes in a circle
                    const angle = (nodeIdx / count) * 2 * Math.PI;
                    const radius = 110; // circle radius
                    const cx = 200; // SVG center estimation
                    const cy = 150;
                    return {
                      x: cx + radius * Math.cos(angle),
                      y: cy + radius * Math.sin(angle)
                    };
                  };

                  const p1 = getPos(edge.source);
                  const p2 = getPos(edge.target);

                  return (
                    <g key={idx}>
                      <line
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke="rgba(99, 102, 241, 0.25)"
                        strokeWidth={Math.max(1, edge.weight * 4)}
                        className="animate-pulse"
                      />
                      {/* Tooltip labels for link relation */}
                      <text
                        x={(p1.x + p2.x) / 2}
                        y={(p1.y + p2.y) / 2 - 4}
                        fill="rgba(129, 140, 248, 0.6)"
                        fontSize="8"
                        textAnchor="middle"
                        className="font-mono"
                      >
                        {(edge.weight * 100).toFixed(0)}% sim
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Render Nodes layout overlay */}
              <div className="relative w-full h-full">
                {graphData.nodes.map((node, nodeIdx) => {
                  const count = graphData.nodes.length;
                  const angle = (nodeIdx / count) * 2 * Math.PI;
                  const radius = 110;
                  const cx = 200; // center offset
                  const cy = 150;
                  const x = cx + radius * Math.cos(angle);
                  const y = cy + radius * Math.sin(angle);

                  return (
                    <div
                      key={node.id}
                      style={{
                        position: 'absolute',
                        left: `${x}px`,
                        top: `${y}px`,
                        transform: 'translate(-50%, -50%)'
                      }}
                      className="flex flex-col items-center group cursor-pointer"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300 ${
                        node.type === 'directory'
                          ? 'bg-slate-900 border-indigo-500/40 text-indigo-400'
                          : 'bg-indigo-950/60 border-indigo-500 text-indigo-300 node-pulse'
                      }`}>
                        {node.label.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="absolute top-9 bg-slate-950 border border-slate-900 rounded px-1.5 py-0.5 text-[9px] font-semibold text-slate-300 whitespace-nowrap shadow-md pointer-events-none group-hover:scale-105 transition-transform">
                        {node.label}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
};
