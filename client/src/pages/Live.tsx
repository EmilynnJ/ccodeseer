import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Video, Users, Calendar, Play } from 'lucide-react';
import api from '../services/api';

interface Stream {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  type: string;
  viewerCount: number;
  scheduledStart?: string;
  actualStart?: string;
  reader: {
    id: string;
    displayName: string;
    profileImage: string;
    slug: string;
  };
}

export default function Live() {
  const [liveStreams, setLiveStreams] = useState<Stream[]>([]);
  const [scheduledStreams, setScheduledStreams] = useState<Stream[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStreams = async () => {
      try {
        const [liveRes, scheduledRes] = await Promise.all([
          api.getLiveStreams(),
          api.getScheduledStreams(),
        ]);
        setLiveStreams(liveRes.data.data);
        setScheduledStreams(scheduledRes.data.data);
      } catch (error) {
        console.error('Error fetching streams:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStreams();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="skeleton h-8 w-48 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton h-64 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-playfair text-white mb-4">Live Streams</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Watch live readings, spiritual teachings, and connect with our community in real-time.
          </p>
        </div>

        {/* Live Now Section */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <h2 className="text-2xl font-playfair text-white">Live Now</h2>
          </div>

          {liveStreams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveStreams.map((stream) => (
                <Link
                  key={stream.id}
                  to={`/live/${stream.id}`}
                  className="card-hover overflow-hidden group"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-dark-700">
                    {stream.thumbnailUrl ? (
                      <img
                        src={stream.thumbnailUrl}
                        alt={stream.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video size={48} className="text-gray-600" />
                      </div>
                    )}

                    {/* Live badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-500 text-white px-2 py-1 rounded text-sm font-semibold">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      LIVE
                    </div>

                    {/* Viewer count */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/60 text-white px-2 py-1 rounded text-sm">
                      <Users size={14} />
                      {stream.viewerCount}
                    </div>

                    {/* Play overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-16 h-16 bg-primary-400 rounded-full flex items-center justify-center">
                        <Play size={32} className="text-white ml-1" />
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-primary-400 transition-colors">
                      {stream.title}
                    </h3>
                    <div className="flex items-center gap-3">
                      <img
                        src={stream.reader.profileImage}
                        alt={stream.reader.displayName}
                        className="avatar avatar-sm"
                      />
                      <span className="text-gray-400">{stream.reader.displayName}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="card-glass p-12 text-center">
              <Video size={48} className="mx-auto text-gray-600 mb-4" />
              <h3 className="text-xl text-white mb-2">No Live Streams</h3>
              <p className="text-gray-400">
                Check back later or view upcoming scheduled streams below.
              </p>
            </div>
          )}
        </section>

        {/* Upcoming Section */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Calendar size={24} className="text-primary-400" />
            <h2 className="text-2xl font-playfair text-white">Upcoming Streams</h2>
          </div>

          {scheduledStreams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scheduledStreams.map((stream) => (
                <div key={stream.id} className="card p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <img
                      src={stream.reader.profileImage}
                      alt={stream.reader.displayName}
                      className="avatar avatar-lg"
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-white">{stream.title}</h3>
                      <p className="text-gray-400">{stream.reader.displayName}</p>
                    </div>
                  </div>

                  {stream.scheduledStart && (
                    <div className="flex items-center gap-2 text-primary-400 mb-4">
                      <Calendar size={16} />
                      <span className="text-sm">
                        {new Date(stream.scheduledStart).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {stream.description && (
                    <p className="text-gray-400 text-sm line-clamp-2">{stream.description}</p>
                  )}

                  <button className="btn-secondary w-full mt-4">
                    Set Reminder
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-glass p-12 text-center">
              <Calendar size={48} className="mx-auto text-gray-600 mb-4" />
              <h3 className="text-xl text-white mb-2">No Upcoming Streams</h3>
              <p className="text-gray-400">
                Check back later for scheduled events.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
