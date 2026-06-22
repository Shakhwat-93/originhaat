import { create } from 'zustand';

interface UIStore {
  recentOrderVisible: boolean;
  setRecentOrderVisible: (v: boolean) => void;
  toastMessage: string | null;
  toastType: 'success' | 'error' | 'info';
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
  orderCount: number;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>()((set) => ({
  recentOrderVisible: false,
  setRecentOrderVisible: (v) => set({ recentOrderVisible: v }),
  toastMessage: null,
  toastType: 'success',
  showToast: (message, type = 'success') =>
    set({ toastMessage: message, toastType: type }),
  hideToast: () => set({ toastMessage: null }),
  orderCount: 347,
  mobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
}));
