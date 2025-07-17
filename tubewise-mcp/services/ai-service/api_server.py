"""
TubeWise AI Service API Server

This is a simplified and robust version of the API server that implements
all the core functionality needed by the frontend.
"""

import os
import sys
import re
import json
import logging
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime

from fastapi import FastAPI, Depends, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("api_server.log")
    ]
)

logger = logging.getLogger("tubewise-api-server")

# Try to import required packages
try:
    from youtube_transcript_api import YouTubeTranscriptApi
    youtube_api_available = True
except ImportError:
    youtube_api_available = False
    logger.warning("YouTubeTranscriptApi not found. Using mock data.")

try:
    import openai
    openai_available = True
except ImportError:
    openai_available = False
    logger.warning("OpenAI module not found. Using fallback summarization.")

try:
    from dotenv import load_dotenv
    # Load environment variables
    load_dotenv()
except ImportError:
    logger.warning("python-dotenv not found. Environment variables will not be loaded from .env file.")

# Configure OpenAI API if available
if openai_available:
    openai.api_key = os.getenv("OPENAI_API_KEY", "")
    if not openai.api_key:
        logger.warning("No OpenAI API key found. Using fallback summarization methods.")
    
    # Check OpenAI version and configure client accordingly
    try:
        import pkg_resources
        openai_version = pkg_resources.get_distribution("openai").version
        logger.info(f"Using OpenAI version: {openai_version}")
        
        if openai_version.startswith("0."):
            # Using older version of OpenAI API
            logger.info("Using older OpenAI API version")
            openai_client = openai
        else:
            # Using newer version of OpenAI API (>=1.0.0)
            logger.info("Using newer OpenAI API version (>=1.0.0)")
            from openai import OpenAI
            openai_client = OpenAI(api_key=openai.api_key)
    except Exception as e:
        logger.warning(f"Error determining OpenAI version: {str(e)}. Assuming older version.")
        openai_client = openai

