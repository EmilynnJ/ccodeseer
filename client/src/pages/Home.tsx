import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, MessageCircle, Video, Users, Sparkles, ArrowRight } from 'lucide-react';
import api from '../services/api';

interface Reader {
  id: string;
  userId: string;
  displayName: string;
  slug: string;
  profileImage: string;
  specialties: string[];
  rating: number;
  totalReviews: number;
  status: string;
  chatRatePerMin: number;
  voiceRatePerMin: number;
  videoRatePerMin: number;
}

export default function Home() {
  const [onlineReaders, setOnlineReaders] = useState<Reader[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOnlineReaders = async () => {
      try {
        const response = await api.getOnlineReaders();
        setOnlineReaders(response.data.data);
      } catch (error) {
        console.error('Error fetching online readers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOnlineReaders();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Main Title */}
            <h1 className="brand-title text-6xl sm:text-7xl lg:text-8xl mb-6 animate-fade-in">
              SoulSeer
            </h1>

            {/* Hero Image */}
            <div className="relative max-w-3xl mx-auto mb-8">
              <img
                src="https://i.postimg.cc/tRLSgCPb/HERO-IMAGE-1.jpg"
                alt="SoulSeer - Psychic Readings"
                className="w-full h-auto rounded-2xl shadow-2xl shadow-primary-400/20 border border-primary-400/20"
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-dark-900/80 to-transparent" />
            </div>

            {/* Tagline */}
            <p className="text-xl sm:text-2xl lg:text-3xl text-gray-200 font-playfair italic mb-8">
              A Community of Gifted Psychics
            </p>

            <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
              Connect with experienced spiritual advisors for guidance, clarity, and insight.
              Pay only for the time you use.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/readers" className="btn-primary btn-lg flex items-center justify-center gap-2">
                <Sparkles size={20} />
                Find Your Reader
                <ArrowRight size={20} />
              </Link>
              <Link to="/about" className="btn-secondary btn-lg">
                Learn More
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-gold-400/10 rounded-full blur-3xl" />
      </section>

      {/* Online Readers Section */}
      <section className="py-16 bg-dark-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-playfair text-white mb-2">
                Readers Online Now
              </h2>
              <p className="text-gray-400">
                Connect instantly with available psychics
              </p>
            </div>
            <Link
              to="/readers"
              className="btn-ghost flex items-center gap-2"
            >
              View All
              <ArrowRight size={18} />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="card p-6">
                  <div className="skeleton w-24 h-24 rounded-full mx-auto mb-4" />
                  <div className="skeleton h-6 w-32 mx-auto mb-2" />
                  <div className="skeleton h-4 w-48 mx-auto mb-4" />
                  <div className="skeleton h-10 w-full" />
                </div>
              ))}
            </div>
          ) : onlineReaders.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {onlineReaders.slice(0, 8).map((reader) => (
                <Link
                  key={reader.id}
                  to={`/readers/${reader.slug}`}
                  className="card-hover p-6 text-center group"
                >
                  {/* Status indicator */}
                  <div className="relative inline-block mb-4">
                    <img
                      src={reader.profileImage}
                      alt={reader.displayName}
                      className="avatar avatar-xl mx-auto group-hover:border-primary-400 transition-all"
                    />
                    <div className="absolute bottom-1 right-1 status-online" />
                  </div>

                  {/* Name */}
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {reader.displayName}
                  </h3>

                  {/* Rating */}
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <Star size={14} className="text-gold-400 fill-current" />
                    <span className="text-gold-400 text-sm">
                      {Number(reader.rating).toFixed(1)}
                    </span>
                    <span className="text-gray-500 text-sm">
                      ({reader.totalReviews})
                    </span>
                  </div>

                  {/* Specialties */}
                  <div className="flex flex-wrap gap-1 justify-center mb-4">
                    {reader.specialties.slice(0, 2).map((specialty, i) => (
                      <span key={i} className="badge-primary text-xs">
                        {specialty}
                      </span>
                    ))}
                  </div>

                  {/* Rates */}
                  <div className="flex justify-center gap-3 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <MessageCircle size={12} />
                      ${Number(reader.chatRatePerMin).toFixed(2)}/min
                    </div>
                    <div className="flex items-center gap-1">
                      <Video size={12} />
                      ${Number(reader.videoRatePerMin).toFixed(2)}/min
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400">No readers are online right now.</p>
              <p className="text-gray-500 text-sm">Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-playfair text-white mb-4">
              How It Works
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Getting a reading is simple and secure
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="card-glass p-8 text-center">
              <div className="w-16 h-16 bg-primary-400/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users size={28} className="text-primary-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                1. Choose Your Reader
              </h3>
              <p className="text-gray-400">
                Browse our community of gifted psychics and find the one that resonates with you.
              </p>
            </div>

            {/* Step 2 */}
            <div className="card-glass p-8 text-center">
              <div className="w-16 h-16 bg-gold-400/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles size={28} className="text-gold-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                2. Add Funds
              </h3>
              <p className="text-gray-400">
                Add money to your balance. You only pay for the minutes you use during your reading.
              </p>
            </div>

            {/* Step 3 */}
            <div className="card-glass p-8 text-center">
              <div className="w-16 h-16 bg-primary-400/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Video size={28} className="text-primary-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                3. Connect & Receive Guidance
              </h3>
              <p className="text-gray-400">
                Start your reading via chat, phone, or video. End anytime you're ready.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-900/20 to-gold-900/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-playfair text-white mb-6">
            Ready to Begin Your Journey?
          </h2>
          <p className="text-lg text-gray-300 mb-8">
            Connect with a gifted psychic today and gain the clarity you seek.
          </p>
          <Link to="/readers" className="btn-primary btn-lg inline-flex items-center gap-2">
            <Sparkles size={20} />
            Start Your Reading
          </Link>
        </div>
      </section>
    </div>
  );
}
