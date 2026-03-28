import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import type { User, AuthTokens } from '@sahayasetu/types';

interface SecureStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

const secureStorage: SecureStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

interface AuthState {
  user: Partial<User> | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setAuth: (user: Partial<User>, tokens: AuthTokens) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: true,

      setAuth: (user, tokens) =>
        set({ user, tokens, isAuthenticated: true, isLoading: false }),

      clearAuth: () =>
        set({ user: null, tokens: null, isAuthenticated: false, isLoading: false }),

      updateUser: (user) =>
        set((state) => ({ user: { ...state.user, ...user } })),

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'sahayasetu-auth',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
