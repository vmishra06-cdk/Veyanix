// Dynamic API Routing Configuration
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Check if we are running in the browser
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If running on a remote domain (like Vercel), use the current origin
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return window.location.origin;
    }
  }
  return 'http://localhost:8000';
};

export const API_BASE_URL = getApiBaseUrl();

// Compute WebSocket URL prefix (ws:// or wss:// depending on secure hosting)
export const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

