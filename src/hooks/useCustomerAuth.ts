import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CustomerUser {
  id: string;
  email: string;
  username: string;
  avatar?: string;
}

interface CustomerAuthState {
  customer: CustomerUser | null;
  loading: boolean;
  login: (customer: CustomerUser) => void;
  logout: () => void;
  setLoading: (v: boolean) => void;
}

export const useCustomerAuth = create<CustomerAuthState>()(
  persist(
    (set) => ({
      customer: null,
      loading: true,
      login: (customer) => set({ customer }),
      logout: () => set({ customer: null }),
      setLoading: (loading) => set({ loading }),
    }),
    { name: "trip-customer-auth", partialize: (s) => ({ customer: s.customer }) }
  )
);
