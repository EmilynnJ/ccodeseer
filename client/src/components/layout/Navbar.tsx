import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react';
import { Menu, X, MessageCircle, User, ShoppingBag, Video, Users, Home, HelpCircle, LogIn } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import NotificationBell from '../NotificationBell';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { isSignedIn } = useAuth();
  const { user, clientProfile } = useAuthStore();

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Readers', href: '/readers', icon: Users },
    { name: 'Live', href: '/live', icon: Video },
    { name: 'Shop', href: '/shop', icon: ShoppingBag },
    { name: 'Community', href: '/community', icon: MessageCircle },
    { name: 'About', href: '/about', icon: HelpCircle },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-900/95 backdrop-blur-md border-b border-primary-400/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <span className="brand-title text-3xl">SoulSeer</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive(item.href)
                    ? 'text-primary-400 bg-primary-400/10'
                    : 'text-gray-300 hover:text-primary-400 hover:bg-primary-400/5'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Right side - Auth & Balance */}
          <div className="hidden md:flex items-center space-x-4">
            {isSignedIn ? (
              <>
                {/* Balance display for clients */}
                {clientProfile && (
                  <Link
                    to="/dashboard/wallet"
                    className="flex items-center px-4 py-2 bg-dark-700 rounded-lg border border-primary-400/20 hover:border-primary-400/40 transition-all"
                  >
                    <span className="text-gold-400 font-semibold">
                      ${Number(clientProfile.balance).toFixed(2)}
                    </span>
                  </Link>
                )}

                {/* Notifications */}
                <NotificationBell />

                {/* Messages */}
                <Link
                  to="/messages"
                  className="p-2 text-gray-400 hover:text-primary-400 transition-colors relative"
                >
                  <MessageCircle size={22} />
                </Link>

                {/* Dashboard */}
                <Link
                  to="/dashboard"
                  className="p-2 text-gray-400 hover:text-primary-400 transition-colors"
                >
                  <User size={22} />
                </Link>

                {/* User Button */}
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: 'w-10 h-10 border-2 border-primary-400/30',
                    },
                  }}
                />
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <SignInButton mode="modal">
                  <button className="btn-ghost btn-sm flex items-center gap-2">
                    <LogIn size={18} />
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="btn-primary btn-sm">
                    Get Started
                  </button>
                </SignUpButton>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-gray-400 hover:text-primary-400 transition-colors"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-dark-800 border-t border-primary-400/10">
          <div className="px-4 py-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive(item.href)
                    ? 'text-primary-400 bg-primary-400/10'
                    : 'text-gray-300 hover:text-primary-400 hover:bg-primary-400/5'
                }`}
              >
                <item.icon size={20} />
                {item.name}
              </Link>
            ))}

            <div className="divider" />

            {isSignedIn ? (
              <>
                {clientProfile && (
                  <Link
                    to="/dashboard/wallet"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between px-4 py-3 bg-dark-700 rounded-lg"
                  >
                    <span className="text-gray-300">Balance</span>
                    <span className="text-gold-400 font-semibold">
                      ${Number(clientProfile.balance).toFixed(2)}
                    </span>
                  </Link>
                )}
                <Link
                  to="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-primary-400"
                >
                  <User size={20} />
                  Dashboard
                </Link>
                <Link
                  to="/messages"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-primary-400"
                >
                  <MessageCircle size={20} />
                  Messages
                </Link>
              </>
            ) : (
              <div className="space-y-2 pt-2">
                <SignInButton mode="modal">
                  <button className="w-full btn-secondary">Sign In</button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="w-full btn-primary">Get Started</button>
                </SignUpButton>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
