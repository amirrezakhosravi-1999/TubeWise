"""
Authentication package for TubeWise.
"""

import sys
import os

# Add parent directory to path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import auth functions
from auth.auth_service import get_current_user, create_access_token, create_refresh_token, verify_password, get_password_hash, authenticate_user, register_user
from auth.dependencies import verify_admin_role

# Export functions for easier imports
__all__ = [
    'get_current_user',
    'create_access_token',
    'create_refresh_token',
    'verify_password',
    'get_password_hash',
    'authenticate_user',
    'register_user',
    'verify_admin_role'
]
