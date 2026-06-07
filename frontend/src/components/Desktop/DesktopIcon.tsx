import React from 'react';
import { useDispatch } from 'react-redux';
import { openWindow } from '../../store/uiSlice';
import { LucideIcon } from 'lucide-react';

interface DesktopIconProps {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

export const DesktopIcon: React.FC<DesktopIconProps> = ({ id, label, icon: Icon, color }) => {
  const dispatch = useDispatch();

  const handleOpen = () => {
    dispatch(openWindow(id));
  };

  return (
    <div
      onClick={handleOpen}
      className="flex flex-col items-center justify-center w-22 h-22 p-2 rounded-xl border border-transparent hover:bg-slate-900/35 hover:border-slate-800/40 cursor-pointer select-none group transition-all duration-200"
    >
      <div className={`p-3 rounded-2xl bg-slate-950/20 backdrop-blur-md border border-slate-900/50 shadow-md group-hover:scale-105 group-hover:shadow-indigo-500/10 group-hover:border-slate-800 transition-all duration-250 ${color}`}>
        <Icon className="w-6 h-6 stroke-[1.8]" />
      </div>
      <span className="mt-2 text-[10px] font-semibold text-center font-sans tracking-wide text-slate-200 drop-shadow-md select-none truncate max-w-full">
        {label}
      </span>
    </div>
  );
};
