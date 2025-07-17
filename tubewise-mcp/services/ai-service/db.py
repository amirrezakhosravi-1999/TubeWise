"""
Database connection and models for TubeWise using SQLAlchemy.
"""
import os
from datetime import datetime
from typing import List, Optional

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Boolean, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker

# Get database connection details from environment variables
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
DB_NAME = os.getenv("DB_NAME", "tubewise")

# Create database URL
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()

# Define models
class User(Base):
    """User model."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    password = Column(String)  # In production, this should be hashed
    role = Column(String, default="free")  # Changed default from 'user' to 'free'
    credits = Column(Integer, default=10)
    language_preference = Column(String, default="en")
    stripe_customer_id = Column(String, unique=True, nullable=True)  # For Stripe integration
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    saved_videos = relationship("SavedVideo", back_populates="user")
    usage_stats = relationship("UsageStats", back_populates="user", uselist=False)
    subscription = relationship("Subscription", back_populates="user", uselist=False)


class Video(Base):
    """Video model."""
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(String, unique=True, index=True)  # YouTube video ID
    title = Column(String)
    url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    summary = relationship("VideoSummary", back_populates="video", uselist=False)
    saved_videos = relationship("SavedVideo", back_populates="video")


class SavedVideo(Base):
    """SavedVideo model for user's saved videos."""
    __tablename__ = "saved_videos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    video_id = Column(Integer, ForeignKey("videos.id"))
    saved_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="saved_videos")
    video = relationship("Video", back_populates="saved_videos")


class VideoSummary(Base):
    """VideoSummary model."""
    __tablename__ = "video_summaries"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"))
    summary = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    video = relationship("Video", back_populates="summary")
    key_points = relationship("KeyPoint", back_populates="summary")


class KeyPoint(Base):
    """KeyPoint model for video summaries."""
    __tablename__ = "key_points"

    id = Column(Integer, primary_key=True, index=True)
    summary_id = Column(Integer, ForeignKey("video_summaries.id"))
    text = Column(Text)
    timestamp = Column(Integer)  # Timestamp in seconds
    confidence = Column(Float, default=0.9)

    # Relationships
    summary = relationship("VideoSummary", back_populates="key_points")


class UsageStats(Base):
    """UsageStats model for tracking user usage."""
    __tablename__ = "usage_stats"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    videos_summarized = Column(Integer, default=0)
    videos_compared = Column(Integer, default=0)
    content_generated = Column(Integer, default=0)
    last_active = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="usage_stats")


class GeneratedContent(Base):
    """GeneratedContent model for tracking generated content."""
    __tablename__ = "generated_contents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    video_id = Column(Integer, ForeignKey("videos.id"))
    content_type = Column(String)  # e.g., "twitter", "linkedin", "notion"
    content = Column(Text)
    format = Column(String)
    title = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User")
    video = relationship("Video")


class ChatMessage(Base):
    """ChatMessage model for storing chat messages."""
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    video_id = Column(Integer, ForeignKey("videos.id"))
    message = Column(Text)  # User's message
    response = Column(Text)  # AI's response
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User")
    video = relationship("Video")
    timeline_suggestions = relationship("TimelineSuggestion", back_populates="chat_message")


class TimelineSuggestion(Base):
    """TimelineSuggestion model for storing timeline suggestions in chat."""
    __tablename__ = "timeline_suggestions"

    id = Column(Integer, primary_key=True, index=True)
    chat_message_id = Column(Integer, ForeignKey("chat_messages.id"))
    timestamp = Column(String)  # Timestamp in format "MM:SS"
    text = Column(Text)  # Description of what happens at this timestamp
    relevance = Column(String)  # Relevance to the user's query (e.g., "high", "medium", "low")

    # Relationships
    chat_message = relationship("ChatMessage", back_populates="timeline_suggestions")


# Function to get a database session
def get_db():
    """Get a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Function to create all tables
def create_tables():
    """Create all tables in the database."""
    Base.metadata.create_all(bind=engine)


# Create tables when the module is imported
# Subscription model for Pro users
class Subscription(Base):
    """Subscription model for Pro users."""
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    stripe_subscription_id = Column(String, unique=True)
    status = Column(String)  # active, trialing, past_due, cancelled, etc.
    start_date = Column(DateTime)
    end_date = Column(DateTime, nullable=True)
    cancel_at_period_end = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="subscription")


if __name__ == "__main__":
    create_tables()
