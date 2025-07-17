import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserSession } from '../models/User';
import { authService } from '../services/authService';
import { videoService } from '../services/videoService';
import { VideoSummary, Video } from '../models/Video';

// Import OAuthLoginData interface
import { OAuthLoginData } from '../services/authService';

// Define the shape of our context
interface AuthContextType {
  user: UserSession | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  oauthLogin: (data: OAuthLoginData) => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isPro: boolean;
  saveVideo: (videoSummary: VideoSummary) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  oauthLogin: async () => {},
  isAuthenticated: false,
  isAdmin: false,
  isPro: false,
  saveVideo: async () => {},
  refreshUserData: async () => {}
});

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated on mount (client-side only)
    const session = authService.getCurrentSession();
    setUser(session);
    setIsLoading(false);
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      const session = await authService.login(email, password);
      setUser(session);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Register function
  const register = async (name: string, email: string, password: string) => {
    try {
      const session = await authService.register(name, email, password);
      setUser(session);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Save video function
  const saveVideo = async (videoSummary: VideoSummary) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Convert VideoSummary to Video
      const video: Video = {
        id: videoSummary.id,
        videoId: videoSummary.videoId,
        title: videoSummary.title,
        url: `https://www.youtube.com/watch?v=${videoSummary.videoId}`,
        thumbnailUrl: `https://img.youtube.com/vi/${videoSummary.videoId}/maxresdefault.jpg`,
        duration: '0:00', // This would need to be fetched from YouTube API in a real implementation
        createdAt: videoSummary.createdAt,
        updatedAt: videoSummary.updatedAt
      };
      
      await videoService.saveVideo(video);
    } catch (error) {
      console.error('Save video error:', error);
      throw error;
    }
  };

  // Compute derived state
  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';
  const isPro = user?.role === 'pro' || user?.role === 'admin';

  // Refresh user data function
  const refreshUserData = async () => {
    try {
      if (user) {
        const session = await authService.refreshUserData();
        setUser(session);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
      throw error;
    }
  };

  // OAuth login function
  const oauthLogin = async (data: OAuthLoginData) => {
    try {
      const session = await authService.oauthLogin(data);
      setUser(session);
    } catch (error) {
      console.error('OAuth login error:', error);
      throw error;
    }
  };

  // Context value
  const value = {
    user,
    isLoading,
    login,
    register,
    logout,
    oauthLogin,
    isAuthenticated,
    isAdmin,
    isPro,
    saveVideo,
    refreshUserData
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};