import { useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import {
  User,
  Wallet,
  Clock,
  Heart,
  Settings,
  BarChart,
  DollarSign,
  Users,
  Shield,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

// Dashboard sub-pages
import DashboardHome from '../components/dashboard/DashboardHome';
import WalletPage from '../components/dashboard/Wallet';
import History from '../components/dashboard/History';
import Favorites from '../components/dashboard/Favorites';
import SettingsPage from '../components/dashboard/Settings';
import ReaderDashboard from '../components/dashboard/ReaderDashboard';
import AdminDashboard from '../components/dashboard/AdminDashboard';

export default function Dashboard() {
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate('/sign-in');
    }
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  const clientNavItems = [
    { path: '/dashboard', icon: User, label: 'Overview', end: true },
    { path: '/dashboard/wallet', icon: Wallet, label: 'Wallet' },
    { path: '/dashboard/history', icon: Clock, label: 'History' },
    { path: '/dashboard/favorites', icon: Heart, label: 'Favorites' },
    { path: '/dashboard/settings', icon: Settings, label: 'Settings' },
  ];

  const readerNavItems = [
    { path: '/dashboard', icon: User, label: 'Overview', end: true },
    { path: '/dashboard/reader', icon: BarChart, label: 'Reader Dashboard' },
    { path: '/dashboard/earnings', icon: DollarSign, label: 'Earnings' },
    { path: '/dashboard/settings', icon: Settings, label: 'Settings' },
  ];

  const adminNavItems = [
    { path: '/dashboard', icon: User, label: 'Overview', end: true },
    { path: '/dashboard/admin', icon: Shield, label: 'Admin Panel' },
    { path: '/dashboard/admin/users', icon: Users, label: 'Users' },
    { path: '/dashboard/settings', icon: Settings, label: 'Settings' },
  ];

  const navItems =
    user?.role === 'admin'
      ? adminNavItems
      : user?.role === 'reader'
      ? readerNavItems
      : clientNavItems;

  const isActive = (path: string, end?: boolean) => {
    if (end) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="card p-4 sticky top-24">
              {/* User info */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-primary-400/10">
                <img
                  src={user?.profileImage || '/placeholder-avatar.png'}
                  alt={user?.fullName}
                  className="avatar avatar-md"
                />
                <div>
                  <h3 className="font-semibold text-white">{user?.fullName}</h3>
                  <span className="badge-primary text-xs capitalize">{user?.role}</span>
                </div>
              </div>

              {/* Navigation */}
              <nav className="space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive(item.path, item.end)
                        ? 'bg-primary-400/20 text-primary-400'
                        : 'text-gray-400 hover:text-white hover:bg-dark-700'
                    }`}
                  >
                    <item.icon size={20} />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <Routes>
              <Route index element={<DashboardHome />} />
              <Route path="wallet" element={<WalletPage />} />
              <Route path="history" element={<History />} />
              <Route path="favorites" element={<Favorites />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="reader/*" element={<ReaderDashboard />} />
              <Route path="earnings" element={<ReaderDashboard />} />
              <Route path="admin/*" element={<AdminDashboard />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}
