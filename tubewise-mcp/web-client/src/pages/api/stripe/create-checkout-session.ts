import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { getServerSession } from 'next-auth/next';
import authOptions from '../auth/[...nextauth]';
import { SUBSCRIPTION_PLANS } from '@/services/stripeService';
import { SubscriptionPlan } from '@/models/User';

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

    const { planId } = req.body;

    // Find the plan in our predefined plans
    let selectedPlan;
    if (planId === SUBSCRIPTION_PLANS[SubscriptionPlan.PRO_MONTHLY].id) {
      selectedPlan = SUBSCRIPTION_PLANS[SubscriptionPlan.PRO_MONTHLY];
    } else if (planId === SUBSCRIPTION_PLANS[SubscriptionPlan.PRO_YEARLY].id) {
      selectedPlan = SUBSCRIPTION_PLANS[SubscriptionPlan.PRO_YEARLY];
    } else {
      return res.status(400).json({ message: 'Invalid plan ID' });
    }

    // Create a Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: selectedPlan.currency,
            product_data: {
              name: selectedPlan.name,
              description: selectedPlan.description,
            },
            unit_amount: Math.round(selectedPlan.price * 100), // Convert to cents
            recurring: {
              interval: selectedPlan.interval,
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/account/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/account/subscription?canceled=true`,
      customer_email: session.user.email || undefined,
      metadata: {
        userId: session.user.id,
        planId: planId,
      },
    });

    return res.status(200).json({
      id: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({
      message: 'An error occurred while creating the checkout session',
    });
  }
}
