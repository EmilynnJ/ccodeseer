import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, X, MessageCircle, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSessionStore } from '../stores/sessionStore';

interface ReadingRequest {
  sessionId: string;
  clientName: string;
  clientAvatar?: string;
  type: 'chat' | 'voice' | 'video';
  ratePerMin: number;
}

interface Props {
  request: ReadingRequest;
  onClose: () => void;
}

export default function IncomingReadingRequest({ request, onClose }: Props) {
  const navigate = useNavigate();
  const { acceptSession, declineSession } = useSessionStore();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play notification sound
  useEffect(() => {
    try {
      audioRef.current = new Audio('/sounds/incoming.mp3');
      audioRef.current.loop = true;
      audioRef.current.play().catch(() => {
        // Autoplay may be blocked
      });
    } catch {
      // Audio not available
    }

    // Auto-decline after 60 seconds
    const timeout = setTimeout(() => {
      handleDecline('timeout');
    }, 60000);

    return () => {
      clearTimeout(timeout);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      if (audioRef.current) audioRef.current.pause();
      await acceptSession(request.sessionId);
      toast.success('Session accepted! Connecting...');
      navigate(`/session/${request.sessionId}`);
      onClose();
    } catch (error) {
      toast.error('Failed to accept session');
      setIsAccepting(false);
    }
  };

  const handleDecline = async (reason: string = 'busy') => {
    setIsDeclining(true);
    try {
      if (audioRef.current) audioRef.current.pause();
      await declineSession(request.sessionId, reason);
      toast('Session declined');
      onClose();
    } catch (error) {
      toast.error('Failed to decline session');
      setIsDeclining(false);
    }
  };

  const typeIcon = {
    chat: MessageCircle,
    voice: Phone,
    video: Video,
  };
  const TypeIcon = typeIcon[request.type];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="card p-8 max-w-sm w-full mx-4 animate-slide-up text-center">
        {/* Pulsing icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-400/20 flex items-center justify-center animate-pulse">
          <TypeIcon size={36} className="text-primary-400" />
        </div>

        <h2 className="text-xl font-semibold text-white mb-2">Incoming Reading Request</h2>

        <div className="flex items-center justify-center gap-3 mb-4">
          {request.clientAvatar && (
            <img
              src={request.clientAvatar}
              alt={request.clientName}
              className="w-10 h-10 rounded-full"
            />
          )}
          <span className="text-lg text-white font-medium">{request.clientName}</span>
        </div>

        <div className="bg-dark-700 rounded-lg p-3 mb-6">
          <p className="text-gray-400 text-sm">
            {request.type.charAt(0).toUpperCase() + request.type.slice(1)} session at{' '}
            <span className="text-gold-400 font-semibold">
              ${request.ratePerMin.toFixed(2)}/min
            </span>
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => handleDecline('busy')}
            disabled={isDeclining || isAccepting}
            className="flex-1 btn bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 flex items-center justify-center gap-2"
          >
            <X size={20} />
            Decline
          </button>
          <button
            onClick={handleAccept}
            disabled={isDeclining || isAccepting}
            className="flex-1 btn-primary flex items-center justify-center gap-2"
          >
            {isAccepting ? (
              <div className="spinner w-5 h-5" />
            ) : (
              <>
                <Phone size={20} />
                Accept
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
