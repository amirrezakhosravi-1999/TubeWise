from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from youtube_transcript_api import YouTubeTranscriptApi
import re
import os
import json
import requests
import math
import time
from collections import Counter
from string import punctuation

# Import OpenAI for high-quality summarization
import openai

# Import sumy as fallback for text summarization
from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.lex_rank import LexRankSummarizer
from sumy.nlp.stemmers import Stemmer
from sumy.utils import get_stop_words

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure OpenAI API
openai.api_key = os.getenv("OPENAI_API_KEY", "")

# If no API key is found, print a warning
if not openai.api_key:
    print("WARNING: No OpenAI API key found. Using fallback summarization methods.")

# Define a class for improved summary generation
class ImprovedSummaryAgent:
    """Agent responsible for generating improved summaries from transcripts."""
    
    def __init__(self, name="ImprovedSummaryAgent"):
        self.name = name
        print(f"Agent {name} initialized")
    
    def process(self, data):
        """Generate summary from transcript."""
        transcript, video_id = data
        try:
            # Get video info (title, etc.)
            video_info = self.get_video_info(video_id)
            video_title = video_info.get("title", "YouTube Video")
            
            # Ensure the transcript isn't too long before processing
            # If it's very long, truncate it for processing to avoid overwhelming the summarizer
            max_transcript_length = 15000  # Maximum number of words to process
            words = transcript.split()
            if len(words) > max_transcript_length:
                print(f"Transcript is very long ({len(words)} words), truncating for processing")
                processed_transcript = " ".join(words[:max_transcript_length])
            else:
                processed_transcript = transcript
            
            # Create a high-quality summary of the entire video using OpenAI
            summary_text = self.generate_openai_summary(processed_transcript, video_title)
            
            # If OpenAI summary fails, use fallback method
            if not summary_text:
                print("OpenAI summary failed, using fallback method")
                summary_text = self.generate_fallback_summary(processed_transcript)
            
            # Extract key points with timestamps
            key_points = self.extract_key_points_with_openai(processed_transcript, video_id)
            
            # If OpenAI key point extraction fails, use fallback method
            if not key_points or len(key_points) < 3:
                print("OpenAI key point extraction failed, using fallback method")
                key_points = self.extract_key_points_fallback(processed_transcript, video_id)
            
            # Return the summary object
            return {
                "videoId": video_id,
                "title": video_title,
                "summary": summary_text,
                "keyPoints": key_points
            }
        except Exception as e:
            print(f"Error generating summary: {e}")
            raise Exception(f"Failed to generate summary: {str(e)}")
    
    def generate_openai_summary(self, transcript, video_title="YouTube Video"):
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
    
    def generate_fallback_summary(self, transcript):
        """Generate a summary using fallback methods when OpenAI is not available or fails."""
        try:
            # If the transcript is very short, just return it
            if len(transcript.split()) < 200:
                return transcript
                
            # Use LexRank for summarization (one of the most reliable algorithms)
            lexrank_summary = self.lexrank_summarize(transcript, sentences_count=10)
            
            # If LexRank fails, use a simple extractive method
            if not lexrank_summary or len(lexrank_summary) < 100:
                return self.simple_summarize(transcript, sentences_count=10)
                
            return lexrank_summary
            
        except Exception as e:
            print(f"Error in fallback summarization: {e}")
            # Last resort: return first 300 words of transcript
            words = transcript.split()
            return " ".join(words[:300]) + "..."
    
    def extract_key_points_with_openai(self, transcript, video_id):
        """Extract key points with timestamps using OpenAI API."""
        try:
            # Check if OpenAI API key is available
            if not openai.api_key:
                print("No OpenAI API key available for key point extraction")
                return None
                
            # If the transcript is very short, use a simpler method
            if len(transcript.split()) < 200:
                return self.extract_key_points_fallback(transcript, video_id)
                
            # Split transcript into segments to identify timestamps
            segments = self.split_transcript_into_segments(transcript, 5)  # 5 segments
            
            # Prepare the prompt for OpenAI
            prompt = f"""Below is the transcript of a YouTube video. 
            Please identify 5-7 key points or insights from the transcript, and for each one, specify approximately when in the video it appears.
            
            Format your response as a numbered list, with each point having a timestamp and the key insight. For example:
            1. [2:30] The main concept is explained
            2. [5:45] An important example is provided
            
            TRANSCRIPT:
            {transcript[:15000]}  # Limit to 15000 chars to stay within token limits
            
            KEY POINTS WITH TIMESTAMPS:"""
            
            # Call OpenAI API with retry logic
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    response = openai.chat.completions.create(
                        model="gpt-3.5-turbo-16k",
                        messages=[
                            {"role": "system", "content": "You are an expert at identifying the most important points in video transcripts with their approximate timestamps."},
                            {"role": "user", "content": prompt}
                        ],
                        max_tokens=500,
                        temperature=0.3,  # Lower temperature for more focused output
                    )
                    
                    # Extract the key points from the response
                    key_points_text = response.choices[0].message.content.strip()
                    
                    # Parse the key points into a structured format
                    key_points = []
                    for line in key_points_text.split("\n"):
                        line = line.strip()
                        if not line:
                            continue
                            
                        # Look for timestamp pattern [mm:ss] or similar
                        timestamp_match = re.search(r'\[(\d+:?\d*)\]', line)
                        if timestamp_match:
                            timestamp = timestamp_match.group(1)
                            # Ensure timestamp is in mm:ss format
                            if ":" not in timestamp:
                                timestamp = f"{timestamp}:00"
                                
                            # Extract the key point text (everything after the timestamp)
                            point_text = line[line.find("]") + 1:].strip()
                            if point_text:
                                key_points.append({"timestamp": timestamp, "point": point_text})
                    
                    # Ensure we got enough key points
                    if len(key_points) >= 3:
                        return key_points
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
    
    def extract_key_points_fallback(self, transcript, video_id):
        """Extract key points with timestamps using fallback methods."""
        try:
            # Use LexRank to find important sentences
            parser = PlaintextParser.from_string(transcript, Tokenizer("english"))
            stemmer = Stemmer("english")
            summarizer = LexRankSummarizer(stemmer)
            summarizer.stop_words = get_stop_words("english")
            
            # Split transcript into segments
            segments = self.split_transcript_into_segments(transcript, 5)
            words = transcript.split()
            
            # Get more sentences than we need
            sentences = summarizer(parser.document, 10)
            
            # Convert to text and find their positions in the transcript
            key_points = []
            for sentence in sentences[:7]:  # Limit to 7 key points
                sentence_text = str(sentence)
                
                # Find the approximate position of this sentence in the transcript
                start_idx = transcript.find(sentence_text)
                if start_idx == -1:
                    # If exact match not found, try to find a close match
                    for i, segment in enumerate(segments):
                        if sentence_text in segment:
                            start_idx = sum(len(s) for s in segments[:i])
                            break
                    else:
                        # If still not found, estimate based on sentence index
                        start_idx = (len(transcript) * sentences.index(sentence)) // len(sentences)
                
                # Calculate timestamp
                minutes = int(start_idx / 150)  # Assuming 150 words per minute
                seconds = int((start_idx / 150 - minutes) * 60)
                timestamp = f"{minutes}:{seconds:02d}"
                
                key_points.append({"timestamp": timestamp, "point": sentence_text})
            
            return key_points
            
        except Exception as e:
            print(f"Error extracting key points: {e}")
            # Fallback method if the advanced method fails
            return self.simple_extract_key_points(transcript, video_id)
    
    def simple_extract_key_points(self, transcript, video_id):
        """A very simple method to extract key points from transcript."""
        # Just take sentences from different parts of the transcript
        words = transcript.split()
        total_words = len(words)
        
        key_points = []
        for i in range(5):  # 5 key points
            # Calculate position for this key point
            position = (i * total_words) // 5
            
            # Get a sentence around this position
            start = max(0, position - 10)
            end = min(total_words, position + 30)
            sentence = " ".join(words[start:end])
            
            # Calculate timestamp
            minutes = (i * 20) // 5  # Spread over 20 minutes
            timestamp = f"{minutes}:00"
            
            key_points.append({"timestamp": timestamp, "point": sentence})
        
        return key_points
    
    def split_transcript_into_segments(self, transcript, num_segments):
        """Split transcript into approximately equal segments."""
        words = transcript.split()
        segment_size = len(words) // num_segments
        
        segments = []
        for i in range(num_segments):
            start = i * segment_size
            end = start + segment_size if i < num_segments - 1 else len(words)
            segments.append(" ".join(words[start:end]))
        
        return segments
    
    def lexrank_summarize(self, text, sentences_count=10, language="english"):
        """Summarize text using LexRank algorithm."""
        try:
            parser = PlaintextParser.from_string(text, Tokenizer(language))
            stemmer = Stemmer(language)
            summarizer = LexRankSummarizer(stemmer)
            summarizer.stop_words = get_stop_words(language)
            
            # Get summary sentences
            summary_sentences = summarizer(parser.document, sentences_count)
            
            # Join into a single text
            summary = " ".join(str(sentence) for sentence in summary_sentences)
            
            return summary
            
        except Exception as e:
            print(f"LexRank summarization error: {e}")
            return None
    
    def simple_summarize(self, text, sentences_count=10):
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
            
            # Tokenize the text
            words = text_for_analysis.split()
            
            # Remove stop words
            stop_words = set(get_stop_words("english"))
            filtered_words = [word for word in words if word not in stop_words and len(word) > 1]
            
            # Calculate word frequencies
            word_frequencies = Counter(filtered_words)
            
            # Normalize frequencies
            max_frequency = max(word_frequencies.values()) if word_frequencies else 1
            for word in word_frequencies:
                word_frequencies[word] = word_frequencies[word] / max_frequency
            
            # Split the original text into sentences
            import re
            sentences = re.split(r'(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|\!)\s', original_text)
            
            # Calculate sentence scores based on word frequencies
            sentence_scores = {}
            for sentence in sentences:
                # Skip very short sentences
                if len(sentence.split()) < 3:
                    continue
                    
                for word in sentence.lower().split():
                    # Remove punctuation from the word
                    word = ''.join(c for c in word if c not in punctuation)
                    if word in word_frequencies:
                        if sentence not in sentence_scores:
                            sentence_scores[sentence] = 0
                        sentence_scores[sentence] += word_frequencies[word]
            
            # Get the top sentences
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
    
    def get_video_info(self, video_id):
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

# Example usage
if __name__ == "__main__":
    # This would be used to test the improved summary agent
    pass
