import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Star, MessageCircle, Video, Users, Sparkles, ArrowRight,
  ShoppingBag, Mail, Radio, BookOpen, Send
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

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

interface LiveStream {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  type: string;
  viewerCount: number;
  reader: {
    id: string;
    displayName: string;
    profileImage: string;
    slug: string;
  };
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  images: string[];
  category?: string;
  type: string;
}

interface ForumPost {
  id: string;
  title: string;
  content: string;
  replyCount: number;
  viewCount: number;
  createdAt: string;
  author: {
    id: string;
    fullName: string;
    profileImage?: string;
  };
}

export default function Home() {
  const [onlineReaders, setOnlineReaders] = useState<Reader[]>([]);
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const [readersRes, streamsRes, productsRes, postsRes] = await Promise.allSettled([
          api.getOnlineReaders(),
          api.getLiveStreams(),
          api.getFeaturedProducts(4),
          api.getRecentForumPosts(4),
        ]);

        if (readersRes.status === 'fulfilled') setOnlineReaders(readersRes.value.data.data || []);
        if (streamsRes.status === 'fulfilled') setLiveStreams(streamsRes.value.data.data || []);
        if (productsRes.status === 'fulfilled') setProducts(productsRes.value.data.data || []);
        if (postsRes.status === 'fulfilled') setForumPosts(postsRes.value.data.data || []);
      } catch (error) {
        console.error('Error fetching home data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;

    setIsSubscribing(true);
    try {
      await api.subscribeNewsletter(newsletterEmail);
      toast.success('Successfully subscribed to our newsletter!');
      setNewsletterEmail('');
    } catch {
      toast.error('Failed to subscribe. Please try again.');
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section - Compact */}
      <section className="relative py-10 lg:py-16 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="brand-title text-5xl sm:text-6xl lg:text-7xl mb-4 animate-fade-in">
              SoulSeer
            </h1>

            <div className="relative max-w-2xl mx-auto mb-6">
              <img
                src="https://i.postimg.cc/tRLSgCPb/HERO-IMAGE-1.jpg"
                alt="SoulSeer - Psychic Readings"
                className="w-full h-48 sm:h-56 lg:h-64 object-cover rounded-2xl shadow-2xl shadow-primary-400/20 border border-primary-400/20"
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-dark-900/80 to-transparent" />
            </div>

            <p className="text-lg sm:text-xl lg:text-2xl text-gray-200 font-playfair italic mb-3">
              A Community of Gifted Psychics
            </p>
            <p className="text-base text-gray-400 max-w-xl mx-auto mb-6">
              Connect with experienced spiritual advisors for guidance, clarity, and insight.
              Pay only for the time you use.
            </p>
          </div>
        </div>

        <div className="absolute top-10 left-10 w-24 h-24 bg-primary-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-gold-400/10 rounded-full blur-3xl" />
      </section>

      {/* Four Navigation Buttons */}
      <section className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Link
              to="/readers"
              className="card-glass p-6 text-center group hover:border-primary-400/40 transition-all duration-300"
            >
              <div className="w-14 h-14 bg-primary-400/20 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-primary-400/30 transition-colors">
                <Users size={26} className="text-primary-400" />
              </div>
              <span className="text-white font-semibold text-lg">Readers</span>
              <p className="text-gray-400 text-xs mt-1">Find your psychic</p>
            </Link>

            <Link
              to="/community"
              className="card-glass p-6 text-center group hover:border-gold-400/40 transition-all duration-300"
            >
              <div className="w-14 h-14 bg-gold-400/20 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-gold-400/30 transition-colors">
                <BookOpen size={26} className="text-gold-400" />
              </div>
              <span className="text-white font-semibold text-lg">Community</span>
              <p className="text-gray-400 text-xs mt-1">Join the tribe</p>
            </Link>

            <Link
              to="/shop"
              className="card-glass p-6 text-center group hover:border-primary-400/40 transition-all duration-300"
            >
              <div className="w-14 h-14 bg-primary-400/20 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-primary-400/30 transition-colors">
                <ShoppingBag size={26} className="text-primary-400" />
              </div>
              <span className="text-white font-semibold text-lg">Shop</span>
              <p className="text-gray-400 text-xs mt-1">Spiritual goods</p>
            </Link>

            <Link
              to="/about#contact"
              className="card-glass p-6 text-center group hover:border-gold-400/40 transition-all duration-300"
            >
              <div className="w-14 h-14 bg-gold-400/20 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-gold-400/30 transition-colors">
                <Mail size={26} className="text-gold-400" />
              </div>
              <span className="text-white font-semibold text-lg">Contact</span>
              <p className="text-gray-400 text-xs mt-1">Get in touch</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Online Readers Section */}
      <section className="py-12 bg-dark-800/50">
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
            <Link to="/readers" className="btn-ghost flex items-center gap-2">
              View All <ArrowRight size={18} />
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
                  <div className="relative inline-block mb-4">
                    <img
                      src={reader.profileImage}
                      alt={reader.displayName}
                      className="avatar avatar-xl mx-auto group-hover:border-primary-400 transition-all"
                    />
                    <div className="absolute bottom-1 right-1 status-online" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {reader.displayName}
                  </h3>
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <Star size={14} className="text-gold-400 fill-current" />
                    <span className="text-gold-400 text-sm">
                      {Number(reader.rating).toFixed(1)}
                    </span>
                    <span className="text-gray-500 text-sm">
                      ({reader.totalReviews})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-center mb-4">
                    {reader.specialties.slice(0, 2).map((specialty, i) => (
                      <span key={i} className="badge-primary text-xs">
                        {specialty}
                      </span>
                    ))}
                  </div>
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

      {/* Active Live Streams Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-playfair text-white mb-2">
                <Radio size={28} className="inline-block text-red-500 mr-2 animate-pulse" />
                Live Now
              </h2>
              <p className="text-gray-400">
                Watch live psychic readings and spiritual sessions
              </p>
            </div>
            <Link to="/live" className="btn-ghost flex items-center gap-2">
              View All <ArrowRight size={18} />
            </Link>
          </div>

          {liveStreams.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {liveStreams.slice(0, 4).map((stream) => (
                <Link
                  key={stream.id}
                  to={`/live`}
                  className="card-hover overflow-hidden group"
                >
                  <div className="relative h-40 bg-dark-700">
                    {stream.thumbnailUrl ? (
                      <img
                        src={stream.thumbnailUrl}
                        alt={stream.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video size={40} className="text-gray-600" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex items-center gap-1 bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                      <Radio size={10} />
                      LIVE
                    </div>
                    <div className="absolute bottom-3 right-3 bg-dark-900/80 text-gray-300 text-xs px-2 py-1 rounded">
                      {stream.viewerCount} watching
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-white font-semibold text-sm truncate mb-2">
                      {stream.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <img
                        src={stream.reader?.profileImage}
                        alt={stream.reader?.displayName}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-gray-400 text-xs">{stream.reader?.displayName}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 card-glass">
              <Video size={48} className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400">No live streams right now.</p>
              <p className="text-gray-500 text-sm mt-1">Check back soon for live readings!</p>
            </div>
          )}
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-12 bg-dark-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-playfair text-white mb-2">
                Featured Products
              </h2>
              <p className="text-gray-400">
                Spiritual tools, crystals, and more
              </p>
            </div>
            <Link to="/shop" className="btn-ghost flex items-center gap-2">
              Shop All <ArrowRight size={18} />
            </Link>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.slice(0, 4).map((product) => (
                <Link
                  key={product.id}
                  to="/shop"
                  className="card-hover overflow-hidden group"
                >
                  <div className="h-48 bg-dark-700">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag size={40} className="text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-white font-semibold text-sm truncate mb-1">
                      {product.name}
                    </h3>
                    <p className="text-gold-400 font-bold">
                      ${Number(product.price).toFixed(2)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 card-glass">
              <ShoppingBag size={48} className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400">Products coming soon!</p>
              <p className="text-gray-500 text-sm mt-1">Our spiritual shop is being stocked.</p>
            </div>
          )}
        </div>
      </section>

      {/* Community Updates Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-playfair text-white mb-2">
                Community Updates
              </h2>
              <p className="text-gray-400">
                Latest discussions from our soul tribe
              </p>
            </div>
            <Link to="/community" className="btn-ghost flex items-center gap-2">
              View All <ArrowRight size={18} />
            </Link>
          </div>

          {forumPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {forumPosts.slice(0, 4).map((post) => (
                <Link
                  key={post.id}
                  to="/community"
                  className="card-hover p-6 group"
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={post.author?.profileImage || '/default-avatar.png'}
                      alt={post.author?.fullName}
                      className="w-10 h-10 rounded-full flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold truncate group-hover:text-primary-400 transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                        {post.content}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        <span>{post.author?.fullName}</span>
                        <span>{post.replyCount} replies</span>
                        <span>{post.viewCount} views</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 card-glass">
              <BookOpen size={48} className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400">Community forum coming soon!</p>
              <p className="text-gray-500 text-sm mt-1">Join us and start the conversation.</p>
            </div>
          )}
        </div>
      </section>

      {/* Newsletter Subscription Section */}
      <section className="py-16 bg-gradient-to-r from-primary-900/30 to-gold-900/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-16 h-16 bg-primary-400/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles size={28} className="text-primary-400" />
          </div>
          <h2 className="text-3xl font-playfair text-white mb-4">
            Stay Connected
          </h2>
          <p className="text-gray-300 mb-8 max-w-lg mx-auto">
            Subscribe to our newsletter for spiritual insights, special offers,
            and updates from the SoulSeer community.
          </p>
          <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="Enter your email address"
              className="flex-1 px-4 py-3 bg-dark-700 border border-primary-400/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-400/50 transition-colors"
              required
            />
            <button
              type="submit"
              disabled={isSubscribing}
              className="btn-primary px-6 py-3 flex items-center justify-center gap-2"
            >
              <Send size={18} />
              {isSubscribing ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
