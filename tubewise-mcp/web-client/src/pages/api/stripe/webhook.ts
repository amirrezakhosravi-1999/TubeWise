import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { buffer } from 'micro';
import { SubscriptionPlan, SubscriptionStatus } from '@/models/User';
import { dbService } from '@/services/dbService';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// Disable the default body parser to get the raw body for webhook verification
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get the raw body
    const rawBody = await buffer(req);
    const signature = req.headers['stripe-signature'] as string;

    // Verify the webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Extract the user ID and plan ID from the metadata
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;
        
        if (userId && planId) {
          // Update the user's subscription in your database
          await updateUserSubscription(userId, session.subscription as string, planId);
        }
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Get the customer ID
        const customerId = subscription.customer as string;
        
        // Find the user associated with this customer ID in your database
        // In a real implementation, you would query your database
        // For this example, we'll assume we have a function to find the user
        const user = await findUserByStripeCustomerId(customerId);
        
        if (user) {
          // Update the user's subscription status and plan
          await updateUserSubscriptionStatus(
            user.id,
            subscription.id,
            subscription.status,
            subscription.items.data[0].price.id
          );
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Get the customer ID
        const customerId = subscription.customer as string;
        
        // Find the user associated with this customer ID
        const user = await findUserByStripeCustomerId(customerId);
        
        if (user) {
          // Update the user's subscription status to canceled
          await cancelUserSubscription(user.id);
        }
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Get the customer ID
        const customerId = invoice.customer as string;
        
        // Find the user associated with this customer ID
        const user = await findUserByStripeCustomerId(customerId);
        
        if (user && invoice.subscription) {
          // Update the user's payment status
          await updateUserPaymentStatus(user.id, invoice.subscription as string, true);
        }
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Get the customer ID
        const customerId = invoice.customer as string;
        
        // Find the user associated with this customer ID
        const user = await findUserByStripeCustomerId(customerId);
        
        if (user && invoice.subscription) {
          // Update the user's payment status
          await updateUserPaymentStatus(user.id, invoice.subscription as string, false);
        }
        break;
      }
      
      // Add more event handlers as needed
      
      default:
        // Unexpected event type
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({
      message: 'An error occurred while processing the webhook',
    });
  }
}

// Helper functions to update the database
// In a real implementation, these would interact with your database

async function updateUserSubscription(
  userId: string,
  subscriptionId: string,
  planId: string
): Promise<void> {
  // In a real implementation, you would update your database
  // For this example, we'll use our mock database service
  
  // Find the user
  const user = dbService.findUserById(userId);
  
  if (user) {
    // Update the user's subscription details
    user.subscriptionId = subscriptionId;
    user.subscriptionStatus = SubscriptionStatus.ACTIVE;
    user.subscriptionPlan = mapStripePlanToOurPlan(planId);
    user.role = UserRole.PRO; // Upgrade the user to Pro
    
    // Save the updated user
    dbService.updateUser(user);
    
    // In a real app, you might also want to send a welcome email
    // or perform other actions when a user subscribes
  }
}

async function updateUserSubscriptionStatus(
  userId: string,
  subscriptionId: string,
  status: string,
  priceId: string
): Promise<void> {
  // Find the user
  const user = dbService.findUserById(userId);
  
  if (user) {
    // Update the user's subscription details
    user.subscriptionId = subscriptionId;
    user.subscriptionStatus = mapStripeStatusToOurStatus(status);
    user.subscriptionPlan = mapStripePlanToOurPlan(priceId);
    
    // If the subscription is active, ensure the user has Pro role
    if (user.subscriptionStatus === SubscriptionStatus.ACTIVE) {
      user.role = UserRole.PRO;
    } else if (user.subscriptionStatus === SubscriptionStatus.CANCELED ||
               user.subscriptionStatus === SubscriptionStatus.UNPAID) {
      // If the subscription is canceled or unpaid, downgrade to Free
      user.role = UserRole.FREE;
    }
    
    // Save the updated user
    dbService.updateUser(user);
  }
}

async function cancelUserSubscription(userId: string): Promise<void> {
  // Find the user
  const user = dbService.findUserById(userId);
  
  if (user) {
    // Update the user's subscription details
    user.subscriptionStatus = SubscriptionStatus.CANCELED;
    user.role = UserRole.FREE; // Downgrade to Free
    
    // Save the updated user
    dbService.updateUser(user);
    
    // In a real app, you might want to send an email
    // or perform other actions when a subscription is canceled
  }
}

async function updateUserPaymentStatus(
  userId: string,
  subscriptionId: string,
  succeeded: boolean
): Promise<void> {
  // Find the user
  const user = dbService.findUserById(userId);
  
  if (user) {
    if (succeeded) {
      // Payment succeeded, ensure the subscription is active
      user.subscriptionStatus = SubscriptionStatus.ACTIVE;
      user.role = UserRole.PRO;
    } else {
      // Payment failed, update the status
      user.subscriptionStatus = SubscriptionStatus.PAST_DUE;
      // Note: We don't immediately downgrade the user
      // Usually you would give them a grace period
    }
    
    // Save the updated user
    dbService.updateUser(user);
    
    // In a real app, you might want to send an email notification
    // about payment success or failure
  }
}

// Helper function to find a user by Stripe customer ID
// In a real implementation, this would query your database
async function findUserByStripeCustomerId(customerId: string): Promise<any> {
  // This is a mock implementation
  // In a real app, you would query your database to find the user
  // with the given Stripe customer ID
  
  // For this example, we'll return a mock user
  // In a real implementation, this would return the actual user or null
  return {
    id: 'user_123',
    name: 'Test User',
    email: 'test@example.com'
  };
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
  switch (stripePriceId) {
    case 'price_pro_monthly':
      return SubscriptionPlan.PRO_MONTHLY;
    case 'price_pro_yearly':
      return SubscriptionPlan.PRO_YEARLY;
    default:
      return SubscriptionPlan.FREE;
  }
}
