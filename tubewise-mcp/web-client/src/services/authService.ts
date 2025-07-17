import { User, UserRole, UserSession, SubscriptionStatus, SubscriptionPlan } from '../models/User';
import { dbService } from './dbService';

// In a real app, this would use a proper session management system
let currentSession: UserSession | null = null;

// Initialize session from localStorage if available (client-side only)
if (typeof window !== 'undefined') {
  try {
    const sessionStr = localStorage.getItem('userSession');
    if (sessionStr) {
      currentSession = JSON.parse(sessionStr) as UserSession;
    }
  } catch (e) {
    console.error('Error initializing session from localStorage:', e);
    localStorage.removeItem('userSession');
  }
}

// Interface for subscription details
export interface SubscriptionDetails {
  plan: string;
  status: string;
  start_date?: string;
  end_date?: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
  limits: {
    videos_summarized: {
      limit: number;
      used: number;
      remaining: number;
      allowed: boolean;
    };
    videos_compared: {
      limit: number;
      used: number;
      remaining: number;
      allowed: boolean;
    };
    content_generated: {
      limit: number;
      used: number;
      remaining: number;
      allowed: boolean;
    };
  };
}

// Interface for OAuth login
export interface OAuthLoginData {
  email: string;
  name: string;
  provider: string;
  providerId: string;
}

export const authService = {
  login: async (email: string, password: string): Promise<UserSession> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Find user with matching email and password
    const userData = dbService.findUserByEmail(email);
    
    if (!userData || userData.password !== password) {
      throw new Error('Invalid email or password');
    }
    
    // Create session
    const session: UserSession = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      token: 'token-' + Date.now(), // In a real app, this would be a JWT
      credits: userData.credits,
      languagePreference: userData.languagePreference,
      subscriptionStatus: userData.subscriptionStatus,
      subscriptionPlan: userData.subscriptionPlan
    };
    
    // Store session
    currentSession = session;
    
    // Store in localStorage for persistence (client-side only)
    if (typeof window !== 'undefined') {
      localStorage.setItem('userSession', JSON.stringify(session));
    }
    
    return session;
  },
  
  oauthLogin: async (data: OAuthLoginData): Promise<UserSession> => {
    try {
      // In a real app, this would call the API
      // For now, simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if user exists with this email
      let user = dbService.findUserByEmail(data.email);
      
      // If user doesn't exist, create a new one
      if (!user) {
        user = dbService.createUser({
          email: data.email,
          name: data.name,
          role: UserRole.FREE,
          credits: 5,
          languagePreference: 'en',
          oauthProvider: data.provider,
          oauthProviderId: data.providerId
        });
      }
      
      // Create session
      const session: UserSession = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: 'oauth-token-' + Date.now(), // In a real app, this would be a JWT
        credits: user.credits,
        languagePreference: user.languagePreference,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionPlan: user.subscriptionPlan
      };
      
      // Save session
      currentSession = session;
      if (typeof window !== 'undefined') {
        localStorage.setItem('userSession', JSON.stringify(session));
      }
      
      return session;
    } catch (error) {
      console.error('OAuth login error:', error);
      throw error;
    }
  },
  
  register: async (name: string, email: string, password: string): Promise<UserSession> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if user with this email already exists
    if (dbService.findUserByEmail(email)) {
      throw new Error('User with this email already exists');
    }
    
    // Create new user
    const newUser = dbService.createUser({
      email,
      name,
      password, // In a real app, this would be hashed
      role: UserRole.FREE,
      credits: 5, // New users get 5 credits
      languagePreference: 'en',
      subscriptionStatus: SubscriptionStatus.NONE,
      subscriptionPlan: SubscriptionPlan.FREE
    });
    
    // Create session
    const session: UserSession = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      token: 'token-' + Date.now(), // In a real app, this would be a JWT
      credits: newUser.credits,
      languagePreference: newUser.languagePreference,
      subscriptionStatus: newUser.subscriptionStatus,
      subscriptionPlan: newUser.subscriptionPlan
    };
    
    // Store session
    currentSession = session;
    
    // Store in localStorage for persistence (client-side only)
    if (typeof window !== 'undefined') {
      localStorage.setItem('userSession', JSON.stringify(session));
    }
    
    return session;
  },
  
  logout: async (): Promise<void> => {
    // Clear session
    currentSession = null;
    
    // Remove from localStorage (client-side only)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userSession');
    }
  },
  
  getCurrentSession: (): UserSession | null => {
    return currentSession;
  },
  
  isAuthenticated: (): boolean => {
    return !!authService.getCurrentSession();
  },
  
  isAdmin: (): boolean => {
    return !!currentSession && currentSession.role === UserRole.ADMIN;
  },
  
  refreshUserData: async (): Promise<UserSession> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (!currentSession) {
      throw new Error('Not authenticated');
    }
    
    // In a real app, this would make an API call to get the latest user data
    // For now, we'll just return the current session
    // In a real implementation, this would fetch subscription details from the server
    
    // Simulate API call to get updated user data
    const user = dbService.findUserById(currentSession.id);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Update session with latest user data
    const updatedSession: UserSession = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      token: 'token-' + Date.now(), // In a real app, this would be a JWT
      credits: user.credits,
      languagePreference: user.languagePreference,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionPlan: user.subscriptionPlan
    };
    
    // Update stored session
    currentSession = updatedSession;
    
    // Update localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('userSession', JSON.stringify(updatedSession));
    }
    
    return updatedSession;
  },
  
  getSubscriptionDetails: async (): Promise<SubscriptionDetails> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (!currentSession) {
      throw new Error('Not authenticated');
    }
    
    // In a real app, this would make an API call to get subscription details
    // For now, we'll return mock data based on the user's role
    
    if (currentSession.role === UserRole.PRO) {
      return {
        plan: 'pro',
        status: 'active',
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        cancel_at_period_end: false,
        limits: {
          videos_summarized: {
            limit: 100,
            used: 51,
            remaining: 49,
            allowed: true
          },
          videos_compared: {
            limit: 20,
            used: 16,
            remaining: 4,
            allowed: true
          },
          content_generated: {
            limit: 50,
            used: 29,
            remaining: 21,
            allowed: true
          }
        }
      };
    } else {
      return {
        plan: 'free',
        status: 'active',
        limits: {
          videos_summarized: {
            limit: 5,
            used: 4,
            remaining: 1,
            allowed: true
          },
          videos_compared: {
            limit: 0,
            used: 0,
            remaining: 0,
            allowed: false
          },
          content_generated: {
            limit: 10,
            used: 9,
            remaining: 1,
            allowed: true
          }
        }
      };
    }
  }
};