import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import {
  Star,
  MessageCircle,
  Phone,
  Video,
  Heart,
  Share2,
  Clock,
  ChevronLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';

interface ReaderData {
  id: string;
  userId: string;
  displayName: string;
  slug: string;
  bio: string;
  profileImage: string;
  coverImage?: string;
  specialties: string[];
  rating: number;
  totalReviews: number;
  totalReadings: number;
  status: string;
  chatRatePerMin: number;
  voiceRatePerMin: number;
  videoRatePerMin: number;
  user?: {
    fullName: string;
    isOnline: boolean;
  };
  reviews?: Array<{
    id: string;
    rating: number;
    comment: string;
    readerResponse?: string;
    createdAt: string;
    clientName: string;
  }>;
}

export default function ReaderProfile() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const { clientProfile } = useAuthStore();
  const [reader, setReader] = useState<ReaderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedType, setSelectedType] = useState<'chat' | 'voice' | 'video'>('chat');

  useEffect(() => {
    const fetchReader = async () => {
      if (!slug) return;
      try {
        const response = await api.getReaderProfile(slug);
        setReader(response.data.data);
      } catch (error) {
        console.error('Error fetching reader:', error);
        toast.error('Reader not found');
        navigate('/readers');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReader();
  }, [slug, navigate]);

  const handleStartSession = async () => {
    if (!isSignedIn) {
      toast.error('Please sign in to start a reading');
      return;
    }

    if (!reader) return;

    const rate =
      selectedType === 'chat'
        ? reader.chatRatePerMin
        : selectedType === 'voice'
        ? reader.voiceRatePerMin
        : reader.videoRatePerMin;

    const minBalance = Number(rate) * 3;

    if (!clientProfile || Number(clientProfile.balance) < minBalance) {
      toast.error(`You need at least $${minBalance.toFixed(2)} to start a reading`);
      navigate('/dashboard/wallet');
      return;
    }

    try {
      const response = await api.requestSession(reader.userId, selectedType);
      toast.success('Session requested! Waiting for reader to accept...');
      navigate(`/session/${response.data.data.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to request session');
    }
  };

  const toggleFavorite = async () => {
    if (!isSignedIn) {
      toast.error('Please sign in to save favorites');
      return;
    }

    if (!reader) return;

    try {
      if (isFavorite) {
        await api.removeFavorite(reader.userId);
        setIsFavorite(false);
        toast.success('Removed from favorites');
      } else {
        await api.addFavorite(reader.userId);
        setIsFavorite(true);
        toast.success('Added to favorites');
      }
    } catch (error) {
      toast.error('Failed to update favorites');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="skeleton h-64 w-full rounded-xl mb-6" />
          <div className="skeleton h-8 w-48 mb-4" />
          <div className="skeleton h-4 w-full mb-2" />
          <div className="skeleton h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (!reader) {
    return null;
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'busy':
        return 'bg-yellow-500';
      case 'in_session':
        return 'bg-primary-400';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online':
        return 'Available Now';
      case 'busy':
        return 'Busy';
      case 'in_session':
        return 'In Session';
      default:
        return 'Offline';
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <button
          onClick={() => navigate('/readers')}
          className="flex items-center gap-2 text-gray-400 hover:text-primary-400 mb-6 transition-colors"
        >
          <ChevronLeft size={20} />
          Back to Readers
        </button>

        {/* Profile Header */}
        <div className="card overflow-hidden mb-8">
          {/* Cover image */}
          <div className="h-48 bg-gradient-to-r from-primary-900/50 to-gold-900/50 relative">
            {reader.coverImage && (
              <img
                src={reader.coverImage}
                alt=""
                className="w-full h-full object-cover opacity-50"
              />
            )}
          </div>

          <div className="px-6 pb-6">
            {/* Avatar and basic info */}
            <div className="flex flex-col sm:flex-row gap-6 -mt-16 relative">
              <div className="relative">
                <img
                  src={reader.profileImage}
                  alt={reader.displayName}
                  className="w-32 h-32 rounded-full border-4 border-dark-800 object-cover"
                />
                <div
                  className={`absolute bottom-2 right-2 w-5 h-5 rounded-full border-2 border-dark-800 ${getStatusClass(
                    reader.status
                  )}`}
                />
              </div>

              <div className="flex-1 pt-4 sm:pt-16">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-playfair text-white mb-1">
                      {reader.displayName}
                    </h1>
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`badge ${
                          reader.status === 'online' ? 'badge-success' : 'badge-warning'
                        }`}
                      >
                        {getStatusText(reader.status)}
                      </span>
                      <div className="flex items-center gap-1">
                        <Star size={16} className="text-gold-400 fill-current" />
                        <span className="text-gold-400 font-semibold">
                          {Number(reader.rating).toFixed(1)}
                        </span>
                        <span className="text-gray-500">
                          ({reader.totalReviews} reviews)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {reader.totalReadings} readings
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={toggleFavorite}
                      className={`p-3 rounded-lg border transition-all ${
                        isFavorite
                          ? 'bg-primary-400/20 border-primary-400 text-primary-400'
                          : 'bg-dark-700 border-transparent text-gray-400 hover:text-primary-400'
                      }`}
                    >
                      <Heart size={20} className={isFavorite ? 'fill-current' : ''} />
                    </button>
                    <button className="p-3 rounded-lg bg-dark-700 text-gray-400 hover:text-primary-400 transition-colors">
                      <Share2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Specialties */}
            <div className="flex flex-wrap gap-2 mt-6">
              {reader.specialties.map((specialty, i) => (
                <span key={i} className="badge-primary">
                  {specialty}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Bio */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-white mb-4">About</h2>
              <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                {reader.bio}
              </p>
            </div>

            {/* Reviews */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                Reviews ({reader.totalReviews})
              </h2>
              {reader.reviews && reader.reviews.length > 0 ? (
                <div className="space-y-4">
                  {reader.reviews.map((review) => (
                    <div key={review.id} className="border-b border-primary-400/10 pb-4 last:border-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              className={
                                i < review.rating
                                  ? 'text-gold-400 fill-current'
                                  : 'text-gray-600'
                              }
                            />
                          ))}
                        </div>
                        <span className="text-gray-400 text-sm">{review.clientName}</span>
                      </div>
                      <p className="text-gray-300 text-sm">{review.comment}</p>
                      {review.readerResponse && (
                        <div className="mt-2 pl-4 border-l-2 border-primary-400/30">
                          <p className="text-sm text-gray-400 italic">
                            "{review.readerResponse}"
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No reviews yet.</p>
              )}
            </div>
          </div>

          {/* Sidebar - Booking */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-24">
              <h2 className="text-xl font-semibold text-white mb-4">Start a Reading</h2>

              {/* Session type selection */}
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => setSelectedType('chat')}
                  className={`w-full p-4 rounded-lg border transition-all flex items-center justify-between ${
                    selectedType === 'chat'
                      ? 'bg-primary-400/20 border-primary-400'
                      : 'bg-dark-700 border-transparent hover:border-primary-400/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MessageCircle size={20} className="text-primary-400" />
                    <span className="text-white">Chat</span>
                  </div>
                  <span className="text-gold-400 font-semibold">
                    ${Number(reader.chatRatePerMin).toFixed(2)}/min
                  </span>
                </button>

                <button
                  onClick={() => setSelectedType('voice')}
                  className={`w-full p-4 rounded-lg border transition-all flex items-center justify-between ${
                    selectedType === 'voice'
                      ? 'bg-primary-400/20 border-primary-400'
                      : 'bg-dark-700 border-transparent hover:border-primary-400/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Phone size={20} className="text-primary-400" />
                    <span className="text-white">Voice Call</span>
                  </div>
                  <span className="text-gold-400 font-semibold">
                    ${Number(reader.voiceRatePerMin).toFixed(2)}/min
                  </span>
                </button>

                <button
                  onClick={() => setSelectedType('video')}
                  className={`w-full p-4 rounded-lg border transition-all flex items-center justify-between ${
                    selectedType === 'video'
                      ? 'bg-primary-400/20 border-primary-400'
                      : 'bg-dark-700 border-transparent hover:border-primary-400/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Video size={20} className="text-primary-400" />
                    <span className="text-white">Video Call</span>
                  </div>
                  <span className="text-gold-400 font-semibold">
                    ${Number(reader.videoRatePerMin).toFixed(2)}/min
                  </span>
                </button>
              </div>

              {/* Start button */}
              <button
                onClick={handleStartSession}
                disabled={reader.status !== 'online'}
                className="btn-primary w-full"
              >
                {reader.status === 'online' ? 'Start Reading' : 'Reader Unavailable'}
              </button>

              {/* Balance reminder */}
              {isSignedIn && clientProfile && (
                <p className="text-center text-sm text-gray-400 mt-4">
                  Your balance:{' '}
                  <span className="text-gold-400 font-semibold">
                    ${Number(clientProfile.balance).toFixed(2)}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
