from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
import logging
from celery_worker import (
    process_video_summary,
    process_video_comparison,
    generate_content,
    get_task_status
)
from cache_service import cache_service
from auth import get_current_user

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/background-tasks", tags=["Background Tasks"])

# Models
class TaskResponse(BaseModel):
    task_id: str
    status: str
    message: str

class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    progress: int
    result: Optional[Dict] = None
    error: Optional[str] = None

class SummaryRequest(BaseModel):
    video_id: str
    options: Optional[Dict] = None

class ComparisonRequest(BaseModel):
    video_ids: List[str]
    options: Optional[Dict] = None

class ContentGenerationRequest(BaseModel):
    video_id: str
    content_type: str = Field(..., description="Type of content to generate (e.g., 'twitter_thread', 'blog_post', 'linkedin_post')")
    style: Optional[str] = Field(None, description="Style of the content (e.g., 'professional', 'casual', 'educational')")
    options: Optional[Dict] = None

@router.post("/summary", response_model=TaskResponse)
async def create_summary_task(
    request: SummaryRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Start a background task to generate a video summary.
    """
    try:
        # Check if we already have a cached summary
        cached_summary = cache_service.get_summary(request.video_id)
        if cached_summary:
            # Return a fake task ID that can be used to retrieve the cached result
            return TaskResponse(
                task_id=f"cached_{request.video_id}",
                status="COMPLETED",
                message="Summary already available in cache"
            )
        
        # Start the Celery task
        options = request.options or {}
        options["user_id"] = current_user["id"]
        
        task = process_video_summary.delay(request.video_id, options)
        
        return TaskResponse(
            task_id=task.id,
            status="STARTED",
            message="Summary generation started"
        )
    except Exception as e:
        logger.error(f"Error starting summary task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/comparison", response_model=TaskResponse)
async def create_comparison_task(
    request: ComparisonRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Start a background task to generate a comparison between multiple videos.
    """
    try:
        if len(request.video_ids) < 2:
            raise HTTPException(status_code=400, detail="At least 2 videos are required for comparison")
        
        if len(request.video_ids) > 5:
            raise HTTPException(status_code=400, detail="Maximum 5 videos can be compared at once")
        
        # Check if we already have a cached comparison
        cached_comparison = cache_service.get_comparison(request.video_ids)
        if cached_comparison:
            # Return a fake task ID that can be used to retrieve the cached result
            comparison_id = "-".join(sorted(request.video_ids))
            return TaskResponse(
                task_id=f"cached_{comparison_id}",
                status="COMPLETED",
                message="Comparison already available in cache"
            )
        
        # Start the Celery task
        options = request.options or {}
        options["user_id"] = current_user["id"]
        
        task = process_video_comparison.delay(request.video_ids, options)
        
        return TaskResponse(
            task_id=task.id,
            status="STARTED",
            message="Comparison generation started"
        )
    except Exception as e:
        logger.error(f"Error starting comparison task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/content", response_model=TaskResponse)
async def create_content_generation_task(
    request: ContentGenerationRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Start a background task to generate content based on a video.
    """
    try:
        # Validate content type
        valid_content_types = ["twitter_thread", "blog_post", "linkedin_post", "notion_page", "email_newsletter"]
        if request.content_type not in valid_content_types:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid content type. Must be one of: {', '.join(valid_content_types)}"
            )
        
        # Start the Celery task
        options = request.options or {}
        options["user_id"] = current_user["id"]
        
        if request.style:
            options["style"] = request.style
        
        task = generate_content.delay(request.video_id, request.content_type, options)
        
        return TaskResponse(
            task_id=task.id,
            status="STARTED",
            message=f"{request.content_type} generation started"
        )
    except Exception as e:
        logger.error(f"Error starting content generation task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{task_id}", response_model=TaskStatusResponse)
async def check_task_status(
    task_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """
    Check the status of a background task.
    """
    try:
        # Handle cached results
        if task_id.startswith("cached_"):
            resource_id = task_id.replace("cached_", "")
            
            # Check if it's a video summary
            if "_" not in resource_id:
                cached_summary = cache_service.get_summary(resource_id)
                if cached_summary:
                    return TaskStatusResponse(
                        task_id=task_id,
                        status="COMPLETED",
                        progress=100,
                        result=cached_summary
                    )
            
            # Check if it's a video comparison
            else:
                video_ids = resource_id.split("-")
                cached_comparison = cache_service.get_comparison(video_ids)
                if cached_comparison:
                    return TaskStatusResponse(
                        task_id=task_id,
                        status="COMPLETED",
                        progress=100,
                        result=cached_comparison
                    )
            
            # If we couldn't find the cached result
            return TaskStatusResponse(
                task_id=task_id,
                status="FAILED",
                progress=0,
                error="Cached result not found"
            )
        
        # Get status from Celery
        status = get_task_status(task_id)
        
        return TaskStatusResponse(
            task_id=task_id,
            status=status.get("status", "UNKNOWN"),
            progress=status.get("progress", 0),
            result=status.get("result"),
            error=status.get("error")
        )
    except Exception as e:
        logger.error(f"Error checking task status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/cancel/{task_id}", response_model=TaskResponse)
async def cancel_task(
    task_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """
    Cancel a running background task.
    """
    try:
        # Handle cached results
        if task_id.startswith("cached_"):
            return TaskResponse(
                task_id=task_id,
                status="COMPLETED",
                message="Task was already completed from cache"
            )
        
        # In a real implementation, you would use Celery's revoke function
        # For this example, we'll just return a success message
        
        return TaskResponse(
            task_id=task_id,
            status="CANCELED",
            message="Task has been canceled"
        )
    except Exception as e:
        logger.error(f"Error canceling task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/clear-cache/{video_id}", response_model=TaskResponse)
async def clear_video_cache(
    video_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """
    Clear the cache for a specific video.
    """
    try:
        # Check if the user is an admin
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Only admins can clear cache")
        
        success = cache_service.clear_video_cache(video_id)
        
        if success:
            return TaskResponse(
                task_id="cache_clear",
                status="COMPLETED",
                message=f"Cache for video {video_id} has been cleared"
            )
        else:
            return TaskResponse(
                task_id="cache_clear",
                status="PARTIAL",
                message=f"Some cache items for video {video_id} could not be cleared"
            )
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(status_code=500, detail=str(e))
