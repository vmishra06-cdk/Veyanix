import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './uiSlice';
import fileSystemReducer from './fileSystemSlice';
import taskReducer from './taskSlice';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    fileSystem: fileSystemReducer,
    tasks: taskReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
