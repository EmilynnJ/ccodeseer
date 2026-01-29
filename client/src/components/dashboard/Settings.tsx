import { useState } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { User, Bell, Shield, LogOut, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import api from '../../services/api';

export default function Settings() {
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const { user, logout } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    username: user?.username || '',
  });

  const [notifications, setNotifications] = useState({
    sessionRequests: true,
    messages: true,
    marketing: false,
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.updateProfile(formData);
      toast.success('Profile updated');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    logout();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-playfair text-white mb-2">Settings</h1>
        <p className="text-gray-400">Manage your account preferences.</p>
      </div>

      {/* Profile Settings */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <User size={20} className="text-primary-400" />
          Profile
        </h2>

        <div className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="label">Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={clerkUser?.primaryEmailAddress?.emailAddress || ''}
              disabled
              className="input opacity-50 cursor-not-allowed"
            />
            <p className="text-gray-500 text-sm mt-1">
              Email is managed through Clerk authentication.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="spinner" />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Bell size={20} className="text-primary-400" />
          Notifications
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
            <div>
              <p className="text-white">Session Requests</p>
              <p className="text-gray-400 text-sm">Get notified when a reader accepts your request</p>
            </div>
            <button
              onClick={() =>
                setNotifications({ ...notifications, sessionRequests: !notifications.sessionRequests })
              }
              className={`w-12 h-6 rounded-full transition-colors ${
                notifications.sessionRequests ? 'bg-primary-400' : 'bg-gray-600'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  notifications.sessionRequests ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
            <div>
              <p className="text-white">Messages</p>
              <p className="text-gray-400 text-sm">Get notified for new messages</p>
            </div>
            <button
              onClick={() =>
                setNotifications({ ...notifications, messages: !notifications.messages })
              }
              className={`w-12 h-6 rounded-full transition-colors ${
                notifications.messages ? 'bg-primary-400' : 'bg-gray-600'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  notifications.messages ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
            <div>
              <p className="text-white">Marketing</p>
              <p className="text-gray-400 text-sm">Receive updates about new features and offers</p>
            </div>
            <button
              onClick={() =>
                setNotifications({ ...notifications, marketing: !notifications.marketing })
              }
              className={`w-12 h-6 rounded-full transition-colors ${
                notifications.marketing ? 'bg-primary-400' : 'bg-gray-600'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  notifications.marketing ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Shield size={20} className="text-primary-400" />
          Security
        </h2>

        <div className="space-y-4">
          <button
            onClick={() => clerkUser?.createExternalAccount({ strategy: 'oauth_google' })}
            className="btn-secondary w-full justify-start"
          >
            Manage Connected Accounts
          </button>

          <button
            onClick={handleSignOut}
            className="btn flex items-center gap-2 w-full justify-center bg-red-500/20 text-red-400 hover:bg-red-500/30"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
