from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import os
from fact_checking import PerplexityService, FactCheckResult
from auth.dependencies import get_current_user, verify_admin_role
from models.user import User
from models.usage_tracking import track_usage

router = APIRouter(prefix="/fact-check", tags=["fact-check"])

class FactCheckRequest(BaseModel):
    video_id: str
    claims: List[str]
    user_role: Optional[str] = "free"

class FactCheckResponse(BaseModel):
    results: List[FactCheckResult]
    remaining_credits: int

@router.post("/", response_model=FactCheckResponse)
async def fact_check_claims(
    request: FactCheckRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """
    Fact-check claims from a YouTube video using Perplexity API
    
    This endpoint allows users to submit claims from a YouTube video for fact-checking.
    The claims are verified using the Perplexity API, which provides sources and explanations.
    
    - Free users can check up to 5 claims per day
    - Pro users can check up to 50 claims per day
    """
    # Check if user has enough credits for fact checking
    usage_limit = 5 if current_user.role == "free" else 50
    
    # Track usage for fact checking
    remaining_credits = await track_usage(
        user_id=current_user.id,
        feature="fact_check",
        usage_limit=usage_limit,
        background_tasks=background_tasks
    )
    
    if remaining_credits <= 0:
        raise HTTPException(
            status_code=403,
            detail=f"You have reached your daily limit for fact checking. Upgrade to Pro for more credits."
        )
    
    try:
        # Initialize Perplexity service
        perplexity_service = PerplexityService()
        
        # Limit the number of claims to process based on user role
        max_claims = 3 if current_user.role == "free" else 10
        claims_to_check = request.claims[:max_claims]
        
        # Fact-check the claims
        results = await perplexity_service.fact_check_claims(claims_to_check)
        
        return FactCheckResponse(
            results=results,
            remaining_credits=remaining_credits
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error during fact checking: {str(e)}"
        )

@router.get("/credits", response_model=Dict[str, int])
async def get_fact_check_credits(current_user: User = Depends(get_current_user)):
    """Get remaining fact-check credits for the current user"""
    usage_limit = 5 if current_user.role == "free" else 50
    
    # Get remaining credits without incrementing usage
    remaining_credits = await track_usage(
        user_id=current_user.id,
        feature="fact_check",
        usage_limit=usage_limit,
        increment=False
    )
    
    return {"remaining_credits": remaining_credits}
