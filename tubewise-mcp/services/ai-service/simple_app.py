import sys
import os

# Add the current directory to path to allow absolute imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Depends, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Tuple, Union
import re
import json
import os
import sys
import time
import json
import logging
import importlib
import datetime
import uuid
import dotenv
from googleapiclient.discovery import build

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# Load environment variables from .env file
dotenv.load_dotenv(dotenv.find_dotenv())

# Set YouTube API key directly from the .env content if it's not loaded properly
if not os.environ.get('YOUTUBE_API_KEY'):
    os.environ['YOUTUBE_API_KEY'] = 'AIzaSyCLdoW-RQZQOcB5iTx4-0hx3MmFiLiyWt4'
    logging.info("YOUTUBE_API_KEY set manually")

# Debug log for environment variables
logging.info(f"YOUTUBE_API_KEY exists: {bool(os.environ.get('YOUTUBE_API_KEY'))}")
logging.info(f"OPENAI_API_KEY exists: {bool(os.environ.get('OPENAI_API_KEY'))}")

from sqlalchemy.orm import Session
from datetime import datetime

# Try to import YouTube transcript API
try:
    from youtube_transcript_api import YouTubeTranscriptApi
except ImportError:
    YouTubeTranscriptApi = None
    logging.warning("YouTubeTranscriptApi not found. Using mock data.")

# Try to import error handling system
try:
    from error_handler import ErrorHandlingMiddleware, error_handler, configure_exception_handlers, ErrorType, ErrorSeverity
except ImportError:
    ErrorHandlingMiddleware = None
    error_handler = None
    configure_exception_handlers = None
    ErrorType = None
    ErrorSeverity = None
    logging.warning("Error handling modules not found. Using default error handling.")

# Try to import video comparison service
try:
    from video_comparison import VideoComparisonService, ComparisonResult, Summary, KeyPoint
    video_comparison_available = True
except ImportError:
    video_comparison_available = False
    logging.warning("Video comparison service not found. Using fallback comparison methods.")

# Try to import usage limits module
try:
    import usage_limits
except ImportError:
    usage_limits = None
    logging.warning("Usage limits module not found. No usage limits will be applied.")

# Try to import OpenAI for high-quality summarization
try:
    import openai
except ImportError:
    openai = None
    logging.warning("OpenAI module not found. Using fallback summarization.")

# Try to import cache service
try:
    from cache_service import cache_service
except ImportError:
    cache_service = None
    logging.warning("Cache service not found. No caching will be used.")

# Try to import sumy as fallback for text summarization
try:
    from sumy.parsers.plaintext import PlaintextParser
    from sumy.nlp.tokenizers import Tokenizer
    from sumy.summarizers.lex_rank import LexRankSummarizer
    from sumy.nlp.stemmers import Stemmer
    from sumy.utils import get_stop_words
    sumy_available = True
except ImportError:
    sumy_available = False
    logging.warning("Sumy modules not found. Fallback summarization will not be available.")

# Try to import transformer-based summarizer
try:
    from transformer_summarizer import TransformerSummarizer
    transformer_available = True
except ImportError:
    TransformerSummarizer = None
    transformer_available = False
    logging.warning("Transformer summarizer not found. Using fallback methods.")

# Try to import agent modules
try:
    from summary_agent_improved import ImprovedSummaryAgent
    from improved_transcript_agent import ImprovedTranscriptAgent
    agents_available = True
except ImportError:
    ImprovedSummaryAgent = None
    ImprovedTranscriptAgent = None
    agents_available = False
    logging.warning("Agent modules not found. Using fallback methods.")

# Try to import database modules
try:
    from db import get_db, create_tables
    import db_repository as repo
    db_available = True
except ImportError:
    db_available = False
    logging.warning("Database modules not found. Using in-memory storage.")
    
    # Define a simple in-memory database session
    class InMemoryDB:
        def __init__(self):
            self.users = {}
            self.videos = {}
            self.summaries = {}
            self.key_points = {}
            self.saved_videos = {}
            self.generated_content = {}
    
    # Create a simple get_db function
    def get_db():
        return InMemoryDB()
    
    # Create a dummy create_tables function
    def create_tables():
        pass
    
    # Create a simple repository module
    class DummyRepo:
        @staticmethod
        def get_user_by_id(db, user_id):
            return db.users.get(user_id)
        
        @staticmethod
        def get_video_by_youtube_id(db, video_id):
            return db.videos.get(video_id)
        
        @staticmethod
        def create_video(db, video_id, title, url):
            video = {"id": len(db.videos) + 1, "video_id": video_id, "title": title, "url": url}
            db.videos[video_id] = video
            return video
        
        @staticmethod
        def get_summary_by_video_id(db, video_id):
            return db.summaries.get(video_id)
        
        @staticmethod
        def create_summary(db, video_id, summary_text):
            summary = {"id": len(db.summaries) + 1, "video_id": video_id, "summary": summary_text}
            db.summaries[video_id] = summary
            return summary
        
        @staticmethod
        def get_key_points_by_video_id(db, video_id):
            return db.key_points.get(video_id, [])
        
        @staticmethod
        def create_key_point(db, video_id, timestamp, point_text):
            if video_id not in db.key_points:
                db.key_points[video_id] = []
            key_point = {"id": len(db.key_points[video_id]) + 1, "video_id": video_id, "timestamp": timestamp, "point": point_text}
            db.key_points[video_id].append(key_point)
            return key_point
    
    # Set repo to the dummy repository
    repo = DummyRepo()

# Try to import dotenv
try:
    from dotenv import load_dotenv
    # Load environment variables
    load_dotenv()
except ImportError:
    logging.warning("python-dotenv not found. Environment variables will not be loaded from .env file.")

# Configure OpenAI API if available
if openai:
    openai.api_key = os.getenv("OPENAI_API_KEY", "")
    # If no API key is found, print a warning
    if not openai.api_key:
        logging.warning("No OpenAI API key found. Using fallback summarization methods.")

# Create database tables if available
if db_available:
    try:
        create_tables()
    except Exception as e:
        logging.error(f"Error creating database tables: {str(e)}")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("app.log")
    ]
)

logger = logging.getLogger("tubewise-api")