# Create FastAPI app
app = FastAPI(
    title="TubeWise AI Service",
    description="AI-powered YouTube video analysis and content generation API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Add health check endpoint
@app.get('/api/health')
def health_check():
    """Health check endpoint for API connectivity testing"""
    return {"status": "ok", "message": "API server is running"}

# Mount static files directory
try:
    app.mount("/static", StaticFiles(directory="static"), name="static")
    logger.info("Static files directory mounted successfully")
except Exception as e:
    logger.error(f"Error mounting static files directory: {str(e)}")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request ID middleware to add request ID to each request
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = str(uuid.uuid4())
    # Store request ID in request state
    request.state.request_id = request_id
    # Add request ID to response headers
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response

# Define data models
class VideoRequest(BaseModel):
    url: str
    user_id: Optional[int] = None

class SummarizeRequest(BaseModel):
    """Request model for summarizing a YouTube video."""
    url: str = Field(..., description="YouTube video URL to summarize")

class MultiVideoRequest(BaseModel):
    """Request model for comparing multiple videos."""
    videoUrls: List[str] = Field(..., description="List of YouTube video URLs to compare")

class ChatRequest(BaseModel):
    videoId: str = Field(..., description="YouTube video ID")
    message: str = Field(..., description="User query")
    user_id: Optional[int] = None
    user_role: Optional[str] = "free"

class ContentGenerationRequest(BaseModel):
    videoId: str = Field(..., description="YouTube video ID")
    contentType: str = Field(..., description="Type of content to generate (twitter, linkedin, notion)")
    style: str = Field("professional", description="Style of content (professional, casual, educational)")
    summary: Optional[str] = None
    title: Optional[str] = None
    keyPoints: Optional[List[Dict[str, str]]] = None
    user_id: Optional[int] = None

class KeyPoint(BaseModel):
    timestamp: str
    point: str

class TimelineSuggestion(BaseModel):
    timestamp: str
    text: str
    relevance: Optional[str] = "medium"

class ChatResponse(BaseModel):
    videoId: str
    response: str
    answer: str  # For compatibility with frontend
    timeline_suggestions: List[TimelineSuggestion]

# Utility functions
def extract_video_id(url):
    """Extract video ID from YouTube URL."""
    if not url:
        return None
    
    # Handle youtu.be URLs
    if 'youtu.be' in url:
        return url.split('/')[-1].split('?')[0]
    
    # Handle regular youtube.com URLs
    pattern = r'(?:v=|\/)([0-9A-Za-z_-]{11}).*'
    match = re.search(pattern, url)
    if match:
        return match.group(1)
    
    # If it's already just the ID
    if len(url) == 11:
        return url
    
    return None

def get_video_info(video_id):
    """Get basic info about a YouTube video."""
    try:
        # In a real implementation, you would use the YouTube API
        # For now, just return a mock response
        return {
            "title": f"YouTube Video {video_id}",
            "channel": "Sample Channel",
            "published_at": "2023-01-01"
        }
    except Exception as e:
        logger.error(f"Error getting video info: {str(e)}")
        return {
            "title": f"YouTube Video {video_id}",
            "channel": "Unknown",
            "published_at": "Unknown"
        }

def get_transcript(video_id):
    """Get transcript for a YouTube video."""
    try:
        if youtube_api_available:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            
            # Format transcript
            formatted_transcript = []
            for item in transcript_list:
                start_seconds = item['start']
                # Format time as HH:MM:SS
                hours = int(start_seconds // 3600)
                minutes = int((start_seconds % 3600) // 60)
                seconds = int(start_seconds % 60)
                
                formatted_time = f"{hours}:{minutes:02d}:{seconds:02d}"
                
                formatted_transcript.append({
                    "startTime": formatted_time,
                    "text": item['text']
                })
                
            return formatted_transcript
        else:
            # Return mock transcript for testing
            return generate_mock_transcript(video_id)
    except Exception as e:
        logger.error(f"Error getting transcript: {str(e)}")
        # Return mock transcript for testing
        return generate_mock_transcript(video_id)

def generate_mock_transcript(video_id):
    """Generate a mock transcript for testing."""
    logger.info(f"Creating mock transcript data for video: {video_id}")
    
    return [
        {"startTime": "0:00:00", "text": "Hello and welcome to this video."},
        {"startTime": "0:00:05", "text": "Today we will be discussing an important topic."},
        {"startTime": "0:00:10", "text": "This is a key point that you should remember."},
        {"startTime": "0:00:15", "text": "Another important concept to understand."},
        {"startTime": "0:00:20", "text": "Let me explain this in more detail."},
        {"startTime": "0:00:25", "text": "This is how you can apply this knowledge."},
        {"startTime": "0:00:30", "text": "Let's summarize what we've learned."},
        {"startTime": "0:00:35", "text": "Thank you for watching this video."},
        {"startTime": "0:00:40", "text": "Don't forget to like and subscribe."},
        {"startTime": "0:00:45", "text": "See you in the next video!"}
    ]

def summarize_text(transcript, title=""):
    """Generate a summary from transcript with structured sections and headlines."""
    try:
        # Join transcript text
        full_text = " ".join([item["text"] for item in transcript])
        
        if not full_text:
            return "No transcript available to summarize."
        
        if openai_available and openai.api_key:
            try:
                # Prompt for structured summary with sections
                prompt = f"""Please create a structured summary of the following video transcript. 
                Format the summary with clear section headings like 'Introduction:', 'Main Points:', 'Key Concepts:', 
                'Conclusion:', etc. Make sure each section is clearly labeled and separated.
                
                For example:
                Introduction: [brief overview of what the video is about]
                Main Points: [key arguments or points made in the video]
                Key Concepts: [important concepts or terms explained]
                Practical Applications: [how the information can be applied]
                Conclusion: [summary of the video's conclusion]
                
                Transcript: {full_text[:4000]}"""
                
                # Check if we're using the new or old OpenAI API
                if hasattr(openai_client, "ChatCompletion"):
                    # Old API (pre-1.0.0)
                    response = openai_client.ChatCompletion.create(
                        model="gpt-3.5-turbo",
                        messages=[
                            {"role": "system", "content": "You are a helpful assistant that creates structured summaries of YouTube video transcripts with clear section headings."},
                            {"role": "user", "content": prompt}
                        ],
                        max_tokens=800
                    )
                    return response.choices[0].message.content
                else:
                    # New API (>=1.0.0)
                    response = openai_client.chat.completions.create(
                        model="gpt-3.5-turbo",
                        messages=[
                            {"role": "system", "content": "You are a helpful assistant that creates structured summaries of YouTube video transcripts with clear section headings."},
                            {"role": "user", "content": prompt}
                        ],
                        max_tokens=800
                    )
                    return response.choices[0].message.content
            except Exception as e:
                logger.error(f"Error using OpenAI API: {str(e)}")
                return generate_structured_mock_summary(title)
        else:
            # Fallback to a structured mock summary
            return generate_structured_mock_summary(title)
    except Exception as e:
        logger.error(f"Error generating summary: {str(e)}")
        return generate_structured_mock_summary(title)


def generate_structured_mock_summary(title=""):
    """Generate a structured mock summary when OpenAI API is not available."""
    return """Introduction: This video provides an overview of an important topic with practical applications.

Main Points:
- The presenter explains key concepts in a clear and structured manner
- Several examples are provided to illustrate the main ideas
- Practical applications are discussed to help viewers implement the knowledge

Key Concepts:
- Core principles are broken down into digestible parts
- Technical terms are explained with everyday language
- Visual aids are used to enhance understanding

Conclusion:
- The video summarizes the key takeaways
- Viewers are encouraged to apply what they've learned
- Additional resources are suggested for further learning"""


def extract_key_points(transcript, summary):
    """Extract key points with timestamps from transcript."""
    try:
        if not transcript or len(transcript) < 3:
            return []
        
        if openai_available and openai.api_key:
            # Join transcript text
            full_text = " ".join([f"{item['startTime']}: {item['text']}" for item in transcript])
            
            try:
                # Check if we're using the new or old OpenAI API
                if hasattr(openai_client, "ChatCompletion"):
                    # Old API (pre-1.0.0)
                    response = openai_client.ChatCompletion.create(
                        model="gpt-3.5-turbo",
                        messages=[
                            {"role": "system", "content": "You are a helpful assistant that extracts key points with timestamps from video transcripts."},
                            {"role": "user", "content": f"Extract 3-5 key points with their timestamps from this transcript: {full_text[:4000]}"}
                        ],
                        max_tokens=500
                    )
                else:
                    # New API (>=1.0.0)
                    response = openai_client.chat.completions.create(
                        model="gpt-3.5-turbo",
                        messages=[
                            {"role": "system", "content": "You are a helpful assistant that extracts key points with timestamps from video transcripts."},
                            {"role": "user", "content": f"Extract 3-5 key points with their timestamps from this transcript: {full_text[:4000]}"}
                        ],
                        max_tokens=500
                    )
            except Exception as e:
                logger.error(f"Error using OpenAI API for key points extraction: {str(e)}")
                return simple_extract_key_points(transcript)
            
            # Parse the response to extract timestamps and points
            key_points_text = response.choices[0].message.content
            key_points = []
            
            # Simple regex to extract timestamps and points
            pattern = r"(\d+:\d+:\d+).*?:(.*?)(?=\n\d+:\d+:\d+|\Z)"
            matches = re.findall(pattern, key_points_text, re.DOTALL)
            
            for timestamp, point in matches:
                key_points.append(KeyPoint(timestamp=timestamp.strip(), point=point.strip()))
            
            # If we couldn't extract key points, fall back to simple method
            if not key_points:
                return simple_extract_key_points(transcript)
            
            return key_points
        else:
            # Fallback to simple method
            return simple_extract_key_points(transcript)
    except Exception as e:
        logger.error(f"Error extracting key points: {str(e)}")
        return simple_extract_key_points(transcript)

def simple_extract_key_points(transcript):
    """A simple method to extract key points from transcript."""
    # For simplicity, just select a few points from the transcript
    key_points = []
    
    if len(transcript) > 3:
        # Select points at approximately 25%, 50%, and 75% of the video
        indices = [
            int(len(transcript) * 0.25),
            int(len(transcript) * 0.5),
            int(len(transcript) * 0.75)
        ]
        
        for idx in indices:
            if idx < len(transcript):
                key_points.append(KeyPoint(
                    timestamp=transcript[idx]["startTime"],
                    point=transcript[idx]["text"]
                ))
    
    return key_points

def generate_timeline_suggestions(transcript, query):
    """Generate timeline suggestions based on transcript and user query."""
    if not transcript:
        return []
    
    # Convert transcript to list if it's not already
    transcript_list = transcript if isinstance(transcript, list) else []
    
    # Create empty list for suggestions
    suggestions = []
    
    # Process the query to find relevant keywords
    keywords = extract_keywords_from_query(query.lower())
    
    # Find segments in transcript that match keywords
    for entry in transcript_list:
        text = entry.get('text', '').lower()
        start_time = entry.get('start', 0)
        
        # Check if any keyword is in this transcript segment
        relevance_score = calculate_relevance(text, keywords)
        
        if relevance_score > 0.3:  # Only include if relevance is above threshold
            suggestions.append({
                "timestamp": format_timestamp(start_time),
                "text": entry.get('text', '')[:100],  # Limit length
                "relevance": "high" if relevance_score > 0.7 else "medium"
            })
    
    # Limit to top 5 most relevant suggestions
    suggestions.sort(key=lambda x: 1 if x["relevance"] == "high" else 0, reverse=True)
    return suggestions[:5]

def extract_keywords_from_query(query):
    """Extract keywords from user query."""
    # Remove common words
    common_words = ["the", "a", "an", "in", "on", "at", "to", "for", "with", "about", "is", "are", "was", "were"]
    
    # Persian common words
    persian_common_words = ["است", "هست", "بود", "شد", "می", "را", "های", "ها", "و", "در", "به", "از", "که", "این", "آن"]
    
    # Split query into words
    words = re.findall(r'\w+', query.lower())
    
    # Filter out common words
    keywords = [word for word in words if word not in common_words and word not in persian_common_words and len(word) > 2]
    
    return keywords

def format_timestamp(seconds):
    """Format seconds to MM:SS or HH:MM:SS format."""
    if seconds is None:
        return "00:00"
        
    # Convert to int if it's a float
    seconds = int(seconds)
    
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    seconds = seconds % 60
    
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
    else:
        return f"{minutes:02d}:{seconds:02d}"


def calculate_relevance(text, keywords):
    """Calculate relevance score between text and keywords."""
    if not keywords:
        return 0.0
    
    matches = sum(1 for keyword in keywords if keyword in text)
    return matches / len(keywords)

def generate_chat_response(transcript, query, video_title=""):
    """Generate a response to a query about the video based on actual transcript content."""
    try:
        # Join transcript text
        full_text = " ".join([item["text"] for item in transcript]) if transcript else ""
        
        if not full_text:
            return "No transcript available to answer questions about this video."
        
        # For debugging
        logger.info(f"OpenAI available: {openai_available}, API key set: {bool(openai.api_key)}")
        logger.info(f"Video title: {video_title}, Query: {query}")
        logger.info(f"Transcript length: {len(full_text)} characters")
        
        # If OpenAI is not available or no API key, analyze transcript directly
        if not openai_available or not openai.api_key:
            logger.warning("OpenAI not available or no API key set. Using direct transcript analysis.")
            
            # Extract relevant parts of the transcript based on the query keywords
            keywords = extract_keywords_from_query(query.lower())
            relevant_segments = []
            
            # Find segments in transcript that match keywords
            for item in transcript:
                text = item.get("text", "").lower()
                relevance = calculate_relevance(text, keywords)
                
                if relevance > 0.3:  # Only include if relevance is above threshold
                    relevant_segments.append(item.get("text", ""))
            
            # If we found relevant segments, use them to construct a response
            if relevant_segments:
                response = f"Based on the transcript of '{video_title}', I found the following information related to your question:\n\n"
                response += "\n".join([f"- {segment}" for segment in relevant_segments[:5]])
                return response
            else:
                # If no relevant segments found, return a general response based on transcript
                sample_text = full_text[:500] + "..." if len(full_text) > 500 else full_text
                return f"The video titled '{video_title}' contains the following content that might be relevant to your question: {sample_text}"
        
        # If OpenAI is available and API key is set, use it
        try:
            # Check if we're using the new or old OpenAI API
            if hasattr(openai_client, "ChatCompletion"):
                # Old API (pre-1.0.0)
                logger.info("Using old OpenAI API (pre-1.0.0)")
                response = openai_client.ChatCompletion.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant that answers questions about YouTube videos based on their transcripts."},
                        {"role": "user", "content": f"Video Title: {video_title}\nTranscript: {full_text[:4000]}\n\nQuestion: {query}"}
                    ],
                    max_tokens=500
                )
                answer = response.choices[0].message.content
            else:
                # New API (>=1.0.0)
                logger.info("Using new OpenAI API (>=1.0.0)")
                response = openai_client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant that answers questions about YouTube videos based on their transcripts."},
                        {"role": "user", "content": f"Video Title: {video_title}\nTranscript: {full_text[:4000]}\n\nQuestion: {query}"}
                    ],
                    max_tokens=500
                )
                logger.info(f"OpenAI API response received: {response}")
                answer = response.choices[0].message.content
            
            logger.info(f"Generated answer: {answer}")
            return answer
        except Exception as e:
            logger.error(f"Error using OpenAI API: {str(e)}")
            # Fallback to mock response if OpenAI API fails
            if "theme" in query.lower() or "about" in query.lower():
                return f"Based on the transcript, this video appears to be about {video_title}. It covers various aspects of the topic."
            else:
                return f"I analyzed the transcript of '{video_title}' and found information related to your question. The video discusses this topic in detail."
    except Exception as e:
        logger.error(f"Error in generate_chat_response: {str(e)}")
        return f"I'm sorry, I couldn't process your question '{query}' at this time. Please try again later."

