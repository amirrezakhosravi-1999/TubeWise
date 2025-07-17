"""
Subscription API endpoints for TubeWise Pro.
"""

from fastapi import APIRouter, Depends, Request, HTTPException, Header
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
import stripe

from . import stripe_service
from db import get_db, User
from auth.auth_service import get_current_user

# Create router
router = APIRouter()

@router.get("/pricing")
async def get_pricing_plans() -> Dict[str, Any]:
    """
    Get pricing plans information.
    """
    return stripe_service.get_pricing_plans()

@router.post("/create-checkout-session")
async def create_checkout_session(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Create a Stripe checkout session for Pro subscription.
    """
    # Get base URL for success and cancel URLs
    base_url = str(request.base_url).rstrip("/")
    success_url = f"{base_url}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{base_url}/subscription/cancel"
    
    # Create checkout session
    checkout_url = stripe_service.create_checkout_session(
        db=db,
        user=current_user,
        price_id=stripe_service.PRO_PLAN_PRICE_ID,
        success_url=success_url,
        cancel_url=cancel_url
    )
    
    return {"checkout_url": checkout_url}

@router.get("/subscription")
async def get_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get current user's subscription details.
    """
    return stripe_service.get_subscription_details(current_user.id, db)

@router.post("/cancel")
async def cancel_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Cancel current user's subscription.
    """
    return stripe_service.cancel_subscription(current_user.id, db)

@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Handle Stripe webhook events.
    """
    # Get raw request payload
    payload = await request.body()
    
    # Process webhook event
    return stripe_service.handle_webhook_event(db, payload, stripe_signature)
