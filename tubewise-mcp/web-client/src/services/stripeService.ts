import { SubscriptionPlan, SubscriptionStatus, User } from '../models/User';

// Interface for subscription plan details
export interface StripePlanDetails {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
}

// Interface for checkout session
export interface CheckoutSession {
  id: string;
  url: string;
}

// Interface for subscription details
export interface StripeSubscriptionDetails {
  id: string;
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

// Available subscription plans
export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, StripePlanDetails> = {
  [SubscriptionPlan.FREE]: {
    id: 'free',
    name: 'Free',
    description: 'Basic access to TubeWise',
    price: 0,
    currency: 'USD',
    interval: 'month',
    features: [
      '5 videos per month',
      'Basic summaries',
      'Limited content generation'
    ]
  },
  [SubscriptionPlan.PRO_MONTHLY]: {
    id: 'price_pro_monthly',
    name: 'Pro Monthly',
    description: 'Full access to TubeWise',
    price: 9.99,
    currency: 'USD',
    interval: 'month',
    features: [
      'Unlimited videos',
      'Advanced summaries',
      'Full content generation',
      'Multi-video comparison',
      'Fact-checking assistant'
    ]
  },
  [SubscriptionPlan.PRO_YEARLY]: {
    id: 'price_pro_yearly',
    name: 'Pro Yearly',
    description: 'Full access to TubeWise with 2 months free',
    price: 99.99,
    currency: 'USD',
    interval: 'year',
    features: [
      'All Pro Monthly features',
      '2 months free',
      'Priority support'
    ]
  }
};

// Stripe service for handling subscriptions and payments
export const stripeService = {
  // Create a checkout session for subscription
  createCheckoutSession: async (planId: string, userId: string): Promise<CheckoutSession> => {
    try {
      // In a real app, this would call your API to create a Stripe checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          userId
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create checkout session');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  },

  // Get subscription details for a user
  getSubscriptionDetails: async (userId: string): Promise<StripeSubscriptionDetails | null> => {
    try {
      // In a real app, this would call your API to get subscription details from Stripe
      const response = await fetch(`/api/stripe/subscription?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get subscription details');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting subscription details:', error);
      return null;
    }
  },

  // Cancel a subscription
  cancelSubscription: async (subscriptionId: string): Promise<boolean> => {
    try {
      // In a real app, this would call your API to cancel a subscription in Stripe
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to cancel subscription');
      }

      return true;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      return false;
    }
  },

  // Update a subscription
  updateSubscription: async (subscriptionId: string, newPlanId: string): Promise<StripeSubscriptionDetails | null> => {
    try {
      // In a real app, this would call your API to update a subscription in Stripe
      const response = await fetch('/api/stripe/update-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId,
          newPlanId
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update subscription');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating subscription:', error);
      return null;
    }
  },

  // Get available plans
  getPlans: (): StripePlanDetails[] => {
    return Object.values(SUBSCRIPTION_PLANS);
  },

  // Get plan by ID
  getPlanById: (planId: string): StripePlanDetails | undefined => {
    return Object.values(SUBSCRIPTION_PLANS).find(plan => plan.id === planId);
  },

  // Check if a user can access a feature based on their subscription
  canAccessFeature: (user: User, feature: 'video_summary' | 'video_comparison' | 'content_generation' | 'fact_checking'): boolean => {
    // Free users have limited access
    if (user.role === 'free') {
      // Get usage count from user data (in a real app, this would come from the database)
      const usageCounts = {
        video_summary: 3, // Example: user has used 3 out of 5 allowed summaries
        video_comparison: 1, // Example: user has used 1 out of 2 allowed comparisons
        content_generation: 2, // Example: user has used 2 out of 3 allowed generations
        fact_checking: 0 // Example: user has used 0 out of 1 allowed fact checks
      };

      // Check limits for free tier
      switch (feature) {
        case 'video_summary':
          return usageCounts.video_summary < 5; // Free users can summarize up to 5 videos
        case 'video_comparison':
          return usageCounts.video_comparison < 2; // Free users can compare up to 2 videos
        case 'content_generation':
          return usageCounts.content_generation < 3; // Free users can generate content 3 times
        case 'fact_checking':
          return usageCounts.fact_checking < 1; // Free users can use fact checking once
        default:
          return false;
      }
    }

    // Pro users have unlimited access to all features
    if (user.role === 'pro' && user.subscriptionStatus === 'active') {
      return true;
    }

    // By default, restrict access
    return false;
  }
};