@app.post("/api/chat")
async def chat_with_video(request: ChatRequest):
    """Chat with a YouTube video."""
    video_id = request.videoId
    message = request.message
    
    if not video_id:
        raise HTTPException(status_code=400, detail="Video ID is required")
    
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")
    
    # Log the received message for debugging
    logger.info(f"Received chat message: {message}")
    
    # Get video info
    video_info = get_video_info(video_id)
    
    # Get transcript
    transcript = get_transcript(video_id)
    
    # استفاده از تابع generate_chat_response برای تولید پاسخ بر اساس محتوای واقعی ویدیو
    try:
        # تلاش برای استفاده از محتوای واقعی ویدیو برای تولید پاسخ
        response = generate_chat_response(transcript, message, video_info.get('title', ''))
        logger.info(f"Generated response for video {video_id} based on actual content")
    except Exception as e:
        # در صورت بروز خطا، یک پاسخ کلی تولید می‌کنیم
        logger.error(f"Error generating response: {str(e)}")
        response = f"Based on the transcript of '{video_info.get('title', 'this video')}', I can provide information related to your question. Please be more specific about what you'd like to know about this video."
        
    # اطمینان از اینکه پاسخ خالی نیست
    if not response or len(response.strip()) == 0:
        response = f"I've analyzed the content of this video but need more context to answer your question specifically. Could you please clarify what aspect of the video you're interested in?"
    
    # Generate timeline suggestions based on the transcript
    timeline_suggestions = generate_timeline_suggestions(transcript, message)
    
    return {
        "videoId": video_id,
        "message": message,
        "response": response,
        "answer": response,  # For compatibility with frontend
        "timelineSuggestions": timeline_suggestions,  # Use camelCase for frontend compatibility
        "timeline_suggestions": timeline_suggestions  # Keep snake_case for backward compatibility
    }
    
