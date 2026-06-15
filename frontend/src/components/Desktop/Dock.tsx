import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { openWindow, focusWindow } from '../../store/uiSlice';
import { FolderOpen, Code2, Users, BarChart3, Layers, ShieldCheck } from 'lucide-react';

export const Dock: React.FC = () => {
  const dispatch = useDispatch();
  const windows = useSelector((state: RootState) => state.ui.windows);

  const dockItems = [
    { id: 'file_manager', label: 'File Explorer', icon: FolderOpen, color: 'text-blue-400 hover:bg-blue-950/30' },
    { id: 'ide', label: 'Online IDE', icon: Code2, color: 'text-emerald-400 hover:bg-emerald-950/30' },
    { id: 'collaboration', label: 'Collaboration', icon: Users, color: 'text-purple-400 hover:bg-purple-950/30' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, color: 'text-amber-400 hover:bg-amber-950/30' },
    { id: 'task_manager', label: 'Task Engine', icon: Layers, color: 'text-cyan-400 hover:bg-cyan-950/30' },
    { id: 'security', label: 'Security Center', icon: ShieldCheck, color: 'text-rose-400 hover:bg-rose-950/30' },
  ];

  const handleIconClick = (id: string) => {
    const win = windows[id];
    if (win.isOpen) {
      if (win.isMinimized) {
        dispatch(focusWindow(id));
      } else {
        dispatch(focusWindow(id));
      }
    } else {
      dispatch(openWindow(id));
    }
  };

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 h-16 bg-slate-900/40 backdrop-blur-xl border border-slate-700/30 px-4 rounded-2xl flex items-end justify-center space-x-3 pb-2 z-[9999] shadow-2xl">
      {dockItems.map((item) => {
        const Icon = item.icon;
        const state = windows[item.id];
        const isOpen = state?.isOpen;

        return (
          <div key={item.id} className="relative flex flex-col items-center group">
            {/* Tooltip label overlay */}
            <div className="absolute bottom-20 bg-slate-950/90 text-slate-200 text-[10px] font-semibold font-sans tracking-wide px-2.5 py-1 rounded-lg border border-slate-800 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:-translate-y-1 transition-all duration-200 whitespace-nowrap shadow-xl">
              {item.label}
            </div>

            {/* Icon buttons wrapper */}
            <button
              onClick={() => handleIconClick(item.id)}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 transform hover:scale-125 hover:-translate-y-2 active:scale-95 ${item.color} ${
                isOpen ? 'bg-slate-800/20 border border-slate-800' : 'border border-transparent'
              }`}
            >
              <Icon className="w-6 h-6 stroke-[1.8]" />
            </button>

            {/* macOS active-dot indicator */}
            {isOpen && (
              <span className="absolute bottom-0 w-1.5 h-1.5 rounded-full bg-indigo-400 animate-fade-in shadow-glow shadow-indigo-400/50" />
            )}
          </div>
        );
      })}
    </div>
  );
};