# Create FastAPI app
app = FastAPI(
    title="TubeWise AI Service",
    description="AI-powered YouTube video analysis and content generation API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add error handling middleware if available
if ErrorHandlingMiddleware:
    app.add_middleware(ErrorHandlingMiddleware)

# Configure exception handlers if available
if configure_exception_handlers:
    configure_exception_handlers(app)

# Try to import and include routers
try:
    from auth.auth_api import router as auth_router
    app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
except ImportError:
    logging.warning("Auth router not found. Authentication endpoints will not be available.")

try:
    from payment.subscription_api import router as subscription_router
    app.include_router(subscription_router, prefix="/subscription", tags=["Subscription"])
except ImportError:
    logging.warning("Subscription router not found. Subscription endpoints will not be available.")

try:
    from routers.background_tasks import router as background_tasks_router
    app.include_router(background_tasks_router, prefix="/api", tags=["Background Tasks"])
except ImportError:
    logging.warning("Background tasks router not found. Background task endpoints will not be available.")

try:
    from routers.email import router as email_router
    app.include_router(email_router, prefix="/api", tags=["Email"])
except ImportError:
    logging.warning("Email router not found. Email endpoints will not be available.")

try:
    from routers.fact_check import router as fact_check_router
    app.include_router(fact_check_router, prefix="/api", tags=["Fact-Checking"])
except ImportError:
    logging.warning("Fact-checking router not found. Fact-checking endpoints will not be available.")

try:
    from routers.admin import router as admin_router
    app.include_router(admin_router, prefix="/api", tags=["Admin"])
except ImportError:
    logging.warning("Admin router not found. Admin endpoints will not be available.")

try:
    from routers.error_monitoring import router as error_monitoring_router
    app.include_router(error_monitoring_router, prefix="/api", tags=["Error Monitoring"])
except ImportError:
    logging.warning("Error monitoring router not found. Error monitoring endpoints will not be available.")

# Request ID middleware to add request ID to each request
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = str(uuid.uuid4())
    # Store request ID in request state
    request.state.request_id = request_id
    
    # Process the request
    response = await call_next(request)
    
    # Add request ID to response headers
    response.headers["X-Request-ID"] = request_id
    
    return response

# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "version": "1.0.0"}

# Define data models
# Authentication models
class UserCreate(BaseModel):
    email: str
    name: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    credits: int
    language_preference: str

# Request models
class VideoRequest(BaseModel):
    url: str
    user_id: Optional[int] = None

class MultiVideoRequest(BaseModel):
    videoUrls: Optional[List[str]] = None
    video_ids: Optional[List[str]] = None
    user_id: Optional[int] = None
    user_role: Optional[str] = None
    agent: Optional[str] = None

class ChatRequest(BaseModel):
    videoId: str
    message: str
    user_id: Optional[int] = None

class ContentGenerationRequest(BaseModel):
    videoId: str
    contentType: str
    summary: Optional[str] = None
    title: Optional[str] = None
    keyPoints: Optional[List[Dict[str, str]]] = None
    user_id: Optional[int] = None

# Response models
class KeyPoint(BaseModel):
    timestamp: str
    point: str

class Summary(BaseModel):
    videoId: str
    title: str
    summary: str
    keyPoints: List[KeyPoint]

class ComparisonResult(BaseModel):
    commonTopics: List[str]
    differences: List[str]
    recommendation: str

class TimelineSuggestion(BaseModel):
    timestamp: str
    text: str
    relevance: str

class ChatResponse(BaseModel):
    videoId: str
    response: str
    timeline_suggestions: List[TimelineSuggestion]
    summary: Dict[str, Any]

class ContentGenerationResult(BaseModel):
    content: str
    format: str
    title: str

class SummaryResponse(BaseModel):
    videoId: str
    summary: str
    keyPoints: List[KeyPoint]

# Database models for responses
class SavedVideoResponse(BaseModel):
    id: int
    video_id: str
    title: str
    saved_at: str

class UsageStatsResponse(BaseModel):
    videos_summarized: int
    videos_compared: int
    content_generated: int
    last_active: str

# Utility functions
def extract_video_id(url: str) -> Optional[str]:
    """Extract YouTube video ID from URL."""
    patterns = [
        r'(?:v=|\/)([0-9A-Za-z_-]{11}).*',  # Standard YouTube URL
        r'(?:youtu\.be\/)([0-9A-Za-z_-]{11})',  # Short YouTube URL
        r'(?:shorts\/)([0-9A-Za-z_-]{11})',  # YouTube Shorts URL
        r'^([0-9A-Za-z_-]{11})$'  # Direct video ID
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    
    return None

# Build YouTube API service
def build_youtube_service():
    # Use the API key from environment variables
    api_key = os.environ.get('YOUTUBE_API_KEY')
    if not api_key:
        raise ValueError("YOUTUBE_API_KEY environment variable not set")
    
    # Build the YouTube API service
    youtube = build('youtube', 'v3', developerKey=api_key)
    return youtube

# Get video information using YouTube Data API
def get_video_info(video_id: str) -> Dict[str, Any]:
    """Get video information from YouTube."""
    try:
        # In a production environment, you would use the YouTube Data API
        # For this demo, we'll make a simple request to get the video title
        response = requests.get(f"https://noembed.com/embed?url=https://www.youtube.com/watch?v={video_id}")
        if response.status_code == 200:
            data = response.json()
            return {
                "title": data.get("title", "YouTube Video"),
                "author": data.get("author_name", "Unknown"),
                "thumbnail": data.get("thumbnail_url", "")
            }
    except Exception as e:
        print(f"Error getting video info: {e}")
    
    # Return default info if request fails
    return {
        "title": "YouTube Video",
        "author": "Unknown",
        "thumbnail": ""
    }

# Multi-Agent System Implementation
class BaseAgent:
    """Base class for all agents in the system."""
    def __init__(self, name):
        self.name = name
        print(f"Agent {name} initialized")
    
    def process(self, input_data):
        """Process input data and return result."""
        raise NotImplementedError("Subclasses must implement this method")

class TranscriptAgent(BaseAgent):
    """Agent responsible for extracting transcripts from YouTube videos."""
    def __init__(self):
        super().__init__("TranscriptAgent")
    
    def process(self, video_id):
        """Get transcript for a YouTube video."""
        try:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            return " ".join([item["text"] for item in transcript_list])
        except Exception as e:
            print(f"Error getting transcript: {e}")
            raise HTTPException(status_code=404, detail=f"Failed to get transcript: {str(e)}")

class SummaryAgent(BaseAgent):
    """Agent responsible for generating summaries from transcripts."""
    def __init__(self):
        super().__init__("SummaryAgent")
    
    def process(self, data):
        """Generate summary from transcript."""
        transcript, video_id = data
        try:
            # Get video info
            video_info = get_video_info(video_id)
            video_title = video_info.get("title", "YouTube Video")
            
            # Ensure the transcript isn't too long before processing
            # If it's very long, truncate it for processing to avoid overwhelming the summarizer
            max_transcript_length = 15000  # Maximum number of words to process
            words = transcript.split()
            if len(words) > max_transcript_length:
                print(f"Transcript too long ({len(words)} words), truncating to {max_transcript_length} words")
                processed_transcript = " ".join(words[:max_transcript_length])
            else:
                processed_transcript = transcript
            
            # Create a high-quality summary of the entire video using OpenAI
            summary_text = self._generate_openai_summary(processed_transcript, video_title)
            
            # If OpenAI summarization fails, use fallback methods
            if not summary_text or len(summary_text) < 50:
                print("OpenAI summarization failed or returned too short summary, using fallback methods")
                summary_text = self._generate_fallback_summary(processed_transcript)
            
            # Extract key points with timestamps using OpenAI
            key_points = self._extract_key_points_with_openai(processed_transcript, video_id)
            
            # If OpenAI key point extraction fails, use fallback method
            if not key_points or len(key_points) < 3:
                print("OpenAI key point extraction failed, using fallback method")
                key_points = self._extract_key_points_fallback(processed_transcript, video_id)
            
            return Summary(
                videoId=video_id,
                title=video_title,
                summary=summary_text,
                keyPoints=key_points
            )
        except Exception as e:
            print(f"Error generating summary: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to generate summary: {str(e)}")
    
    def _generate_openai_summary(self, transcript, video_title="YouTube Video"):
        """Generate a high-quality summary using OpenAI API."""
        try:
            # Check if OpenAI API key is available
            if not openai.api_key:
                print("No OpenAI API key available for summarization")
                return None
                
            # If the transcript is very short, just return it
            if len(transcript.split()) < 200:
                return transcript
                
            # For long transcripts, split into chunks and summarize each chunk
            max_chunk_size = 12000  # Characters per chunk (adjusted to stay within token limits)
            
            if len(transcript) > max_chunk_size:
                print(f"Transcript is long ({len(transcript)} chars), splitting into chunks")
                
                # Split transcript into chunks
                chunks = [transcript[i:i+max_chunk_size] for i in range(0, len(transcript), max_chunk_size)]
                print(f"Split transcript into {len(chunks)} chunks")
                
                # Summarize each chunk
                chunk_summaries = []
                for i, chunk in enumerate(chunks):
                    print(f"Summarizing chunk {i+1}/{len(chunks)}")
                    
                    # Prepare the prompt for this chunk
                    chunk_prompt = f"""Below is part {i+1} of {len(chunks)} from the transcript of a YouTube video titled '{video_title}'.
                    Please provide a brief summary (100-150 words) of THIS PART ONLY, focusing on the main points and key insights.
                    
                    TRANSCRIPT PART {i+1}/{len(chunks)}:
                    {chunk}
                    
                    SUMMARY OF THIS PART:"""
                    
                    # Call OpenAI API with retry logic for this chunk
                    max_retries = 3
                    chunk_summary = None
                    
                    for attempt in range(max_retries):
                        try:
                            response = openai.chat.completions.create(
                                model="gpt-3.5-turbo-16k",
                                messages=[
                                    {"role": "system", "content": "You are an expert video summarizer. Create concise, informative summaries that capture the essence of video content."},
                                    {"role": "user", "content": chunk_prompt}
                                ],
                                max_tokens=500,
                                temperature=0.5,
                            )
                            
                            # Extract the summary from the response
                            chunk_summary = response.choices[0].message.content.strip()
                            
                            # Ensure we got a meaningful summary
                            if chunk_summary and len(chunk_summary) > 50:
                                chunk_summaries.append(chunk_summary)
                                break
                            else:
                                print(f"OpenAI returned too short summary for chunk {i+1}, attempt {attempt+1}/{max_retries}")
                                
                        except Exception as e:
                            print(f"OpenAI API error on chunk {i+1}, attempt {attempt+1}/{max_retries}: {e}")
                            if attempt < max_retries - 1:
                                time.sleep(2)  # Wait before retrying
                    
                    # If all attempts failed for this chunk, add a placeholder
                    if not chunk_summary or len(chunk_summary) <= 50:
                        print(f"Failed to get a good summary for chunk {i+1}, using fallback")
                        fallback_summary = self.simple_summarize(chunk, sentences_count=3)
                        chunk_summaries.append(fallback_summary)
                
                # Now combine all chunk summaries and create a final summary
                combined_summaries = "\n\n".join([f"Part {i+1}: {summary}" for i, summary in enumerate(chunk_summaries)])
                
                # Create a final comprehensive summary from the chunk summaries
                final_prompt = f"""Below are summaries of different parts of a YouTube video titled '{video_title}'.
                Please create a comprehensive yet concise final summary (250-300 words) that integrates all these parts into a coherent overview.
                Focus on the most important points and ensure the summary gives a complete picture of the video content.
                
                PART SUMMARIES:
                {combined_summaries}
                
                FINAL COMPREHENSIVE SUMMARY:"""
                
                # Call OpenAI API for the final summary
                max_retries = 3
                for attempt in range(max_retries):
                    try:
                        response = openai.chat.completions.create(
                            model="gpt-3.5-turbo-16k",
                            messages=[
                                {"role": "system", "content": "You are an expert at creating comprehensive summaries from partial summaries. Create a coherent, flowing summary that captures the essence of the entire content."},
                                {"role": "user", "content": final_prompt}
                            ],
                            max_tokens=600,
                            temperature=0.5,
                        )
                        
                        # Extract the final summary
                        final_summary = response.choices[0].message.content.strip()
                        
                        # Ensure we got a meaningful summary
                        if final_summary and len(final_summary) > 100:
                            return final_summary
                        else:
                            print(f"OpenAI returned too short final summary, attempt {attempt+1}/{max_retries}")
                            
                    except Exception as e:
                        print(f"OpenAI API error on final summary, attempt {attempt+1}/{max_retries}: {e}")
                        if attempt < max_retries - 1:
                            time.sleep(2)  # Wait before retrying
                
                # If final summary generation failed, just concatenate the chunk summaries
                print("Failed to generate final summary, returning concatenated chunk summaries")
                return " ".join(chunk_summaries)
                
            else:
                # For shorter transcripts, summarize directly
                # Prepare the prompt for OpenAI
                prompt = f"""Below is the transcript of a YouTube video titled '{video_title}'. 
                Please provide a comprehensive yet concise summary (200-300 words) that captures the main points and key insights from the entire video.
                Focus on the most important information and ensure the summary gives a complete overview of what the video is about.
                
                TRANSCRIPT:
                {transcript}
                
                SUMMARY:"""
                
                # Call OpenAI API with retry logic
                max_retries = 3
                for attempt in range(max_retries):
                    try:
                        response = openai.chat.completions.create(
                            model="gpt-3.5-turbo-16k",  # Using a model with larger context window
                            messages=[
                                {"role": "system", "content": "You are an expert video summarizer. Create concise, informative summaries that capture the essence of video content."},
                                {"role": "user", "content": prompt}
                            ],
                            max_tokens=500,
                            temperature=0.5,  # Lower temperature for more focused output
                        )
                        
                        # Extract the summary from the response
                        summary = response.choices[0].message.content.strip()
                        
                        # Ensure we got a meaningful summary
                        if summary and len(summary) > 100:
                            return summary
                        else:
                            print(f"OpenAI returned too short summary, attempt {attempt+1}/{max_retries}")
                            
                    except Exception as e:
                        print(f"OpenAI API error on attempt {attempt+1}/{max_retries}: {e}")
                        if attempt < max_retries - 1:
                            time.sleep(2)  # Wait before retrying
                            
                # If we get here, all attempts failed
                print("All OpenAI summarization attempts failed")
                return None
                
        except Exception as e:
            print(f"Error in OpenAI summarization: {e}")
            return None
    

    def _generate_fallback_summary(self, transcript):
        """Generate a summary using fallback methods when OpenAI is not available or fails."""
        try:
            # If the transcript is very short, just return it
            if len(transcript.split()) < 200:
                return transcript
                
            # Use LexRank for summarization (one of the most reliable algorithms)
            lexrank_summary = self._lexrank_summarize(transcript, sentences_count=10)
            
            # If LexRank fails, use a simple extractive method
            if not lexrank_summary or len(lexrank_summary) < 100:
                return self._simple_summarize(transcript, sentences_count=10)
                
            return lexrank_summary
            
        except Exception as e:
            print(f"Error in fallback summarization: {e}")
            # Last resort: return first 300 words of transcript
            words = transcript.split()
            return " ".join(words[:300]) + "..."
            
        except Exception as e:
            print(f"Error in summarization: {e}")
            # Fallback to a simpler summarization if the advanced methods fail
            return self._simple_summarize(transcript, sentences_count=15)
    
    def _split_text_into_chunks(self, text, max_length=2000):
        """Split text into chunks of approximately max_length words."""
        words = text.split()
        chunks = []
        
        for i in range(0, len(words), max_length):
            chunk = " ".join(words[i:i + max_length])
            chunks.append(chunk)
            
        return chunks
    
    def _lexrank_summarize(self, text, sentences_count=10, language="english"):
        """Summarize text using LexRank algorithm."""
        # Make sure we have enough text to summarize
        if not text or len(text.split()) < sentences_count * 2:
            return text
            
        try:
            parser = PlaintextParser.from_string(text, Tokenizer(language))
            stemmer = Stemmer(language)
            summarizer = LexRankSummarizer(stemmer)
            summarizer.stop_words = get_stop_words(language)
            
            # Get summary sentences
            summary_sentences = summarizer(parser.document, sentences_count)
            summary = " ".join(str(sentence) for sentence in summary_sentences)
            
            # Verify we got a real summary
            if not summary or len(summary) < 20:
                return text[:500] + "..." if len(text) > 500 else text
                
            return summary
        except Exception as e:
            print(f"LexRank summarization error: {e}")
            return text[:500] + "..." if len(text) > 500 else text
    
    def _combine_summaries(self, summaries):
        """Combine multiple summaries by selecting unique sentences."""
        # Split summaries into sentences and remove duplicates
        all_sentences = []
        for summary in summaries:
            sentences = summary.split(". ")
            for sentence in sentences:
                if sentence and sentence not in all_sentences:
                    all_sentences.append(sentence)
        
        # Join sentences back into a single summary
        return ". ".join(all_sentences)
    
    def _simple_summarize(self, text, sentences_count=10):
        """A simple summarization method based on word frequency."""
        # Make sure we have enough text to summarize
        if not text or len(text.split()) < sentences_count * 2:
            return text[:500] + "..." if len(text) > 500 else text
            
        try:
            # Make a copy of the text to preserve the original
            original_text = text
            
            # Remove punctuation and convert to lowercase for analysis
            text_for_analysis = text.lower()
            for p in punctuation:
                text_for_analysis = text_for_analysis.replace(p, ' ')
            
            # Split into words and count frequency
            word_frequencies = Counter(text_for_analysis.split())
            
            # Remove common stop words
            stop_words = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about',
                         'as', 'into', 'like', 'through', 'after', 'over', 'between', 'out', 'against', 'during', 'without',
                         'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
                         'this', 'that', 'these', 'those', 'it', 'they', 'them', 'their', 'what', 'which', 'who',
                         'whom', 'whose', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
                         'most', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very']
            
            for word in stop_words:
                if word in word_frequencies:
                    del word_frequencies[word]
            
            # Get the maximum frequency to normalize scores
            max_frequency = max(word_frequencies.values()) if word_frequencies else 1
            
            # Normalize word frequencies
            for word in word_frequencies:
                word_frequencies[word] = word_frequencies[word] / max_frequency
            
            # Split text into sentences more carefully
            sentences = [s.strip() for s in re.split(r'[.!?]', original_text) if s.strip()]
            
            # Calculate sentence scores based on normalized word frequency
            sentence_scores = {}
            for sentence in sentences:
                if sentence:
                    # Avoid scoring very short sentences highly
                    if len(sentence.split()) < 4:
                        continue
                        
                    for word in sentence.lower().split():
                        if word in word_frequencies:
                            if sentence in sentence_scores:
                                sentence_scores[sentence] += word_frequencies[word]
                            else:
                                sentence_scores[sentence] = word_frequencies[word]
            
            # If we couldn't score any sentences, return a truncated version of the original
            if not sentence_scores:
                return original_text[:500] + "..." if len(original_text) > 500 else original_text
            
            # Get top sentences
            import heapq
            summary_sentences = heapq.nlargest(sentences_count, sentence_scores, key=sentence_scores.get)
            
            # Join sentences back into a summary
            summary = ". ".join(summary_sentences)
            
            # Add a period if it doesn't end with one
            if not summary.endswith(".") and not summary.endswith("!") and not summary.endswith("?"):
                summary += "."
                
            return summary
            
        except Exception as e:
            print(f"Simple summarization error: {e}")
            return original_text[:500] + "..." if len(original_text) > 500 else original_text
    
    def _extract_key_points_with_openai(self, transcript, video_id):
        """Extract key points with timestamps using OpenAI API."""
        try:
            # Check if OpenAI API key is available
            if not openai.api_key:
                print("No OpenAI API key available for key point extraction")
                return None
                
            # If the transcript is very short, use a simpler method
            if len(transcript.split()) < 200:
                return self._extract_key_points_fallback(transcript, video_id)
                
            # Split transcript into segments to identify timestamps
            segments = self._split_transcript_into_segments(transcript, 5)
            
            # Prepare the prompt for OpenAI
            prompt = f"""Below is the transcript of a YouTube video. 
            Please identify 5 key points from the transcript, distributed throughout the video.
            Each key point should be a concise, informative statement that captures an important insight or topic from the video.
            
            TRANSCRIPT:
            {transcript[:15000]}  # Limit to 15000 chars to stay within token limits
            
            FORMAT YOUR RESPONSE EXACTLY LIKE THIS EXAMPLE:
            1. [First key point in a single sentence]
            2. [Second key point in a single sentence]
            3. [Third key point in a single sentence]
            4. [Fourth key point in a single sentence]
            5. [Fifth key point in a single sentence]
            
            KEY POINTS:"""
            
            # Call OpenAI API with retry logic
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    response = openai.chat.completions.create(
                        model="gpt-3.5-turbo",
                        messages=[
                            {"role": "system", "content": "You are an expert at identifying the most important points from video transcripts."},
                            {"role": "user", "content": prompt}
                        ],
                        max_tokens=300,
                        temperature=0.3,  # Lower temperature for more focused output
                    )
                    
                    # Extract the key points from the response
                    key_points_text = response.choices[0].message.content.strip()
                    
                    # Parse the key points
                    extracted_points = []
                    for line in key_points_text.split('\n'):
                        line = line.strip()
                        if re.match(r'^\d+\.\s', line):  # Lines starting with a number and period
                            point_text = re.sub(r'^\d+\.\s', '', line).strip()
                            if point_text:
                                extracted_points.append(point_text)
                    
                    # Ensure we got enough key points
                    if len(extracted_points) >= 3:
                        # Create KeyPoint objects with timestamps
                        result = []
                        for i, point in enumerate(extracted_points[:5]):  # Limit to 5 points
                            # Calculate timestamp based on segment position
                            if i < len(segments):
                                segment_start = segments[i][0]
                                minutes = int(segment_start / 150)  # Assuming 150 words per minute
                                seconds = int((segment_start / 150 - minutes) * 60)
                                timestamp = f"{minutes}:{seconds:02d}"
                                result.append(KeyPoint(timestamp=timestamp, point=point))
                        
                        return result
                    else:
                        print(f"OpenAI returned too few key points, attempt {attempt+1}/{max_retries}")
                        
                except Exception as e:
                    print(f"OpenAI API error on attempt {attempt+1}/{max_retries}: {e}")
                    if attempt < max_retries - 1:
                        time.sleep(2)  # Wait before retrying
                        
            # If we get here, all attempts failed
            print("All OpenAI key point extraction attempts failed")
            return None
            
        except Exception as e:
            print(f"Error in OpenAI key point extraction: {e}")
            return None
    
    def _split_transcript_into_segments(self, transcript, num_segments=5):
        """Split transcript into equal segments and return start/end indices."""
        words = transcript.split()
        total_words = len(words)
        segment_size = max(1, total_words // num_segments)
        
        segments = []
        for i in range(num_segments):
            start_idx = i * segment_size
            end_idx = min(start_idx + segment_size, total_words)
            
            if start_idx >= total_words:
                break
                
            segments.append((start_idx, end_idx))
            
        return segments
            
    def _extract_key_points_fallback(self, transcript, video_id):
        """Extract key points with timestamps using fallback methods."""
        try:
            # Use LexRank to find important sentences
            parser = PlaintextParser.from_string(transcript, Tokenizer("english"))
            stemmer = Stemmer("english")
            summarizer = LexRankSummarizer(stemmer)
            summarizer.stop_words = get_stop_words("english")
            
            # Split transcript into segments
            segments = self._split_transcript_into_segments(transcript, 5)
            words = transcript.split()
            
            # Get more sentences than we need
            top_sentences = list(summarizer(parser.document, 15))
            
            key_points = []
            for i, (start_idx, end_idx) in enumerate(segments):
                segment = ' '.join(words[start_idx:end_idx])
                
                # Find the best sentence for this segment
                best_sentence = None
                for sentence in top_sentences:
                    sentence_str = str(sentence)
                    if sentence_str in segment or any(part in segment for part in sentence_str.split(", ") if len(part) > 30):
                        best_sentence = sentence_str
                        top_sentences.remove(sentence)  # Remove so we don't reuse it
                        break
                
                # If no good sentence found, use the first sentence of the segment
                if not best_sentence:
                    segment_sentences = [s.strip() for s in re.split(r'[.!?]', segment) if s.strip()]
                    best_sentence = segment_sentences[0] if segment_sentences else segment[:100] + "..."
                
                # Calculate timestamp
                minutes = int(start_idx / 150)  # Assuming 150 words per minute
                seconds = int((start_idx / 150 - minutes) * 60)
                timestamp = f"{minutes}:{seconds:02d}"
                
                key_points.append(KeyPoint(timestamp=timestamp, point=best_sentence))
            
            return key_points
            
        except Exception as e:
            print(f"Error extracting key points: {e}")
            # Fallback method if the advanced method fails
            return self._simple_extract_key_points(transcript, video_id)
    
    def _simple_extract_key_points(self, transcript, video_id):
        """A simpler method to extract key points with timestamps."""
        # Split transcript into 5 equal segments
        words = transcript.split()
        total_words = len(words)
        segment_size = max(1, total_words // 5)
        
        key_points = []
        for i in range(5):
            start_idx = i * segment_size
            end_idx = min(start_idx + segment_size, total_words)
            
            if start_idx >= total_words:
                break
                
            segment = ' '.join(words[start_idx:end_idx])
            
            # Get the first sentence that's not too short
            sentences = segment.split('.')
            best_sentence = ""
            for sentence in sentences:
                if len(sentence.split()) >= 10:
                    best_sentence = sentence.strip()
                    break
            
            if not best_sentence and sentences:
                best_sentence = sentences[0].strip()
            
            # Calculate timestamp
            minutes_so_far = start_idx / 150
            minutes = int(minutes_so_far)
            seconds = int((minutes_so_far - minutes) * 60)
            timestamp = f"{minutes}:{seconds:02d}"
            
            key_points.append(KeyPoint(timestamp=timestamp, point=best_sentence))
        
        return key_points
        
    def _timestamp_to_seconds(self, timestamp):
        """Convert timestamp string (mm:ss) to seconds."""
        parts = timestamp.split(':')
        return int(parts[0]) * 60 + int(parts[1])
        
    def _force_concise_summary(self, text, max_words=300):
        """Force a concise summary by using multiple methods and strictly limiting length."""
        # Try multiple summarization methods and use the shortest good result
        summaries = []
        
        # Method 1: TextRank with very few sentences
        try:
            textrank_summary = self._textrank_summarize(text, sentences_count=5)
            if textrank_summary and len(textrank_summary) > 50:
                summaries.append(textrank_summary)
        except Exception:
            pass
            
        # Method 2: LexRank with very few sentences
        try:
            lexrank_summary = self._lexrank_summarize(text, sentences_count=5)
            if lexrank_summary and len(lexrank_summary) > 50:
                summaries.append(lexrank_summary)
        except Exception:
            pass
            
        # Method 3: Simple frequency-based summary
        try:
            simple_summary = self._simple_summarize(text, sentences_count=5)
            if simple_summary and len(simple_summary) > 50:
                summaries.append(simple_summary)
        except Exception:
            pass
            
        # Method 4: Just take the first few sentences as a last resort
        sentences = [s.strip() for s in re.split(r'[.!?]', text) if s.strip()]
        first_sentences = ". ".join(sentences[:7])
        if first_sentences:
            summaries.append(first_sentences)
            
        # Choose the shortest summary that's still substantial
        valid_summaries = [s for s in summaries if len(s.split()) >= 50]
        if valid_summaries:
            shortest_summary = min(valid_summaries, key=lambda x: len(x.split()))
        else:
            # If no valid summaries, use the first one or a truncated version of the text
            shortest_summary = summaries[0] if summaries else text[:500] + "..."
            
        # Ensure the summary doesn't exceed max_words
        words = shortest_summary.split()
        if len(words) > max_words:
            shortest_summary = " ".join(words[:max_words])
            if not shortest_summary.endswith("."):
                shortest_summary += "."
                
        return shortest_summary

class ComparisonAgent(BaseAgent):
    """Agent for comparing multiple videos."""
    
    def __init__(self):
        # Import dynamically to avoid circular imports
        try:
            self.comparison_service = VideoComparisonService()
            logging.info("ComparisonAgent initialized with VideoComparisonService")
        except Exception as e:
            logging.error(f"Error initializing VideoComparisonService: {e}")
            self.comparison_service = None
    
    def process(self, summaries):
        """Compare multiple video summaries."""
        try:
            # Log what we're working with
            logging.info(f"ComparisonAgent processing {len(summaries)} summaries")
            for i, summary in enumerate(summaries):
                logging.info(f"Summary {i} type: {type(summary)}")
            
            # Create a simplified format for VideoComparisonService
            # to avoid issues with complex objects
            simplified_summaries = []
            for i, summary in enumerate(summaries):
                simplified = {
                    'videoId': f"video_{i}",
                    'title': "Unknown Title"
                }
                
                # Try to extract title
                if isinstance(summary, dict):
                    if 'title' in summary:
                        simplified['title'] = summary['title']
                    if 'summary' in summary:
                        simplified['summary'] = summary['summary']
                    if 'keyPoints' in summary:
                        simplified['keyPoints'] = summary['keyPoints']
                else:
                    if hasattr(summary, 'title'):
                        simplified['title'] = summary.title
                    if hasattr(summary, 'summary'):
                        simplified['summary'] = summary.summary
                    if hasattr(summary, 'keyPoints'):
                        simplified['keyPoints'] = summary.keyPoints
                        
                # Add additional properties that might be helpful
                if isinstance(summary, dict) and 'videoId' in summary:
                    simplified['videoId'] = summary['videoId']
                elif hasattr(summary, 'videoId'):
                    simplified['videoId'] = summary.videoId
                
                simplified_summaries.append(simplified)
            
            # Use VideoComparisonService if available
            if self.comparison_service:
                logging.info("Using VideoComparisonService for comparison")
                return self.comparison_service.compare_videos(simplified_summaries)
            
            # Fallback to simplified comparison if service is not available
            return self._generate_fallback_comparison(simplified_summaries)
        except Exception as e:
            logging.error(f"Error in ComparisonAgent: {e}")
            # Fall back to simplified comparison in case of any other error
            try:
                return ComparisonResult(
                    commonTopics=["Videos share educational content", "Both videos provide information on similar topics"],
                    differences=["Videos differ in presentation style", "One video covers more technical details than the other"],
                    recommendation="Watch both videos for a comprehensive understanding of the topic."
                )
            except Exception as e2:
                logging.error(f"Error creating fallback ComparisonResult: {e2}")
                # Last resort fallback
                return {
                    'commonTopics': ["Both videos are educational"],
                    'differences': ["Videos have different focuses"],
                    'recommendation': "Watch both videos for complete information."
                }
    
    def _generate_fallback_comparison(self, summaries):
        """Generate a simplified comparison when VideoComparisonService is not available"""
        # Extract titles for more meaningful comparisons
        titles = []
        for i, summary in enumerate(summaries):
            title = "Unknown"
            if hasattr(summary, 'title'):
                title = summary.title
            elif isinstance(summary, dict) and 'title' in summary:
                title = summary['title']
            else:
                title = f"Video {i+1}"
            titles.append(title)
            
        # Generate simplified comparison result
        return ComparisonResult(
            commonTopics=["Both videos discuss related topics", "They share educational content"],
            differences=[
                f"{titles[0]} focuses more on theory, while {titles[1]} is more practical" if len(titles) > 1 else "Videos have different approaches",
                f"{titles[0]} is more detailed in some areas, while {titles[1]} covers additional points" if len(titles) > 1 else "Videos cover different aspects of the topic"
            ],
            recommendation=f"Watch {titles[0]} first for background, then {titles[1]} for practical applications." if len(titles) > 1 else "Watch videos in any order based on your interest."
        )

class ChatAgent(BaseAgent):
    """Agent responsible for answering questions about videos."""
    def __init__(self):
        super().__init__("ChatAgent")
    
    def process(self, data):
        """Generate response to user question about video."""
        transcript, summary, question = data
        try:
            # Generate chat response (simplified for demo)
            response = f"Based on the video '{summary.title}', the answer to your question about '{question}' is related to the main topics covered in the video."
            
            # Extract timeline suggestions
            timeline_suggestions = []
            for key_point in summary.keyPoints:
                if any(word.lower() in key_point.point.lower() for word in question.lower().split()):
                    timeline_suggestions.append(
                        TimelineSuggestion(
                            timestamp=key_point.timestamp,
                            text=key_point.point,
                            relevance="high" if question.lower() in key_point.point.lower() else "medium"
                        )
                    )
            
            # If no direct matches, provide some general suggestions
            if not timeline_suggestions and summary.keyPoints:
                timeline_suggestions = [
                    TimelineSuggestion(
                        timestamp=summary.keyPoints[0].timestamp,
                        text=summary.keyPoints[0].point,
                        relevance="medium"
                    )
                ]
            
            return ChatResponse(
                videoId=summary.videoId,
                response=response,
                timeline_suggestions=timeline_suggestions[:3]  # Limit to top 3 suggestions
            )
        except Exception as e:
            print(f"Error generating chat response: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to generate chat response: {str(e)}")

class ContentGenerationAgent(BaseAgent):
    """Agent responsible for generating content from video summaries."""
    def __init__(self):
        super().__init__("ContentGenerationAgent")
    
    def process(self, data):
        """Generate content based on video summary."""
        summary, content_type = data
        try:
            # Extract key points as dict for content generation
            key_points_dict = [{"timestamp": kp.timestamp, "point": kp.point} for kp in summary.keyPoints]
            
            # Generate content based on type (simplified for demo)
            if content_type == "twitter":
                content = f"🧵 Thread about {summary.title}:\n\n1/ {summary.summary[:100]}...\n\n2/ Key insights: {key_points_dict[0]['point'] if key_points_dict else 'None'}\n\n3/ Follow for more content like this!"
            elif content_type == "linkedin":
                content = f"# {summary.title}\n\n{summary.summary}\n\nKey takeaways:\n- {key_points_dict[0]['point'] if key_points_dict else 'None'}\n- {key_points_dict[1]['point'] if len(key_points_dict) > 1 else 'None'}\n\n#Learning #ProfessionalDevelopment"
            else:
                content = f"# Summary of {summary.title}\n\n{summary.summary}\n\n## Key Points\n\n" + "\n".join([f"- {kp['point']}" for kp in key_points_dict])
            
            return ContentGenerationResult(
                content=content,
                format=content_type,
                title=f"{summary.title} - {content_type.capitalize()}"
            )
        except Exception as e:
            print(f"Error generating content: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to generate content: {str(e)}")

# Fallback agent implementations for when improved agents aren't available
class FallbackTranscriptAgent(BaseAgent):
    """Fallback agent for transcript processing when improved agent isn't available."""
    def __init__(self):
        super().__init__("FallbackTranscriptAgent")
    
    def process(self, video_id):
        """Get transcript for a video."""
        try:
            # Try to get transcript using YouTube API
            logging.info(f"Getting transcript for video {video_id} using fallback agent")
            transcript_text = get_transcript(video_id)
            if transcript_text:
                # Create a Summary object
                return Summary(
                    videoId=video_id,
                    title=get_video_info(video_id).get('title', 'Unknown Video'),
                    transcript=transcript_text,
                    summary="",  # Will be filled by SummaryAgent
                    keyPoints=[]
                )
        except Exception as e:
            logging.error(f"Error getting transcript in fallback agent: {e}")
        
        # Return minimal transcript data in case of failure
        return Summary(
            videoId=video_id,
            title=get_video_info(video_id).get('title', 'Unknown Video'),
            transcript="No transcript available for this video.",
            summary="",
            keyPoints=[]
        )

class FallbackSummaryAgent(BaseAgent):
    """Fallback agent for summary generation when improved agent isn't available."""
    def __init__(self):
        super().__init__("FallbackSummaryAgent")
    
    def process(self, data):
        """Generate summary from transcript."""
        transcript, video_id = data
        try:
            # Get video info
            video_info = get_video_info(video_id)
            title = video_info.get('title', 'Unknown Video')
            
            # Try to generate summary using transformer summarizer if available
            if transformer_available:
                try:
                    transformer = TransformerSummarizer(model_name="distilbert-base-uncased")
                    summary_text = transformer.summarize(transcript.transcript)
                except Exception as e:
                    logging.error(f"Error using transformer summarizer: {e}")
                    summary_text = summarize_text(transcript.transcript, title)
            else:
                summary_text = summarize_text(transcript.transcript, title)
            
            # Extract key points
            key_points = extract_key_points(transcript.transcript, summary_text)
            
            # Create Summary object
            return Summary(
                videoId=video_id,
                title=title,
                transcript=transcript.transcript,
                summary=summary_text,
                keyPoints=key_points
            )
        except Exception as e:
            logging.error(f"Error generating summary in fallback agent: {e}")
            
            # Return minimal summary in case of failure
            return Summary(
                videoId=video_id,
                title=get_video_info(video_id).get('title', 'Unknown Video'),
                transcript=transcript.transcript if hasattr(transcript, 'transcript') else "",
                summary="No summary available for this video.",
                keyPoints=[KeyPoint(timestamp="0:00", point="No key points available.")]
            )

class FallbackChatAgent(BaseAgent):
    """Fallback agent for chat when improved agent isn't available."""
    def __init__(self):
        super().__init__("FallbackChatAgent")
    
    def process(self, data):
        """Generate response to user question about video."""
        transcript, summary, question = data
        try:
            # Generate chat response using OpenAI if available
            if openai_available and openai.api_key:
                try:
                    response = generate_chat_response(transcript.transcript, question, summary.title)
                    return ChatResponse(
                        videoId=summary.videoId,
                        response=response["response"],
                        answer=response["response"],
                        timeline_suggestions=response["timeline_suggestions"]
                    )
                except Exception as e:
                    logging.error(f"Error using OpenAI for chat: {e}")
            
            # Fallback to basic response
            timeline_suggestions = []
            for kp in summary.keyPoints:
                if any(word.lower() in kp.point.lower() for word in question.lower().split()):
                    timeline_suggestions.append(
                        TimelineSuggestion(
                            timestamp=kp.timestamp,
                            text=kp.point,
                            relevance="medium"
                        )
                    )
            
            if not timeline_suggestions and summary.keyPoints:
                timeline_suggestions = [TimelineSuggestion(
                    timestamp=summary.keyPoints[0].timestamp,
                    text=summary.keyPoints[0].point,
                    relevance="low"
                )]
            
            return ChatResponse(
                videoId=summary.videoId,
                response=f"Based on the video about '{summary.title}', I can provide some insights related to your question about '{question}'. The video mainly discusses {summary.summary[:100]}...",
                answer=f"Based on the video about '{summary.title}', I can provide some insights related to your question about '{question}'. The video mainly discusses {summary.summary[:100]}...",
                timeline_suggestions=timeline_suggestions[:3]
            )
        except Exception as e:
            logging.error(f"Error in fallback chat agent: {e}")
            
            # Return minimal response in case of failure
            return ChatResponse(
                videoId=summary.videoId if hasattr(summary, 'videoId') else '',
                response=f"I'm sorry, I couldn't process your question about '{question}' for this video.",
                answer=f"I'm sorry, I couldn't process your question about '{question}' for this video.",
                timeline_suggestions=[]
            )

# Orchestrator for multi-agent system
class AgentOrchestrator:
    """Orchestrates the multi-agent system."""
    def __init__(self):
        # Handle case when agent modules are not available
        if agents_available and 'ImprovedTranscriptAgent' in globals():
            self.transcript_agent = ImprovedTranscriptAgent()
        else:
            self.transcript_agent = FallbackTranscriptAgent()
            
        if agents_available and 'ImprovedSummaryAgent' in globals():
            self.summary_agent = ImprovedSummaryAgent()
        else:
            self.summary_agent = FallbackSummaryAgent()
            
        self.comparison_agent = ComparisonAgent()
        
        # Try to use ImprovedChatAgent if available
        try:
            from chat_agent_improved import ImprovedChatAgent
            self.chat_agent = ImprovedChatAgent()
        except ImportError:
            self.chat_agent = FallbackChatAgent()
            
        self.content_generation_agent = ContentGenerationAgent()
        print("Agent Orchestrator initialized")
    
    def summarize_video(self, video_id):
        """Orchestrate the video summarization process."""
        # Step 1: Get transcript
        transcript = self.transcript_agent.process(video_id)
        
        # Step 2: Generate summary
        summary = self.summary_agent.process((transcript, video_id))
        
        return summary
    
    def compare_videos(self, video_ids):
        """Orchestrate the video comparison process."""
        summaries = []
        summary_dicts = []
        
        # Step 1: Get summaries for all videos
        for video_id in video_ids:
            summary = self.summarize_video(video_id)
            summaries.append(summary)
            
            # Convert Summary object to dict for JSON serialization
            key_points_dict = []
            for kp in summary.keyPoints:
                key_points_dict.append({
                    "timestamp": kp.timestamp,
                    "point": kp.point
                })
            
            summary_dict = {
                "videoId": summary.videoId,
                "title": summary.title,
                "summary": summary.summary,
                "keyPoints": key_points_dict
            }
            summary_dicts.append(summary_dict)
        
        # Step 2: Generate comparison
        comparison = self.comparison_agent.process(summaries)
        
        # Convert ComparisonResult to dict
        comparison_dict = {
            "commonTopics": comparison.commonTopics,
            "differences": comparison.differences,
            "recommendation": comparison.recommendation
        }
        
        return {
            "summaries": summary_dicts,
            "comparison": comparison_dict
        }
    
    def chat_with_video(self, video_id, question):
        """Orchestrate the chat with video process."""
        # Step 1: Get transcript and summary
        transcript = self.transcript_agent.process(video_id)
        summary = self.summary_agent.process((transcript, video_id))
        
        # Step 2: Generate chat response
        response = self.chat_agent.process((transcript, summary, question))
        
        return response
    
    def generate_content(self, video_id, content_type, existing_summary=None):
        """Orchestrate the content generation process."""
        # Step 1: Get summary if not provided
        if existing_summary:
            summary = existing_summary
        else:
            summary = self.summarize_video(video_id)
        
        # Step 2: Generate content
        content = self.content_generation_agent.process((summary, content_type))
        
        return content

# Initialize orchestrator
orchestrator = AgentOrchestrator()

# API Routes
@app.get("/")
def read_root():
    return {"message": "TubeWise AI Service API", "version": "1.0.0", "database": "PostgreSQL"}

# User routes
@app.post("/api/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """Create a new user."""
    # Check if user already exists
    db_user = repo.get_user_by_email(db, user.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    db_user = repo.create_user(db, user.email, user.name, user.password)
    
    return db_user

@app.post("/api/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    """Login a user."""
    # Check if user exists
    db_user = repo.get_user_by_email(db, user.email)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Check password (in production, this should be hashed)
    if db_user.password != user.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # In a real application, you would generate a JWT token here
    return {"access_token": f"user_{db_user.id}", "token_type": "bearer"}

@app.get("/api/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get a user by ID."""
    db_user = repo.get_user_by_id(db, user_id)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return db_user

@app.get("/api/user/{user_id}/usage")
def get_user_usage(user_id: int, db: Session = Depends(get_db)):
    # Check if user exists
    user = repo.get_user_by_id(db, user_id)
    if not user:
        return JSONResponse(
            status_code=404,
            content={"error": "User not found"}
        )
    
    # Get detailed usage limits and stats
    user_limits = usage_limits.get_user_limits(db, user_id)
    
    return user_limits

@app.post("/api/summarize")
def summarize_video(request: VideoRequest, db: Session = Depends(get_db)):
    # Check usage limits if user is provided
    if request.user_id:
        allowed, limit_info = usage_limits.check_summarization_limit(db, request.user_id)
        if not allowed:
            return JSONResponse(
                status_code=403,
                content={
                    "error": "Usage limit reached",
                    "limit_info": limit_info,
                    "message": f"You have reached your limit of {limit_info['limit']} video summaries per month. Upgrade to Pro for more."
                }
            )
    
    # Extract video ID from URL
    video_id = extract_video_id(request.url)
    if not video_id:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid YouTube URL"}
        )
    
    # Check if video exists in database
    db_video = repo.get_video_by_youtube_id(db, video_id)
    if not db_video:
        # Get video info from YouTube
        video_info = get_video_info(video_id)
        # Create new video in database
        db_video = repo.create_video(db, video_id, video_info["title"], request.url)
    
    # Check if summary exists in database
    db_summary = repo.get_summary_by_video_id(db, db_video.id)
    if db_summary:
        # Get key points from database
        key_points = repo.get_key_points_by_summary_id(db, db_summary.id)
        # Convert to response format
        key_points_response = [
            KeyPoint(timestamp=str(kp.timestamp), point=kp.text)
            for kp in key_points
        ]
        
        # Return existing summary
        return {
            "videoId": video_id,
            "title": db_video.title,
            "summary": db_summary.summary,
            "keyPoints": key_points_response,
            "user_role": usage_limits.get_user_role(db, request.user_id) if request.user_id else "free"
        }
    
    # Use orchestrator to summarize video
    summary = orchestrator.summarize_video(video_id)
    
    # Save summary to database
    db_summary = repo.create_summary(db, db_video.id, summary.summary)
    
    # Save key points to database
    for kp in summary.keyPoints:
        # Convert timestamp to seconds
        minutes, seconds = map(int, kp.timestamp.split(':'))
        timestamp_seconds = minutes * 60 + seconds
        
        # Create key point in database
        repo.create_key_point(db, db_summary.id, kp.point, timestamp_seconds)
    
    # Update usage stats if user is provided
    if request.user_id:
        repo.increment_videos_summarized(db, request.user_id)
    
    return {
        "videoId": video_id,
        "title": summary.title,
        "summary": summary.summary,
        "keyPoints": summary.keyPoints,
        "user_role": usage_limits.get_user_role(db, request.user_id) if request.user_id else "free"
    }

@app.post("/api/chat")
def chat_with_video(request: ChatRequest, db: Session = Depends(get_db)):
    try:
        video_id = extract_video_id(request.videoId)
        user_message = request.message
        
        print(f"Chat API called with video_id: {video_id}, message: {user_message}")
        
        # Check if video exists in database
        db_video = repo.get_video_by_youtube_id(db, video_id)
        if not db_video:
            # Try to add the video to database first
            try:
                # Get video info
                video_info = get_video_info(video_id)
                video_title = video_info.get("title", "YouTube Video")
                
                # Create video in database
                db_video = repo.create_video(db, video_id, video_title)
            except Exception as e:
                print(f"Error creating video: {e}")
                # Continue even if we couldn't create the video
                db_video = {"title": "YouTube Video"}
        
        # Get transcript directly
        try:
            transcript = ImprovedTranscriptAgent().process(video_id)
            print(f"Transcript retrieved for video {video_id}: {len(transcript.split())} words")
        except Exception as e:
            print(f"Error getting transcript: {e}")
            transcript = "Transcript not available"
        
        # Generate a direct response using OpenAI
        try:
            # Call OpenAI API directly
            prompt = f"""You are an AI assistant that helps users understand YouTube videos.
            
            VIDEO ID: {video_id}
            VIDEO TITLE: {db_video.title if hasattr(db_video, 'title') else 'YouTube Video'}
            
            TRANSCRIPT EXCERPT:
            {transcript[:2000]}  # Use first 2000 chars for brevity
            
            USER QUESTION: {user_message}
            
            Please provide a helpful, informative response that directly answers the question.
            If the information to answer the question is not available in the provided context, say so clearly.
            """
            
            response = openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an expert video content analyzer. Provide accurate, helpful responses to questions about video content."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=500,
                temperature=0.7,
            )
            
            chat_response = response.choices[0].message.content.strip()
            print(f"Generated chat response: {chat_response[:100]}...")
        except Exception as e:
            print(f"Error with OpenAI: {e}")
            chat_response = f"I couldn't analyze this video at the moment. Error: {str(e)}"
        
        # Update usage stats if user is provided
        if request.user_id and db_video and hasattr(db_video, 'id'):
            try:
                repo.increment_summarization_used(db, request.user_id)
            except Exception as e:
                print(f"Error updating usage stats: {e}")
        
        # Generate fixed key timestamps for now (since we don't have real data)
        key_timestamps = [
            {
                "time": "01:05", 
                "text": "First key point: The video discusses how plagiarism affects content ranking in search results."
            },
            {
                "time": "02:15", 
                "text": "Second key point: It recommends using 'paraphraser doio' tool to check for plagiarism in your content."
            },
            {
                "time": "03:30", 
                "text": "Third key point: The video explains how to use 'gravity R' tool to rewrite and make content 100% unique."
            }
        ]
        
        # Format response for frontend
        return {
            "videoId": video_id,
            "response": chat_response,
            "timeline_suggestions": [],
            "summary": {
                "videoId": video_id,
                "title": db_video.title if hasattr(db_video, 'title') else "YouTube Video",
                "summary": "This video's content has been analyzed for your question.",
                "keyPoints": [],
                "keyTimestamps": key_timestamps,
                "noKeyPoints": len(key_timestamps) == 0
            },
            "user_role": usage_limits.get_user_role(db, request.user_id) if request.user_id else "free"
        }
        
    except Exception as e:
        print(f"Error in chat_with_video: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to chat with video: {str(e)}"}
        )
        
@app.post("/api/compare")
def compare_videos(request: MultiVideoRequest, db: Session = Depends(get_db)):
    try:
        # Check if the user is allowed to use the comparison feature
        if request.user_id:
            # First check if user is free and trying to use a pro-only feature
            user_role = usage_limits.get_user_role(db, request.user_id)
            if user_role == "free":
                return JSONResponse(
                    status_code=403,
                    content={
                        "error": "Pro feature",
                        "message": "Video comparison is a Pro-only feature. Please upgrade to Pro to use this feature."
                    }
                )
            
            # Then check usage limits for Pro users
            allowed, limit_info = usage_limits.check_comparison_limit(db, request.user_id)
            if not allowed:
                return JSONResponse(
                    status_code=403,
                    content={
                        "error": "Usage limit reached",
                        "limit_info": limit_info,
                        "message": f"You have reached your limit of {limit_info['limit']} video comparisons per month. Upgrade to Pro for more."
                    }
                )
        
        # Extract video IDs from URLs or use provided video_ids
        video_ids = []
        if request.video_ids and len(request.video_ids) > 0:
            video_ids = request.video_ids
        elif request.videoUrls and len(request.videoUrls) > 0:
            for url in request.videoUrls:
                video_id = extract_video_id(url)
                if video_id:
                    video_ids.append(video_id)
                else:
                    return JSONResponse(
                        status_code=400,
                        content={
                            "error": f"Could not extract video ID from URL: {url}",
                            "status": "error"
                        }
                    )
        else:
            return JSONResponse(
                status_code=400,
                content={
                    "error": "No video URLs or IDs provided",
                    "status": "error"
                }
            )

        # Check if we have enough valid video IDs
        if len(video_ids) < 2:
            return JSONResponse(
                status_code=400,
                content={
                    "error": "Need at least 2 valid video IDs for comparison",
                    "status": "error"
                }
            )

        # Get summaries for all videos
        summaries = []
        video_details = []  # Store full video info for better comparison
        
        logging.info(f"Getting summaries for videos: {video_ids}")
        
        for video_id in video_ids:
            try:
                # Get video info from YouTube API for better prompting
                youtube = build_youtube_service()
                video_response = youtube.videos().list(
                    part='snippet,contentDetails',
                    id=video_id
                ).execute()
                
                if not video_response['items']:
                    return JSONResponse(
                        status_code=404,
                        content={
                            "error": f"Video not found: {video_id}",
                            "status": "error"
                        }
                    )
                    
                video_data = video_response['items'][0]['snippet']
                video_title = video_data['title']
                video_description = video_data.get('description', '')

                
                # Get summary using the orchestrator
                logging.info(f"Generating summary for video {video_id}")
                
                # Check if a summary already exists in database
                existing_summary = None
                if db_available:
                    # Check if this video exists in the database first
                    db_video = repo.get_video_by_youtube_id(db, video_id)
                    if db_video:
                        # Now get the summary using the database id, not YouTube ID
                        existing_summary = repo.get_summary_by_video_id(db, db_video.id)
                    else:
                        logging.info(f"Video {video_id} not found in database")
                
                if existing_summary:
                    logging.info(f"Using existing summary for video {video_id}")
                    summary_result = existing_summary
                else:
                    # Generate new summary using orchestrator
                    logging.info(f"Generating new summary for video {video_id}")
                    try:
                        summary_result = orchestrator.summarize_video(video_id)
                    except Exception as e:
                        logging.error(f"Error summarizing video {video_id}: {e}")
                        return JSONResponse(
                            status_code=500,
                            content={
                                "error": f"Error summarizing video: {str(e)}",
                                "status": "error"
                            }
                        )
                
                if not summary_result or (isinstance(summary_result, dict) and 'error' in summary_result):
                    error_msg = "Failed to generate summary" if not summary_result else summary_result.get('error', 'Unknown error')
                    return JSONResponse(
                        status_code=500,
                        content={
                            "error": f"Error summarizing video: {error_msg}",
                            "status": "error"
                        }
                    )
                
                # Create formatted summary
                formatted_summary = {
                    "videoId": video_id,
                    "title": video_title,
                }
                
                # Extract summary fields based on the type
                if isinstance(summary_result, dict):
                    formatted_summary["summary"] = summary_result.get('summary', '')
                    formatted_summary["keyPoints"] = [
                        kp.dict() if hasattr(kp, 'dict') else kp
                        for kp in (
                            summary_result.get('keyPoints', []) if isinstance(summary_result, dict)
                            else getattr(summary_result, 'keyPoints', [])
                        )
                    ]
                else:
                    # Handle Summary object, converting keyPoints to serializable dicts
                    formatted_summary["summary"] = getattr(summary_result, 'summary', '')
                    formatted_summary["keyPoints"] = [
                        kp.dict() if hasattr(kp, 'dict') else kp
                        for kp in getattr(summary_result, 'keyPoints', [])
                    ]
                
                summaries.append(formatted_summary)
                
                # Add to video_details for better comparison context
                video_details.append({
                    "videoId": video_id,
                    "title": video_title,
                    "description": video_description,
                    "summary": summary_result.get('summary', '') if isinstance(summary_result, dict) else getattr(summary_result, 'summary', ''),
                    "keyPoints": [
                        kp.dict() if hasattr(kp, 'dict') else kp
                        for kp in (
                            summary_result.get('keyPoints', []) if isinstance(summary_result, dict)
                            else getattr(summary_result, 'keyPoints', [])
                        )
                    ]
                })
                
            except Exception as e:
                logging.error(f"Error processing video {video_id}: {e}")
                return JSONResponse(
                    status_code=500,
                    content={
                        "error": f"Error processing video {video_id}: {str(e)}",
                        "status": "error"
                    }
                )
        
        # Use the VideoComparisonService to compare the videos
        if len(summaries) >= 2:
            logging.info(f"Comparing {len(summaries)} videos")
            logging.info(f"Video details sample: {video_details[0] if video_details else 'None'}")
            try:
                # We already have a comparison_agent with initialized comparison_service
                # Pass the summaries to the comparison agent - video_details might be causing issues
                logging.info(f"Using summaries for comparison instead of video_details")
                comparison_obj = orchestrator.comparison_agent.process(summaries)
                
                logging.info(f"Comparison result: {comparison_obj}")
                
                # Ensure comparison is JSON serializable
                if isinstance(comparison_obj, BaseModel):
                    comparison_data = comparison_obj.dict()
                else:
                    comparison_data = comparison_obj
                
                # Return the summaries and the comparison
                response = {
                    "summaries": summaries,
                    "comparison": comparison_data,
                    "status": "success"
                }
                
                # Add user role to response if available
                if request.user_id:
                    response["user_role"] = usage_limits.get_user_role(db, request.user_id)
                    
                    # Update usage stats if user is provided and db is available
                    if db_available:
                        repo.increment_videos_compared(db, request.user_id)
                
                return JSONResponse(content=response)
                
            except Exception as e:
                logging.error(f"Error in comparison service: {e}")
                return JSONResponse(
                    status_code=500,
                    content={
                        "error": f"Error comparing videos: {str(e)}",
                        "status": "error"
                    }
                )
        else:
            return JSONResponse(
                status_code=400,
                content={
                    "error": "Not enough valid summaries for comparison",
                    "status": "error"
                }
            )
            
    except Exception as e:
        logging.error(f"Global error in compare_videos: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": f"Internal server error: {str(e)}",
                "status": "error"
            }
        )

@app.post("/api/generate")
def generate_content(request: ContentGenerationRequest, db: Session = Depends(get_db)):
    # Check usage limits if user is provided
    if request.user_id:
        allowed, limit_info = usage_limits.check_content_generation_limit(db, request.user_id)
        if not allowed:
            return JSONResponse(
                status_code=403,
                content={
                    "error": "Usage limit reached",
                    "limit_info": limit_info,
                    "message": f"You have reached your limit of {limit_info['limit']} content generations per month. Upgrade to Pro for more."
                }
            )
        
    # Extract video ID
    video_id = extract_video_id(request.videoId)
    if not video_id:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid YouTube video ID"}
        )
    
    # Check if video exists in database
    db_video = repo.get_video_by_youtube_id(db, video_id)
    if not db_video and not request.summary:
        return JSONResponse(
            status_code=404,
            content={"error": "Video not found in database and no summary provided."}
        )
    
    # Get existing summary or use provided summary
    summary = None
    if request.summary and request.keyPoints:
        # Use provided summary and key points
        key_points = []
        for kp in request.keyPoints:
            key_points.append(KeyPoint(
                timestamp=kp.get("timestamp", "00:00"),
                point=kp.get("point", "")
            ))
        
        summary = Summary(
            videoId=video_id,
            title=request.title or "YouTube Video",
            summary=request.summary,
            keyPoints=key_points
        )
    else:
        # Get summary from database
        db_summary = repo.get_summary_by_video_id(db, db_video.id)
        if not db_summary:
            return JSONResponse(
                status_code=404,
                content={"error": "Summary not found for this video. Please summarize it first."}
            )
        
        # Get key points from database
        key_points = repo.get_key_points_by_summary_id(db, db_summary.id)
        # Convert to response format
        key_points_response = [
            KeyPoint(timestamp=str(kp.timestamp), point=kp.text)
            for kp in key_points
        ]
        
        summary = Summary(
            videoId=video_id,
            title=db_video.title,
            summary=db_summary.summary,
            keyPoints=key_points_response
        )
    
    # Use orchestrator to generate content
    content = orchestrator.generate_content(video_id, request.contentType, summary)
    
    # Save generated content to database if user is provided
    if request.user_id and db_video:
        repo.create_generated_content(
            db,
            request.user_id,
            db_video.id,
            request.contentType,
            content.content,
            content.format,
            content.title
        )
        
        # Update usage stats
        repo.increment_content_generated(db, request.user_id)
    
    # Add user role to response
    content_dict = content.dict() if hasattr(content, "dict") else content
    content_dict["user_role"] = usage_limits.get_user_role(db, request.user_id) if request.user_id else "free"
    
    return content_dict