@app.post("/api/summarize")
async def summarize_video(request: SummarizeRequest):
    """Summarize a YouTube video."""
    video_url = request.url
    
    if not video_url:
        raise HTTPException(status_code=400, detail="Video URL is required")
    
    # Extract video ID from URL
    video_id = extract_video_id(video_url)
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")
    
    # Get video info
    video_info = get_video_info(video_id)
    
    # Get transcript
    transcript = get_transcript(video_id)
    
    # Generate summary
    summary = summarize_text(transcript, video_info["title"])
    
    # Extract key points
    key_points = extract_key_points(transcript, summary)
    
    return {
        "videoId": video_id,
        "title": video_info["title"],
        "summary": summary,
        "keyPoints": key_points,
        "transcript": transcript
    }

@app.get("/api/summarize/{video_id}")
async def get_video_summary(video_id: str):
    """Get summary for a YouTube video by ID (compatible with frontend)."""
    if not video_id:
        raise HTTPException(status_code=400, detail="Video ID is required")
    
    # Get video info
    video_info = get_video_info(video_id)
    
    # Get transcript
    transcript = get_transcript(video_id)
    
    # Generate summary
    summary = summarize_text(transcript, video_info["title"])
    
    # Extract key points
    key_points = extract_key_points(transcript, summary)
    
    return {
        "videoId": video_id,
        "title": video_info["title"],
        "summary": summary,
        "keyPoints": key_points,
        "transcript": transcript
    }

