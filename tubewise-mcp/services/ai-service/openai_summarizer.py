"""OpenAI-based summarization module for high-quality text summarization."""

import os
import time
import re
from typing import List, Dict, Any, Optional
import openai

class OpenAISummarizer:
    """
    A class for high-quality text summarization using OpenAI API.
    """
    
    def __init__(self):
        """
        Initialize the summarizer with OpenAI API key.
        """
        # Get API key from environment variable
        openai.api_key = os.getenv("OPENAI_API_KEY")
        if not openai.api_key:
            raise ValueError("OpenAI API key not found. Please set the OPENAI_API_KEY environment variable.")
        print("OpenAI summarizer initialized")
    
    def summarize(self, text: str, max_length: int = 300, min_length: int = 100) -> str:
        """
        Generate a summary of the input text using OpenAI API.
        
        Args:
            text (str): The text to summarize
            max_length (int): Maximum length of the summary in words
            min_length (int): Minimum length of the summary in words
            
        Returns:
            str: The generated summary
        """
        if not text or len(text.split()) < 100:
            print("Text too short for summarization, returning original")
            return text
            
        try:
            # For very long texts, we need to chunk and summarize separately
            if len(text.split()) > 4000:  # GPT-3.5 has a context limit
                return self.summarize_long_text(text, max_length, min_length)
                
            # Prepare the prompt for OpenAI
            prompt = f"""Please provide a comprehensive yet concise summary of the following text. 
            The summary should capture the main points and key insights from the entire text.
            Focus on the most important information and ensure the summary gives a complete overview.
            
            TEXT TO SUMMARIZE:
            {text}
            
            SUMMARY:"""
            
            # Call OpenAI API with retry logic
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    response = openai.chat.completions.create(
                        model="gpt-3.5-turbo-16k",  # Using a model with larger context window
                        messages=[
                            {"role": "system", "content": "You are an expert video summarizer. Create concise, informative summaries that capture the essence of content."},
                            {"role": "user", "content": prompt}
                        ],
                        max_tokens=max_length * 4,  # Rough estimate: 1 word ≈ 4 tokens
                        temperature=0.5,  # Lower temperature for more focused output
                    )
                    
                    # Extract the summary from the response
                    summary = response.choices[0].message.content.strip()
                    
                    # Ensure we got a meaningful summary
                    if summary and len(summary) > 50:
                        return summary
                    else:
                        print(f"OpenAI returned too short summary, attempt {attempt+1}/{max_retries}")
                        
                except Exception as e:
                    print(f"OpenAI API error, attempt {attempt+1}/{max_retries}: {e}")
                    if attempt < max_retries - 1:
                        time.sleep(2)  # Wait before retrying
            
            # If all attempts failed, return a simple extractive summary
            print("Failed to generate summary with OpenAI, using fallback method")
            return self._simple_summarize(text, max_length)
            
        except Exception as e:
            print(f"Error in summarization: {e}")
            # Return a portion of the original text as fallback
            return self._simple_summarize(text, max_length)
    
    def summarize_long_text(self, text: str, max_length: int = 300, min_length: int = 100) -> str:
        """
        Summarize a long text by breaking it into chunks, summarizing each chunk,
        and then summarizing the combined summaries.
        
        Args:
            text (str): The long text to summarize
            max_length (int): Maximum length of the final summary in words
            min_length (int): Minimum length of the final summary in words
            
        Returns:
            str: The generated summary
        """
        print(f"Text is long ({len(text.split())} words), using chunk-based summarization")
        
        # Split text into chunks of approximately 4000 words (GPT-3.5 context limit)
        chunks = self._split_into_chunks(text, chunk_size=4000)
        print(f"Split text into {len(chunks)} chunks")
        
        # Summarize each chunk
        chunk_summaries = []
        for i, chunk in enumerate(chunks):
            print(f"Summarizing chunk {i+1}/{len(chunks)}")
            chunk_summary = self.summarize(chunk, max_length=max_length//2, min_length=min_length//2)
            chunk_summaries.append(chunk_summary)
        
        # Combine chunk summaries
        combined_summary = "\n\n".join([f"Part {i+1}: {summary}" for i, summary in enumerate(chunk_summaries)])
        
        # If the combined summary is still too long, summarize it again
        if len(combined_summary.split()) > max_length * 1.5:
            print("Combined chunk summaries still too long, summarizing again")
            final_summary_prompt = f"""Below are summaries of different parts of a text.
            Please create a comprehensive yet concise final summary that integrates all these parts into a coherent overview.
            Focus on the most important points and ensure the summary gives a complete picture of the content.
            
            PART SUMMARIES:
            {combined_summary}
            
            FINAL COMPREHENSIVE SUMMARY:"""
            
            # Call OpenAI API for the final summary
            try:
                response = openai.chat.completions.create(
                    model="gpt-3.5-turbo-16k",
                    messages=[
                        {"role": "system", "content": "You are an expert at creating comprehensive summaries from partial summaries. Create a coherent, flowing summary that captures the essence of the entire content."},
                        {"role": "user", "content": final_summary_prompt}
                    ],
                    max_tokens=max_length * 4,
                    temperature=0.5,
                )
                
                return response.choices[0].message.content.strip()
            except Exception as e:
                print(f"Error in final summarization: {e}")
                # If final summarization fails, just return the combined summaries
                return " ".join(chunk_summaries)
        
        return combined_summary
    
    def extract_key_points(self, text: str, video_id: str, num_points: int = 5) -> List[Dict[str, str]]:
        """
        Extract key points with timestamps from the text using OpenAI API.
        
        Args:
            text (str): The text to extract key points from
            video_id (str): The ID of the video
            num_points (int): Number of key points to extract
            
        Returns:
            List[Dict[str, str]]: List of key points with timestamps
        """
        try:
            # Prepare the prompt for OpenAI
            prompt = f"""Extract {num_points} key points from the following transcript of a video.
            For each key point, provide a timestamp (in mm:ss format) and a brief description of the key point.
            The timestamps should be evenly distributed throughout the video to cover the entire content.
            
            TRANSCRIPT:
            {text}
            
            KEY POINTS (format each point as 'mm:ss - description'):"""
            
            # Call OpenAI API
            response = openai.chat.completions.create(
                model="gpt-3.5-turbo-16k",
                messages=[
                    {"role": "system", "content": "You are an expert at extracting key points from video transcripts. Provide concise, informative key points with accurate timestamps."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1000,
                temperature=0.5,
            )
            
            # Extract key points from the response
            key_points_text = response.choices[0].message.content.strip()
            
            # Parse key points
            key_points = []
            for line in key_points_text.split('\n'):
                line = line.strip()
                if not line or line.startswith('#') or line.startswith('KEY POINTS'):
                    continue
                    
                # Remove numbering if present
                line = re.sub(r'^\d+\.\s*', '', line)
                
                # Extract timestamp and point
                match = re.match(r'([0-9]+:[0-9]+)\s*-\s*(.+)', line)
                if match:
                    timestamp, point = match.groups()
                    key_points.append({
                        "timestamp": timestamp,
                        "point": point.strip()
                    })
            
            # If we couldn't extract enough key points, generate some
            if len(key_points) < num_points:
                print(f"Only extracted {len(key_points)} key points, generating more")
                missing_points = num_points - len(key_points)
                
                # Calculate timestamps for missing points
                # Assume a 10-minute video by default
                for i in range(missing_points):
                    minutes = (i * 10) // num_points
                    seconds = ((i * 10) % num_points) * (60 // num_points)
                    timestamp = f"{minutes}:{seconds:02d}"
                    
                    # Generate a point for this timestamp
                    segment_index = (i * len(text.split())) // num_points
                    segment_end = ((i + 1) * len(text.split())) // num_points
                    segment = " ".join(text.split()[segment_index:segment_end])
                    
                    # Use the first sentence as the point
                    sentences = segment.split('.')
                    point = sentences[0] + '.' if sentences else segment[:100]
                    
                    key_points.append({
                        "timestamp": timestamp,
                        "point": point.strip()
                    })
            
            return key_points[:num_points]  # Limit to requested number of points
            
        except Exception as e:
            print(f"Error extracting key points: {e}")
            return self._simple_extract_key_points(text, video_id, num_points)
    
    def _split_into_chunks(self, text: str, chunk_size: int = 4000) -> List[str]:
        """
        Split text into chunks of approximately chunk_size words,
        trying to break at paragraph or sentence boundaries.
        
        Args:
            text (str): The text to split
            chunk_size (int): Target size of each chunk in words
            
        Returns:
            List[str]: List of text chunks
        """
        # First try to split by paragraphs
        paragraphs = text.split('\n\n')
        
        # If we only have one paragraph or very few, split by sentences
        if len(paragraphs) < 3:
            sentences = re.split(r'(?<!\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|\!)\s', text)
            return self._combine_units(sentences, chunk_size)
        
        return self._combine_units(paragraphs, chunk_size)
    
    def _combine_units(self, units: List[str], chunk_size: int) -> List[str]:
        """
        Combine text units (paragraphs or sentences) into chunks of approximately chunk_size words.
        
        Args:
            units (List[str]): List of text units to combine
            chunk_size (int): Target size of each chunk in words
            
        Returns:
            List[str]: List of text chunks
        """
        chunks = []
        current_chunk = []
        current_size = 0
        
        for unit in units:
            unit_size = len(unit.split())
            
            if current_size + unit_size <= chunk_size:
                current_chunk.append(unit)
                current_size += unit_size
            else:
                # If the current chunk has content, add it to chunks
                if current_chunk:
                    chunks.append(' '.join(current_chunk))
                
                # Start a new chunk with this unit
                current_chunk = [unit]
                current_size = unit_size
        
        # Add the last chunk if it has content
        if current_chunk:
            chunks.append(' '.join(current_chunk))
        
        return chunks
    
    def _simple_summarize(self, text: str, max_words: int = 300) -> str:
        """
        A simple extractive summarization method based on sentence importance.
        
        Args:
            text (str): The text to summarize
            max_words (int): Maximum length of the summary in words
            
        Returns:
            str: The generated summary
        """
        # Split text into sentences
        sentences = re.split(r'(?<!\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|\!)\s', text)
        
        # If there are very few sentences, just return the text
        if len(sentences) <= 3:
            return text
        
        # Calculate sentence importance based on position
        # First and last sentences are usually more important
        importance = {}
        for i, sentence in enumerate(sentences):
            # Position-based importance: beginning and end are more important
            pos_importance = 1.0
            if i < len(sentences) * 0.2:  # First 20%
                pos_importance = 2.0
            elif i > len(sentences) * 0.8:  # Last 20%
                pos_importance = 1.5
            
            # Length-based importance: longer sentences often contain more information
            length_importance = min(1.0, len(sentence.split()) / 20.0)
            
            # Combined importance
            importance[i] = pos_importance * length_importance
        
        # Sort sentences by importance
        sorted_sentences = sorted(range(len(sentences)), key=lambda i: importance[i], reverse=True)
        
        # Select top sentences to form summary (up to max_words)
        selected_indices = []
        word_count = 0
        for i in sorted_sentences:
            sentence_words = len(sentences[i].split())
            if word_count + sentence_words <= max_words:
                selected_indices.append(i)
                word_count += sentence_words
            else:
                break
        
        # Sort selected indices to maintain original order
        selected_indices.sort()
        
        # Combine selected sentences
        summary = ' '.join([sentences[i] for i in selected_indices])
        
        return summary
    
    def _simple_extract_key_points(self, text: str, video_id: str, num_points: int = 5) -> List[Dict[str, str]]:
        """
        A simple method to extract key points with timestamps.
        
        Args:
            text (str): The text to extract key points from
            video_id (str): The ID of the video
            num_points (int): Number of key points to extract
            
        Returns:
            List[Dict[str, str]]: List of key points with timestamps
        """
        # Split text into segments
        words = text.split()
        segment_size = max(1, len(words) // num_points)
        
        key_points = []
        for i in range(min(num_points, len(words) // segment_size)):
            # Extract segment
            start_idx = i * segment_size
            end_idx = min((i + 1) * segment_size, len(words))
            segment = ' '.join(words[start_idx:end_idx])
            
            # Calculate timestamp
            # Assuming a 10-minute video by default
            minutes = (i * 10) // num_points
            seconds = ((i * 10) % num_points) * (60 // num_points)
            timestamp = f"{minutes}:{seconds:02d}"
            
            # Extract first sentence as key point
            sentences = segment.split('.')
            point = sentences[0] + '.' if sentences else segment[:100]
            
            key_points.append({
                "timestamp": timestamp,
                "point": point.strip()
            })
        
        return key_points
