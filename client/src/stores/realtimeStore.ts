import { create } from 'zustand';
import Ably from 'ably';

interface RealtimeState {
  ably: Ably.Realtime | null;
  isConnected: boolean;
  onlineReaders: Map<string, 'online' | 'offline' | 'busy' | 'in_session'>;

  // Actions
  initAbly: (apiKey: string, clientId: string) => void;
  disconnect: () => void;
  subscribeToReaderStatus: () => void;
  subscribeToNotifications: (userId: string, callback: (notification: any) => void) => void;
  subscribeToSession: (sessionId: string, callbacks: {
    onMessage?: (message: any) => void;
    onSessionEnd?: () => void;
  }) => void;
  unsubscribeFromSession: (sessionId: string) => void;
  subscribeToStream: (streamId: string, callbacks: {
    onGift?: (gift: any) => void;
    onViewerJoin?: (viewer: any) => void;
    onViewerLeave?: (viewer: any) => void;
    onStreamEnd?: () => void;
  }) => void;
  unsubscribeFromStream: (streamId: string) => void;
}

export const useRealtimeStore = create<RealtimeState>((set, get) => ({
  ably: null,
  isConnected: false,
  onlineReaders: new Map(),

  initAbly: (apiKey, clientId) => {
    const ably = new Ably.Realtime({
      key: apiKey,
      clientId,
      echoMessages: false,
    });

    ably.connection.on('connected', () => {
      set({ isConnected: true });
      console.log('Ably connected');
    });

    ably.connection.on('disconnected', () => {
      set({ isConnected: false });
      console.log('Ably disconnected');
    });

    set({ ably });
  },

  disconnect: () => {
    const { ably } = get();
    if (ably) {
      ably.close();
      set({ ably: null, isConnected: false });
    }
  },

  subscribeToReaderStatus: () => {
    const { ably } = get();
    if (!ably) return;

    const channel = ably.channels.get('readers:status');
    channel.subscribe('status-update', (message) => {
      const { readerId, status } = message.data;
      set((state) => {
        const newMap = new Map(state.onlineReaders);
        newMap.set(readerId, status);
        return { onlineReaders: newMap };
      });
    });
  },

  subscribeToNotifications: (userId, callback) => {
    const { ably } = get();
    if (!ably) return;

    const channel = ably.channels.get(`notifications:${userId}`);
    channel.subscribe('notification', (message) => {
      callback(message.data);
    });
  },

  subscribeToSession: (sessionId, callbacks) => {
    const { ably } = get();
    if (!ably) return;

    const channel = ably.channels.get(`reading:${sessionId}`);

    if (callbacks.onMessage) {
      channel.subscribe('message', (message) => {
        callbacks.onMessage!(message.data);
      });
    }

    if (callbacks.onSessionEnd) {
      channel.subscribe('session-ended', () => {
        callbacks.onSessionEnd!();
      });
    }
  },

  unsubscribeFromSession: (sessionId) => {
    const { ably } = get();
    if (!ably) return;

    const channel = ably.channels.get(`reading:${sessionId}`);
    channel.unsubscribe();
  },

  subscribeToStream: (streamId, callbacks) => {
    const { ably } = get();
    if (!ably) return;

    const channel = ably.channels.get(`stream:${streamId}`);

    if (callbacks.onGift) {
      channel.subscribe('gift-received', (message) => {
        callbacks.onGift!(message.data);
      });
    }

    if (callbacks.onViewerJoin) {
      channel.subscribe('viewer-joined', (message) => {
        callbacks.onViewerJoin!(message.data);
      });
    }

    if (callbacks.onViewerLeave) {
      channel.subscribe('viewer-left', (message) => {
        callbacks.onViewerLeave!(message.data);
      });
    }

    if (callbacks.onStreamEnd) {
      channel.subscribe('stream-ended', () => {
        callbacks.onStreamEnd!();
      });
    }
  },

  unsubscribeFromStream: (streamId) => {
    const { ably } = get();
    if (!ably) return;

    const channel = ably.channels.get(`stream:${streamId}`);
    channel.unsubscribe();
  },
}));

export default useRealtimeStore;