def compare_videos(video_ids, videos_info=None, transcripts=None):
    """Compare multiple YouTube videos and generate a comprehensive comparison."""
    try:
        if not videos_info or not transcripts:
            videos_info = []
            transcripts = []
            for vid in video_ids:
                video_info = get_video_info(vid)
                videos_info.append({"id": vid, "title": video_info["title"]})
                transcript = get_transcript(vid)
                transcripts.append(transcript)
        
        # For simplicity, generate a basic comparison
        comparison = {
            "title": "Comparison of Videos",
            "overview": "This is a comparison of the selected videos.",
            "similarities": ["Both videos contain informative content", "Both videos have clear audio"],
            "differences": ["The videos cover different topics", "The presentation styles differ"],
            "recommendations": ["Watch both videos for a comprehensive understanding"],
            "individual_summaries": []
        }
        
        # Add individual summaries
        for i, (video_id, video_info, transcript) in enumerate(zip(video_ids, videos_info, transcripts)):
            summary = summarize_text(transcript, video_info.get("title", f"Video {i+1}"))
            comparison["individual_summaries"].append({
                "video_id": video_id,
                "title": video_info.get("title", f"Video {i+1}"),
                "summary": summary
            })
        
        return comparison
    except Exception as e:
        logger.error(f"Error comparing videos: {str(e)}")
        return {
            "title": "Comparison Error",
            "overview": "There was an error comparing the videos.",
            "error": str(e)
        }

@app.post("/api/compare")
async def compare_multiple_videos(request: MultiVideoRequest):
    """Compare multiple YouTube videos."""
    video_urls = request.videoUrls
    
    if not video_urls or len(video_urls) < 2:
        raise HTTPException(status_code=400, detail="At least two video URLs are required")
    
    # Extract video IDs from URLs
    video_ids = [extract_video_id(url) for url in video_urls]
    video_ids = [vid for vid in video_ids if vid]  # Remove empty values
    
    if len(video_ids) < 2:
        raise HTTPException(status_code=400, detail="Could not extract valid video IDs from URLs")
    
    # Get video info and transcripts
    videos_info = []
    transcripts = []
    
    for vid in video_ids:
        video_info = get_video_info(vid)
        videos_info.append({"id": vid, "title": video_info["title"]})
        
        transcript = get_transcript(vid)
        transcripts.append(transcript)
    
    # Generate comparison
    comparison_result = compare_videos(video_ids, videos_info, transcripts)
    
    return {
        "video_ids": video_ids,
        "comparison": comparison_result
    }

