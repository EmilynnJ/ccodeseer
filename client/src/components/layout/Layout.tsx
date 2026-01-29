import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import Navbar from './Navbar';
import Footer from './Footer';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import { useRealtimeStore } from '../../stores/realtimeStore';
import IncomingReadingRequest from '../IncomingReadingRequest';
import api from '../../services/api';

interface ReadingRequest {
  sessionId: string;
  clientName: string;
  clientAvatar?: string;
  type: 'chat' | 'voice' | 'video';
  ratePerMin: number;
}

export default function Layout() {
  const { isSignedIn } = useAuth();
  const { user, fetchUser } = useAuthStore();
  const { initAbly, disconnect, subscribeToNotifications } = useRealtimeStore();
  const [incomingRequest, setIncomingRequest] = useState<ReadingRequest | null>(null);

  // Sync user on auth change
  useEffect(() => {
    if (isSignedIn && !user) {
      fetchUser();
    }
  }, [isSignedIn, user]);

  // Initialize Ably real-time connection
  useEffect(() => {
    if (!user?.id) return;

    // Get Ably token from server
    const initRealtime = async () => {
      try {
        const response = await api.getAblyToken();
        const { tokenRequest } = response.data.data;
        // Initialize with token auth
        initAbly(tokenRequest, user.id);
      } catch (error) {
        console.error('Failed to initialize real-time connection:', error);
      }
    };

    initRealtime();

    return () => {
      disconnect();
    };
  }, [user?.id]);

  // Listen for incoming reading requests (for readers)
  useEffect(() => {
    if (!user?.id) return;

    subscribeToNotifications(user.id, (notification: any) => {
      if (notification.type === 'reading_request') {
        setIncomingRequest({
          sessionId: notification.metadata?.sessionId,
          clientName: notification.metadata?.clientName || 'Client',
          clientAvatar: notification.metadata?.clientAvatar,
          type: notification.metadata?.sessionType || 'chat',
          ratePerMin: notification.metadata?.ratePerMin || 0,
        });
      }
    });
  }, [user?.id, subscribeToNotifications]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <Outlet />
      </main>
      <Footer />

      {/* Incoming reading request modal (for readers) */}
      {incomingRequest && (
        <IncomingReadingRequest
          request={incomingRequest}
          onClose={() => setIncomingRequest(null)}
        />
      )}

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1a1a2e',
            color: '#fff',
            border: '1px solid rgba(255, 105, 180, 0.2)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
}
