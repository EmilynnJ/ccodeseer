import { useEffect, useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  BarChart,
  Users,
  DollarSign,
  Video,
  ShoppingBag,
  Settings,
  Plus,
  Eye,
} from 'lucide-react';
import api from '../../services/api';

interface AdminStats {
  totalUsers: number;
  totalReaders: number;
  totalRevenue: number;
  platformFees: number;
  activeSessions: number;
  activeStreams: number;
  newUsers: number;
}

function Overview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.getAdminStats('30d');
        setStats(response.data.data);
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="skeleton h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-6">
          <Users size={24} className="text-primary-400 mb-4" />
          <p className="text-gray-400 text-sm">Total Users</p>
          <p className="text-3xl font-bold text-white">{stats?.totalUsers || 0}</p>
        </div>

        <div className="card p-6">
          <Users size={24} className="text-gold-400 mb-4" />
          <p className="text-gray-400 text-sm">Total Readers</p>
          <p className="text-3xl font-bold text-white">{stats?.totalReaders || 0}</p>
        </div>

        <div className="card p-6">
          <DollarSign size={24} className="text-green-400 mb-4" />
          <p className="text-gray-400 text-sm">Total Revenue (30d)</p>
          <p className="text-3xl font-bold text-white">
            ${(stats?.totalRevenue || 0).toFixed(2)}
          </p>
        </div>

        <div className="card p-6">
          <DollarSign size={24} className="text-primary-400 mb-4" />
          <p className="text-gray-400 text-sm">Platform Fees (30d)</p>
          <p className="text-3xl font-bold text-white">
            ${(stats?.platformFees || 0).toFixed(2)}
          </p>
        </div>

        <div className="card p-6">
          <Video size={24} className="text-red-400 mb-4" />
          <p className="text-gray-400 text-sm">Active Sessions</p>
          <p className="text-3xl font-bold text-white">{stats?.activeSessions || 0}</p>
        </div>

        <div className="card p-6">
          <Video size={24} className="text-purple-400 mb-4" />
          <p className="text-gray-400 text-sm">Active Streams</p>
          <p className="text-3xl font-bold text-white">{stats?.activeStreams || 0}</p>
        </div>

        <div className="card p-6">
          <Users size={24} className="text-blue-400 mb-4" />
          <p className="text-gray-400 text-sm">New Users (30d)</p>
          <p className="text-3xl font-bold text-white">{stats?.newUsers || 0}</p>
        </div>

        <div className="card p-6">
          <BarChart size={24} className="text-gold-400 mb-4" />
          <p className="text-gray-400 text-sm">Platform Fee Rate</p>
          <p className="text-3xl font-bold text-white">30%</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/dashboard/admin/readers/new"
            className="p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors flex items-center gap-3"
          >
            <Plus size={20} className="text-primary-400" />
            <span className="text-white">Create Reader Account</span>
          </Link>
          <Link
            to="/dashboard/admin/users"
            className="p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors flex items-center gap-3"
          >
            <Eye size={20} className="text-primary-400" />
            <span className="text-white">View All Users</span>
          </Link>
          <Link
            to="/dashboard/admin/products"
            className="p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors flex items-center gap-3"
          >
            <ShoppingBag size={20} className="text-primary-400" />
            <span className="text-white">Manage Products</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.getAdminUsers({ limit: 50 });
        setUsers(response.data.data);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-playfair text-white">User Management</h2>
        <Link to="/dashboard/admin/readers/new" className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Create Reader
        </Link>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-dark-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary-400/10">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center">
                  <div className="spinner mx-auto" />
                </td>
              </tr>
            ) : users.length > 0 ? (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-dark-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <img
                        src={user.profileImage || '/placeholder-avatar.png'}
                        alt={user.fullName}
                        className="avatar avatar-sm"
                      />
                      <span className="text-white">{user.fullName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="badge-primary capitalize">{user.role}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`badge ${
                        user.isOnline ? 'badge-success' : 'badge-warning'
                      }`}
                    >
                      {user.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="text-primary-400 hover:text-primary-300">
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const location = useLocation();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-playfair text-white mb-2">Admin Panel</h1>
        <p className="text-gray-400">Manage your platform.</p>
      </div>

      <Routes>
        <Route index element={<Overview />} />
        <Route path="users" element={<UserManagement />} />
      </Routes>
    </div>
  );
}
