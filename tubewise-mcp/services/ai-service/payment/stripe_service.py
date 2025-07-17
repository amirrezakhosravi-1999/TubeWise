"""
Stripe payment service for TubeWise Pro subscriptions.
This module handles all interactions with the Stripe API for subscription management.
"""

import os
import stripe
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple

from sqlalchemy.orm import Session
from fastapi import HTTPException

# Import models
from db import User, Subscription

# Set up Stripe API key
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_your_test_key")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_your_webhook_secret")

# Pro plan configuration
PRO_PLAN_PRICE_ID = os.getenv("STRIPE_PRO_PLAN_PRICE_ID", "price_your_price_id")
PRO_PLAN_PRODUCT_ID = os.getenv("STRIPE_PRO_PLAN_PRODUCT_ID", "prod_your_product_id")

# Pro plan details
PRO_PLAN_DETAILS = {
    "name": "TubeWise Pro",
    "description": "Full access to all TubeWise premium features",
    "features": [
        "100 video summaries per month",
        "20 video comparisons per month",
        "50 content generations per month",
        "Priority support",
        "Advanced AI analysis"
    ],
    "monthly_price": 9.99,
    "yearly_price": 99.99,
    "currency": "USD"
}

def create_customer(db: Session, user: User) -> str:
    """
    Create a Stripe customer for a user and save the customer ID to the database.
    
    Args:
        db: Database session
        user: User model instance
        
    Returns:
        Stripe customer ID
    """
    # Check if user already has a Stripe customer ID
    if user.stripe_customer_id:
        return user.stripe_customer_id
        
    # Create a new customer in Stripe
    try:
        customer = stripe.Customer.create(
            email=user.email,
            name=user.name,
            metadata={"user_id": str(user.id)}
        )
        
        # Save the customer ID to the user record
        user.stripe_customer_id = customer.id
        db.commit()
        
        return customer.id
    except stripe.error.StripeError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")

def create_checkout_session(db: Session, user: User, price_id: str, success_url: str, cancel_url: str) -> str:
    """
    Create a Stripe checkout session for subscription payment.
    
    Args:
        db: Database session
        user: User model instance
        price_id: Stripe price ID for the subscription
        success_url: URL to redirect after successful payment
        cancel_url: URL to redirect after cancelled payment
        
    Returns:
        Checkout session URL
    """
    # Ensure user has a Stripe customer ID
    customer_id = create_customer(db, user)
    
    try:
        # Create the checkout session
        checkout_session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{
                "price": price_id,
                "quantity": 1
            }],
            mode="subscription",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": str(user.id)
            }
        )
        
        return checkout_session.url
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")

def handle_webhook_event(db: Session, payload: bytes, signature: str) -> Dict[str, Any]:
    """
    Handle Stripe webhook events for subscription lifecycle management.
    
    Args:
        db: Database session
        payload: Raw request payload
        signature: Stripe signature header
        
    Returns:
        Processed event data
    """
    try:
        # Verify the event came from Stripe
        event = stripe.Webhook.construct_event(
            payload, signature, STRIPE_WEBHOOK_SECRET
        )
        
        event_data = event["data"]["object"]
        event_type = event["type"]
        
        # Handle different event types
        if event_type == "checkout.session.completed":
            # Payment was successful, activate the subscription
            handle_successful_checkout(db, event_data)
        elif event_type == "customer.subscription.updated":
            # Subscription was updated
            handle_subscription_updated(db, event_data)
        elif event_type == "customer.subscription.deleted":
            # Subscription was cancelled
            handle_subscription_cancelled(db, event_data)
        elif event_type == "invoice.payment_failed":
            # Payment failed
            handle_payment_failed(db, event_data)
            
        return {"status": "success", "event_type": event_type}
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook error: {str(e)}")

def handle_successful_checkout(db: Session, event_data: Dict[str, Any]) -> None:
    """
    Handle successful checkout session completion.
    
    Args:
        db: Database session
        event_data: Stripe event data
    """
    # Get user ID from metadata
    user_id = int(event_data.get("metadata", {}).get("user_id"))
    if not user_id:
        return
        
    # Get subscription ID from the session
    subscription_id = event_data.get("subscription")
    if not subscription_id:
        return
        
    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return
        
    # Update user role to pro
    user.role = "pro"
    
    # Create or update subscription record
    subscription = db.query(Subscription).filter(Subscription.user_id == user_id).first()
    if not subscription:
        subscription = Subscription(
            user_id=user_id,
            stripe_subscription_id=subscription_id,
            status="active",
            start_date=datetime.utcnow()
        )
        db.add(subscription)
    else:
        subscription.stripe_subscription_id = subscription_id
        subscription.status = "active"
        subscription.start_date = datetime.utcnow()
        subscription.end_date = None
        
    db.commit()

