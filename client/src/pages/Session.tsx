import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Send,
  Clock,
  DollarSign,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useSessionStore } from '../stores/sessionStore';
import { useAuthStore } from '../stores/authStore';
import { useRealtimeStore } from '../stores/realtimeStore';
import { useAgora } from '../hooks/useAgora';

export default function Session() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const { user, clientProfile } = useAuthStore();
  const {
    currentSession,
    agoraCredentials,
    messages,
    elapsedSeconds,
    setCurrentSession,
    setAgoraCredentials,
    addMessage,
    setMessages,
    incrementElapsed,
    clearSession,
  } = useSessionStore();
  const { subscribeToSession, unsubscribeFromSession } = useRealtimeStore();

  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Agora hook — only active when we have credentials and session is voice/video
  const agora = useAgora({
    channelName: agoraCredentials?.channelName || '',
    token: agoraCredentials?.token || '',
    uid: agoraCredentials?.uid || 0,
    type: (currentSession?.type as 'voice' | 'video') || 'voice',
    onUserJoined: () => {
      toast.success('Reader connected');
    },
    onUserLeft: () => {
      toast('Reader disconnected', { icon: '⚠️' });
    },
  });

  // Fetch session data
  useEffect(() => {
    if (!isSignedIn) {
      navigate('/sign-in');
      return;
    }

    const fetchSession = async () => {
      if (!sessionId) return;
      try {
        const response = await api.getSession(sessionId);
        const sessionData = response.data.data.session;
        setCurrentSession(sessionData);

        // If session already has agora credentials (reader accepted)
        if (response.data.data.agora) {
          setAgoraCredentials(response.data.data.agora);
        }

        // Load messages if chat session
        if (sessionData.type === 'chat' || sessionData.status === 'active') {
          try {
            const messagesRes = await api.getSessionMessages(sessionId);
            setMessages(messagesRes.data.data);
          } catch {
            // Messages may not be available yet
          }
        }
      } catch (error: any) {
        toast.error('Failed to load session');
        navigate('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [sessionId, isSignedIn]);

  // Subscribe to real-time session events via Ably
  useEffect(() => {
    if (!sessionId) return;

    subscribeToSession(sessionId, {
      onMessage: (message: any) => {
        // Don't add own messages (they're added locally)
        if (message.senderId !== user?.id) {
          addMessage(message);
        }
      },
      onSessionEnd: () => {
        toast.success('Session ended');
        clearSession();
        navigate('/dashboard/history');
      },
    });

    return () => {
      unsubscribeFromSession(sessionId);
    };
  }, [sessionId, user?.id]);

  // Join Agora when we have credentials and session is active for voice/video
  useEffect(() => {
    if (
      agoraCredentials &&
      currentSession?.status === 'active' &&
      (currentSession.type === 'voice' || currentSession.type === 'video') &&
      !agora.isJoined
    ) {
      agora.join().catch((err) => {
        console.error('Failed to join Agora channel:', err);
        toast.error('Failed to connect to call');
      });
    }
  }, [agoraCredentials, currentSession?.status, currentSession?.type, agora.isJoined]);

  // Play local video track in container
  useEffect(() => {
    if (agora.localVideoTrack && localVideoRef.current) {
      agora.localVideoTrack.play(localVideoRef.current);
    }
  }, [agora.localVideoTrack]);

  // Play remote video track in container
  useEffect(() => {
    if (agora.remoteUsers.length > 0 && remoteVideoRef.current) {
      const remoteUser = agora.remoteUsers[0];
      if (remoteUser.videoTrack) {
        remoteUser.videoTrack.play(remoteVideoRef.current);
      }
    }
  }, [agora.remoteUsers]);

  // Timer for active sessions
  useEffect(() => {
    if (currentSession?.status === 'active' && !timerRef.current) {
      timerRef.current = setInterval(() => {
        incrementElapsed();
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentSession?.status, incrementElapsed]);

  // Auto scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateCost = () => {
    if (!currentSession) return 0;
    const minutes = Math.ceil(elapsedSeconds / 60);
    return minutes * Number(currentSession.ratePerMin);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !sessionId) return;

    try {
      await api.sendSessionMessage(sessionId, newMessage.trim());
      addMessage({
        id: Date.now().toString(),
        sessionId,
        senderId: user!.id,
        content: newMessage.trim(),
        type: 'text',
        createdAt: new Date().toISOString(),
      });
      setNewMessage('');
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) return;

    if (confirm('Are you sure you want to end this session?')) {
      try {
        // Leave Agora channel first
        if (agora.isJoined) {
          await agora.leave();
        }
        await api.endSession(sessionId);
        toast.success('Session ended');
        clearSession();
        navigate('/dashboard/history');
      } catch (error) {
        toast.error('Failed to end session');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-gray-400">Connecting to session...</p>
        </div>
      </div>
    );
  }

  if (!currentSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <X size={64} className="mx-auto text-gray-600 mb-4" />
          <h2 className="text-xl text-white mb-2">Session Not Found</h2>
          <p className="text-gray-400 mb-4">This session may have ended or doesn't exist.</p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Waiting for acceptance
  if (currentSession.status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card p-8 text-center max-w-md">
          <div className="spinner mx-auto mb-4" />
          <h2 className="text-xl text-white mb-2">Waiting for Reader</h2>
          <p className="text-gray-400 mb-4">
            Your reading request has been sent. Please wait for the reader to accept.
          </p>
          <button
            onClick={() => {
              clearSession();
              navigate('/readers');
            }}
            className="btn-secondary"
          >
            Cancel Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-dark-800 border-b border-primary-400/10 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-primary-400" />
              <span className="text-2xl font-mono text-white">
                {formatTime(elapsedSeconds)}
              </span>
            </div>
            <div className="divider-gold h-8 w-px" />
            <div className="flex items-center gap-2">
              <DollarSign size={20} className="text-gold-400" />
              <span className="text-xl text-gold-400">
                ${calculateCost().toFixed(2)}
              </span>
            </div>
            <span className="text-xs text-gray-500">
              ${Number(currentSession.ratePerMin).toFixed(2)}/min
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 mr-4">
              Balance: ${Number(clientProfile?.balance || 0).toFixed(2)}
            </span>
            <button
              onClick={handleEndSession}
              className="btn bg-red-500 hover:bg-red-600 text-white flex items-center gap-2"
            >
              <PhoneOff size={18} />
              End Session
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex">
        {/* Video/Voice area */}
        {(currentSession.type === 'voice' || currentSession.type === 'video') && (
          <div className="flex-1 bg-dark-900 flex items-center justify-center relative">
            {currentSession.type === 'video' ? (
              <div className="w-full h-full relative">
                {/* Remote video (full) */}
                <div
                  ref={remoteVideoRef}
                  className="w-full h-full bg-dark-800 flex items-center justify-center"
                >
                  {agora.remoteUsers.length === 0 && (
                    <div className="text-center">
                      <div className="spinner mx-auto mb-4" />
                      <p className="text-gray-400">Waiting for reader to connect...</p>
                    </div>
                  )}
                </div>

                {/* Local video (picture-in-picture) */}
                <div
                  ref={localVideoRef}
                  className="absolute bottom-4 right-4 w-48 h-36 bg-dark-700 rounded-lg overflow-hidden border-2 border-primary-400/30 shadow-lg"
                >
                  {agora.isVideoMuted && (
                    <div className="w-full h-full flex items-center justify-center">
                      <VideoOff size={24} className="text-gray-500" />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div
                  className={`w-32 h-32 bg-primary-400/20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                    agora.isJoined ? 'animate-pulse' : ''
                  }`}
                >
                  <Phone size={48} className="text-primary-400" />
                </div>
                <p className="text-white text-lg mb-1">
                  {agora.isJoined ? 'Voice call in progress' : 'Connecting...'}
                </p>
                <p className="text-gray-400 text-sm">
                  {agora.remoteUsers.length > 0
                    ? 'Reader connected'
                    : 'Waiting for reader...'}
                </p>
              </div>
            )}

            {/* Media controls */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
              <button
                onClick={() => agora.toggleMute()}
                className={`p-4 rounded-full transition-all ${
                  agora.isAudioMuted
                    ? 'bg-red-500 text-white'
                    : 'bg-dark-700 text-white hover:bg-dark-600'
                }`}
                title={agora.isAudioMuted ? 'Unmute' : 'Mute'}
              >
                {agora.isAudioMuted ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
              {currentSession.type === 'video' && (
                <button
                  onClick={() => agora.toggleVideo()}
                  className={`p-4 rounded-full transition-all ${
                    agora.isVideoMuted
                      ? 'bg-red-500 text-white'
                      : 'bg-dark-700 text-white hover:bg-dark-600'
                  }`}
                  title={agora.isVideoMuted ? 'Turn on camera' : 'Turn off camera'}
                >
                  {agora.isVideoMuted ? <VideoOff size={24} /> : <Video size={24} />}
                </button>
              )}
              <button
                onClick={handleEndSession}
                className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all"
                title="End call"
              >
                <PhoneOff size={24} />
              </button>
            </div>
          </div>
        )}

        {/* Chat area */}
        <div
          className={`${
            currentSession.type === 'chat' ? 'flex-1' : 'w-96'
          } flex flex-col bg-dark-800 border-l border-primary-400/10`}
        >
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No messages yet. Say hello!</p>
              </div>
            )}
            {messages.map((message) => {
              const isOwn = message.senderId === user?.id;
              const isSystem = message.type === 'system';

              if (isSystem) {
                return (
                  <div key={message.id} className="text-center">
                    <span className="text-xs text-gray-500 bg-dark-700 px-3 py-1 rounded-full">
                      {message.content}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      isOwn
                        ? 'bg-primary-400/20 text-white'
                        : 'bg-dark-700 text-gray-200'
                    }`}
                  >
                    <p>{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isOwn ? 'text-primary-300' : 'text-gray-500'
                      }`}
                    >
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSendMessage}
            className="p-4 border-t border-primary-400/10"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="input flex-1"
              />
              <button type="submit" className="btn-primary px-4">
                <Send size={20} />
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
