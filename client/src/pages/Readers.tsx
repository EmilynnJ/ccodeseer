import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, MessageCircle, Phone, Video, Search, Filter, Users } from 'lucide-react';
import api from '../services/api';

interface Reader {
  id: string;
  userId: string;
  displayName: string;
  slug: string;
  bio: string;
  profileImage: string;
  specialties: string[];
  rating: number;
  totalReviews: number;
  totalReadings: number;
  status: string;
  chatRatePerMin: number;
  voiceRatePerMin: number;
  videoRatePerMin: number;
}

export default function Readers() {
  const [readers, setReaders] = useState<Reader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const specialties = [
    'all',
    'Tarot',
    'Clairvoyant',
    'Medium',
    'Astrology',
    'Love & Relationships',
    'Career',
    'Spiritual Guidance',
    'Energy Healing',
    'Past Lives',
    'Dream Interpretation',
  ];

  useEffect(() => {
    const fetchReaders = async () => {
      try {
        setIsLoading(true);
        const response = await api.getReaders({ limit: 50 });
        setReaders(response.data.data);
      } catch (error) {
        console.error('Error fetching readers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReaders();
  }, []);

  const filteredReaders = readers.filter((reader) => {
    const matchesSearch =
      reader.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reader.bio.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSpecialty =
      selectedSpecialty === 'all' ||
      reader.specialties.some((s) =>
        s.toLowerCase().includes(selectedSpecialty.toLowerCase())
      );

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'online' && reader.status === 'online');

    return matchesSearch && matchesSpecialty && matchesStatus;
  });

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'online':
        return 'status-online';
      case 'busy':
        return 'status-busy';
      case 'in_session':
        return 'status-in-session';
      default:
        return 'status-offline';
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-playfair text-white mb-4">
            Our Gifted Readers
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Connect with experienced spiritual advisors who are ready to guide you on your journey.
          </p>
        </div>

        {/* Filters */}
        <div className="card p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search readers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>

            {/* Specialty Filter */}
            <div className="relative">
              <Filter
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="input pl-10 appearance-none"
              >
                {specialties.map((specialty) => (
                  <option key={specialty} value={specialty}>
                    {specialty === 'all' ? 'All Specialties' : specialty}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`flex-1 py-2 px-4 rounded-lg transition-all ${
                  statusFilter === 'all'
                    ? 'bg-primary-400/20 text-primary-400 border border-primary-400'
                    : 'bg-dark-700 text-gray-400 border border-transparent hover:border-primary-400/30'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('online')}
                className={`flex-1 py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2 ${
                  statusFilter === 'online'
                    ? 'bg-green-400/20 text-green-400 border border-green-400'
                    : 'bg-dark-700 text-gray-400 border border-transparent hover:border-green-400/30'
                }`}
              >
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                Online
              </button>
            </div>
          </div>
        </div>

        {/* Readers Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card p-6">
                <div className="flex gap-4">
                  <div className="skeleton w-20 h-20 rounded-full" />
                  <div className="flex-1">
                    <div className="skeleton h-6 w-32 mb-2" />
                    <div className="skeleton h-4 w-24 mb-2" />
                    <div className="skeleton h-4 w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredReaders.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReaders.map((reader) => (
              <Link
                key={reader.id}
                to={`/readers/${reader.slug}`}
                className="card-hover p-6 group"
              >
                <div className="flex gap-4 mb-4">
                  {/* Avatar with status */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={reader.profileImage}
                      alt={reader.displayName}
                      className="avatar avatar-lg group-hover:border-primary-400 transition-all"
                    />
                    <div
                      className={`absolute bottom-0 right-0 ${getStatusClass(
                        reader.status
                      )}`}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white truncate group-hover:text-primary-400 transition-colors">
                      {reader.displayName}
                    </h3>

                    {/* Rating */}
                    <div className="flex items-center gap-1 mb-1">
                      <Star size={14} className="text-gold-400 fill-current" />
                      <span className="text-gold-400 text-sm">
                        {Number(reader.rating).toFixed(1)}
                      </span>
                      <span className="text-gray-500 text-sm">
                        ({reader.totalReviews} reviews)
                      </span>
                    </div>

                    {/* Readings count */}
                    <p className="text-gray-500 text-xs">
                      {reader.totalReadings} readings
                    </p>
                  </div>
                </div>

                {/* Bio preview */}
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                  {reader.bio}
                </p>

                {/* Specialties */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {reader.specialties.slice(0, 3).map((specialty, i) => (
                    <span key={i} className="badge-primary text-xs">
                      {specialty}
                    </span>
                  ))}
                  {reader.specialties.length > 3 && (
                    <span className="badge text-xs bg-dark-600 text-gray-400">
                      +{reader.specialties.length - 3}
                    </span>
                  )}
                </div>

                {/* Rates */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-dark-700/50 rounded-lg py-2 px-3">
                    <MessageCircle size={14} className="mx-auto text-primary-400 mb-1" />
                    <p className="text-white text-sm font-semibold">
                      ${Number(reader.chatRatePerMin).toFixed(2)}
                    </p>
                    <p className="text-gray-500 text-xs">/min</p>
                  </div>
                  <div className="bg-dark-700/50 rounded-lg py-2 px-3">
                    <Phone size={14} className="mx-auto text-primary-400 mb-1" />
                    <p className="text-white text-sm font-semibold">
                      ${Number(reader.voiceRatePerMin).toFixed(2)}
                    </p>
                    <p className="text-gray-500 text-xs">/min</p>
                  </div>
                  <div className="bg-dark-700/50 rounded-lg py-2 px-3">
                    <Video size={14} className="mx-auto text-primary-400 mb-1" />
                    <p className="text-white text-sm font-semibold">
                      ${Number(reader.videoRatePerMin).toFixed(2)}
                    </p>
                    <p className="text-gray-500 text-xs">/min</p>
                  </div>
                </div>

                {/* Connect button */}
                {reader.status === 'online' && (
                  <button className="btn-primary w-full mt-4 group-hover:shadow-glow">
                    Connect Now
                  </button>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Users size={64} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl text-white mb-2">No readers found</h3>
            <p className="text-gray-400">
              Try adjusting your filters or search terms.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
