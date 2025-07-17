"""
Usage limits management for TubeWise.
This module provides functions to check and enforce usage limits for free and pro users.
"""
from typing import Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
import db_repository as repo
from db import User

# Define usage limits
FREE_LIMITS = {
    "videos_summarized": 5,  # 5 videos per month for free users
    "videos_compared": 0,    # No video comparisons for free users
    "content_generated": 10  # 10 content generations per month for free users
}

PRO_LIMITS = {
    "videos_summarized": 100,  # 100 videos per month for pro users
    "videos_compared": 20,     # 20 video comparisons per month for pro users
    "content_generated": 50    # 50 content generations per month for pro users
}

def get_user_role(db: Session, user_id: int) -> str:
    """Get the role of a user (free or pro)."""
    user = repo.get_user_by_id(db, user_id)
    if not user:
        return "free"  # Default to free if user not found
    return user.role

def check_summarization_limit(db: Session, user_id: int) -> Tuple[bool, Dict[str, Any]]:
    """
    Check if a user has reached their summarization limit.
    Returns (allowed, info) where:
    - allowed: True if the user is allowed to summarize another video
    - info: Dict with limit information
    """
    user_role = get_user_role(db, user_id)
    limit = PRO_LIMITS["videos_summarized"] if user_role == "pro" else FREE_LIMITS["videos_summarized"]
    
    # Get user's usage stats
    stats = repo.get_usage_stats_by_user_id(db, user_id)
    used = 0 if not stats else stats.videos_summarized
    
    allowed = used < limit
    remaining = max(0, limit - used)
    
    return allowed, {
        "allowed": allowed,
        "limit": limit,
        "used": used,
        "remaining": remaining,
        "user_role": user_role
    }

def check_comparison_limit(db: Session, user_id: int) -> Tuple[bool, Dict[str, Any]]:
    """
    Check if a user has reached their video comparison limit.
    Returns (allowed, info) where:
    - allowed: True if the user is allowed to compare videos
    - info: Dict with limit information
    """
    user_role = get_user_role(db, user_id)
    limit = PRO_LIMITS["videos_compared"] if user_role == "pro" else FREE_LIMITS["videos_compared"]
    
    # Get user's usage stats
    stats = repo.get_usage_stats_by_user_id(db, user_id)
    used = 0 if not stats else stats.videos_compared
    
    allowed = used < limit
    remaining = max(0, limit - used)
    
    return allowed, {
        "allowed": allowed,
        "limit": limit,
        "used": used,
        "remaining": remaining,
        "user_role": user_role
    }

def check_content_generation_limit(db: Session, user_id: int) -> Tuple[bool, Dict[str, Any]]:
    """
    Check if a user has reached their content generation limit.
    Returns (allowed, info) where:
    - allowed: True if the user is allowed to generate content
    - info: Dict with limit information
    """
    user_role = get_user_role(db, user_id)
    limit = PRO_LIMITS["content_generated"] if user_role == "pro" else FREE_LIMITS["content_generated"]
    
    # Get user's usage stats
    stats = repo.get_usage_stats_by_user_id(db, user_id)
    used = 0 if not stats else stats.content_generated
    
    allowed = used < limit
    remaining = max(0, limit - used)
    
    return allowed, {
        "allowed": allowed,
        "limit": limit,
        "used": used,
        "remaining": remaining,
        "user_role": user_role
    }

def get_user_limits(db: Session, user_id: int) -> Dict[str, Any]:
    """Get all usage limits and current usage for a user."""
    user_role = get_user_role(db, user_id)
    stats = repo.get_usage_stats_by_user_id(db, user_id)
    
    if not stats:
        # Default values if no stats exist
        used_stats = {
            "videos_summarized": 0,
            "videos_compared": 0,
            "content_generated": 0
        }
    else:
        used_stats = {
            "videos_summarized": stats.videos_summarized,
            "videos_compared": stats.videos_compared,
            "content_generated": stats.content_generated
        }
    
    limits = PRO_LIMITS if user_role == "pro" else FREE_LIMITS
    
    result = {
        "user_role": user_role,
        "limits": {},
    }
    
    for key, limit in limits.items():
        used = used_stats.get(key, 0)
        result["limits"][key] = {
            "limit": limit,
            "used": used,
            "remaining": max(0, limit - used),
            "allowed": used < limit
        }
    
    return result
