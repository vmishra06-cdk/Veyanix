import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { openWindow } from '../../store/uiSlice';
import { Shield, Cpu, HardDrive, CpuIcon, Activity, Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface TopBarProps {
  socketConnected: boolean;
  systemMetrics: {
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    active_tasks: number;
  };
  username: string;
  onResetLayout: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ 
  socketConnected, 
  systemMetrics, 
  username, 
  onResetLayout 
}) => {
  const dispatch = useDispatch();
  const [time, setTime] = useState(new Date());

  // Update system clock every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="absolute top-0 left-0 right-0 h-10 bg-slate-950/60 backdrop-blur-md border-b border-slate-900/80 px-4 flex items-center justify-between text-xs text-slate-300 z-[9999] select-none">
      {/* Left section: OS Logo & Branding */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1.5 font-bold text-indigo-400 font-sans tracking-wider cursor-pointer group" onClick={onResetLayout}>
          <Shield className="w-4 h-4 text-indigo-500 group-hover:rotate-12 transition-transform" />
          <span>VEYANIX</span>
          <span className="text-[9px] bg-indigo-900/60 text-indigo-300 border border-indigo-500/20 px-1 rounded">OS v1.0</span>
        </div>
        
        {/* Workspace Quick Actions */}
        <div className="h-4 w-[1px] bg-slate-800" />
        <button 
          onClick={onResetLayout}
          className="text-slate-400 hover:text-slate-200 transition-colors flex items-center space-x-1"
          title="Reset all window positions"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Windows</span>
        </button>
      </div>

      {/* Middle section: System Health telemetry */}
      <div className="hidden md:flex items-center space-x-6">
        {/* CPU utilization indicator */}
        <div className="flex items-center space-x-2 text-slate-400" title="Host CPU utilization">
          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          <span>CPU:</span>
          <span className="font-mono font-semibold text-slate-200">{systemMetrics.cpu_usage.toFixed(1)}%</span>
          <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div 
              style={{ width: `${systemMetrics.cpu_usage}%` }} 
              className={`h-full transition-all duration-500 ${
                systemMetrics.cpu_usage > 80 ? 'bg-red-500' : systemMetrics.cpu_usage > 50 ? 'bg-amber-500' : 'bg-indigo-500'
              }`}
            />
          </div>
        </div>

        {/* RAM memory utilization indicator */}
        <div className="flex items-center space-x-2 text-slate-400" title="Host RAM memory allocation">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>RAM:</span>
          <span className="font-mono font-semibold text-slate-200">{systemMetrics.memory_usage.toFixed(1)}%</span>
          <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div 
              style={{ width: `${systemMetrics.memory_usage}%` }} 
              className={`h-full transition-all duration-500 ${
                systemMetrics.memory_usage > 85 ? 'bg-red-500' : 'bg-emerald-500'
              }`}
            />
          </div>
        </div>

        {/* Disk space utilization indicator */}
        <div className="flex items-center space-x-2 text-slate-400">
          <HardDrive className="w-3.5 h-3.5 text-amber-400" />
          <span>Disk:</span>
          <span className="font-mono font-semibold text-slate-200">{systemMetrics.disk_usage.toFixed(1)}%</span>
        </div>
        
        {/* Active tasks status */}
        {systemMetrics.active_tasks > 0 && (
          <div 
            onClick={() => dispatch(openWindow('task_manager'))}
            className="flex items-center space-x-1.5 text-indigo-400 bg-indigo-950/40 border border-indigo-500/20 px-2 py-0.5 rounded-full cursor-pointer animate-pulse"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            <span>{systemMetrics.active_tasks} Active Worker Jobs</span>
          </div>
        )}
      </div>

      {/* Right section: Connection status, Time and User profile */}
      <div className="flex items-center space-x-4">
        {/* Connection status indicator */}
        <div 
          className={`flex items-center space-x-1 px-1.5 py-0.5 rounded font-mono text-[10px] border ${
            socketConnected 
              ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400' 
              : 'bg-rose-950/30 border-rose-500/20 text-rose-400'
          }`}
          title={socketConnected ? 'Connected to WebSocket telemetry server' : 'WebSocket connection offline'}
        >
          {socketConnected ? (
            <>
              <Wifi className="w-3 h-3" />
              <span>ONLINE</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" />
              <span>OFFLINE</span>
            </>
          )}
        </div>

        {/* User profile capsule */}
        <div 
          onClick={() => dispatch(openWindow('security'))}
          className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full cursor-pointer hover:border-slate-700 transition-colors"
        >
          <div className="w-4.5 h-4.5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white uppercase">
            {username.slice(0, 2)}
          </div>
          <span className="text-slate-300 font-semibold">{username}</span>
        </div>

        <div className="h-4 w-[1px] bg-slate-800" />

        {/* Date and clock */}
        <div className="flex flex-col items-end font-sans">
          <span className="font-semibold text-slate-100">{formatTime(time)}</span>
          <span className="text-[9px] text-slate-400 leading-none">{formatDate(time)}</span>
        </div>
      </div>
    </div>
  );
};
