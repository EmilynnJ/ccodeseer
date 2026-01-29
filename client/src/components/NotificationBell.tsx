import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useRealtimeStore } from '../stores/realtimeStore';
import { useAuthStore } from '../stores/authStore';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { subscribeToNotifications } = useRealtimeStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch existing notifications
    const fetchNotifications = async () => {
      try {
        const response = await api.getNotifications();
        const data = response.data.data || [];
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.isRead).length);
      } catch {
        // Silently fail — notifications are non-critical
      }
    };

    fetchNotifications();
  }, []);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user?.id) return;

    subscribeToNotifications(user.id, (notification: any) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });
  }, [user?.id, subscribeToNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      try {
        await api.markNotificationRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Ignore
      }
    }

    // Navigate based on notification type
    setIsOpen(false);
    if (notification.metadata?.sessionId) {
      navigate(`/session/${notification.metadata.sessionId}`);
    } else if (notification.metadata?.url) {
      navigate(notification.metadata.url);
    }
  };

  const timeAgo = (dateStr: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-400 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-dark-800 border border-primary-400/10 rounded-xl shadow-2xl z-50 max-h-96 overflow-hidden">
          <div className="p-4 border-b border-primary-400/10 flex items-center justify-between">
            <h3 className="font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs text-primary-400">{unreadCount} new</span>
            )}
          </div>

          <div className="overflow-y-auto max-h-72">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No notifications yet
              </div>
            ) : (
              notifications.slice(0, 20).map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-left p-4 hover:bg-dark-700 transition-colors border-b border-primary-400/5 ${
                    !notification.isRead ? 'bg-dark-700/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {!notification.isRead && (
                      <span className="w-2 h-2 bg-primary-400 rounded-full mt-2 flex-shrink-0" />
                    )}
                    <div className={!notification.isRead ? '' : 'ml-5'}>
                      <p className="text-sm font-medium text-white">{notification.title}</p>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {timeAgo(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
