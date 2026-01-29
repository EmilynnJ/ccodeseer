import { useEffect, useState } from 'react';
import { Clock, MessageCircle, Phone, Video, Star, DollarSign } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

interface Session {
  id: string;
  type: 'chat' | 'voice' | 'video';
  status: string;
  duration: number;
  totalAmount: number;
  createdAt: string;
  readerId?: string;
  clientId?: string;
}

export default function History() {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const role = user?.role === 'reader' ? 'reader' : 'client';
        const response = await api.getSessionHistory(role, 1, 50);
        setSessions(response.data.data);
      } catch (error) {
        console.error('Error fetching sessions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, [user?.role]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'chat':
        return <MessageCircle size={18} />;
      case 'voice':
        return <Phone size={18} />;
      case 'video':
        return <Video size={18} />;
      default:
        return <Clock size={18} />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'badge-success';
      case 'cancelled':
        return 'badge-error';
      case 'active':
        return 'badge-primary';
      case 'disputed':
        return 'badge-warning';
      default:
        return 'badge';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <div className="skeleton h-8 w-48 mb-2" />
          <div className="skeleton h-4 w-64" />
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-playfair text-white mb-2">Reading History</h1>
        <p className="text-gray-400">View all your past reading sessions.</p>
      </div>

      {sessions.length > 0 ? (
        <div className="space-y-4">
          {sessions.map((session) => (
            <div key={session.id} className="card p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      session.type === 'chat'
                        ? 'bg-primary-400/20 text-primary-400'
                        : session.type === 'voice'
                        ? 'bg-gold-400/20 text-gold-400'
                        : 'bg-green-400/20 text-green-400'
                    }`}
                  >
                    {getTypeIcon(session.type)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white capitalize">
                      {session.type} Reading
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {new Date(session.createdAt).toLocaleString()}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1 text-sm text-gray-400">
                        <Clock size={14} />
                        {formatDuration(session.duration)}
                      </span>
                      <span className="flex items-center gap-1 text-sm text-gold-400">
                        <DollarSign size={14} />
                        ${Number(session.totalAmount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`badge ${getStatusBadge(session.status)}`}>
                    {session.status}
                  </span>
                  {session.status === 'completed' && (
                    <button className="block mt-2 text-primary-400 text-sm hover:underline">
                      Leave Review
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <Clock size={64} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl text-white mb-2">No Readings Yet</h3>
          <p className="text-gray-400 mb-6">
            Once you have a reading, it will appear here.
          </p>
          <a href="/readers" className="btn-primary inline-block">
            Find a Reader
          </a>
        </div>
      )}
    </div>
  );
}