def handle_subscription_updated(db: Session, event_data: Dict[str, Any]) -> None:
    """
    Handle subscription update events.
    
    Args:
        db: Database session
        event_data: Stripe event data
    """
    subscription_id = event_data.get("id")
    if not subscription_id:
        return
        
    # Find subscription in database
    subscription = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == subscription_id
    ).first()
    
    if not subscription:
        return
        
    # Update subscription status
    status = event_data.get("status")
    if status:
        subscription.status = status
        
    # If subscription is no longer active, update user role
    if status not in ["active", "trialing"]:
        user = db.query(User).filter(User.id == subscription.user_id).first()
        if user:
            user.role = "free"
            
    db.commit()

def handle_subscription_cancelled(db: Session, event_data: Dict[str, Any]) -> None:
    """
    Handle subscription cancellation events.
    
    Args:
        db: Database session
        event_data: Stripe event data
    """
    subscription_id = event_data.get("id")
    if not subscription_id:
        return
        
    # Find subscription in database
    subscription = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == subscription_id
    ).first()
    
    if not subscription:
        return
        
    # Update subscription status and end date
    subscription.status = "cancelled"
    subscription.end_date = datetime.fromtimestamp(event_data.get("cancel_at", 0))
    
    # Update user role to free
    user = db.query(User).filter(User.id == subscription.user_id).first()
    if user:
        user.role = "free"
        
    db.commit()

def handle_payment_failed(db: Session, event_data: Dict[str, Any]) -> None:
    """
    Handle payment failure events.
    
    Args:
        db: Database session
        event_data: Stripe event data
    """
    subscription_id = event_data.get("subscription")
    if not subscription_id:
        return
        
    # Find subscription in database
    subscription = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == subscription_id
    ).first()
    
    if not subscription:
        return
        
    # Update subscription status
    subscription.status = "past_due"
    db.commit()

def get_subscription_details(user_id: int, db: Session) -> Dict[str, Any]:
    """
    Get subscription details for a user.
    
    Args:
        user_id: User ID
        db: Database session
        
    Returns:
        Subscription details
    """
    # Get user and subscription from database
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    subscription = db.query(Subscription).filter(Subscription.user_id == user_id).first()
    
    # If no subscription exists, return free plan details
    if not subscription or subscription.status not in ["active", "trialing"]:
        return {
            "plan": "free",
            "status": "active",
            "limits": {
                "videos_summarized": 5,
                "videos_compared": 0,
                "content_generated": 10
            }
        }
        
    # Get subscription details from Stripe
    try:
        stripe_subscription = stripe.Subscription.retrieve(subscription.stripe_subscription_id)
        
        return {
            "plan": "pro",
            "status": subscription.status,
            "start_date": subscription.start_date.isoformat() if subscription.start_date else None,
            "end_date": subscription.end_date.isoformat() if subscription.end_date else None,
            "current_period_end": datetime.fromtimestamp(stripe_subscription.current_period_end).isoformat(),
            "cancel_at_period_end": stripe_subscription.cancel_at_period_end,
            "limits": {
                "videos_summarized": 100,
                "videos_compared": 20,
                "content_generated": 50
            }
        }
    except stripe.error.StripeError:
        # If Stripe API call fails, return basic subscription info
        return {
            "plan": "pro",
            "status": subscription.status,
            "start_date": subscription.start_date.isoformat() if subscription.start_date else None,
            "end_date": subscription.end_date.isoformat() if subscription.end_date else None,
            "limits": {
                "videos_summarized": 100,
                "videos_compared": 20,
                "content_generated": 50
            }
        }

def cancel_subscription(user_id: int, db: Session) -> Dict[str, Any]:
    """
    Cancel a user's subscription.
    
    Args:
        user_id: User ID
        db: Database session
        
    Returns:
        Cancellation details
    """
    # Get user and subscription from database
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    subscription = db.query(Subscription).filter(Subscription.user_id == user_id).first()
    if not subscription or subscription.status not in ["active", "trialing"]:
        raise HTTPException(status_code=400, detail="No active subscription found")
        
    # Cancel subscription in Stripe
    try:
        stripe_subscription = stripe.Subscription.modify(
            subscription.stripe_subscription_id,
            cancel_at_period_end=True
        )
        
        # Update subscription in database
        subscription.cancel_at_period_end = True
        db.commit()
        
        return {
            "status": "cancelled",
            "effective_date": datetime.fromtimestamp(stripe_subscription.cancel_at).isoformat()
        }
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")

def get_pricing_plans() -> Dict[str, Any]:
    """
    Get pricing plans information.
    
    Returns:
        Pricing plans details
    """
    return {
        "free": {
            "name": "Free",
            "price": 0,
            "currency": "USD",
            "features": [
                "5 video summaries per month",
                "No video comparisons",
                "10 content generations per month",
                "Basic AI analysis"
            ],
            "limits": {
                "videos_summarized": 5,
                "videos_compared": 0,
                "content_generated": 10
            }
        },
        "pro": PRO_PLAN_DETAILS
    }
