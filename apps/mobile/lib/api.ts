import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const BASE_URL =
  Constants.expoConfig?.extra?.API_URL || 'http://localhost:8080/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  try {
    const stored = await SecureStore.getItemAsync('sahayasetu-auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      const token = parsed?.state?.tokens?.accessToken;
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {}
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as any;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const stored = await SecureStore.getItemAsync('sahayasetu-auth');
        if (stored) {
          const parsed = JSON.parse(stored);
          const refreshToken = parsed?.state?.tokens?.refreshToken;
          if (refreshToken) {
            const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
            const { accessToken } = res.data;
            // Update stored token
            parsed.state.tokens.accessToken = accessToken;
            await SecureStore.setItemAsync('sahayasetu-auth', JSON.stringify(parsed));
            original.headers.Authorization = `Bearer ${accessToken}`;
            return api(original);
          }
        }
      } catch {}
      // Clear auth on failure
      await SecureStore.deleteItemAsync('sahayasetu-auth');
    }
    return Promise.reject(error);
  },
);

// ── Typed API methods ─────────────────────────────────────────────────────

export const authMobileApi = {
  sendOtp: (phone: string) => api.post('/auth/otp/send', { phone }),
  verifyOtp: (phone: string, code: string) =>
    api.post('/auth/otp/verify', { phone, code }),
  me: () => api.get('/auth/me'),
  updateProfile: (data: { name?: string; email?: string }) =>
    api.patch('/auth/me', data),
  updateFcmToken: (fcmToken: string, platform: 'android' | 'ios') =>
    api.patch('/auth/me/fcm-token', { fcmToken, platform }),
};

export const requestMobileApi = {
  list: (params?: Record<string, string>) =>
    api.get('/requests', { params }),
  create: (data: any) => api.post('/requests', data),
  get: (id: string) => api.get(`/requests/${id}`),
  updateStatus: (id: string, status: string, note?: string) =>
    api.patch(`/requests/${id}/status`, { status, note }),
  rate: (id: string, rating: number, comment?: string) =>
    api.post(`/requests/${id}/rate`, { rating, comment }),
};

export const mediaMobileApi = {
  upload: (formData: FormData, params: Record<string, string>) =>
    api.post(`/media/upload?${new URLSearchParams(params)}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  listByRequest: (requestId: string) =>
    api.get(`/media/request/${requestId}`),
};
