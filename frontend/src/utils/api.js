import axios from 'axios';

const AUTH_URL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:8001';
const CHAT_URL = import.meta.env.VITE_CHAT_API_URL || 'http://localhost:8000';

const authApi = axios.create({
  baseURL: AUTH_URL,
});

const chatApi = axios.create({
  baseURL: CHAT_URL,
});

// Add token to chatApi requests
chatApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add auto-logout on 401
const handleAuthError = (error) => {
  // Only auto-reload if it's NOT a login or signup attempt
  const isAuthAttempt = error.config.url.includes('/auth/login') || error.config.url.includes('/auth/signup');
  
  if (error.response && error.response.status === 401 && !isAuthAttempt) {
    localStorage.removeItem('token');
    window.location.reload();
  }
  return Promise.reject(error);
};

authApi.interceptors.response.use((r) => r, handleAuthError);
chatApi.interceptors.response.use((r) => r, handleAuthError);

export { authApi, chatApi };
