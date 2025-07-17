import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { authService } from '@/services/authService';
import { analyticsService } from '@/services/analyticsService';
import { UserRole } from '@/models/User';
import DashboardLayout from '@/components/layouts/DashboardLayout';

// Types
interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  credits: number;
  subscriptionStatus?: string;
  subscriptionPlan?: string;
  createdAt: string;
}

interface SystemStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalVideosProcessed: number;
  totalCreditsUsed: number;
  averageProcessingTime: number;
}

interface AdminDashboardProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  const router = useRouter();
  
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [creditAmount, setCreditAmount] = useState(5);
  
  // Fetch users and system stats on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // In a real app, these would be API calls to your backend
        // For this example, we'll use mock data
        
        // Mock users data
        const mockUsers: User[] = [
          {
            id: '1',
            name: 'John Doe',
            email: 'john@example.com',
            role: UserRole.FREE,
            credits: 3,
            createdAt: '2023-01-15T10:30:00Z'
          },
          {
            id: '2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            role: UserRole.PRO,
            credits: 999999, // Unlimited
            subscriptionStatus: 'active',
            subscriptionPlan: 'pro_monthly',
            createdAt: '2023-02-20T14:15:00Z'
          },
          {
            id: '3',
            name: 'Bob Johnson',
            email: 'bob@example.com',
            role: UserRole.FREE,
            credits: 0,
            createdAt: '2023-03-05T09:45:00Z'
          },
          {
            id: '4',
            name: 'Alice Williams',
            email: 'alice@example.com',
            role: UserRole.PRO,
            credits: 999999, // Unlimited
            subscriptionStatus: 'active',
            subscriptionPlan: 'pro_yearly',
            createdAt: '2023-01-10T11:20:00Z'
          },
          {
            id: '5',
            name: 'Admin User',
            email: 'admin@example.com',
            role: UserRole.ADMIN,
            credits: 999999, // Unlimited
            createdAt: '2022-12-01T08:00:00Z'
          }
        ];
        
        // Mock system stats
        const mockStats: SystemStats = {
          totalUsers: mockUsers.length,
          activeSubscriptions: mockUsers.filter(user => user.subscriptionStatus === 'active').length,
          totalVideosProcessed: 1250,
          totalCreditsUsed: 8750,
          averageProcessingTime: 3.5 // seconds
        };
        
        setUsers(mockUsers);
        setFilteredUsers(mockUsers);
        setSystemStats(mockStats);
        setLoading(false);
        
        // Track page view
        analyticsService.trackPageView('Admin Dashboard');
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Filter users based on search term and role filter
  useEffect(() => {
    let filtered = [...users];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        user => 
          user.name.toLowerCase().includes(term) || 
          user.email.toLowerCase().includes(term)
      );
    }
    
    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }
    
    setFilteredUsers(filtered);
  }, [searchTerm, roleFilter, users]);
  
  // Handle adding credits to a user
  const handleAddCredits = async () => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      
      // In a real app, this would be an API call to your backend
      // For this example, we'll update the local state
      
      const updatedUsers = users.map(user => {
        if (user.id === selectedUser.id) {
          return {
            ...user,
            credits: user.credits + creditAmount
          };
        }
        return user;
      });
      
      setUsers(updatedUsers);
      
      // Update filtered users
      const updatedFilteredUsers = filteredUsers.map(user => {
        if (user.id === selectedUser.id) {
          return {
            ...user,
            credits: user.credits + creditAmount
          };
        }
        return user;
      });
      
      setFilteredUsers(updatedFilteredUsers);
      
      // Reset selected user and credit amount
      setSelectedUser(null);
      setCreditAmount(5);
      
      // Track event
      analyticsService.trackEvent('Admin Added Credits', {
        admin_id: currentUser.id,
        user_id: selectedUser.id,
        amount: creditAmount
      });
      
      setLoading(false);
      
      // Show success message
      alert(`Successfully added ${creditAmount} credits to ${selectedUser.name}`);
    } catch (error) {
      console.error('Error adding credits:', error);
      setLoading(false);
      
      // Show error message
      alert('Error adding credits. Please try again.');
    }
  };
  
  // Handle changing user role
  const handleChangeRole = async (userId: string, newRole: UserRole) => {
    try {
      setLoading(true);
      
      // In a real app, this would be an API call to your backend
      // For this example, we'll update the local state
      
      const updatedUsers = users.map(user => {
        if (user.id === userId) {
          return {
            ...user,
            role: newRole
          };
        }
        return user;
      });
      
      setUsers(updatedUsers);
      
      // Update filtered users
      const updatedFilteredUsers = filteredUsers.map(user => {
        if (user.id === userId) {
          return {
            ...user,
            role: newRole
          };
        }
        return user;
      });
      
      setFilteredUsers(updatedFilteredUsers);
      
      // Track event
      analyticsService.trackEvent('Admin Changed User Role', {
        admin_id: currentUser.id,
        user_id: userId,
        new_role: newRole
      });
      
      setLoading(false);
      
      // Show success message
      alert(`Successfully changed user role to ${newRole}`);
    } catch (error) {
      console.error('Error changing role:', error);
      setLoading(false);
      
      // Show error message
      alert('Error changing role. Please try again.');
    }
  };
  
  // Render system stats cards
  const renderSystemStats = () => {
    if (!systemStats) {
      return <div className="text-gray-500">Loading system stats...</div>;
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">Total Users</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{systemStats.totalUsers}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">Active Subscriptions</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{systemStats.activeSubscriptions}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">Videos Processed</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{systemStats.totalVideosProcessed}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">Avg. Processing Time</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{systemStats.averageProcessingTime}s</p>
        </div>
      </div>
    );
  };
  
  // Render user management section
  const renderUserManagement = () => {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">User Management</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage users, assign credits, and change roles.
          </p>
          
          <div className="mt-4 flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <label htmlFor="search" className="sr-only">Search</label>
              <input
                type="text"
                id="search"
                placeholder="Search users by name or email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              />
            </div>
            
            <div>
              <label htmlFor="role-filter" className="sr-only">Filter by role</label>
              <select
                id="role-filter"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              >
                <option value="all">All Roles</option>
                <option value={UserRole.FREE}>Free</option>
                <option value={UserRole.PRO}>Pro</option>
                <option value={UserRole.ADMIN}>Admin</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Credits
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subscription
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-500 font-medium">{user.name.charAt(0)}</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === UserRole.ADMIN 
                        ? 'bg-purple-100 text-purple-800' 
                        : user.role === UserRole.PRO 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.credits === 999999 ? '∞' : user.credits}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.subscriptionPlan 
                      ? <span className="text-green-600">{user.subscriptionPlan}</span> 
                      : <span className="text-gray-400">None</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Add Credits
                    </button>
                    <select
                      value={user.role}
                      onChange={(e) => handleChangeRole(user.id, e.target.value as UserRole)}
                      className="text-sm border-gray-300 rounded-md"
                    >
                      <option value={UserRole.FREE}>Free</option>
                      <option value={UserRole.PRO}>Pro</option>
                      <option value={UserRole.ADMIN}>Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
              
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No users found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  
  // Render modal for adding credits
  const renderAddCreditsModal = () => {
    if (!selectedUser) return null;
    
    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h2 className="text-lg font-medium text-gray-900">Add Credits</h2>
          <p className="mt-1 text-sm text-gray-500">
            Add credits to {selectedUser.name}'s account.
          </p>
          
          <div className="mt-4">
            <label htmlFor="credit-amount" className="block text-sm font-medium text-gray-700">
              Credit Amount
            </label>
            <input
              type="number"
              id="credit-amount"
              min="1"
              max="100"
              value={creditAmount}
              onChange={(e) => setCreditAmount(parseInt(e.target.value))}
              className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
            />
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => setSelectedUser(null)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleAddCredits}
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {loading ? 'Processing...' : 'Add Credits'}
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <DashboardLayout>
      <Head>
        <title>Admin Dashboard | TubeWise</title>
      </Head>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Manage users, monitor system activity, and configure settings.
        </p>
        
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">System Overview</h2>
          {renderSystemStats()}
        </div>
        
        <div className="mt-8">
          {renderUserManagement()}
        </div>
      </div>
      
      {renderAddCreditsModal()}
    </DashboardLayout>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);
  
  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin?callbackUrl=/admin/dashboard',
        permanent: false,
      },
    };
  }
  
  // Check if user is an admin
  if (session.user.role !== 'admin') {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }
  
  return {
    props: {
      currentUser: session.user,
    },
  };
};

export default AdminDashboard;
