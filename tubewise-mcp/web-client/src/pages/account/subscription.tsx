import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { stripeService, SUBSCRIPTION_PLANS } from '@/services/stripeService';
import { SubscriptionPlan, SubscriptionStatus } from '@/models/User';
import { authService } from '@/services/authService';
import { analyticsService } from '@/services/analyticsService';
import DashboardLayout from '@/components/layouts/DashboardLayout';

// Types
interface SubscriptionPageProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    subscriptionStatus?: SubscriptionStatus;
    subscriptionPlan?: SubscriptionPlan;
  };
}

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ user }) => {
  const router = useRouter();
  const { success, canceled, session_id } = router.query;
  
  const [loading, setLoading] = useState(false);
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  
  // Fetch subscription details on component mount
  useEffect(() => {
    const fetchSubscriptionDetails = async () => {
      try {
        const details = await stripeService.getSubscriptionDetails(user.id);
        setSubscriptionDetails(details);
      } catch (error) {
        console.error('Error fetching subscription details:', error);
      }
    };
    
    fetchSubscriptionDetails();
    
    // Track page view
    analyticsService.trackPageView('Subscription Page');
    
    // Handle success or canceled query params
    if (success && session_id) {
      analyticsService.trackEvent('Subscription Checkout Completed', {
        session_id: session_id
      });
      // Show success message or refresh subscription details
      fetchSubscriptionDetails();
    } else if (canceled) {
      analyticsService.trackEvent('Subscription Checkout Canceled');
      // Show canceled message
    }
  }, [user.id, success, canceled, session_id]);
  
  // Handle subscription checkout
  const handleSubscribe = async (planId: string) => {
    try {
      setLoading(true);
      
      // Track event
      analyticsService.trackEvent('Subscription Checkout Started', {
        plan_id: planId
      });
      
      // Create checkout session
      const checkoutSession = await stripeService.createCheckoutSession(planId, user.id);
      
      // Redirect to checkout
      window.location.href = checkoutSession.url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      setLoading(false);
    }
  };
  
  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    if (!subscriptionDetails?.id) return;
    
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to Pro features at the end of your billing period.')) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Track event
      analyticsService.trackEvent('Subscription Cancellation Started');
      
      // Cancel subscription
      const success = await stripeService.cancelSubscription(subscriptionDetails.id);
      
      if (success) {
        // Track event
        analyticsService.trackEvent('Subscription Cancelled Successfully');
        
        // Refresh subscription details
        const details = await stripeService.getSubscriptionDetails(user.id);
        setSubscriptionDetails(details);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error canceling subscription:', error);
      setLoading(false);
    }
  };
  
  // Render subscription status
  const renderSubscriptionStatus = () => {
    if (!subscriptionDetails) {
      return <div className="text-gray-500">Loading subscription details...</div>;
    }
    
    if (subscriptionDetails.status === SubscriptionStatus.ACTIVE) {
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h3 className="text-green-800 font-medium">Active Subscription</h3>
          <p className="text-green-700 mt-1">
            You are currently on the {SUBSCRIPTION_PLANS[subscriptionDetails.plan]?.name} plan.
          </p>
          <p className="text-sm text-green-600 mt-2">
            Your subscription will {subscriptionDetails.cancelAtPeriodEnd ? 'end' : 'renew'} on {new Date(subscriptionDetails.currentPeriodEnd).toLocaleDateString()}.
          </p>
          
          {!subscriptionDetails.cancelAtPeriodEnd && (
            <button
              onClick={handleCancelSubscription}
              disabled={loading}
              className="mt-3 text-sm text-red-600 hover:text-red-800 font-medium focus:outline-none"
            >
              Cancel Subscription
            </button>
          )}
        </div>
      );
    }
    
    if (subscriptionDetails.status === SubscriptionStatus.CANCELED) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="text-yellow-800 font-medium">Subscription Canceled</h3>
          <p className="text-yellow-700 mt-1">
            Your subscription has been canceled and will end on {new Date(subscriptionDetails.currentPeriodEnd).toLocaleDateString()}.
          </p>
          <p className="text-sm text-yellow-600 mt-2">
            You can subscribe again to continue enjoying Pro features.
          </p>
        </div>
      );
    }
    
    if (subscriptionDetails.status === SubscriptionStatus.PAST_DUE) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="text-red-800 font-medium">Payment Issue</h3>
          <p className="text-red-700 mt-1">
            There was an issue with your last payment. Please update your payment method.
          </p>
        </div>
      );
    }
    
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="text-blue-800 font-medium">Free Plan</h3>
        <p className="text-blue-700 mt-1">
          You are currently on the free plan with limited features.
        </p>
        <p className="text-sm text-blue-600 mt-2">
          Upgrade to Pro for unlimited access to all features.
        </p>
      </div>
    );
  };
  
  // Render subscription plans
  const renderSubscriptionPlans = () => {
    const plans = [
      SUBSCRIPTION_PLANS[SubscriptionPlan.FREE],
      SUBSCRIPTION_PLANS[SubscriptionPlan.PRO_MONTHLY],
      SUBSCRIPTION_PLANS[SubscriptionPlan.PRO_YEARLY]
    ];
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {plans.map((plan) => (
          <div 
            key={plan.id}
            className={`border rounded-lg p-6 ${
              subscriptionDetails?.plan === plan.id 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <h3 className="text-xl font-bold">{plan.name}</h3>
            <div className="mt-2 text-2xl font-bold">
              {plan.price === 0 ? 'Free' : `$${plan.price}/${plan.interval}`}
            </div>
            <p className="mt-2 text-gray-600">{plan.description}</p>
            
            <ul className="mt-4 space-y-2">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            
            <div className="mt-6">
              {plan.id === 'free' ? (
                <button
                  disabled
                  className="w-full py-2 px-4 border border-gray-300 rounded-md text-gray-700 bg-gray-100 cursor-not-allowed"
                >
                  Current Free Plan
                </button>
              ) : subscriptionDetails?.plan === plan.id ? (
                <button
                  disabled
                  className="w-full py-2 px-4 border border-blue-500 rounded-md text-blue-700 bg-blue-100 cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading}
                  className="w-full py-2 px-4 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {loading ? 'Processing...' : `Subscribe to ${plan.name}`}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <DashboardLayout>
      <Head>
        <title>Subscription Management | TubeWise</title>
      </Head>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900">Subscription Management</h1>
        <p className="mt-2 text-gray-600">
          Manage your TubeWise subscription and billing information.
        </p>
        
        <div className="mt-8">
          {renderSubscriptionStatus()}
          
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Available Plans</h2>
          {renderSubscriptionPlans()}
        </div>
        
        <div className="mt-12 border-t border-gray-200 pt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Billing FAQ</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">How does billing work?</h3>
              <p className="mt-1 text-gray-600">
                You will be charged at the beginning of each billing cycle. For monthly plans, you'll be charged every month on the same date. For yearly plans, you'll be charged once a year.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900">Can I cancel my subscription?</h3>
              <p className="mt-1 text-gray-600">
                Yes, you can cancel your subscription at any time. You will continue to have access to Pro features until the end of your current billing period.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900">What happens if I downgrade?</h3>
              <p className="mt-1 text-gray-600">
                If you downgrade from Pro to Free, you'll maintain access to Pro features until the end of your current billing period. After that, you'll be moved to the Free plan.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);
  
  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin?callbackUrl=/account/subscription',
        permanent: false,
      },
    };
  }
  
  return {
    props: {
      user: session.user,
    },
  };
};

export default SubscriptionPage;
