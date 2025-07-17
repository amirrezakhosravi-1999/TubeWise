from fastapi import BackgroundTasks
from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timedelta
from typing import Optional
from db import Base, get_db
import logging

logger = logging.getLogger(__name__)

class UsageTracking(Base):
    """Model for tracking feature usage by users"""
    __tablename__ = "usage_tracking"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    feature = Column(String, index=True)  # e.g., 'summarize', 'compare', 'fact_check', 'generate'
    count = Column(Integer, default=0)
    date = Column(DateTime, default=func.now())
    
    @classmethod
    async def get_usage(cls, user_id: str, feature: str, session: AsyncSession):
        """Get usage for a specific feature by a user for the current day"""
        today = datetime.now().date()
        tomorrow = today + timedelta(days=1)
        
        query = select(cls).where(
            cls.user_id == user_id,
            cls.feature == feature,
            cls.date >= today,
            cls.date < tomorrow
        )
        
        result = await session.execute(query)
        return result.scalars().first()
    
    @classmethod
    async def increment_usage(cls, user_id: str, feature: str, session: AsyncSession):
        """Increment usage count for a specific feature by a user"""
        usage = await cls.get_usage(user_id, feature, session)
        
        if usage:
            usage.count += 1
        else:
            usage = cls(user_id=user_id, feature=feature, count=1)
            session.add(usage)
        
        await session.commit()
        return usage.count

async def track_usage(
    user_id: str, 
    feature: str, 
    usage_limit: int, 
    background_tasks: Optional[BackgroundTasks] = None,
    increment: bool = True
) -> int:
    """
    Track usage for a specific feature by a user
    
    Args:
        user_id: User ID
        feature: Feature name (e.g., 'summarize', 'compare', 'fact_check', 'generate')
        usage_limit: Maximum allowed usage for the feature
        background_tasks: Background tasks for asynchronous processing
        increment: Whether to increment the usage count
        
    Returns:
        Remaining credits for the feature
    """
    async def _track_usage():
        async with get_db() as session:
            try:
                usage = await UsageTracking.get_usage(user_id, feature, session)
                current_count = usage.count if usage else 0
                
                if increment and current_count < usage_limit:
                    await UsageTracking.increment_usage(user_id, feature, session)
                    current_count += 1
                
                remaining = max(0, usage_limit - current_count)
                return remaining
            except Exception as e:
                logger.error(f"Error tracking usage: {str(e)}")
                # If there's an error, we'll assume the user has remaining credits
                # to avoid blocking legitimate usage due to tracking issues
                return max(0, usage_limit - 1)
    
    if background_tasks:
        # If we have background tasks, we'll track usage asynchronously
        # but return the approximate remaining credits immediately
        async with get_db() as session:
            usage = await UsageTracking.get_usage(user_id, feature, session)
            current_count = usage.count if usage else 0
            
        if increment:
            background_tasks.add_task(_track_usage)
            # Assume the current request will succeed
            current_count += 1
            
        return max(0, usage_limit - current_count)
    else:
        # If no background tasks, track usage synchronously
        return await _track_usage()
