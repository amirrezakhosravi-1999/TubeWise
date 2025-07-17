"""
Database repository for TubeWise.
This module provides functions to interact with the database.
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime

from db import (
    User, Video, SavedVideo, VideoSummary, KeyPoint, 
    UsageStats, GeneratedContent, ChatMessage, TimelineSuggestion
)


# User repository functions
def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get a user by email."""
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Get a user by ID."""
    return db.query(User).filter(User.id == user_id).first()


async def get_users(db: Session, skip: int = 0, limit: int = 100, search: Optional[str] = None, role: Optional[str] = None) -> List[User]:
    """Get all users with optional filtering."""
    query = db.query(User)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (User.name.ilike(search_term)) | 
            (User.email.ilike(search_term))
        )
    
    if role:
        query = query.filter(User.role == role)
    
    return query.offset(skip).limit(limit).all()


async def count_users(db: Session) -> int:
    """Count all users."""
    return db.query(User).count()


async def count_users_by_role(db: Session, role: str) -> int:
    """Count users by role."""
    return db.query(User).filter(User.role == role).count()


async def count_active_users(db: Session, since: datetime) -> int:
    """Count active users since a specific date."""
    return db.query(User).filter(User.last_active >= since).count()


def create_user(db: Session, email: str, name: str, password: str, role: str = "user") -> User:
    """Create a new user."""
    user = User(
        email=email,
        name=name,
        password=password,  # In production, this should be hashed
        role=role,
        credits=10,
        language_preference="en",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user(db: Session, user_id: int, data: Dict[str, Any]) -> Optional[User]:
    """Update a user."""
    user = get_user_by_id(db, user_id)
    if not user:
        return None
    
    for key, value in data.items():
        if hasattr(user, key):
            setattr(user, key, value)
    
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    return user


# Video repository functions
def get_video_by_youtube_id(db: Session, youtube_id: str) -> Optional[Video]:
    """Get a video by YouTube ID."""
    return db.query(Video).filter(Video.video_id == youtube_id).first()


def create_video(db: Session, youtube_id: str, title: str, url: str) -> Video:
    """Create a new video."""
    video = Video(
        video_id=youtube_id,
        title=title,
        url=url,
    )
    db.add(video)
    db.commit()
    db.refresh(video)
    return video


# Saved video repository functions
def get_saved_videos_by_user_id(db: Session, user_id: int) -> List[SavedVideo]:
    """Get saved videos by user ID."""
    return db.query(SavedVideo).filter(SavedVideo.user_id == user_id).all()


def save_video(db: Session, user_id: int, video_id: int) -> SavedVideo:
    """Save a video for a user."""
    saved_video = SavedVideo(
        user_id=user_id,
        video_id=video_id,
    )
    db.add(saved_video)
    db.commit()
    db.refresh(saved_video)
    return saved_video


def remove_saved_video(db: Session, user_id: int, video_id: int) -> bool:
    """Remove a saved video."""
    saved_video = db.query(SavedVideo).filter(
        SavedVideo.user_id == user_id,
        SavedVideo.video_id == video_id
    ).first()
    
    if not saved_video:
        return False
    
    db.delete(saved_video)
    db.commit()
    return True


# Video summary repository functions
def get_summary_by_video_id(db: Session, video_id: int) -> Optional[VideoSummary]:
    """Get a summary by video ID."""
    return db.query(VideoSummary).filter(VideoSummary.video_id == video_id).first()


def create_summary(db: Session, video_id: int, summary_text: str) -> VideoSummary:
    """Create a new summary."""
    summary = VideoSummary(
        video_id=video_id,
        summary=summary_text,
    )
    db.add(summary)
    db.commit()
    db.refresh(summary)
    return summary


def get_all_summaries(db: Session) -> List[VideoSummary]:
    """Get all summaries."""
    return db.query(VideoSummary).all()


# Key point repository functions
def create_key_point(db: Session, summary_id: int, text: str, timestamp: int, confidence: float = 0.9) -> KeyPoint:
    """Create a new key point."""
    key_point = KeyPoint(
        summary_id=summary_id,
        text=text,
        timestamp=timestamp,
        confidence=confidence,
    )
    db.add(key_point)
    db.commit()
    db.refresh(key_point)
    return key_point


def get_key_points_by_summary_id(db: Session, summary_id: int) -> List[KeyPoint]:
    """Get key points by summary ID."""
    return db.query(KeyPoint).filter(KeyPoint.summary_id == summary_id).all()


# Usage stats repository functions
def get_usage_stats_by_user_id(db: Session, user_id: int) -> Optional[UsageStats]:
    """Get usage stats by user ID."""
    return db.query(UsageStats).filter(UsageStats.user_id == user_id).first()


def increment_videos_summarized(db: Session, user_id: int) -> UsageStats:
    """Increment videos summarized count."""
    stats = get_usage_stats_by_user_id(db, user_id)
    
    if not stats:
        stats = UsageStats(
            user_id=user_id,
            videos_summarized=1,
            videos_compared=0,
            content_generated=0,
        )
        db.add(stats)
    else:
        stats.videos_summarized += 1
        stats.last_active = datetime.utcnow()
        stats.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(stats)
    return stats


def increment_videos_compared(db: Session, user_id: int) -> UsageStats:
    """Increment videos compared count."""
    stats = get_usage_stats_by_user_id(db, user_id)
    
    if not stats:
        stats = UsageStats(
            user_id=user_id,
            videos_summarized=0,
            videos_compared=1,
            content_generated=0,
        )
        db.add(stats)
    else:
        stats.videos_compared += 1
        stats.last_active = datetime.utcnow()
        stats.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(stats)
    return stats


def increment_content_generated(db: Session, user_id: int) -> UsageStats:
    """Increment content generated count."""
    stats = get_usage_stats_by_user_id(db, user_id)
    
    if not stats:
        stats = UsageStats(
            user_id=user_id,
            videos_summarized=0,
            videos_compared=0,
            content_generated=1,
        )
        db.add(stats)
    else:
        stats.content_generated += 1
        stats.last_active = datetime.utcnow()
        stats.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(stats)
    return stats


# Chat message repository functions
def create_chat_message(
    db: Session, 
    user_id: int, 
    video_id: int, 
    message: str, 
    response: str
) -> ChatMessage:
    """Create a new chat message."""
    chat_message = ChatMessage(
        user_id=user_id,
        video_id=video_id,
        message=message,
        response=response,
    )
    db.add(chat_message)
    db.commit()
    db.refresh(chat_message)
    return chat_message


def get_chat_messages_by_video_id(db: Session, video_id: int) -> List[ChatMessage]:
    """Get chat messages by video ID."""
    return db.query(ChatMessage).filter(ChatMessage.video_id == video_id).all()


# Timeline suggestion repository functions
def create_timeline_suggestion(
    db: Session, 
    chat_message_id: int, 
    timestamp: str, 
    text: str, 
    relevance: str
) -> TimelineSuggestion:
    """Create a new timeline suggestion."""
    suggestion = TimelineSuggestion(
        chat_message_id=chat_message_id,
        timestamp=timestamp,
        text=text,
        relevance=relevance,
    )
    db.add(suggestion)
    db.commit()
    db.refresh(suggestion)
    return suggestion


def get_timeline_suggestions_by_chat_message_id(db: Session, chat_message_id: int) -> List[TimelineSuggestion]:
    """Get timeline suggestions by chat message ID."""
    return db.query(TimelineSuggestion).filter(TimelineSuggestion.chat_message_id == chat_message_id).all()


# System logs repository functions
async def get_system_logs(
    db: Session, 
    skip: int = 0, 
    limit: int = 100, 
    level: Optional[str] = None,
    source: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> List[Dict[str, Any]]:
    """Get system logs with optional filtering."""
    # In a real implementation, this would query a logs table
    # For now, we'll return some sample logs
    sample_logs = [
        {
            "id": 1,
            "timestamp": datetime.now(),
            "level": "INFO",
            "message": "User login successful",
            "source": "auth_service"
        },
        {
            "id": 2,
            "timestamp": datetime.now(),
            "level": "WARNING",
            "message": "Rate limit exceeded for fact checking",
            "source": "fact_check_service"
        },
        {
            "id": 3,
            "timestamp": datetime.now(),
            "level": "ERROR",
            "message": "Failed to connect to YouTube API",
            "source": "transcript_agent"
        }
    ]
    
    # Apply filters
    filtered_logs = sample_logs
    if level:
        filtered_logs = [log for log in filtered_logs if log["level"] == level]
    if source:
        filtered_logs = [log for log in filtered_logs if log["source"] == source]
    if start_date:
        filtered_logs = [log for log in filtered_logs if log["timestamp"] >= start_date]
    if end_date:
        filtered_logs = [log for log in filtered_logs if log["timestamp"] <= end_date]
    
    # Apply pagination
    paginated_logs = filtered_logs[skip:skip + limit]
    
    return paginated_logs


# Usage statistics functions
async def get_user_usage_stats(db: Session, user_id: int) -> Dict[str, int]:
    """Get usage statistics for a user."""
    # Get usage stats from database
    usage_stats = get_usage_stats_by_user_id(db, user_id)
    
    if usage_stats:
        return {
            "videos_summarized": usage_stats.videos_summarized,
            "videos_compared": usage_stats.videos_compared,
            "content_generated": usage_stats.content_generated,
            "fact_checks": 0  # Add this field to the UsageStats model
        }
    else:
        return {
            "videos_summarized": 0,
            "videos_compared": 0,
            "content_generated": 0,
            "fact_checks": 0
        }


async def count_feature_usage(db: Session, feature: str) -> int:
    """Count total usage of a specific feature."""
    # In a real implementation, this would query the usage_tracking table
    # For now, we'll return some sample data
    sample_counts = {
        "summarize": 150,
        "compare": 75,
        "fact_check": 45,
        "generate": 120
    }
    
    return sample_counts.get(feature, 0)


# Generated content repository functions
def create_generated_content(
    db: Session, 
    user_id: int, 
    video_id: int, 
    content_type: str, 
    content: str, 
    format: str, 
    title: str
) -> GeneratedContent:
    """Create a new generated content."""
    generated_content = GeneratedContent(
        user_id=user_id,
        video_id=video_id,
        content_type=content_type,
        content=content,
        format=format,
        title=title,
    )
    db.add(generated_content)
    db.commit()
    db.refresh(generated_content)
    return generated_content


def get_generated_contents_by_user_id(db: Session, user_id: int) -> List[GeneratedContent]:
    """Get generated contents by user ID."""
    return db.query(GeneratedContent).filter(GeneratedContent.user_id == user_id).all()
