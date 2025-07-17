import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { getServerSession } from 'next-auth/next';
import authOptions from '../auth/[...nextauth]';
import { SubscriptionPlan, SubscriptionStatus } from '@/models/User';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get the user session
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // In a real implementation, you would fetch the user's subscription ID from your database
    // For this example, we'll simulate retrieving a subscription from Stripe
    
    // Simulate getting the user's subscription ID from your database
    const subscriptionId = 'sub_simulated'; // In a real app, this would come from your database
    
    // For demonstration purposes, we'll return simulated subscription data
    // In a real app, you would fetch this from Stripe using the subscription ID
    const subscriptionData = {
      id: subscriptionId,
      status: SubscriptionStatus.ACTIVE,
      plan: SubscriptionPlan.PRO_MONTHLY,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      cancelAtPeriodEnd: false
    };

    // In a real implementation, you would do something like this:
    /*
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Map Stripe subscription data to our format
    const subscriptionData = {
      id: subscription.id,
      status: mapStripeStatusToOurStatus(subscription.status),
      plan: mapStripePlanToOurPlan(subscription.items.data[0].price.id),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    };
    */

    return res.status(200).json(subscriptionData);
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return res.status(500).json({
      message: 'An error occurred while fetching the subscription',
    });
  }
}

// Helper function to map Stripe subscription status to our status enum
function mapStripeStatusToOurStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case 'active':
      return SubscriptionStatus.ACTIVE;
    case 'canceled':
      return SubscriptionStatus.CANCELED;
    case 'past_due':
      return SubscriptionStatus.PAST_DUE;
    case 'unpaid':
      return SubscriptionStatus.UNPAID;
    case 'trialing':
      return SubscriptionStatus.TRIAL;
    default:
      return SubscriptionStatus.NONE;
  }
}

// Helper function to map Stripe price ID to our plan enum
function mapStripePlanToOurPlan(stripePriceId: string): SubscriptionPlan {
  // This would map your Stripe price IDs to your plan enum
  // You would need to maintain this mapping when you create products/prices in Stripe
  switch (stripePriceId) {
    case 'price_pro_monthly':
      return SubscriptionPlan.PRO_MONTHLY;
    case 'price_pro_yearly':
      return SubscriptionPlan.PRO_YEARLY;
    default:
      return SubscriptionPlan.FREE;
  }
}
