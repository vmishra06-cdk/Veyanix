import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { 
  Users, MessageSquare, Send, Globe, Code, MousePointer, 
  Terminal, ShieldCheck 
} from 'lucide-react';

interface PeerCursor {
  clientId: string;
  username: string;
  x: number;
  y: number;
}

interface PeerChatMessage {
  username: string;
  message: string;
}

export const CollaborationApp: React.FC = () => {
  const user = useSelector((state: RootState) => state.fileSystem.files[0]?.owner_id); // Grab some context or default username
  const [username, setUsername] = useState(`User_${Math.floor(Math.random() * 900 + 100)}`);
  const [roomId, setRoomId] = useState('lobby');
  const [connected, setConnected] = useState(false);
  
  // Collaborative content states
  const [sharedText, setSharedText] = useState('// Collaborative text workspace. Type here to sync with peers...\n');
  const [peers, setPeers] = useState<string[]>([]);
  const [cursors, setCursors] = useState<Record<string, PeerCursor>>({});
  const [chatMessages, setChatMessages] = useState<PeerChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  
  const wsRef = useRef<WebSocket | null>(null);
  const clientIdRef = useRef<string>(Math.random().toString(36).substring(7));
  const canvasRef = useRef<HTMLDivElement>(null);

  // Initialize and connect socket on session start
  const handleConnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = `ws://localhost:8000/api/v1/ws/${clientIdRef.current}/${roomId}?username=${encodeURIComponent(username)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setPeers([username]);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const type = payload.type;
        const data = payload.data;

        if (type === 'USER_JOINED') {
          setPeers(data.active_users);
          setChatMessages(prev => [...prev, { username: 'System', message: `${data.username} joined the workspace.` }]);
        } else if (type === 'USER_LEFT') {
          setPeers(data.active_users);
          setChatMessages(prev => [...prev, { username: 'System', message: `${data.username} left the workspace.` }]);
          setCursors(prev => {
            const next = { ...prev };
            delete next[data.client_id];
            return next;
          });
        } else if (type === 'CODE_SYNC') {
          setSharedText(data.code);
        } else if (type === 'CHAT_RECEIVE') {
          setChatMessages(prev => [...prev, { username: data.username, message: data.message }]);
        } else if (type === 'CURSOR_UPDATE') {
          setCursors(prev => ({
            ...prev,
            [data.client_id]: {
              clientId: data.client_id,
              username: data.username,
              x: data.x,
              y: data.y
            }
          }));
        }
      } catch (e) {
        console.error(e);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setPeers([]);
      setCursors({});
    };
  };

  useEffect(() => {
    // Connect by default
    handleConnect();
    return () => {
      wsRef.current?.close();
    };
  }, [roomId]);

  // Emit local code changes
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setSharedText(text);
    if (connected && wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'CODE_CHANGE',
        data: { code: text }
      }));
    }
  };

  // Emit local chat messages
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !connected || !wsRef.current) return;

    wsRef.current.send(JSON.stringify({
      type: 'CHAT_MESSAGE',
      data: { message: chatInput }
    }));
    setChatInput('');
  };

  // Emit mouse coordinates relative to the canvas workspace
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!connected || !wsRef.current || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    wsRef.current.send(JSON.stringify({
      type: 'CURSOR_MOVE',
      data: { x, y }
    }));
  };

  return (
    <div className="flex flex-1 overflow-hidden h-full text-xs font-sans select-none bg-slate-950/20">
      
      {/* 1. Left controls panel: Session and Room configuration */}
      <div className="w-52 border-r border-slate-900 bg-slate-950/45 p-4 flex flex-col justify-between">
        <div className="space-y-4">
          <div>
            <h3 className="text-slate-400 font-semibold text-xs tracking-wider uppercase mb-2">My Profile</h3>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
            />
          </div>

          <div>
            <h3 className="text-slate-400 font-semibold text-xs tracking-wider uppercase mb-2">Active Room</h3>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="lobby">Lobby Room</option>
              <option value="room_alpha">Room Alpha (IDE Sync)</option>
              <option value="room_beta">Room Beta (Design)</option>
            </select>
          </div>

          <div className="h-[1px] bg-slate-800" />
          
          <div>
            <div className="flex items-center space-x-1.5 text-slate-400 font-semibold text-[10px] tracking-wider uppercase mb-2">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>Participants ({peers.length})</span>
            </div>
            
            <ul className="space-y-1.5 max-h-48 overflow-y-auto">
              {peers.map((peer, idx) => (
                <li key={idx} className="flex items-center space-x-2 bg-slate-950 border border-slate-900 px-2 py-1 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  <span className="text-slate-300 truncate font-mono">{peer} {peer === username ? '(You)' : ''}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <button
          onClick={handleConnect}
          className={`w-full py-1.5 rounded font-semibold text-xs transition-colors ${
            connected 
              ? 'bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-900/40' 
              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
          }`}
        >
          {connected ? 'Sync Connected' : 'Reconnect Session'}
        </button>
      </div>

      {/* 2. Main Collaborative Canvas and Editor */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Collaborative Editor area with cursor trackers overlay */}
        <div 
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          className="flex-1 p-3 bg-slate-950/40 relative flex flex-col min-h-0"
        >
          <div className="flex items-center justify-between mb-2 text-slate-400 text-[10px] select-none">
            <span className="font-semibold flex items-center space-x-1">
              <Code className="w-3.5 h-3.5 text-indigo-400" />
              <span>COLLABORATIVE SYNC NOTEBOOK (Room: {roomId})</span>
            </span>
            <span>Typing syncs in real-time</span>
          </div>

          <textarea
            value={sharedText}
            onChange={handleTextChange}
            disabled={!connected}
            className="flex-1 w-full bg-slate-950 border border-slate-900 rounded-xl p-3 font-mono text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/25 leading-normal resize-none overflow-y-auto"
            placeholder="No connection to collaborate room..."
          />

          {/* Connected Peers Floating cursors rendering */}
          {Object.values(cursors).map((cursor) => (
            <div
              key={cursor.clientId}
              style={{
                position: 'absolute',
                left: `${cursor.x}px`,
                top: `${cursor.y}px`,
                pointerEvents: 'none',
                transform: 'translate(-2px, -2px)',
                zIndex: 9999
              }}
              className="flex items-center space-x-1 transition-all duration-75"
            >
              <MousePointer className="w-4 h-4 text-indigo-400 fill-indigo-400" />
              <span className="bg-indigo-600 text-white font-semibold text-[8px] px-1.5 py-0.5 rounded shadow-lg border border-indigo-400/30 font-mono">
                {cursor.username}
              </span>
            </div>
          ))}
        </div>

        {/* 3. Collaborative chat timeline panel */}
        <div className="h-44 border-t border-slate-900 bg-slate-950/80 flex flex-col">
          <div className="h-8 border-b border-slate-900 px-4 flex items-center space-x-1.5 text-slate-400 text-[10px] select-none">
            <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold">ROOM CHAT TRANSMITTER</span>
          </div>
          
          <div className="flex-1 p-3 overflow-y-auto space-y-1.5 min-h-0 font-sans">
            {chatMessages.length === 0 ? (
              <div className="text-slate-600 italic">No room chat transmissions logged</div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div key={idx} className="flex space-x-2 text-[11px] leading-relaxed">
                  <span className={`font-mono font-bold ${
                    msg.username === 'System' ? 'text-indigo-400' : 'text-slate-400'
                  }`}>
                    [{msg.username}]:
                  </span>
                  <span className="text-slate-300 select-text">{msg.message}</span>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendChat} className="p-2 border-t border-slate-900 bg-slate-950 flex space-x-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={!connected}
              placeholder="Send message to room peers..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!connected || !chatInput.trim()}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded font-semibold text-xs"
            >
              Send
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
