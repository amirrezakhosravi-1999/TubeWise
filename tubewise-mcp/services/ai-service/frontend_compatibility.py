"""
Frontend compatibility module for TubeWise AI Service.
This module adds additional API endpoints to ensure compatibility with the frontend.
"""

import logging
from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import JSONResponse
from typing import List, Dict, Any, Optional
import json

logger = logging.getLogger("tubewise-api-compat")

# Create a router for compatibility endpoints
router = APIRouter(tags=["Frontend Compatibility"])

# Function to register routes with the main app
def register_routes(app: FastAPI):
    """Register compatibility routes with the main FastAPI app."""
    app.include_router(router)
    logger.info("Frontend compatibility routes registered with the main app")

# Add GET endpoint for summarize by video ID
@router.get("/api/summarize/{video_id}")
def get_video_summary(video_id: str):
    """Get summary for a YouTube video by ID (compatible with frontend)."""
    if not video_id:
        return JSONResponse(
            status_code=400,
            content={"error": "Video ID is required"}
        )
    
    try:
        # Import functions from api_server to avoid circular imports
        from api_server import get_video_info, get_transcript, summarize_text, extract_key_points
        
        # Get video info
        video_info = get_video_info(video_id)
        
        # Get transcript
        transcript = get_transcript(video_id)
        
        # Generate summary
        summary_text = summarize_text(transcript, video_info["title"])
        
        # Extract key points
        key_points = extract_key_points(transcript, summary_text)
        
        # Return summary
        return {
            "videoId": video_id,
            "title": video_info["title"],
            "summary": summary_text,
            "keyPoints": key_points
        }
    except Exception as e:
        logger.error(f"Error generating summary: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Error generating summary: {str(e)}"}
        )

# Add POST endpoint for comparing videos with URLs
@router.post("/api/compare")
def compare_videos_frontend(request: Dict[str, Any]):
    """Compare multiple YouTube videos (compatible with frontend)."""
    # Frontend sends full video URLs
    video_urls = request.get("videoUrls", [])
    
    if not video_urls or len(video_urls) < 2:
        return JSONResponse(
            status_code=400,
            content={"error": "At least two video URLs are required"}
        )
    
    try:
        # Import functions from api_server to avoid circular imports
        from api_server import extract_video_id, get_video_info, get_transcript, compare_videos
        
        # Extract video IDs from URLs
        video_ids = [extract_video_id(url) for url in video_urls]
        video_ids = [vid for vid in video_ids if vid]  # Remove empty values
        
        if len(video_ids) < 2:
            return JSONResponse(
                status_code=400,
                content={"error": "Could not extract valid video IDs from URLs"}
            )
        
        # Get video info and transcripts
        videos_info = []
        transcripts = []
        
        for vid in video_ids:
            # Get video info
            video_info = get_video_info(vid)
            videos_info.append({"id": vid, "title": video_info["title"]})
            
            # Get transcript
            transcript = get_transcript(vid)
            if not transcript:
                return JSONResponse(
                    status_code=404,
                    content={"error": f"Could not retrieve transcript for video {vid}"}
                )
            
            transcripts.append(transcript)
        
        # Generate comparison
        comparison_result = compare_videos(video_ids, videos_info, transcripts)
        
        # Return comparison result
        return {
            "video_ids": video_ids,
            "comparison": comparison_result
        }
    except Exception as e:
        logger.error(f"Error comparing videos: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Error comparing videos: {str(e)}"}
        )

# Add endpoint for generating content from video summary
@router.post("/api/generate-content")
def generate_content_frontend(request: Dict[str, Any]):
    """Generate content from a video summary (compatible with frontend)."""
    video_id = request.get("videoId")
    content_type = request.get("contentType")
    style = request.get("style", "professional")  # Default to professional if not provided
    
    if not video_id:
        return JSONResponse(
            status_code=400,
            content={"error": "Video ID is required"}
        )
    
    if not content_type:
        return JSONResponse(
            status_code=400,
            content={"error": "Content type is required"}
        )
    
    # Validate style
    valid_styles = ["professional", "casual", "educational"]
    if style.lower() not in valid_styles:
        logger.warning(f"Invalid style: {style}. Using default.")
        if content_type.lower() == "linkedin":
            style = "professional"
        elif content_type.lower() == "twitter":
            style = "casual"
        elif content_type.lower() == "notion":
            style = "educational"
        else:
            style = "professional"
    
    try:
        # Import functions from api_server to avoid circular imports
        from api_server import get_video_info, get_transcript, summarize_text, extract_key_points
        from api_server import generate_twitter_thread, generate_linkedin_post, generate_notion_page
        
        # Get video info
        video_info = get_video_info(video_id)
        
        # Get transcript
        transcript = get_transcript(video_id)
        
        # Generate summary
        summary_text = summarize_text(transcript, video_info["title"])
        
        # Extract key points
        key_points_obj = extract_key_points(transcript, summary_text)
        key_points = []
        for kp in key_points_obj:
            key_points.append({"timestamp": kp.timestamp, "point": kp.point})
        
        # Generate content based on type and style
        content = ""
        if content_type.lower() == "twitter":
            content = generate_twitter_thread(video_info["title"], summary_text, key_points, style)
        elif content_type.lower() == "linkedin":
            content = generate_linkedin_post(video_info["title"], summary_text, key_points, style)
        elif content_type.lower() == "notion":
            content = generate_notion_page(video_info["title"], summary_text, key_points, style)
        else:
            return JSONResponse(
                status_code=400,
                content={"error": f"Unsupported content type: {content_type}"}
            )
        
        # Return content
        return {
            "videoId": video_id,
            "contentType": content_type,
            "style": style,
            "title": video_info["title"],
            "content": content
        }
    except Exception as e:
        logger.error(f"Error generating content: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Error generating content: {str(e)}"}
        )

# Ensure chat API returns data in the format expected by frontend
@router.post("/api/chat")
def chat_with_video_frontend(request: Dict[str, Any]):
    """Chat with a YouTube video (compatible with frontend)."""
    # Support both videoId and video_id formats for better compatibility
    video_id = request.get("videoId") or request.get("video_id")
    # Support both message and query formats for better compatibility
    message = request.get("message") or request.get("query")
    user_id = request.get("user_id")
    user_role = request.get("user_role", "free")
    
    logger.info(f"Chat API called with video_id: {video_id}, message: {message}")
    
    if not video_id:
        return JSONResponse(
            status_code=400,
            content={"error": "Video ID is required"}
        )
    
    if not message:
        return JSONResponse(
            status_code=400,
            content={"error": "Message is required"}
        )
    
    try:
        # Import functions from api_server to avoid circular imports
        from api_server import get_video_info, get_transcript, generate_chat_response
        
        # Get video info
        video_info = get_video_info(video_id)
        
        # Get transcript
        transcript = get_transcript(video_id)
        if not transcript:
            return JSONResponse(
                status_code=404,
                content={"error": "Could not retrieve transcript for this video"}
            )
        
        # Generate chat response
        chat_response = generate_chat_response(transcript, message, video_info["title"])
        
        # Return response in the format expected by frontend
        return {
            "videoId": video_id,
            "message": message,
            "response": chat_response["response"],
            "answer": chat_response["response"],  # For compatibility with frontend
            "timeline_suggestions": chat_response["timeline_suggestions"]
        }
    except Exception as e:
        logger.error(f"Error generating chat response: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Error generating chat response: {str(e)}"}
        )

# Log that the compatibility module has been loaded
logger.info("Frontend compatibility module loaded")
