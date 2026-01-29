import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, DollarSign, Star, Heart, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import api from '../../services/api';

interface RecentSession {
  id: string;
  type: string;
  status: string;
  duration: number;
  totalAmount: number;
  createdAt: string;
}

export default function DashboardHome() {
  const { user, clientProfile, readerProfile } = useAuthStore();
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecentSessions = async () => {
      try {
        const role = user?.role === 'reader' ? 'reader' : 'client';
        const response = await api.getSessionHistory(role, 1, 5);
        setRecentSessions(response.data.data);
      } catch (error) {
        console.error('Error fetching sessions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentSessions();
  }, [user?.role]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} min${mins !== 1 ? 's' : ''}`;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-playfair text-white mb-2">
          Welcome back, {user?.fullName?.split(' ')[0]}!
        </h1>
        <p className="text-gray-400">
          Here's an overview of your account.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Balance */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <DollarSign size={24} className="text-gold-400" />
            <Link to="/dashboard/wallet" className="text-primary-400 text-sm hover:underline">
              Add Funds
            </Link>
          </div>
          <p className="text-gray-400 text-sm">Balance</p>
          <p className="text-2xl font-bold text-white">
            ${Number(clientProfile?.balance || 0).toFixed(2)}
          </p>
        </div>

        {/* Total Spent */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <Clock size={24} className="text-primary-400" />
          </div>
          <p className="text-gray-400 text-sm">Total Spent</p>
          <p className="text-2xl font-bold text-white">
            ${Number(clientProfile?.totalSpent || 0).toFixed(2)}
          </p>
        </div>

        {/* Sessions */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <Star size={24} className="text-gold-400" />
          </div>
          <p className="text-gray-400 text-sm">Total Readings</p>
          <p className="text-2xl font-bold text-white">
            {recentSessions.length}
          </p>
        </div>

        {/* Favorites */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <Heart size={24} className="text-primary-400" />
            <Link to="/dashboard/favorites" className="text-primary-400 text-sm hover:underline">
              View All
            </Link>
          </div>
          <p className="text-gray-400 text-sm">Favorite Readers</p>
          <p className="text-2xl font-bold text-white">0</p>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="card">
        <div className="p-6 border-b border-primary-400/10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Recent Readings</h2>
            <Link
              to="/dashboard/history"
              className="text-primary-400 hover:text-primary-300 flex items-center gap-1"
            >
              View All <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <div className="divide-y divide-primary-400/10">
          {isLoading ? (
            <div className="p-6">
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <div className="skeleton h-4 w-32" />
                    <div className="skeleton h-4 w-20" />
                  </div>
                ))}
              </div>
            </div>
          ) : recentSessions.length > 0 ? (
            recentSessions.map((session) => (
              <div key={session.id} className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium capitalize">
                    {session.type} Reading
                  </p>
                  <p className="text-gray-400 text-sm">
                    {new Date(session.createdAt).toLocaleDateString()} •{' '}
                    {formatDuration(session.duration)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gold-400 font-semibold">
                    ${Number(session.totalAmount).toFixed(2)}
                  </p>
                  <span
                    className={`badge text-xs ${
                      session.status === 'completed'
                        ? 'badge-success'
                        : session.status === 'cancelled'
                        ? 'badge-error'
                        : 'badge-warning'
                    }`}
                  >
                    {session.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <Clock size={48} className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400">No readings yet</p>
              <Link to="/readers" className="btn-primary mt-4 inline-block">
                Find a Reader
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/readers" className="card-hover p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-400/20 rounded-full flex items-center justify-center">
            <Star size={24} className="text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Start a Reading</h3>
            <p className="text-gray-400 text-sm">Connect with a psychic now</p>
          </div>
          <ArrowRight size={20} className="ml-auto text-gray-500" />
        </Link>

        <Link to="/live" className="card-hover p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-gold-400/20 rounded-full flex items-center justify-center">
            <Clock size={24} className="text-gold-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Watch Live Streams</h3>
            <p className="text-gray-400 text-sm">Join live spiritual sessions</p>
          </div>
          <ArrowRight size={20} className="ml-auto text-gray-500" />
        </Link>
      </div>
    </div>
  );
}
