import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { focusWindow } from '../../store/uiSlice';
import { upsertTask } from '../../store/taskSlice';
import { WS_BASE_URL } from '../../config';

// Desktop Sub-components
import { TopBar } from './TopBar';
import { Window } from './Window';
import { Dock } from './Dock';
import { DesktopIcon } from './DesktopIcon';

// App Window Contents
import { FileManagerApp } from '../Apps/FileManagerApp';
import { AIChatApp } from '../Apps/AIChatApp';
import { IDEApp } from '../Apps/IDEApp';
import { CollaborationApp } from '../Apps/CollaborationApp';
import { AnalyticsApp } from '../Apps/AnalyticsApp';
import { TaskManagerApp } from '../Apps/TaskManagerApp';
import { SecurityApp } from '../Apps/SecurityApp';

// Icons for shortcuts
import { 
  FolderOpen, MessageSquare, Code2, Users, 
  BarChart3, Layers, ShieldCheck 
} from 'lucide-react';

interface TelemetryPoint {
  time: string;
  cpu: number;
  memory: number;
}

export const Desktop: React.FC = () => {
  const dispatch = useDispatch();
  const windows = useSelector((state: RootState) => state.ui.windows);
  const wallpaper = useSelector((state: RootState) => state.ui.wallpaper);
  
  const username = localStorage.getItem('veyanix_username') || 'Developer';
  const token = localStorage.getItem('veyanix_token');

  // WebSocket connection & System metrics state
  const [socketConnected, setSocketConnected] = useState(false);
  const [systemMetrics, setSystemMetrics] = useState({
    cpu_usage: 22.5,
    memory_usage: 41.2,
    disk_usage: 42.4,
    active_tasks: 0
  });
  const [metricsHistory, setMetricsHistory] = useState<TelemetryPoint[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const clientIdRef = useRef<string>(Math.random().toString(36).substring(7));

  // Initialize global system metrics telemetry WebSocket
  useEffect(() => {
    const wsUrl = `${WS_BASE_URL}/api/v1/ws/${clientIdRef.current}/global_system?username=${encodeURIComponent(username)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setSocketConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const type = payload.type;
        const data = payload.data;

        if (type === 'SYSTEM_TELEMETRY') {
          setSystemMetrics({
            cpu_usage: data.cpu_usage,
            memory_usage: data.memory_usage,
            disk_usage: data.disk_usage,
            active_tasks: data.active_tasks
          });

          // Record history log (keep last 20 frames for Recharts area rendering)
          const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setMetricsHistory(prev => {
            const next = [...prev, { time: timeLabel, cpu: data.cpu_usage, memory: data.memory_usage }];
            return next.slice(-20); // Cap history frame depth
          });
          
        } else if (type === 'TASK_UPDATE') {
          // Dispatch live background task updates to Redux
          dispatch(upsertTask(data));
        }
      } catch (e) {
        console.error("WebSocket message parsing error:", e);
      }
    };

    ws.onclose = () => {
      setSocketConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [username, dispatch]);

  // Handle resetting workspace window cascades to default bounds
  const handleResetLayout = () => {
    // Reload page to reset positions
    window.location.reload();
  };

  const getWallpaperClass = () => {
    switch(wallpaper) {
      case 'gradient-indigo': 
        return 'bg-gradient-to-br from-slate-950 via-indigo-950/80 to-purple-950/90';
      case 'gradient-emerald':
        return 'bg-gradient-to-br from-slate-950 via-emerald-950/70 to-slate-950';
      case 'solid-dark':
        return 'bg-slate-950';
      default:
        return 'bg-gradient-to-br from-slate-950 via-indigo-950/80 to-purple-950/90';
    }
  };

  return (
    <div className={`relative w-screen h-screen overflow-hidden transition-all duration-700 ${getWallpaperClass()}`}>
      
      {/* Decorative cosmic background dust elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.06),transparent_65%)] pointer-events-none" />
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-purple-500/5 rounded-full filter blur-[130px] pointer-events-none orb-1" />
      <div className="absolute bottom-1/4 right-1/4 w-[550px] h-[550px] bg-indigo-500/5 rounded-full filter blur-[140px] pointer-events-none orb-2" />
      <div className="absolute top-1/3 right-1/3 w-[400px] h-[400px] bg-cyan-500/5 rounded-full filter blur-[120px] pointer-events-none orb-3" />

      {/* 1. Global menu header top bar */}
      <TopBar 
        socketConnected={socketConnected}
        systemMetrics={systemMetrics}
        username={username}
        onResetLayout={handleResetLayout}
      />

      {/* 2. Desktop shortcuts Grid layout */}
      <div className="absolute top-14 left-6 grid grid-cols-1 gap-2.5 z-10">
        <DesktopIcon id="file_manager" label="File Explorer" icon={FolderOpen} color="text-blue-400" />
        <DesktopIcon id="ai_chat" label="AI Assistant" icon={MessageSquare} color="text-indigo-400" />
        <DesktopIcon id="ide" label="Online IDE" icon={Code2} color="text-emerald-400" />
        <DesktopIcon id="collaboration" label="Collab Room" icon={Users} color="text-purple-400" />
        <DesktopIcon id="analytics" label="System Stats" icon={BarChart3} color="text-amber-400" />
        <DesktopIcon id="task_manager" label="Task Engine" icon={Layers} color="text-cyan-400" />
        <DesktopIcon id="security" label="Security Center" icon={ShieldCheck} color="text-rose-400" />
      </div>

      {/* 3. Render Floating Application Windows */}
      <Window id="file_manager">
        <FileManagerApp />
      </Window>
      
      <Window id="ai_chat">
        <AIChatApp />
      </Window>
      
      <Window id="ide">
        <IDEApp />
      </Window>
      
      <Window id="collaboration">
        <CollaborationApp />
      </Window>
      
      <Window id="analytics">
        <AnalyticsApp systemMetrics={systemMetrics} metricsHistory={metricsHistory} />
      </Window>
      
      <Window id="task_manager">
        <TaskManagerApp />
      </Window>
      
      <Window id="security">
        <SecurityApp />
      </Window>

      {/* 4. bottom macOS dock bar */}
      <Dock />
    </div>
  );
};
