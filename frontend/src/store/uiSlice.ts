import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface WindowState {
  id: string;
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

interface UIState {
  windows: Record<string, WindowState>;
  activeWindowId: string | null;
  maxZIndex: number;
  wallpaper: string;
}

const defaultWindows: Record<string, WindowState> = {
  file_manager: { id: 'file_manager', title: 'File Explorer', isOpen: false, isMinimized: false, isMaximized: false, x: 80, y: 80, width: 850, height: 550, zIndex: 1 },
  ai_chat: { id: 'ai_chat', title: 'AI Assistant & RAG', isOpen: false, isMinimized: false, isMaximized: false, x: 150, y: 60, width: 480, height: 600, zIndex: 1 },
  ide: { id: 'ide', title: 'Online Sandbox IDE', isOpen: false, isMinimized: false, isMaximized: false, x: 220, y: 100, width: 900, height: 600, zIndex: 1 },
  collaboration: { id: 'collaboration', title: 'Team Collaboration Workspace', isOpen: false, isMinimized: false, isMaximized: false, x: 290, y: 120, width: 650, height: 480, zIndex: 1 },
  analytics: { id: 'analytics', title: 'System Analytics Telemetry', isOpen: false, isMinimized: false, isMaximized: false, x: 360, y: 140, width: 800, height: 500, zIndex: 1 },
  task_manager: { id: 'task_manager', title: 'Distributed Task queue', isOpen: false, isMinimized: false, isMaximized: false, x: 420, y: 160, width: 700, height: 450, zIndex: 1 },
  security: { id: 'security', title: 'Veyanix Security Center', isOpen: false, isMinimized: false, isMaximized: false, x: 480, y: 180, width: 800, height: 520, zIndex: 1 }
};

const initialState: UIState = {
  windows: defaultWindows,
  activeWindowId: null,
  maxZIndex: 10,
  wallpaper: 'gradient-indigo'
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    openWindow: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (state.windows[id]) {
        state.windows[id].isOpen = true;
        state.windows[id].isMinimized = false;
        state.maxZIndex += 1;
        state.windows[id].zIndex = state.maxZIndex;
        state.activeWindowId = id;
      }
    },
    closeWindow: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (state.windows[id]) {
        state.windows[id].isOpen = false;
        if (state.activeWindowId === id) {
          state.activeWindowId = null;
        }
      }
    },
    minimizeWindow: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (state.windows[id]) {
        state.windows[id].isMinimized = true;
        if (state.activeWindowId === id) {
          state.activeWindowId = null;
        }
      }
    },
    toggleMaximize: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (state.windows[id]) {
        state.windows[id].isMaximized = !state.windows[id].isMaximized;
      }
    },
    focusWindow: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (state.windows[id]) {
        state.windows[id].isMinimized = false;
        state.maxZIndex += 1;
        state.windows[id].zIndex = state.maxZIndex;
        state.activeWindowId = id;
      }
    },
    moveWindow: (state, action: PayloadAction<{ id: string; x: number; y: number }>) => {
      const { id, x, y } = action.payload;
      if (state.windows[id]) {
        state.windows[id].x = x;
        state.windows[id].y = y;
      }
    },
    resizeWindow: (state, action: PayloadAction<{ id: string; width: number; height: number }>) => {
      const { id, width, height } = action.payload;
      if (state.windows[id]) {
        state.windows[id].width = width;
        state.windows[id].height = height;
      }
    },
    changeWallpaper: (state, action: PayloadAction<string>) => {
      state.wallpaper = action.payload;
    }
  }
});

export const {
  openWindow,
  closeWindow,
  minimizeWindow,
  toggleMaximize,
  focusWindow,
  moveWindow,
  resizeWindow,
  changeWallpaper
} = uiSlice.actions;

export default uiSlice.reducer;