@app.post("/api/generate")
async def generate_content_alias(request: ContentGenerationRequest):
    """Alias for generate-content endpoint."""
    return await generate_content(request)

@app.post("/api/generate-content")
async def generate_content_endpoint(request: ContentGenerationRequest):
    """Generate content endpoint for frontend compatibility."""
    return await generate_content(request)

async def generate_content(request: ContentGenerationRequest):
    """Generate content from a video summary."""
    video_id = request.videoId
    content_type = request.contentType
    style = request.style
    user_id = request.user_id
    
    # Check if we already have summary data
    summary_text = request.summary
    title = request.title
    key_points = request.keyPoints
    
    # If not provided, fetch them
    if not summary_text or not title:
        try:
            # Get video info
            video_info = get_video_info(video_id)
            title = video_info["title"]
            
            # Get transcript
            transcript = get_transcript(video_id)
            if not transcript:
                raise HTTPException(status_code=404, detail="Could not retrieve transcript for this video")
            
            # Generate summary if not provided
            if not summary_text:
                summary_text = summarize_text(transcript, title)
            
            # Extract key points if not provided
            if not key_points:
                key_points_obj = extract_key_points(transcript, summary_text)
                key_points = []
                for kp in key_points_obj:
                    key_points.append({"timestamp": kp.timestamp, "point": kp.point})
        except Exception as e:
            logger.error(f"Error generating content: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error generating content: {str(e)}")
    
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
    
    # Generate content based on type and style
    content = ""
    try:
        if content_type.lower() == "twitter":
            content = generate_twitter_thread(title, summary_text, key_points, style)
        elif content_type.lower() == "linkedin":
            content = generate_linkedin_post(title, summary_text, key_points, style)
        elif content_type.lower() == "notion":
            content = generate_notion_page(title, summary_text, key_points, style)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported content type: {content_type}")
    except Exception as e:
        logger.error(f"Error generating {content_type} content: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating {content_type} content: {str(e)}")
    
    # Return content
    return {
        "videoId": video_id,
        "contentType": content_type,
        "style": style,
        "title": title,
        "content": content
    }

def generate_twitter_thread(title, summary, key_points, style="professional"):
    """Generate a Twitter thread from video summary.
    
    Args:
        title: The title of the video
        summary: The summary text
        key_points: List of key points with timestamps
        style: Content style (professional, casual, educational)
    """
    # Create a thread of tweets
    thread = []
    tweet_count = 1
    total_tweets = 2  # Start with intro + summary, will add key points + conclusion later
    
    if key_points:
        total_tweets += min(len(key_points), 5) + 1  # Add key points + intro tweet for key points
    total_tweets += 1  # Add conclusion tweet
    
    # First tweet with title and intro - style dependent
    if style.lower() == "professional":
        thread.append(f"🧵 Tweet {tweet_count}/{total_tweets}: Analysis of \"{title}\" - Key insights and takeaways in this thread. #ProfessionalDevelopment")
    elif style.lower() == "casual":
        thread.append(f"🧵 Tweet {tweet_count}/{total_tweets}: Just watched \"{title}\" and OMG it was amazing! Here's what I learned 👇 #VideoSummary")
    elif style.lower() == "educational":
        thread.append(f"🧵 Tweet {tweet_count}/{total_tweets}: Educational breakdown of \"{title}\" - Learn the main concepts in this thread. #LearningThread")
    else:  # Default professional
        thread.append(f"🧵 Tweet {tweet_count}/{total_tweets}: I just watched \"{title}\" and wanted to share my key takeaways in this thread! #VideoSummary")
    
    tweet_count += 1
    
    # Second tweet with summary
    if len(summary) > 240:
        # Split into multiple tweets if too long
        summary_parts = [summary[i:i+240] for i in range(0, len(summary), 240)]
        for part in summary_parts:
            thread.append(f"Tweet {tweet_count}/{total_tweets}: {part}")
            tweet_count += 1
            total_tweets += 1  # Adjust total count for split summary
    else:
        thread.append(f"Tweet {tweet_count}/{total_tweets}: {summary}")
        tweet_count += 1
    
    # Tweets with key points - style dependent
    if key_points:
        if style.lower() == "professional":
            thread.append(f"Tweet {tweet_count}/{total_tweets}: Key insights from the video:")
        elif style.lower() == "casual":
            thread.append(f"Tweet {tweet_count}/{total_tweets}: Check out these cool points from the video:")
        elif style.lower() == "educational":
            thread.append(f"Tweet {tweet_count}/{total_tweets}: Important concepts to understand:")
        else:
            thread.append(f"Tweet {tweet_count}/{total_tweets}: Key points from the video:")
            
        tweet_count += 1
        
        for i, kp in enumerate(key_points[:5]):  # Limit to 5 key points for Twitter
            point_text = kp.get("point", "") if isinstance(kp, dict) else kp.point
            timestamp = kp.get("timestamp", "") if isinstance(kp, dict) else kp.timestamp
            thread.append(f"Tweet {tweet_count}/{total_tweets}: {i+1}. {point_text} ({timestamp})")
            tweet_count += 1
    
    # Final tweet with call to action - style dependent
    if style.lower() == "professional":
        thread.append(f"Tweet {tweet_count}/{total_tweets}: What strategies from this analysis could you implement in your work? Share your thoughts. #ProfessionalGrowth")
    elif style.lower() == "casual":
        thread.append(f"Tweet {tweet_count}/{total_tweets}: That's it! Have you watched this video? What did you think? Drop a comment below! 💬 #ContentCreation")
    elif style.lower() == "educational":
        thread.append(f"Tweet {tweet_count}/{total_tweets}: What did you learn from this thread? Any questions about these concepts? Let's discuss! #ContinuousLearning")
    else:
        thread.append(f"Tweet {tweet_count}/{total_tweets}: Thanks for reading! What are your thoughts on these points? #ContentCreation")
    
    return "\n\n---\n\n".join(thread)

