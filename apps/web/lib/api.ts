import axios, { AxiosInstance, AxiosError } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token from localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as any;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const { accessToken } = res.data;
        localStorage.setItem('access_token', accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// ── Auth helpers ──────────────────────────────────────────────────────────

export const authApi = {
  sendOtp: (phone: string) =>
    api.post('/auth/otp/send', { phone }),

  verifyOtp: (phone: string, code: string) =>
    api.post('/auth/otp/verify', { phone, code }),

  login: (phone: string, password: string) =>
    api.post('/auth/login', { phone, password }),

  logout: () => api.post('/auth/logout'),

  me: () => api.get('/auth/me'),
};

// ── Request helpers ───────────────────────────────────────────────────────

export const requestApi = {
  list: (params?: Record<string, string>) =>
    api.get('/requests', { params }),

  get: (id: string) => api.get(`/requests/${id}`),

  stats: () => api.get('/requests/stats'),

  assign: (id: string, agentId: string) =>
    api.patch(`/requests/${id}/assign`, { agentId }),

  updateStatus: (id: string, status: string, note?: string) =>
    api.patch(`/requests/${id}/status`, { status, note }),
};

// ── Media helpers ─────────────────────────────────────────────────────────

export const mediaApi = {
  listByRequest: (requestId: string) =>
    api.get(`/media/request/${requestId}`),

  getFlagged: (page = 1) =>
    api.get(`/media/admin/flagged?page=${page}`),

  getSignedUrl: (id: string) => api.get(`/media/${id}/signed-url`),
};

// ── Agent helpers ─────────────────────────────────────────────────────────

export const agentApi = {
  list: () => api.get('/auth/users', { params: { role: 'FIELD_AGENT' } }),
  stats: (agentId: string) => api.get(`/requests/stats?agentId=${agentId}`),
};
