import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export type UserRole = 'client' | 'reader' | 'admin';

export interface User {
  id: string;
  clerkId: string;
  email: string;
  username: string;
  fullName: string;
  profileImage?: string;
  role: UserRole;
  isOnline: boolean;
}

export interface ClientProfile {
  id: string;
  userId: string;
  balance: number;
  totalSpent: number;
  autoReloadEnabled: boolean;
  autoReloadAmount?: number;
  autoReloadThreshold?: number;
}

export interface ReaderProfile {
  id: string;
  userId: string;
  displayName: string;
  slug: string;
  bio: string;
  specialties: string[];
  profileImage: string;
  coverImage?: string;
  chatRatePerMin: number;
  voiceRatePerMin: number;
  videoRatePerMin: number;
  isAvailable: boolean;
  status: 'online' | 'offline' | 'busy' | 'in_session';
  rating: number;
  totalReviews: number;
  totalReadings: number;
  stripeAccountStatus: 'pending' | 'active' | 'restricted';
}

interface AuthState {
  user: User | null;
  clientProfile: ClientProfile | null;
  readerProfile: ReaderProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setClientProfile: (profile: ClientProfile | null) => void;
  setReaderProfile: (profile: ReaderProfile | null) => void;
  setLoading: (loading: boolean) => void;

  // API Actions
  syncUser: (data: { email: string; username: string; fullName: string; profileImage?: string }) => Promise<void>;
  fetchUser: () => Promise<void>;
  fetchClientProfile: () => Promise<void>;
  fetchReaderProfile: () => Promise<void>;
  updateBalance: (newBalance: number) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      clientProfile: null,
      readerProfile: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setClientProfile: (clientProfile) => set({ clientProfile }),
      setReaderProfile: (readerProfile) => set({ readerProfile }),
      setLoading: (isLoading) => set({ isLoading }),

      syncUser: async (data) => {
        try {
          set({ isLoading: true });
          const response = await api.syncUser(data);
          set({ user: response.data.data, isAuthenticated: true });

          // Fetch role-specific profile
          const user = response.data.data;
          if (user.role === 'reader' || user.role === 'admin') {
            get().fetchReaderProfile();
          }
          get().fetchClientProfile();
        } catch (error) {
          console.error('Error syncing user:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      fetchUser: async () => {
        try {
          set({ isLoading: true });
          const response = await api.getMe();
          const user = response.data.data;
          set({ user, isAuthenticated: true });

          // Fetch role-specific profiles
          if (user.role === 'reader' || user.role === 'admin') {
            get().fetchReaderProfile();
          }
          get().fetchClientProfile();
        } catch (error) {
          console.error('Error fetching user:', error);
          set({ user: null, isAuthenticated: false });
        } finally {
          set({ isLoading: false });
        }
      },

      fetchClientProfile: async () => {
        try {
          const response = await api.getClientProfile();
          set({ clientProfile: response.data.data });
        } catch (error) {
          console.error('Error fetching client profile:', error);
        }
      },

      fetchReaderProfile: async () => {
        try {
          const response = await api.getMyReaderProfile();
          set({ readerProfile: response.data.data });
        } catch (error) {
          console.error('Error fetching reader profile:', error);
        }
      },

      updateBalance: (newBalance) => {
        const clientProfile = get().clientProfile;
        if (clientProfile) {
          set({ clientProfile: { ...clientProfile, balance: newBalance } });
        }
      },

      logout: () => {
        set({
          user: null,
          clientProfile: null,
          readerProfile: null,
          isAuthenticated: false,
        });
        api.setAuthToken(null);
      },
    }),
    {
      name: 'soulseer-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