def generate_linkedin_post(title, summary, key_points, style="professional"):
    """Generate a LinkedIn post from video summary.
    
    Args:
        title: The title of the video
        summary: The summary text
        key_points: List of key points with timestamps
        style: Content style (professional, casual, educational)
    """
    # Create a LinkedIn post
    post = []
    
    # Introduction - style dependent
    if style.lower() == "professional":
        post.append(f"📊 **Professional Analysis: {title}**\n")
        post.append(f"I recently analyzed this insightful video and wanted to share key strategic takeaways for professionals:\n\n{summary}\n")
    elif style.lower() == "casual":
        post.append(f"📺 **Just Watched: {title}**\n")
        post.append(f"Hey connections! I just watched this awesome video and thought you might enjoy these highlights:\n\n{summary}\n")
    elif style.lower() == "educational":
        post.append(f"📚 **Learning Resource: {title}**\n")
        post.append(f"I'd like to share this educational video that explains important concepts clearly:\n\n{summary}\n")
    else:  # Default professional
        post.append(f"📺 **Video Analysis: {title}**\n")
        post.append(f"I recently watched this insightful video and wanted to share my key takeaways:\n\n{summary}\n")
    
    # Key points - style dependent
    if key_points:
        if style.lower() == "professional":
            post.append("**Strategic Insights:**\n")
        elif style.lower() == "casual":
            post.append("**Cool Points to Remember:**\n")
        elif style.lower() == "educational":
            post.append("**Key Learning Concepts:**\n")
        else:
            post.append("**Key Insights:**\n")
            
        for i, kp in enumerate(key_points[:5]):  # Limit to 5 key points
            point_text = kp.get("point", "") if isinstance(kp, dict) else kp.point
            timestamp = kp.get("timestamp", "") if isinstance(kp, dict) else kp.timestamp
            post.append(f"{i+1}. **{point_text}** (at {timestamp})")
    
    # Conclusion - style dependent
    if style.lower() == "professional":
        post.append("\n\nHow might these insights impact your business strategy? I'd appreciate your professional perspective.\n\n#BusinessStrategy #ProfessionalDevelopment #StrategicInsights")
    elif style.lower() == "casual":
        post.append("\n\nWhat do you think? Have you seen this video? Let me know in the comments!\n\n#VideoReview #JustSharing #WeekendThoughts")
    elif style.lower() == "educational":
        post.append("\n\nWhat other educational resources have you found valuable on this topic? Let's build a learning community.\n\n#ContinuousLearning #Education #KnowledgeSharing")
    else:
        post.append("\n\nWhat are your thoughts on these insights? Have you implemented any of these strategies in your work?\n\n#ProfessionalDevelopment #VideoInsights #TubeWise")
    
    return "\n".join(post)

