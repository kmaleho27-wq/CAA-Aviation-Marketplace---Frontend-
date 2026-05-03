import axios from 'axios';
import mockAdapter from '../api/mockAdapter';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Defaults to mock when VITE_USE_MOCK_API is unset OR explicitly "true".
// Set VITE_USE_MOCK_API=false to hit a real backend at VITE_API_URL.
const useMockApi = String(import.meta.env.VITE_USE_MOCK_API ?? 'true').toLowerCase() !== 'false';

export const isMockApi = useMockApi;

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  ...(useMockApi ? { adapter: mockAdapter } : {}),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(err);
  }
);

export default api;
