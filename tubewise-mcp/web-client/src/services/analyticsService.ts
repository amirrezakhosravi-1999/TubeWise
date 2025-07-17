import posthog from 'posthog-js';

// Define type for PostHog instance
type PostHogType = typeof posthog;

/**
 * Analytics service for tracking user events and metrics
 */
class AnalyticsService {
  private initialized = false;

  /**
   * Initialize the analytics service
   */
  init(): void {
    if (this.initialized) return;
    
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_API_KEY;
    const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';
    
    if (!apiKey) {
      console.warn('PostHog API key not found. Analytics will not be tracked.');
      return;
    }
    
    try {
      posthog.init(apiKey, {
        api_host: apiHost,
        capture_pageview: true,
        loaded: (posthogInstance: PostHogType) => {
          if (process.env.NODE_ENV === 'development') {
            // In development, log events to console instead of sending to PostHog
            posthog.opt_out_capturing();
            console.log('PostHog initialized in development mode (events logged to console)');
          } else {
            console.log('PostHog initialized successfully');
          }
        }
      });
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize PostHog:', error);
    }
  }
  
  /**
   * Track a user event
   * @param eventName Name of the event
   * @param properties Additional properties for the event
   */
  trackEvent(eventName: string, properties?: Record<string, any>): void {
    if (!this.initialized) {
      this.init();
    }
    
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Analytics] Event: ${eventName}`, properties);
      } else {
        posthog.capture(eventName, properties);
      }
    } catch (error) {
      console.error(`Failed to track event ${eventName}:`, error);
    }
  }
  
  /**
   * Identify a user
   * @param userId User ID
   * @param traits User traits
   */
  identifyUser(userId: string, traits?: Record<string, any>): void {
    if (!this.initialized) {
      this.init();
    }
    
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Analytics] Identify user: ${userId}`, traits);
      } else {
        posthog.identify(userId, traits);
      }
    } catch (error) {
      console.error(`Failed to identify user ${userId}:`, error);
    }
  }
  
  /**
   * Track a page view
   * @param pageName Name of the page
   * @param properties Additional properties for the page view
   */
  trackPageView(pageName: string, properties?: Record<string, any>): void {
    if (!this.initialized) {
      this.init();
    }
    
    try {
      const pageViewProperties = {
        page: pageName,
        ...properties
      };
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Analytics] Page view: ${pageName}`, pageViewProperties);
      } else {
        posthog.capture('$pageview', pageViewProperties);
      }
    } catch (error) {
      console.error(`Failed to track page view ${pageName}:`, error);
    }
  }
  
  /**
   * Track a feature usage
   * @param featureName Name of the feature
   * @param properties Additional properties for the feature usage
   */
  trackFeatureUsage(featureName: string, properties?: Record<string, any>): void {
    this.trackEvent(`feature_used_${featureName}`, properties);
  }
  
  /**
   * Track a subscription event
   * @param action Subscription action (e.g., 'subscribed', 'cancelled')
   * @param plan Subscription plan
   * @param properties Additional properties for the subscription event
   */
  trackSubscription(action: string, plan: string, properties?: Record<string, any>): void {
    this.trackEvent(`subscription_${action}`, {
      plan,
      ...properties
    });
  }
  
  /**
   * Track a video analysis event
   * @param action Video analysis action (e.g., 'summarized', 'compared')
   * @param videoId Video ID
   * @param properties Additional properties for the video analysis event
   */
  trackVideoAnalysis(action: string, videoId: string, properties?: Record<string, any>): void {
    this.trackEvent(`video_${action}`, {
      video_id: videoId,
      ...properties
    });
  }
  
  /**
   * Track a content generation event
   * @param contentType Type of content generated (e.g., 'twitter', 'linkedin')
   * @param videoId Video ID
   * @param properties Additional properties for the content generation event
   */
  trackContentGeneration(contentType: string, videoId: string, properties?: Record<string, any>): void {
    this.trackEvent('content_generated', {
      content_type: contentType,
      video_id: videoId,
      ...properties
    });
  }
  
  /**
   * Track a fact check event
   * @param videoId Video ID
   * @param claimsCount Number of claims checked
   * @param properties Additional properties for the fact check event
   */
  trackFactCheck(videoId: string, claimsCount: number, properties?: Record<string, any>): void {
    this.trackEvent('fact_check', {
      video_id: videoId,
      claims_count: claimsCount,
      ...properties
    });
  }
}

// Create a singleton instance
const analyticsServiceInstance = new AnalyticsService();

// Named export for better TypeScript support
export { analyticsServiceInstance as analyticsService };

// Default export for backward compatibility
export default analyticsServiceInstance;
