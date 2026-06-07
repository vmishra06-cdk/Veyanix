import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface TaskItem {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  input_data?: any;
  result_data?: any;
  error?: string;
  created_at: string;
  updated_at: string;
}

interface TaskState {
  tasks: TaskItem[];
  loading: boolean;
  error: string | null;
}

const initialState: TaskState = {
  tasks: [],
  loading: false,
  error: null
};

const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setTasks: (state, action: PayloadAction<TaskItem[]>) => {
      state.tasks = action.payload;
    },
    upsertTask: (state, action: PayloadAction<TaskItem>) => {
      const idx = state.tasks.findIndex(t => t.id === action.payload.id);
      if (idx !== -1) {
        state.tasks[idx] = action.payload;
      } else {
        // Prepended to show new tasks first
        state.tasks.unshift(action.payload);
      }
    },
    removeTask: (state, action: PayloadAction<string>) => {
      state.tasks = state.tasks.filter(t => t.id !== action.payload);
    },
    setTaskLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setTaskError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    }
  }
});

export const {
  setTasks,
  upsertTask,
  removeTask,
  setTaskLoading,
  setTaskError
} = taskSlice.actions;

export default taskSlice.reducer;
