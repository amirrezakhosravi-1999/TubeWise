"""Improved TranscriptAgent that extracts full transcripts from YouTube videos."""

from youtube_transcript_api import YouTubeTranscriptApi
from fastapi import HTTPException
from typing import List, Dict, Any
import time
import re

class ImprovedTranscriptAgent:
    """Agent responsible for extracting complete transcripts from YouTube videos."""
    
    def __init__(self, name="ImprovedTranscriptAgent"):
        """Initialize the agent."""
        self.name = name
        print(f"Agent {name} initialized")
    
    def process(self, video_id: str) -> str:
        """Get complete transcript for a YouTube video.
        
        Args:
            video_id: YouTube video ID
            
        Returns:
            str: Complete transcript text
        """
        try:
            # Get transcript from YouTube
            print(f"Fetching transcript for video ID: {video_id}")
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            
            # Log transcript details for debugging
            print(f"Retrieved {len(transcript_list)} transcript segments")
            
            # Extract text from transcript segments
            transcript_text = " ".join([item["text"] for item in transcript_list])
            
            # Log transcript length for debugging
            print(f"Full transcript length: {len(transcript_text)} characters, {len(transcript_text.split())} words")
            
            # Return the complete transcript
            return transcript_text
        except Exception as e:
            print(f"Error getting transcript: {e}")
            raise HTTPException(status_code=404, detail=f"Failed to get transcript: {str(e)}")
    
    def get_transcript_with_timestamps(self, video_id: str) -> List[Dict[str, Any]]:
        """Get transcript with timestamps for a YouTube video.
        
        Args:
            video_id: YouTube video ID
            
        Returns:
            List[Dict[str, Any]]: List of transcript segments with timestamps
        """
        try:
            # Get transcript from YouTube
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            
            # Format timestamps as mm:ss
            for item in transcript_list:
                seconds = item["start"]
                minutes = int(seconds // 60)
                seconds = int(seconds % 60)
                item["timestamp"] = f"{minutes}:{seconds:02d}"
            
            return transcript_list
        except Exception as e:
            print(f"Error getting transcript with timestamps: {e}")
            raise HTTPException(status_code=404, detail=f"Failed to get transcript with timestamps: {str(e)}")
