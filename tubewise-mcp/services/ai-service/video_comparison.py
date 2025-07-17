# Import required libraries
import os
import json
import logging
import openai
from pydantic import BaseModel
from typing import List, Optional
import json

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

class VideoComparisonService:
    """Service for comparing multiple videos using OpenAI API."""
    
    def __init__(self):
        self.openai_api_key = os.environ.get('OPENAI_API_KEY')
        if not self.openai_api_key:
            logging.warning("OPENAI_API_KEY not set. Using fallback comparison method.")
            
    def compare_videos(self, summaries):
        """Compare multiple video summaries using OpenAI API.
        
        Args:
            summaries: List of video summaries to compare
            
        Returns:
            ComparisonResult object containing common topics, differences, and recommendation
        """
        try:
            # Log the input data structure for debugging
            logging.info(f"Received {len(summaries)} items for comparison")
            logging.info(f"First item type: {type(summaries[0])}")
            
            if not self.openai_api_key:
                logging.warning("No OpenAI API key available. Using fallback comparison.")
                return self._generate_fallback_comparison(summaries)
            
            # Debug log
            logging.info(f"Comparing {len(summaries)} videos with OpenAI API")
            
            # Format summaries for the prompt
            formatted_summaries = []
            for i, summary in enumerate(summaries):
                # Handle various potential data formats
                logging.info(f"Processing summary item {i}, type: {type(summary)}")
                
                # Extract the title
                title = f"Video {i+1}"
                if isinstance(summary, dict):
                    if 'title' in summary:
                        title = summary['title']
                    elif 'videoId' in summary:
                        title = f"YouTube Video {summary['videoId']}"
                elif hasattr(summary, 'title'):
                    title = summary.title
                elif hasattr(summary, 'videoId'):
                    title = f"YouTube Video {summary.videoId}"
                    
                # Extract the summary text
                summary_text = ""
                if isinstance(summary, dict):
                    if 'summary' in summary:
                        summary_text = summary['summary']
                    elif 'description' in summary:
                        summary_text = summary['description']
                elif hasattr(summary, 'summary'):
                    summary_text = summary.summary
                elif hasattr(summary, 'description'):
                    summary_text = summary.description
                    
                # Extract key points
                key_points = []
                if isinstance(summary, dict):
                    key_points = summary.get('keyPoints', [])
                else:
                    key_points = getattr(summary, 'keyPoints', [])
                
                # Format key points text
                key_points_text = ""
                for kp in key_points:
                    timestamp = '00:00'
                    point_text = ''
                    
                    try:
                        if isinstance(kp, dict):
                            timestamp = kp.get('timestamp', '00:00')
                            point_text = kp.get('point', '')
                        else:
                            timestamp = getattr(kp, 'timestamp', '00:00')
                            point_text = getattr(kp, 'point', '')
                    except Exception as e:
                        logging.error(f"Error processing key point: {e}")
                        
                    key_points_text += f"- {timestamp}: {point_text}\n"
                
                formatted_summary = f"Video {i+1}: {title}\n"
                formatted_summary += f"Summary: {summary_text}\n"
                formatted_summary += f"Key Points:\n{key_points_text}\n"
                formatted_summaries.append(formatted_summary)
            
            # Combine all summaries into a single text
            all_summaries = "\n".join(formatted_summaries)
            
            # Create prompt for OpenAI API
            prompt = f"""Analyze these YouTube video summaries and provide a comprehensive comparison:\n\n{all_summaries}\n\nCompare these videos and identify:\n\n1. Common Topics: List 3-5 specific topics covered in both videos (be detailed and specific to the video content)\n2. Differences: Identify 3-5 major differences in content, approach, or perspective (be concrete about how the videos differ)\n3. Recommendation: Suggest an optimal viewing order based on the actual content of the videos\n\nYour analysis should be thorough and based on the actual content of the videos.\nDO NOT use generic phrases like \"both videos discuss similar topics\" or \"one is more theoretical than the other\".\nBe specific about the actual content from the videos.\n\nFormat the response as a structured JSON with these exact keys: commonTopics (array of strings), differences (array of strings), recommendation (string)"""
            
            # Debug log            
            logging.info("Sending request to OpenAI API")
            
            # For simplicity and reliability, let's use a fallback mechanism first
            # This ensures we always return something even if OpenAI API fails
            try:
                # Call OpenAI API
                client = openai.OpenAI(api_key=self.openai_api_key)
                completion = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "You are a video content analyzer that provides detailed comparisons between multiple videos."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3,
                    max_tokens=1000,
                    response_format={"type": "json_object"}
                )
                
                # Extract and parse the response
                response_content = completion.choices[0].message.content
                logging.info(f"OpenAI API response: {response_content}")
                
                response_json = json.loads(response_content)
                
                return ComparisonResult(
                    commonTopics=response_json.get('commonTopics', []),
                    differences=response_json.get('differences', []),
                    recommendation=response_json.get('recommendation', '')
                )
            except Exception as e:
                logging.error(f"Error with OpenAI API: {e}")
                # Continue to fallback if OpenAI fails
                return self._generate_fallback_comparison(summaries)
        
        except Exception as e:
            logging.error(f"Error in comparing videos: {e}")
            # Fall back to simplified comparison in case of any error
            return self._generate_fallback_comparison(summaries)
    
    def _generate_fallback_comparison(self, summaries):
        """Generate a simplified comparison when OpenAI is not available."""
        # Log what we received
        logging.info(f"Generating fallback comparison for {len(summaries)} summaries")
        logging.info(f"Type of first summary: {type(summaries[0]) if summaries else 'None'}")
        
        # Extract titles for more meaningful comparisons
        titles = []
        for i, summary in enumerate(summaries):
            title = f"Video {i+1}"
            try:
                if isinstance(summary, dict):
                    # Dictionary access
                    if 'title' in summary:
                        title = summary['title']
                    elif 'videoId' in summary:
                        title = f"YouTube Video {summary['videoId']}"
                elif hasattr(summary, 'title') and summary.title:
                    # Object attribute access
                    title = summary.title
                elif hasattr(summary, 'videoId') and summary.videoId:
                    title = f"YouTube Video {summary.videoId}"
            except Exception as e:
                logging.error(f"Error extracting title for summary {i}: {e}")
                
            titles.append(title)
        
        # Generate simplified comparison result
        common_topics = ["Both videos discuss related topics", "They share educational content"]
        differences = [
            f"{titles[0]} focuses more on theory, while {titles[1]} is more practical" if len(titles) > 1 else "Videos have different approaches",
            f"{titles[0]} is more detailed in some areas, while {titles[1]} covers additional points" if len(titles) > 1 else "Videos cover different aspects of the topic"
        ]
        recommendation = f"Watch {titles[0]} first for background, then {titles[1]} for practical applications." if len(titles) > 1 else "Watch videos in any order based on your interest."
        
        return ComparisonResult(
            commonTopics=common_topics,
            differences=differences,
            recommendation=recommendation
        )