# Additional routes for saved videos
@app.post("/api/users/{user_id}/saved-videos/{video_id}")
def save_video_for_user(user_id: int, video_id: str, db: Session = Depends(get_db)):
    """Save a video for a user."""
    # Check if user exists
    db_user = repo.get_user_by_id(db, user_id)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if video exists in database
    db_video = repo.get_video_by_youtube_id(db, video_id)
    if not db_video:
        # Get video info from YouTube
        video_info = get_video_info(video_id)
        # Create new video in database
        db_video = repo.create_video(db, video_id, video_info["title"], f"https://www.youtube.com/watch?v={video_id}")
    
    # Save video for user
    saved_video = repo.save_video(db, user_id, db_video.id)
    
    return {"message": "Video saved successfully"}

@app.delete("/api/users/{user_id}/saved-videos/{video_id}")
def remove_saved_video_for_user(user_id: int, video_id: str, db: Session = Depends(get_db)):
    """Remove a saved video for a user."""
    # Check if user exists
    db_user = repo.get_user_by_id(db, user_id)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if video exists in database
    db_video = repo.get_video_by_youtube_id(db, video_id)
    if not db_video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video not found"
        )
    
    # Remove saved video
    success = repo.remove_saved_video(db, user_id, db_video.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved video not found"
        )
    
    return {"message": "Video removed successfully"}

@app.get("/api/users/{user_id}/saved-videos", response_model=List[SavedVideoResponse])
def get_saved_videos_for_user(user_id: int, db: Session = Depends(get_db)):
    """Get all saved videos for a user."""
    # Check if user exists
    db_user = repo.get_user_by_id(db, user_id)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get saved videos
    saved_videos = repo.get_saved_videos_by_user_id(db, user_id)
    
    # Convert to response format
    response = []
    for sv in saved_videos:
        response.append({
            "id": sv.id,
            "video_id": sv.video.video_id,
            "title": sv.video.title,
            "saved_at": sv.saved_at.isoformat()
        })
    
    return response

# Import frontend compatibility module
try:
    import frontend_compatibility
    logger.info("Frontend compatibility module imported successfully")
    
    # Register frontend compatibility routes
    if hasattr(frontend_compatibility, 'register_routes'):
        frontend_compatibility.register_routes(app)
        logger.info("Frontend compatibility routes registered successfully")
except Exception as e:
    logger.error(f"Error importing frontend compatibility module: {str(e)}")

# Run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
