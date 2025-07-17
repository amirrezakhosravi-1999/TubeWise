import { User, UserRole, SubscriptionPlan, SubscriptionStatus } from '../models/User';
import { dbService } from './dbService';

// Feature types
export type FeatureType = 'video_summary' | 'video_comparison' | 'content_generation' | 'fact_checking';

// Usage limits for different subscription tiers
export const USAGE_LIMITS = {
  [UserRole.FREE]: {
    video_summary: 5,
    video_comparison: 2,
    content_generation: 3,
    fact_checking: 1
  },
  [UserRole.PRO]: {
    video_summary: Infinity,
    video_comparison: Infinity,
    content_generation: Infinity,
    fact_checking: Infinity
  },
  [UserRole.ADMIN]: {
    video_summary: Infinity,
    video_comparison: Infinity,
    content_generation: Infinity,
    fact_checking: Infinity
  }
};

// Interface for usage statistics
export interface UsageStats {
  limit: number;
  used: number;
  remaining: number;
  allowed: boolean;
}

// Service for managing usage limits
export const usageLimitService = {
  // Check if a user can use a specific feature
  canUseFeature: (userId: string, feature: FeatureType): boolean => {
    // Get the user
    const user = dbService.findUserById(userId);
    
    if (!user) {
      return false;
    }
    
    // Get the usage stats for this feature
    const stats = usageLimitService.getFeatureUsageStats(userId, feature);
    
    return stats.allowed;
  },
  
  // Get usage statistics for a specific feature
  getFeatureUsageStats: (userId: string, feature: FeatureType): UsageStats => {
    // Get the user
    const user = dbService.findUserById(userId);
    
    if (!user) {
      return { limit: 0, used: 0, remaining: 0, allowed: false };
    }
    
    // Get the usage limit for this user's role
    const limit = USAGE_LIMITS[user.role][feature];
    
    // Get the current usage count from the database
    // In a real app, this would be stored in the database
    // For this example, we'll use a mock implementation
    const used = getUsageCount(userId, feature);
    
    // Calculate remaining uses
    const remaining = limit === Infinity ? Infinity : Math.max(0, limit - used);
    
    // Check if the user is allowed to use this feature
    const allowed = remaining > 0 || remaining === Infinity;
    
    return { limit, used, remaining, allowed };
  },
  
  // Record usage of a feature
  recordUsage: (userId: string, feature: FeatureType): boolean => {
    // Check if the user can use this feature
    if (!usageLimitService.canUseFeature(userId, feature)) {
      return false;
    }
    
    // In a real app, you would update the usage count in your database
    // For this example, we'll use a mock implementation
    incrementUsageCount(userId, feature);
    
    return true;
  },
  
  // Get usage statistics for all features
  getAllFeatureUsageStats: (userId: string): Record<FeatureType, UsageStats> => {
    return {
      video_summary: usageLimitService.getFeatureUsageStats(userId, 'video_summary'),
      video_comparison: usageLimitService.getFeatureUsageStats(userId, 'video_comparison'),
      content_generation: usageLimitService.getFeatureUsageStats(userId, 'content_generation'),
      fact_checking: usageLimitService.getFeatureUsageStats(userId, 'fact_checking')
    };
  },
  
  // Reset usage counts for a user (e.g., at the start of a new billing period)
  resetUsageCounts: (userId: string): void => {
    // In a real app, you would reset the usage counts in your database
    // For this example, we'll use a mock implementation
    resetAllUsageCounts(userId);
  }
};

// Mock implementations for usage tracking
// In a real app, these would interact with your database

// Store usage counts in memory (for demo purposes)
const usageCounts: Record<string, Record<FeatureType, number>> = {};

// Get the current usage count for a feature
function getUsageCount(userId: string, feature: FeatureType): number {
  if (!usageCounts[userId]) {
    usageCounts[userId] = {
      video_summary: 0,
      video_comparison: 0,
      content_generation: 0,
      fact_checking: 0
    };
  }
  
  return usageCounts[userId][feature];
}

// Increment the usage count for a feature
function incrementUsageCount(userId: string, feature: FeatureType): void {
  if (!usageCounts[userId]) {
    usageCounts[userId] = {
      video_summary: 0,
      video_comparison: 0,
      content_generation: 0,
      fact_checking: 0
    };
  }
  
  usageCounts[userId][feature]++;
}

// Reset all usage counts for a user
function resetAllUsageCounts(userId: string): void {
  usageCounts[userId] = {
    video_summary: 0,
    video_comparison: 0,
    content_generation: 0,
    fact_checking: 0
  };
}
