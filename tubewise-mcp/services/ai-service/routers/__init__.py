"""
Routers package for TubeWise API.
"""

from routers.fact_check import router as fact_check_router
from routers.admin import router as admin_router

__all__ = [
    "fact_check_router",
    "admin_router"
]
