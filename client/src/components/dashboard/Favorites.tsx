import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Star, MessageCircle, Video, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface FavoriteReader {
  readerId: string;
  addedAt: string;
  reader: {
    id: string;
    displayName: string;
    slug: string;
    profileImage: string;
    specialties: string[];
    rating: number;
    status: string;
    chatRatePerMin: number;
    voiceRatePerMin: number;
    videoRatePerMin: number;
  };
}

export default function Favorites() {
  const [favorites, setFavorites] = useState<FavoriteReader[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const response = await api.getFavorites();
        setFavorites(response.data.data);
      } catch (error) {
        console.error('Error fetching favorites:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFavorites();
  }, []);

  const handleRemove = async (readerId: string) => {
    try {
      await api.removeFavorite(readerId);
      setFavorites((prev) => prev.filter((f) => f.readerId !== readerId));
      toast.success('Removed from favorites');
    } catch (error) {
      toast.error('Failed to remove');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <div className="skeleton h-8 w-48 mb-2" />
          <div className="skeleton h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-playfair text-white mb-2">Favorite Readers</h1>
        <p className="text-gray-400">Your saved readers for quick access.</p>
      </div>

      {favorites.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {favorites.map((fav) => (
            <div key={fav.readerId} className="card p-6 relative group">
              {/* Remove button */}
              <button
                onClick={() => handleRemove(fav.readerId)}
                className="absolute top-4 right-4 p-2 bg-dark-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 hover:text-red-400"
              >
                <Trash2 size={16} />
              </button>

              <div className="flex gap-4">
                {/* Avatar */}
                <div className="relative">
                  <img
                    src={fav.reader.profileImage}
                    alt={fav.reader.displayName}
                    className="avatar avatar-lg"
                  />
                  <div
                    className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-dark-800 ${
                      fav.reader.status === 'online'
                        ? 'bg-green-500'
                        : fav.reader.status === 'busy'
                        ? 'bg-yellow-500'
                        : 'bg-gray-500'
                    }`}
                  />
                </div>

                {/* Info */}
                <div className="flex-1">
                  <Link
                    to={`/readers/${fav.reader.slug}`}
                    className="text-lg font-semibold text-white hover:text-primary-400 transition-colors"
                  >
                    {fav.reader.displayName}
                  </Link>

                  <div className="flex items-center gap-2 mt-1">
                    <Star size={14} className="text-gold-400 fill-current" />
                    <span className="text-gold-400 text-sm">
                      {Number(fav.reader.rating).toFixed(1)}
                    </span>
                    <span
                      className={`badge text-xs ${
                        fav.reader.status === 'online'
                          ? 'badge-success'
                          : 'badge-warning'
                      }`}
                    >
                      {fav.reader.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {fav.reader.specialties.slice(0, 2).map((s, i) => (
                      <span key={i} className="badge-primary text-xs">
                        {s}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-4 mt-3 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <MessageCircle size={14} />
                      ${Number(fav.reader.chatRatePerMin).toFixed(2)}/min
                    </span>
                    <span className="flex items-center gap-1">
                      <Video size={14} />
                      ${Number(fav.reader.videoRatePerMin).toFixed(2)}/min
                    </span>
                  </div>
                </div>
              </div>

              {/* Connect button */}
              {fav.reader.status === 'online' && (
                <Link
                  to={`/readers/${fav.reader.slug}`}
                  className="btn-primary w-full mt-4"
                >
                  Connect Now
                </Link>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <Heart size={64} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl text-white mb-2">No Favorites Yet</h3>
          <p className="text-gray-400 mb-6">
            Save your favorite readers for quick access.
          </p>
          <Link to="/readers" className="btn-primary inline-block">
            Browse Readers
          </Link>
        </div>
      )}
    </div>
  );
}
