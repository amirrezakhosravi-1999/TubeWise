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
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get the user session
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { subscriptionId, newPlanId } = req.body;

    if (!subscriptionId || !newPlanId) {
      return res.status(400).json({ 
        message: 'Subscription ID and new plan ID are required' 
      });
    }

    // In a real implementation, you would verify that the subscription belongs to the user
    // For example, by checking your database

    // Retrieve the subscription to get the current items
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Get the current subscription item ID
    const itemId = subscription.items.data[0].id;

    // Update the subscription with the new price
    const updatedSubscription = await stripe.subscriptions.update(
      subscriptionId,
      {
        items: [
          {
            id: itemId,
            price: newPlanId, // The new price ID
          },
        ],
        // Optionally, prorate the charges
        proration_behavior: 'create_prorations',
      }
    );

    // In a real implementation, you would update your database to reflect this change
    
    // For demonstration purposes, we'll return simulated subscription data
    // In a real app, you would map the Stripe response to your data model
    const subscriptionData = {
      id: updatedSubscription.id,
      status: mapStripeStatusToOurStatus(updatedSubscription.status),
      plan: mapStripePlanToOurPlan(newPlanId),
      currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end
    };

    return res.status(200).json(subscriptionData);
  } catch (error) {
    console.error('Error updating subscription:', error);
    return res.status(500).json({
      message: 'An error occurred while updating the subscription',
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
