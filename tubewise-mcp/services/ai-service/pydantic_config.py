"""
Pydantic configuration for the TubeWise AI service.
This file provides configuration for Pydantic models to allow arbitrary types.
"""

from pydantic import BaseModel, ConfigDict

class BaseModelWithConfig(BaseModel):
    """Base model with configuration for arbitrary types."""
    model_config = ConfigDict(arbitrary_types_allowed=True)
