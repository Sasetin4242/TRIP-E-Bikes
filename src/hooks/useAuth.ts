import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  role?: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
  setLoading: (v: boolean) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loading: true,
      login: (user) => set({ user }),
      logout: () => set({ user: null }),
      setLoading: (loading) => set({ loading }),
    }),
    { name: "trip-admin-auth", partialize: (s) => ({ user: s.user }) }
  )
);
