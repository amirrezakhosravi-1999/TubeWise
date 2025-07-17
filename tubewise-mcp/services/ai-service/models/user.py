"""
User model for TubeWise.
"""

from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

# Import User model from db.py
from db import User

# Add to_dict method to User class
def user_to_dict(user) -> Dict[str, Any]:
    """Convert user to dictionary."""
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "credits": user.credits,
        "language_preference": user.language_preference,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "last_active": user.last_active.isoformat() if user.last_active else None,
        "is_active": getattr(user, 'is_active', True)
    }

# Add to_dict method to User class
User.to_dict = user_to_dict

# Pydantic models for API
class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    credits: Optional[int] = None
    language_preference: Optional[str] = None

class UserResponse(UserBase):
    id: int
    role: str
    credits: int
    language_preference: str
    created_at: datetime
    last_active: Optional[datetime] = None
    
    class Config:
        orm_mode = True
