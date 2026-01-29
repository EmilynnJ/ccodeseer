import { useEffect, useState } from 'react';
import { DollarSign, Clock, Star, Users, TrendingUp } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

export default function ReaderDashboard() {
  const { readerProfile } = useAuthStore();
  const [earnings, setEarnings] = useState({
    pendingBalance: 0,
    totalEarned: 0,
    totalPaidOut: 0,
    period: '30d',
  });
  const [stats, setStats] = useState({
    totalSessions: 0,
    avgDuration: 0,
    rating: 0,
    totalReviews: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [earningsRes, statsRes] = await Promise.all([
          api.getReaderEarningsData(),
          api.getReaderEarnings('30d'),
        ]);
        setEarnings(earningsRes.data.data);
        setStats(statsRes.data.data);
      } catch (error) {
        console.error('Error fetching reader data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleUpdateStatus = async (status: 'online' | 'offline') => {
    try {
      await api.updateReaderStatus(status);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="skeleton h-8 w-48 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-playfair text-white mb-2">Reader Dashboard</h1>
          <p className="text-gray-400">Manage your readings and earnings.</p>
        </div>

        {/* Status Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => handleUpdateStatus('online')}
            className={`px-4 py-2 rounded-lg transition-all ${
              readerProfile?.status === 'online'
                ? 'bg-green-500/20 text-green-400 border border-green-400'
                : 'bg-dark-700 text-gray-400 hover:border-green-400/30 border border-transparent'
            }`}
          >
            Go Online
          </button>
          <button
            onClick={() => handleUpdateStatus('offline')}
            className={`px-4 py-2 rounded-lg transition-all ${
              readerProfile?.status === 'offline'
                ? 'bg-gray-500/20 text-gray-400 border border-gray-400'
                : 'bg-dark-700 text-gray-400 hover:border-gray-400/30 border border-transparent'
            }`}
          >
            Go Offline
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <DollarSign size={24} className="text-gold-400" />
            <span className="text-green-400 text-sm flex items-center gap-1">
              <TrendingUp size={14} />
              Available
            </span>
          </div>
          <p className="text-gray-400 text-sm">Pending Balance</p>
          <p className="text-3xl font-bold text-white">
            ${earnings.pendingBalance.toFixed(2)}
          </p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <Clock size={24} className="text-primary-400" />
          </div>
          <p className="text-gray-400 text-sm">Total Readings</p>
          <p className="text-3xl font-bold text-white">{stats.totalSessions}</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <Star size={24} className="text-gold-400" />
          </div>
          <p className="text-gray-400 text-sm">Rating</p>
          <p className="text-3xl font-bold text-white">
            {Number(readerProfile?.rating || 0).toFixed(1)}
          </p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <Users size={24} className="text-primary-400" />
          </div>
          <p className="text-gray-400 text-sm">Reviews</p>
          <p className="text-3xl font-bold text-white">{readerProfile?.totalReviews || 0}</p>
        </div>
      </div>

      {/* Earnings Overview */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Earnings Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-dark-700 rounded-lg">
            <p className="text-gray-400 text-sm mb-2">Pending Payout</p>
            <p className="text-3xl font-bold text-gold-400">
              ${earnings.pendingBalance.toFixed(2)}
            </p>
          </div>
          <div className="text-center p-6 bg-dark-700 rounded-lg">
            <p className="text-gray-400 text-sm mb-2">Total Earned</p>
            <p className="text-3xl font-bold text-white">
              ${earnings.totalEarned.toFixed(2)}
            </p>
          </div>
          <div className="text-center p-6 bg-dark-700 rounded-lg">
            <p className="text-gray-400 text-sm mb-2">Total Paid Out</p>
            <p className="text-3xl font-bold text-green-400">
              ${earnings.totalPaidOut.toFixed(2)}
            </p>
          </div>
        </div>

        {earnings.pendingBalance >= 15 && (
          <button className="btn-gold w-full mt-6">
            Request Payout (${earnings.pendingBalance.toFixed(2)})
          </button>
        )}
        {earnings.pendingBalance < 15 && (
          <p className="text-center text-gray-400 text-sm mt-4">
            Minimum payout is $15. Keep going!
          </p>
        )}
      </div>

      {/* Rate Settings */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Your Rates</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-dark-700 rounded-lg">
            <p className="text-gray-400 text-sm mb-1">Chat Rate</p>
            <p className="text-2xl font-bold text-white">
              ${Number(readerProfile?.chatRatePerMin || 0).toFixed(2)}/min
            </p>
          </div>
          <div className="p-4 bg-dark-700 rounded-lg">
            <p className="text-gray-400 text-sm mb-1">Voice Rate</p>
            <p className="text-2xl font-bold text-white">
              ${Number(readerProfile?.voiceRatePerMin || 0).toFixed(2)}/min
            </p>
          </div>
          <div className="p-4 bg-dark-700 rounded-lg">
            <p className="text-gray-400 text-sm mb-1">Video Rate</p>
            <p className="text-2xl font-bold text-white">
              ${Number(readerProfile?.videoRatePerMin || 0).toFixed(2)}/min
            </p>
          </div>
        </div>
        <button className="btn-secondary mt-4">Edit Rates</button>
      </div>
    </div>
  );
}
