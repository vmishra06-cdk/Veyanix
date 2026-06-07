import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { closeWindow, minimizeWindow, toggleMaximize, focusWindow, moveWindow, resizeWindow } from '../../store/uiSlice';
import { Minus, Square, X, RotateCcw } from 'lucide-react';

interface WindowProps {
  id: string;
  children: React.ReactNode;
}

export const Window: React.FC<WindowProps> = ({ id, children }) => {
  const dispatch = useDispatch();
  const windowState = useSelector((state: RootState) => state.ui.windows[id]);
  const activeWindowId = useSelector((state: RootState) => state.ui.activeWindowId);
  const isActive = activeWindowId === id;

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  // Refs to store mouse offsets during drag/resize events
  const dragStart = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ w: 0, h: 0, x: 0, y: 0 });
  
  const windowRef = useRef<HTMLDivElement>(null);

  // Focus window on click inside container
  const handleWindowClick = () => {
    if (!isActive) {
      dispatch(focusWindow(id));
    }
  };

  // Drag start handler (triggers on title bar mouse down)
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (windowState.isMaximized) return; // Disable dragging when maximized
    
    // Prevent focus stealing from text inputs inside window
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return;
    
    setIsDragging(true);
    dispatch(focusWindow(id));
    
    dragStart.current = {
      x: e.clientX - windowState.x,
      y: e.clientY - windowState.y
    };
    e.preventDefault();
  };

  // Resize start handler (triggers on corner resize grip mouse down)
  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsResizing(true);
    dispatch(focusWindow(id));
    
    resizeStart.current = {
      w: windowState.width,
      h: windowState.height,
      x: e.clientX,
      y: e.clientY
    };
    e.preventDefault();
    e.stopPropagation();
  };

  // Document-level event handlers for seamless drag/resize tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragStart.current.x;
        const newY = Math.max(40, e.clientY - dragStart.current.y); // Constrain top edge so it doesn't hide behind TopBar
        dispatch(moveWindow({ id, x: newX, y: newY }));
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStart.current.x;
        const deltaY = e.clientY - resizeStart.current.y;
        
        // Enforce minimum size boundaries
        const newWidth = Math.max(350, resizeStart.current.w + deltaX);
        const newHeight = Math.max(250, resizeStart.current.h + deltaY);
        
        dispatch(resizeWindow({ id, width: newWidth, height: newHeight }));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, id, dispatch]);

  if (!windowState.isOpen || windowState.isMinimized) return null;

  // Compute CSS styling classes based on maximize/minimize and focus states
  const windowStyle: React.CSSProperties = windowState.isMaximized
    ? {
        top: '40px',
        left: '0px',
        width: '100vw',
        height: 'calc(100vh - 88px)', // Leaves room for top bar & dock
        zIndex: windowState.zIndex
      }
    : {
        top: `${windowState.y}px`,
        left: `${windowState.x}px`,
        width: `${windowState.width}px`,
        height: `${windowState.height}px`,
        zIndex: windowState.zIndex
      };

  return (
    <div
      ref={windowRef}
      style={windowStyle}
      onClick={handleWindowClick}
      className={`absolute flex flex-col rounded-xl overflow-hidden glass-window animate-scale-in border-slate-700/50 ${
        isActive ? 'active ring-1 ring-indigo-500/20' : ''
      }`}
    >
      {/* Window Title Bar header */}
      <div
        onMouseDown={handleDragStart}
        className={`flex items-center justify-between px-4 py-2 border-b select-none cursor-move transition-colors duration-250 ${
          isActive 
            ? 'bg-slate-900/60 border-slate-700/70 text-slate-100' 
            : 'bg-slate-950/40 border-slate-800/40 text-slate-400'
        }`}
      >
        <div className="flex items-center space-x-2">
          {/* Decorative colored dots for macOS style */}
          <div className="flex space-x-1.5 mr-2">
            <button 
              onClick={() => dispatch(closeWindow(id))}
              className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-600 flex items-center justify-center group"
            >
              <X className="w-2 h-2 text-rose-950 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button 
              onClick={() => dispatch(minimizeWindow(id))}
              className="w-3 h-3 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center group"
            >
              <Minus className="w-2 h-2 text-amber-950 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button 
              onClick={() => dispatch(toggleMaximize(id))}
              className="w-3 h-3 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center group"
            >
              {windowState.isMaximized ? (
                <RotateCcw className="w-1.5 h-1.5 text-emerald-950 opacity-0 group-hover:opacity-100 transition-opacity" />
              ) : (
                <Square className="w-1.5 h-1.5 text-emerald-950 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          </div>
          <span className="text-xs font-semibold tracking-wide font-sans">{windowState.title}</span>
        </div>
        
        {/* Subtle status label or icon */}
        <div className="text-[10px] opacity-40 font-mono">
          {windowState.isMaximized ? 'Maximized' : `${windowState.width}x${windowState.height}`}
        </div>
      </div>

      {/* Window Workspace Content wrapper */}
      <div className="flex-1 overflow-auto bg-slate-950/80 backdrop-blur-md relative flex flex-col">
        {children}
      </div>

      {/* Edge Resize grip handle (disabled when maximized) */}
      {!windowState.isMaximized && (
        <div
          onMouseDown={handleResizeStart}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 z-50 group"
        >
          <svg width="8" height="8" viewBox="0 0 10 10" className="text-slate-500 group-hover:text-indigo-400 transition-colors">
            <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5" />
            <line x1="10" y1="4" x2="4" y2="10" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
      )}
    </div>
  );
};
