"""
Improved SummaryAgent that uses OpenAI API for high-quality summarization.
"""

from openai_summarizer import OpenAISummarizer
from typing import List, Dict, Any, Optional, Tuple
import time
import re
import os

class ImprovedSummaryAgent:
    """Agent responsible for generating high-quality summaries from transcripts using OpenAI API."""
    
    def __init__(self, name="ImprovedSummaryAgent"):
        """Initialize the agent with an OpenAI summarizer."""
        # Note: We're not calling super().__init__() because we're not inheriting from BaseAgent
        # This is to avoid compatibility issues with the existing code
        self.name = name
        
        # Check if OpenAI API key is available
        if not os.getenv("OPENAI_API_KEY"):
            print("WARNING: OpenAI API key not found. Using transformer-based summarization as fallback.")
            from transformer_summarizer import TransformerSummarizer
            self.summarizer = TransformerSummarizer("facebook/bart-large-cnn")
            self.using_openai = False
        else:
            # Initialize the OpenAI summarizer
            self.summarizer = OpenAISummarizer()
            self.using_openai = True
            
        print(f"Agent {name} initialized with {'OpenAI' if self.using_openai else 'transformer'} summarizer")
    
    def process(self, data: Tuple[str, str]) -> Dict[str, Any]:
        """
        Generate summary from transcript.
        
        Args:
            data: Tuple containing (transcript, video_id)
            
        Returns:
            Dict containing the summary information
        """
        transcript, video_id = data
        try:
            # Get video info
            video_info = self.get_video_info(video_id)
            video_title = video_info.get("title", "YouTube Video")
            
            # Log transcript length for debugging
            transcript_word_count = len(transcript.split())
            print(f"Transcript length: {transcript_word_count} words")
            print(f"First 100 characters of transcript: {transcript[:100]}...")
            print(f"Last 100 characters of transcript: {transcript[-100:]}...")
            
            # Make sure we're using the full transcript
            if transcript_word_count < 50:
                print("Warning: Transcript is very short. This might be an error in transcript extraction.")
            
            # Generate summary using transformer model
            print(f"Generating summary for video: {video_title}")
            summary_text = self.summarizer.summarize(
                transcript,
                max_length=300,  # Maximum length of the summary in words
                min_length=150   # Minimum length of the summary in words
            )
            
            # Log the summary for debugging
            print(f"Generated summary length: {len(summary_text.split())} words")
            print(f"Summary: {summary_text[:100]}...")
            
            # Extract key points with timestamps
            print("Extracting key points from transcript")
            key_points = self.summarizer.extract_key_points(transcript, video_id, num_points=7)
            
            # Log key points for debugging
            print(f"Generated {len(key_points)} key points")
            for i, kp in enumerate(key_points):
                print(f"Key point {i+1}: {kp['timestamp']} - {kp['point'][:50]}...")
            
            # Import the Summary and KeyPoint classes from the main module
            from simple_app import Summary, KeyPoint
            
            # Convert key_points to KeyPoint objects
            key_point_objects = [KeyPoint(timestamp=kp["timestamp"], point=kp["point"]) for kp in key_points]
            
            # Return the Summary object
            return Summary(
                videoId=video_id,
                title=video_title,
                summary=summary_text,
                keyPoints=key_point_objects
            )
        except Exception as e:
            print(f"Error generating summary: {e}")
            raise Exception(f"Failed to generate summary: {str(e)}")
    
    def get_video_info(self, video_id: str) -> Dict[str, Any]:
        """
        Get video information from YouTube.
        
        Args:
            video_id: YouTube video ID
            
        Returns:
            Dict containing video information
        """
        import requests
        
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
