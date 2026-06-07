import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface FileItem {
  id: string;
  name: string;
  path: string;
  is_directory: boolean;
  size: number;
  is_encrypted: boolean;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

interface FileSystemState {
  files: FileItem[];
  currentPath: string; // virtual path, starts with "/"
  selectedFileId: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: FileSystemState = {
  files: [],
  currentPath: '/',
  selectedFileId: null,
  loading: false,
  error: null
};

const fileSystemSlice = createSlice({
  name: 'fileSystem',
  initialState,
  reducers: {
    setFiles: (state, action: PayloadAction<FileItem[]>) => {
      state.files = action.payload;
    },
    setCurrentPath: (state, action: PayloadAction<string>) => {
      state.currentPath = action.payload;
      state.selectedFileId = null; // Clear selection when navigating
    },
    setSelectedFileId: (state, action: PayloadAction<string | null>) => {
      state.selectedFileId = action.payload;
    },
    addFileItem: (state, action: PayloadAction<FileItem>) => {
      state.files = state.files.filter(f => f.id !== action.payload.id); // Prevent duplicate
      state.files.push(action.payload);
    },
    removeFileItem: (state, action: PayloadAction<string>) => {
      state.files = state.files.filter(f => f.id !== action.payload);
      if (state.selectedFileId === action.payload) {
        state.selectedFileId = null;
      }
    },
    updateFileEncryptionState: (state, action: PayloadAction<{ id: string; is_encrypted: boolean }>) => {
      const { id, is_encrypted } = action.payload;
      const file = state.files.find(f => f.id === id);
      if (file) {
        file.is_encrypted = is_encrypted;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    }
  }
});

export const {
  setFiles,
  setCurrentPath,
  setSelectedFileId,
  addFileItem,
  removeFileItem,
  updateFileEncryptionState,
  setLoading,
  setError
} = fileSystemSlice.actions;

export default fileSystemSlice.reducer;