def generate_notion_page(title, summary, key_points, style="educational"):
    """Generate a Notion page from video summary.
    
    Args:
        title: The title of the video
        summary: The summary text
        key_points: List of key points with timestamps
        style: Content style (professional, casual, educational)
    """
    # Create a structured Notion page
    page = []
    
    # Title and metadata - style dependent
    if style.lower() == "professional":
        page.append(f"# 📊 Professional Analysis: {title}\n")
        page.append(f"*Strategic analysis generated by TubeWise on {datetime.now().strftime('%Y-%m-%d')}*\n")
    elif style.lower() == "casual":
        page.append(f"# 🎬 Fun Notes: {title}\n")
        page.append(f"*Quick notes created with TubeWise on {datetime.now().strftime('%Y-%m-%d')}*\n")
    elif style.lower() == "educational":
        page.append(f"# 📚 Learning Notes: {title}\n")
        page.append(f"*Educational summary generated by TubeWise on {datetime.now().strftime('%Y-%m-%d')}*\n")
    else:  # Default
        page.append(f"# 📝 Notes: {title}\n")
        page.append(f"*Generated by TubeWise on {datetime.now().strftime('%Y-%m-%d')}*\n")
    
    # Summary section - style dependent
    if style.lower() == "professional":
        page.append("## 📈 Executive Summary\n")
    elif style.lower() == "casual":
        page.append("## 💭 What It's About\n")
    elif style.lower() == "educational":
        page.append("## 📋 Learning Summary\n")
    else:
        page.append("## 📋 Summary\n")
    
    page.append(f"{summary}\n")
    
    # Key points section - style dependent
    if key_points:
        if style.lower() == "professional":
            page.append("## 🎯 Strategic Points\n")
        elif style.lower() == "casual":
            page.append("## ✨ Cool Stuff to Remember\n")
        elif style.lower() == "educational":
            page.append("## 🧠 Key Concepts\n")
        else:
            page.append("## 🔑 Key Points\n")
            
        for i, kp in enumerate(key_points):  # Include all key points
            point_text = kp.get("point", "") if isinstance(kp, dict) else kp.point
            timestamp = kp.get("timestamp", "") if isinstance(kp, dict) else kp.timestamp
            
            if style.lower() == "professional":
                page.append(f"### Strategic Point {i+1}: {point_text}\n")
            elif style.lower() == "casual":
                page.append(f"### Cool Point {i+1}: {point_text}\n")
            elif style.lower() == "educational":
                page.append(f"### Concept {i+1}: {point_text}\n")
            else:
                page.append(f"### Point {i+1}: {point_text}\n")
                
            page.append(f"*Timestamp: {timestamp}*\n")
    
    # Action items section - style dependent
    if style.lower() == "professional":
        page.append("## 📌 Action Plan\n")
        page.append("- [ ] Analyze implications for our business\n")
        page.append("- [ ] Present key findings to stakeholders\n")
        page.append("- [ ] Develop implementation strategy\n")
        page.append("- [ ] Schedule follow-up meeting\n")
    elif style.lower() == "casual":
        page.append("## 🎯 Things to Do\n")
        page.append("- [ ] Share with friends\n")
        page.append("- [ ] Try out some of these ideas\n")
        page.append("- [ ] Check out related videos\n")
    elif style.lower() == "educational":
        page.append("## 📝 Study Plan\n")
        page.append("- [ ] Review these concepts\n")
        page.append("- [ ] Research related topics\n")
        page.append("- [ ] Apply concepts in practice\n")
        page.append("- [ ] Test understanding with exercises\n")
    else:
        page.append("## ✅ Action Items\n")
        page.append("- [ ] Review these notes again\n")
        page.append("- [ ] Share insights with team\n")
        page.append("- [ ] Implement key learnings\n")
    
    # References section
    page.append("## 📚 References\n")
    page.append(f"- Original video: [YouTube](https://www.youtube.com/watch?v={title})\n")
    page.append("- Generated using TubeWise AI\n")
    
    return "\n".join(page)

@app.post("/api/users/{user_id}/saved-videos")
async def save_video(user_id: str, video_data: dict):
    """Save a video for a user."""
    try:
        # In a real implementation, this would save to a database
        # For now, just return success
        return {
            "success": True,
            "message": "Video saved successfully",
            "user_id": user_id,
            "video_id": video_data.get("videoId")
        }
    except Exception as e:
        logger.error(f"Error saving video: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving video: {str(e)}")

@app.delete("/api/users/{user_id}/saved-videos/{video_id}")
async def remove_saved_video(user_id: str, video_id: str):
    """Remove a saved video for a user."""
    try:
        # In a real implementation, this would remove from a database
        # For now, just return success
        return {
            "success": True,
            "message": "Video removed successfully",
            "user_id": user_id,
            "video_id": video_id
        }
    except Exception as e:
        logger.error(f"Error removing video: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error removing video: {str(e)}")

# Run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
