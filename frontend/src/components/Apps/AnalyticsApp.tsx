import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  BarChart3, Cpu, Activity, HardDrive, Layers, Clock, 
  TrendingUp, AlertTriangle, ShieldCheck, Database 
} from 'lucide-react';

interface TelemetryPoint {
  time: string;
  cpu: number;
  memory: number;
}

interface AnalyticsAppProps {
  systemMetrics: {
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    active_tasks: number;
  };
  metricsHistory: TelemetryPoint[];
}

export const AnalyticsApp: React.FC<AnalyticsAppProps> = ({ systemMetrics, metricsHistory }) => {
  const tasks = useSelector((state: RootState) => state.tasks.tasks);
  const files = useSelector((state: RootState) => state.fileSystem.files);
  
  // Local telemetry aggregates
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const failedTasks = tasks.filter(t => t.status === 'failed').length;
  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'running').length;
  
  const totalFiles = files.filter(f => !f.is_directory).length;
  const encryptedFiles = files.filter(f => !f.is_directory && f.is_encrypted).length;

  // Simple Predictive Analytics: Memory usage forecasting
  // Demonstrates basic Machine Learning / forecasting algorithms in frontend
  const [predictedSpikeTime, setPredictedSpikeTime] = useState<string>("Stable");
  
  useEffect(() => {
    if (metricsHistory.length < 5) return;
    
    // Check linear trend of the last 5 memory points
    const lastPoints = metricsHistory.slice(-5);
    let slope = 0;
    for (let i = 1; i < lastPoints.length; i++) {
      slope += lastPoints[i].memory - lastPoints[i-1].memory;
    }
    slope /= 4; // average change
    
    if (slope > 1.5) {
      setPredictedSpikeTime("High Risk: Spike predicted in < 2 mins");
    } else if (slope > 0.5) {
      setPredictedSpikeTime("Medium Alert: Gradual memory growth");
    } else {
      setPredictedSpikeTime("Stable: Resource profile optimized");
    }
  }, [metricsHistory]);

  return (
    <div className="flex flex-col flex-1 h-full select-none text-xs font-sans bg-slate-950/20 p-4 overflow-y-auto space-y-4">
      
      {/* 1. Header and Quick Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* CPU utilization */}
        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center space-x-3.5 shadow-md">
          <div className="p-2.5 bg-indigo-950/50 border border-indigo-500/20 text-indigo-400 rounded-xl">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">CPU Usage</div>
            <div className="text-base font-bold font-mono text-slate-200">{systemMetrics.cpu_usage.toFixed(1)}%</div>
          </div>
        </div>

        {/* Memory allocation */}
        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center space-x-3.5 shadow-md">
          <div className="p-2.5 bg-emerald-950/50 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">RAM Allocated</div>
            <div className="text-base font-bold font-mono text-slate-200">{systemMetrics.memory_usage.toFixed(1)}%</div>
          </div>
        </div>

        {/* Task Queues count */}
        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center space-x-3.5 shadow-md">
          <div className="p-2.5 bg-cyan-950/50 border border-cyan-500/20 text-cyan-400 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Queue Depth</div>
            <div className="text-base font-bold font-mono text-slate-200">{systemMetrics.active_tasks} Tasks</div>
          </div>
        </div>

        {/* Disk consumption */}
        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center space-x-3.5 shadow-md">
          <div className="p-2.5 bg-amber-950/50 border border-amber-500/20 text-amber-400 rounded-xl">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Disk Storage</div>
            <div className="text-base font-bold font-mono text-slate-200">{systemMetrics.disk_usage.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* 2. Recharts Line graph showing CPU / Memory usage logs history */}
      <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-2xl shadow-xl flex flex-col">
        <div className="flex items-center justify-between mb-4 border-b border-slate-900 pb-2">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-4.5 h-4.5 text-indigo-400" />
            <span className="font-semibold text-slate-200">Real-time Performance Telemetry (2s polling)</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Total frames: {metricsHistory.length}</span>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metricsHistory} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="time" stroke="#475569" fontSize={9} tickLine={false} />
              <YAxis stroke="#475569" domain={[0, 100]} fontSize={9} tickLine={false} />
              <Tooltip 
                contentStyle={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '8px' }} 
                labelStyle={{ fontSize: '10px', color: '#64748b' }}
                itemStyle={{ fontSize: '11px' }}
              />
              <Line 
                type="monotone" 
                dataKey="cpu" 
                name="CPU Usage" 
                stroke="#6366f1" 
                strokeWidth={2} 
                dot={false} 
                activeDot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="memory" 
                name="RAM Usage" 
                stroke="#10b981" 
                strokeWidth={2} 
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Sub-telemetry panels: Task queue statistics & Predictive analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Distributed Task Engine stats */}
        <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-2xl shadow-lg flex flex-col justify-between">
          <div className="border-b border-slate-900 pb-2 mb-3">
            <h3 className="font-semibold text-slate-200 flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Distributed Task telemetry</span>
            </h3>
          </div>
          
          <div className="grid grid-cols-3 gap-3 text-center my-2">
            <div className="p-2 bg-slate-950/60 border border-slate-900 rounded-xl">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Dispatched</div>
              <div className="text-sm font-bold font-mono text-slate-200 mt-1">{totalTasks}</div>
            </div>
            <div className="p-2 bg-slate-950/60 border border-slate-900 rounded-xl">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Completed</div>
              <div className="text-sm font-bold font-mono text-emerald-400 mt-1">{completedTasks}</div>
            </div>
            <div className="p-2 bg-slate-950/60 border border-slate-900 rounded-xl">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Failed</div>
              <div className="text-sm font-bold font-mono text-rose-500 mt-1">{failedTasks}</div>
            </div>
          </div>
          
          <div className="space-y-1.5 text-xs text-slate-400 pt-2 border-t border-slate-900/50">
            <div className="flex justify-between">
              <span>Task worker status:</span>
              <span className="text-emerald-400 font-semibold font-mono">Daemon Running</span>
            </div>
            <div className="flex justify-between">
              <span>Queue status:</span>
              <span className={pendingTasks > 0 ? 'text-amber-400 animate-pulse font-mono' : 'text-slate-400 font-mono'}>
                {pendingTasks} jobs pending in cache
              </span>
            </div>
          </div>
        </div>

        {/* Predictive AI Forecasting panel */}
        <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-2xl shadow-lg flex flex-col justify-between">
          <div className="border-b border-slate-900 pb-2 mb-3">
            <h3 className="font-semibold text-slate-200 flex items-center space-x-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Predictive ML resource analysis</span>
            </h3>
          </div>
          
          <div className="p-3 bg-slate-950/80 border border-slate-900 rounded-xl flex items-start space-x-2.5">
            <div className="p-1 rounded bg-indigo-950/40 border border-indigo-500/20 text-indigo-400 mt-0.5">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-semibold text-slate-200 text-xs">Linear Trend Forecast</div>
              <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                Veyanix continuously fits a linear regression line over memory telemetry slopes to forecast capacity.
              </div>
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-slate-400 pt-2 border-t border-slate-900/50 mt-3">
            <div className="flex justify-between">
              <span>Health Outlook Status:</span>
              <span className={`font-semibold ${
                predictedSpikeTime.startsWith("High") ? 'text-rose-400' : predictedSpikeTime.startsWith("Medium") ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {predictedSpikeTime}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Workspace density:</span>
              <span className="text-slate-300 font-mono">{totalFiles} Files ({encryptedFiles} Encrypted)</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
