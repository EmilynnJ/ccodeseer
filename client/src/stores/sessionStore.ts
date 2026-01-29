import { create } from 'zustand';
import api from '../services/api';

export interface ReadingSession {
  id: string;
  clientId: string;
  readerId: string;
  type: 'chat' | 'voice' | 'video';
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'disputed';
  ratePerMin: number;
  startTime?: string;
  endTime?: string;
  duration: number;
  totalAmount: number;
  platformFee: number;
  readerEarnings: number;
  agoraChannelName?: string;
  ablyChannelName?: string;
}

export interface AgoraCredentials {
  token: string;
  uid: number;
  channelName: string;
}

export interface SessionMessage {
  id: string;
  sessionId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'audio' | 'system';
  createdAt: string;
}

interface SessionState {
  currentSession: ReadingSession | null;
  agoraCredentials: AgoraCredentials | null;
  messages: SessionMessage[];
  elapsedSeconds: number;
  isConnecting: boolean;
  isInSession: boolean;

  // Actions
  setCurrentSession: (session: ReadingSession | null) => void;
  setAgoraCredentials: (credentials: AgoraCredentials | null) => void;
  addMessage: (message: SessionMessage) => void;
  setMessages: (messages: SessionMessage[]) => void;
  setElapsedSeconds: (seconds: number) => void;
  incrementElapsed: () => void;
  setConnecting: (connecting: boolean) => void;

  // API Actions
  requestSession: (readerId: string, type: 'chat' | 'voice' | 'video') => Promise<ReadingSession>;
  acceptSession: (sessionId: string) => Promise<{ session: ReadingSession; agora: AgoraCredentials }>;
  declineSession: (sessionId: string, reason?: string) => Promise<void>;
  endSession: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  loadMessages: () => Promise<void>;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  currentSession: null,
  agoraCredentials: null,
  messages: [],
  elapsedSeconds: 0,
  isConnecting: false,
  isInSession: false,

  setCurrentSession: (session) => set({
    currentSession: session,
    isInSession: session?.status === 'active',
  }),
  setAgoraCredentials: (credentials) => set({ agoraCredentials: credentials }),
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
  })),
  setMessages: (messages) => set({ messages }),
  setElapsedSeconds: (seconds) => set({ elapsedSeconds: seconds }),
  incrementElapsed: () => set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 })),
  setConnecting: (connecting) => set({ isConnecting: connecting }),

  requestSession: async (readerId, type) => {
    set({ isConnecting: true });
    try {
      const response = await api.requestSession(readerId, type);
      const session = response.data.data;
      set({ currentSession: session });
      return session;
    } finally {
      set({ isConnecting: false });
    }
  },

  acceptSession: async (sessionId) => {
    set({ isConnecting: true });
    try {
      const response = await api.acceptSession(sessionId);
      const { session, agora } = response.data.data;
      set({
        currentSession: session,
        agoraCredentials: agora,
        isInSession: true,
        elapsedSeconds: 0,
        messages: [],
      });
      return { session, agora };
    } finally {
      set({ isConnecting: false });
    }
  },

  declineSession: async (sessionId, reason) => {
    await api.declineSession(sessionId, reason);
    set({ currentSession: null });
  },

  endSession: async () => {
    const session = get().currentSession;
    if (!session) return;

    try {
      await api.endSession(session.id);
    } finally {
      set({
        currentSession: null,
        agoraCredentials: null,
        messages: [],
        elapsedSeconds: 0,
        isInSession: false,
      });
    }
  },

  sendMessage: async (content) => {
    const session = get().currentSession;
    if (!session) return;

    await api.sendSessionMessage(session.id, content);
  },

  loadMessages: async () => {
    const session = get().currentSession;
    if (!session) return;

    const response = await api.getSessionMessages(session.id);
    set({ messages: response.data.data });
  },

  clearSession: () => set({
    currentSession: null,
    agoraCredentials: null,
    messages: [],
    elapsedSeconds: 0,
    isInSession: false,
    isConnecting: false,
  }),
}));

export default useSessionStore;
