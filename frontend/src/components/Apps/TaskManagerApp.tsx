import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { setTasks, upsertTask } from '../../store/taskSlice';
import { 
  Layers, Play, Clock, CheckCircle, AlertCircle, RefreshCw, 
  HelpCircle, Settings, ChevronRight 
} from 'lucide-react';

export const TaskManagerApp: React.FC = () => {
  const dispatch = useDispatch();
  const tasks = useSelector((state: RootState) => state.tasks.tasks);
  
  const [taskName, setTaskName] = useState('heavy_computation');
  const [fibN, setFibN] = useState(30);
  const [loading, setLoading] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  const token = localStorage.getItem('veyanix_token');
  const headers = { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Fetch initial list of task executions
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        dispatch(setTasks(data));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Selected task details helper
  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  // Dispatch background task queue handler
  const handleDispatchTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const input_data: Record<string, any> = {};
    if (taskName === 'heavy_computation') {
      input_data['n'] = fibN;
    }

    try {
      const res = await fetch('http://localhost:8000/api/v1/tasks/dispatch', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: taskName,
          input_data
        })
      });

      if (res.ok) {
        const data = await res.json();
        dispatch(upsertTask(data));
        setSelectedTaskId(data.id); // select newly dispatched task
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'bg-slate-900 text-slate-400 border-slate-800';
      case 'running': return 'bg-indigo-950/40 text-indigo-400 border-indigo-500/20';
      case 'completed': return 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20';
      case 'failed': return 'bg-rose-950/40 text-rose-500 border-rose-500/20';
      default: return 'bg-slate-900 text-slate-400 border-slate-800';
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden h-full text-xs font-sans select-none bg-slate-950/20">
      
      {/* 1. Left panel: New Task submission form */}
      <div className="w-56 border-r border-slate-900 bg-slate-950/45 p-4 flex flex-col justify-between">
        <form onSubmit={handleDispatchTask} className="space-y-4">
          <div>
            <div className="flex items-center space-x-1 border-b border-slate-900 pb-2 mb-3">
              <Settings className="w-4 h-4 text-indigo-400" />
              <h3 className="text-slate-300 font-bold tracking-wide">Configure Task</h3>
            </div>
            
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Worker Action</label>
            <select
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="heavy_computation">Heavy Math (Fibonacci)</option>
              <option value="vector_reindex">Rebuild Vector Index</option>
              <option value="system_maintenance">System Maintenance</option>
            </select>
          </div>

          {/* Conditional Input Parameters */}
          {taskName === 'heavy_computation' && (
            <div className="animate-fade-in">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                Fibonacci Term: {fibN}
              </label>
              <input
                type="range"
                min="10"
                max="40"
                value={fibN}
                onChange={(e) => setFibN(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <span className="text-[10px] text-slate-500 leading-normal block mt-1">
                Higher terms require larger CPU iterations, demonstrating thread-yield schedules.
              </span>
            </div>
          )}

          {taskName === 'vector_reindex' && (
            <div className="text-[10px] text-slate-500 leading-normal bg-slate-950 border border-slate-900 p-2.5 rounded-lg">
              Re-calculates word Inverse Document Frequencies (IDFs) and pre-normalizes cosine matrix values for custom search indexing.
            </div>
          )}

          {taskName === 'system_maintenance' && (
            <div className="text-[10px] text-slate-500 leading-normal bg-slate-950 border border-slate-900 p-2.5 rounded-lg">
              Logs system metrics telemetry, purges transient files in `/sandbox`, and cleans expired workers.
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-lg shadow-indigo-600/10"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Dispatch Job</span>
          </button>
        </form>

        <button 
          onClick={fetchTasks}
          className="w-full py-1.5 border border-slate-850 hover:bg-slate-900 text-slate-400 hover:text-slate-200 rounded text-xs transition-colors flex items-center justify-center space-x-1"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* 2. Middle list: Running and Completed jobs */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-8 border-b border-slate-900 px-4 flex items-center justify-between text-slate-400 text-[10px] select-none bg-slate-950/40">
          <span className="font-semibold flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>BACKGROUND JOBS ENGINE HISTORY</span>
          </span>
          <span>WebSocket Live Progress Updates</span>
        </div>

        {loading && tasks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <span className="animate-pulse">Querying task daemon...</span>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <Layers className="w-12 h-12 stroke-[1.2] mb-2 opacity-35" />
            <span className="text-xs">No tasks queued or dispatched</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-slate-900/60">
            {tasks.map((task) => {
              const isSelected = selectedTaskId === task.id;
              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className={`p-3 cursor-pointer flex items-center justify-between transition-colors ${
                    isSelected ? 'bg-indigo-950/20 border-l-2 border-indigo-500' : 'hover:bg-slate-900/15'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-200 uppercase tracking-wide truncate">
                        {task.name.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </div>
                    
                    {/* Live Progress Bar indicator */}
                    <div className="mt-2.5 flex items-center space-x-3.5">
                      <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${task.progress}%` }} 
                          className={`h-full transition-all duration-300 ${
                            task.status === 'failed' ? 'bg-rose-500' : task.status === 'completed' ? 'bg-emerald-500' : 'bg-indigo-500'
                          }`}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono font-semibold w-8 text-right">
                        {task.progress}%
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Right Panel: Result payload and error output */}
      {selectedTask && (
        <div className="w-64 border-l border-slate-900 bg-slate-950/45 p-4 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            <div className="border-b border-slate-900 pb-2">
              <h3 className="text-slate-350 font-bold uppercase text-[10px] tracking-wider">Job Details</h3>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[9px] text-slate-500 uppercase tracking-wide">Task ID</label>
                <div className="text-[10px] font-mono text-slate-400 break-all">{selectedTask.id}</div>
              </div>
              
              <div>
                <label className="text-[9px] text-slate-500 uppercase tracking-wide">Dispatched</label>
                <div className="text-[10px] font-mono text-slate-300">
                  {new Date(selectedTask.created_at).toLocaleString()}
                </div>
              </div>

              <div>
                <label className="text-[9px] text-slate-500 uppercase tracking-wide">Input JSON</label>
                <pre className="mt-1 bg-slate-950 border border-slate-900 rounded-lg p-2 font-mono text-[10px] text-slate-400 max-h-24 overflow-y-auto">
                  {JSON.stringify(selectedTask.input_data, null, 2)}
                </pre>
              </div>

              {selectedTask.result_data && (
                <div>
                  <label className="text-[9px] text-slate-500 uppercase tracking-wide text-emerald-400">Result Output</label>
                  <pre className="mt-1 bg-slate-950 border border-emerald-950/20 rounded-lg p-2 font-mono text-[10px] text-emerald-400/90 max-h-36 overflow-y-auto">
                    {JSON.stringify(selectedTask.result_data, null, 2)}
                  </pre>
                </div>
              )}

              {selectedTask.error && (
                <div>
                  <label className="text-[9px] text-slate-500 uppercase tracking-wide text-rose-500">Error Logs</label>
                  <pre className="mt-1 bg-slate-950 border border-rose-950/20 rounded-lg p-2 font-mono text-[10px] text-rose-400 max-h-36 overflow-y-auto whitespace-pre-wrap">
                    {selectedTask.error}
                  </pre>
                </div>
              )}
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-900/60 flex items-center space-x-1.5 text-[10px] text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            <span>Updated: {new Date(selectedTask.updated_at).toLocaleTimeString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};
