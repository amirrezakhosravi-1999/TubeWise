from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import os
from sqlalchemy.orm import Session
from sqlalchemy.future import select
from datetime import datetime, timedelta
import logging

from auth.dependencies import get_current_user, verify_admin_role
from db import get_db
from models.user import User
import db_repository as repo

router = APIRouter(prefix="/admin", tags=["admin"])

# Models for admin dashboard
class UserListItem(BaseModel):
    id: int
    email: str
    name: str
    role: str
    credits: int
    created_at: datetime
    last_active: Optional[datetime] = None
    usage_stats: Dict[str, int]

class SystemLog(BaseModel):
    id: int
    timestamp: datetime
    level: str
    message: str
    source: str

class UpdateUserRequest(BaseModel):
    role: Optional[str] = None
    credits: Optional[int] = None
    language_preference: Optional[str] = None

class AdminDashboardStats(BaseModel):
    total_users: int
    active_users_last_24h: int
    active_users_last_7d: int
    total_videos_processed: int
    total_comparisons: int
    total_fact_checks: int
    total_content_generated: int
    pro_users_count: int
    free_users_count: int

# Admin-only endpoints
@router.get("/users", response_model=List[UserListItem])
async def get_all_users(
    skip: int = 0, 
    limit: int = 100,
    search: Optional[str] = None,
    role_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin_role)
):
    """
    Get a list of all users (admin only)
    
    This endpoint allows admins to view all users in the system with their basic information
    and usage statistics. Results can be paginated and filtered.
    """
    try:
        # Get users from database
        users = await repo.get_users(db, skip=skip, limit=limit, search=search, role=role_filter)
        
        # Get usage stats for each user
        result = []
        for user in users:
            # Get usage stats
            usage_stats = await repo.get_user_usage_stats(db, user.id)
            
            # Convert to UserListItem
            user_item = UserListItem(
                id=user.id,
                email=user.email,
                name=user.name,
                role=user.role,
                credits=user.credits,
                created_at=user.created_at,
                last_active=user.last_active,
                usage_stats={
                    "videos_summarized": usage_stats.get("videos_summarized", 0),
                    "videos_compared": usage_stats.get("videos_compared", 0),
                    "content_generated": usage_stats.get("content_generated", 0),
                    "fact_checks": usage_stats.get("fact_checks", 0)
                }
            )
            result.append(user_item)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting users: {str(e)}")

@router.get("/dashboard/stats", response_model=AdminDashboardStats)
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin_role)
):
    """
    Get dashboard statistics (admin only)
    
    This endpoint provides overall statistics for the admin dashboard, including
    user counts, activity metrics, and feature usage.
    """
    try:
        # Get total users
        total_users = await repo.count_users(db)
        
        # Get active users in last 24 hours
        yesterday = datetime.now() - timedelta(days=1)
        active_users_24h = await repo.count_active_users(db, since=yesterday)
        
        # Get active users in last 7 days
        last_week = datetime.now() - timedelta(days=7)
        active_users_7d = await repo.count_active_users(db, since=last_week)
        
        # Get pro and free users count
        pro_users = await repo.count_users_by_role(db, role="pro")
        free_users = await repo.count_users_by_role(db, role="free")
        
        # Get feature usage counts
        videos_processed = await repo.count_feature_usage(db, feature="summarize")
        comparisons = await repo.count_feature_usage(db, feature="compare")
        fact_checks = await repo.count_feature_usage(db, feature="fact_check")
        content_generated = await repo.count_feature_usage(db, feature="generate")
        
        return AdminDashboardStats(
            total_users=total_users,
            active_users_last_24h=active_users_24h,
            active_users_last_7d=active_users_7d,
            total_videos_processed=videos_processed,
            total_comparisons=comparisons,
            total_fact_checks=fact_checks,
            total_content_generated=content_generated,
            pro_users_count=pro_users,
            free_users_count=free_users
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting dashboard stats: {str(e)}")

@router.get("/logs", response_model=List[SystemLog])
async def get_system_logs(
    skip: int = 0,
    limit: int = 100,
    level: Optional[str] = None,
    source: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin_role)
):
    """
    Get system logs (admin only)
    
    This endpoint allows admins to view system logs with filtering options.
    """
    try:
        # Get logs from database
        logs = await repo.get_system_logs(
            db, 
            skip=skip, 
            limit=limit, 
            level=level,
            source=source,
            start_date=start_date,
            end_date=end_date
        )
        
        return logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting system logs: {str(e)}")

@router.put("/users/{user_id}", response_model=UserListItem)
async def update_user(
    user_id: int,
    update_data: UpdateUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin_role)
):
    """
    Update user information (admin only)
    
    This endpoint allows admins to update user information, including role, credits,
    and language preference.
    """
    try:
        # Get user from database
        user = await repo.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update user data
        if update_data.role is not None:
            if update_data.role not in ["free", "pro", "admin"]:
                raise HTTPException(status_code=400, detail="Invalid role")
            user.role = update_data.role
        
        if update_data.credits is not None:
            user.credits = update_data.credits
        
        if update_data.language_preference is not None:
            user.language_preference = update_data.language_preference
        
        # Save updated user
        updated_user = await repo.update_user(db, user)
        
        # Get usage stats
        usage_stats = await repo.get_user_usage_stats(db, user.id)
        
        # Return updated user
        return UserListItem(
            id=updated_user.id,
            email=updated_user.email,
            name=updated_user.name,
            role=updated_user.role,
            credits=updated_user.credits,
            created_at=updated_user.created_at,
            last_active=updated_user.last_active,
            usage_stats={
                "videos_summarized": usage_stats.get("videos_summarized", 0),
                "videos_compared": usage_stats.get("videos_compared", 0),
                "content_generated": usage_stats.get("content_generated", 0),
                "fact_checks": usage_stats.get("fact_checks", 0)
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating user: {str(e)}")

@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin_role)
):
    """
    Delete a user (admin only)
    
    This endpoint allows admins to delete a user from the system.
    """
    try:
        # Get user from database
        user = await repo.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Don't allow deleting self
        if user.id == current_user.id:
            raise HTTPException(status_code=400, detail="Cannot delete yourself")
        
        # Delete user
        await repo.delete_user(db, user_id)
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting user: {str(e)}")

@router.post("/users/{user_id}/reset-password", status_code=204)
async def reset_user_password(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin_role)
):
    """
    Reset a user's password (admin only)
    
    This endpoint allows admins to reset a user's password. A temporary password
    will be generated and sent to the user's email address.
    """
    try:
        # Get user from database
        user = await repo.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Generate temporary password
        temp_password = await repo.reset_user_password(db, user_id)
        
        # TODO: Send email with temporary password
        # For now, just log it
        logging.info(f"Reset password for user {user.email}: {temp_password}")
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error resetting password: {str(e)}")
