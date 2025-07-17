"""
Transformer-based summarization module for high-quality text summarization.
This module uses pre-trained transformer models from Hugging Face for summarization.
"""

import torch
from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM
import re
import time
from typing import List, Dict, Any, Optional

class TransformerSummarizer:
    """
    A class for high-quality text summarization using transformer models.
    """
    
    def __init__(self, model_name="facebook/bart-large-cnn"):
        """
        Initialize the summarizer with a pre-trained model.
        
        Args:
            model_name (str): Name of the pre-trained model to use.
                Options include:
                - "facebook/bart-large-cnn" (default, good for news articles)
                - "sshleifer/distilbart-cnn-12-6" (faster, smaller model)
                - "t5-base" (good general purpose summarizer)
                - "google/pegasus-xsum" (very good for extreme summarization)
        """
        # Per user request, use the higher quality model
        # Override if a smaller model was specified
        if model_name == "distilbert-base-uncased":
            model_name = "facebook/bart-large-cnn"
            print("Using high-quality model facebook/bart-large-cnn instead of distilbert per user request")
        
        self.model_name = model_name
        print(f"Loading transformer summarization model: {model_name}")
        
        # Load model and tokenizer
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.model = AutoModelForSeq2SeqLM.from_pretrained(model_name, low_cpu_mem_usage=True)
            # Force CPU usage to avoid CUDA errors
            self.device = "cpu"
            self.model.to(self.device)
            print(f"Model loaded successfully. Using device: {self.device}")
            
            # Create summarization pipeline
            self.summarizer = pipeline(
                "summarization", 
                model=self.model, 
                tokenizer=self.tokenizer,
                device=-1  # Use CPU
            )
        except Exception as e:
            print(f"Error loading model: {e}")
            # Fallback to pipeline which will download the model if needed
            try:
                self.summarizer = pipeline("summarization", model=model_name)
                print("Model loaded through pipeline fallback")
            except Exception as e:
                print(f"Critical error loading model: {e}")
                raise
    
    def summarize(self, text: str, max_length: int = 300, min_length: int = 100) -> str:
        """
        Generate a summary of the input text.
        
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
            if len(text.split()) > 1024:
                return self.summarize_long_text(text, max_length, min_length)
                
            # Convert max/min length from words to tokens (approximate)
            max_tokens = max_length * 2  # Rough estimate: 1 word ≈ 2 tokens
            min_tokens = min_length * 2
            
            try:
                # Generate summary with error handling
                summary = self.summarizer(
                    text, 
                    max_length=max_tokens,
                    min_length=min_tokens,
                    do_sample=False  # Deterministic generation
                )
                
                # Extract the summary text with safety checks
                if summary and isinstance(summary, list) and len(summary) > 0 and 'summary_text' in summary[0]:
                    summary_text = summary[0]['summary_text']
                else:
                    print("Warning: Unexpected summarizer output format")
                    # Fallback to a simple extractive summary
                    words = text.split()
                    summary_text = " ".join(words[:max_length]) + "..."
            except Exception as e:
                print(f"Error in transformer summarization: {e}")
                # Fallback to a simple extractive summary
                words = text.split()
                summary_text = " ".join(words[:max_length]) + "..."
            
            return summary_text
            
        except Exception as e:
            print(f"Error in summarization: {e}")
            # Return a portion of the original text as fallback
            words = text.split()
            return " ".join(words[:max_length]) + "..."
    
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
        
        # Split text into chunks of approximately 1000 words
        chunks = self.split_into_chunks(text, chunk_size=1000)
        print(f"Split text into {len(chunks)} chunks")
        
        # Summarize each chunk with error handling
        chunk_summaries = []
        for i, chunk in enumerate(chunks):
            print(f"Summarizing chunk {i+1}/{len(chunks)}")
            try:
                # Use a smaller max_length for chunk summaries
                chunk_summary = self.summarizer(
                    chunk,
                    max_length=250,  # Shorter summaries for chunks
                    min_length=100,
                    do_sample=False
                )
                
                # Extract the summary text with safety checks
                if chunk_summary and isinstance(chunk_summary, list) and len(chunk_summary) > 0 and 'summary_text' in chunk_summary[0]:
                    chunk_summaries.append(chunk_summary[0]['summary_text'])
                else:
                    print(f"Warning: Unexpected summarizer output format for chunk {i+1}")
                    # Fallback to a simple extractive summary
                    words = chunk.split()
                    chunk_summaries.append(" ".join(words[:150]) + "...")
            except Exception as e:
                print(f"Error summarizing chunk {i+1}: {e}")
                # Fallback to a simple extractive summary
                words = chunk.split()
                chunk_summaries.append(" ".join(words[:150]) + "...")
        
        # Combine chunk summaries
        combined_summary = " ".join(chunk_summaries)
        
        # If the combined summary is still too long, summarize it again
        if len(combined_summary.split()) > max_length * 1.5:
            print("Combined chunk summaries still too long, summarizing again")
            final_summary = self.summarizer(
                combined_summary,
                max_length=max_length * 2,  # Convert to tokens
                min_length=min_length * 2,
                do_sample=False
            )
            return final_summary[0]['summary_text']
        
        return combined_summary
    
    def split_into_chunks(self, text: str, chunk_size: int = 1000) -> List[str]:
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
            sentences = re.split(r'(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|\!)\s', text)
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
    
    def extract_key_points(self, text: str, video_id: str, num_points: int = 5) -> List[Dict[str, str]]:
        """
        Extract key points with timestamps from the text.
        
        Args:
            text (str): The text to extract key points from
            video_id (str): The ID of the video
            num_points (int): Number of key points to extract
            
        Returns:
            List[Dict[str, str]]: List of key points with timestamps
        """
        # Split text into segments to identify timestamps
        segments = self.split_into_chunks(text, chunk_size=len(text.split()) // num_points)
        
        key_points = []
        for i, segment in enumerate(segments):
            if i >= num_points:
                break
                
            try:
                # Summarize this segment to get a key point
                summary = self.summarizer(
                    segment,
                    max_length=30,  # Very short summary for key points
                    min_length=10,
                    do_sample=False
                )
                
                # Extract the summary text with safety checks
                if summary and isinstance(summary, list) and len(summary) > 0 and 'summary_text' in summary[0]:
                    point_text = summary[0]['summary_text']
                else:
                    print(f"Warning: Unexpected summarizer output format for key point {i+1}")
                    # Fallback to first sentence of segment
                    sentences = segment.split('.')
                    point_text = sentences[0] + '.' if sentences else segment[:100]
            except Exception as e:
                print(f"Error extracting key point {i+1}: {e}")
                # Fallback to first sentence of segment
                sentences = segment.split('.')
                point_text = sentences[0] + '.' if sentences else segment[:100]
            
            # Calculate timestamp based on segment position
            # Assuming a 10-minute video by default
            minutes = (i * 10) // len(segments)
            seconds = ((i * 10) % len(segments)) * (60 // len(segments))
            timestamp = f"{minutes}:{seconds:02d}"
            
            key_points.append({
                "timestamp": timestamp,
                "point": point_text
            })
        
        return key_points

# Example usage
if __name__ == "__main__":
    # This would be used to test the transformer summarizer
    summarizer = TransformerSummarizer()
    test_text = """
    This is a test paragraph. It contains multiple sentences about a topic.
    This is the second sentence. And this is the third one.
    """
    summary = summarizer.summarize(test_text)
    print(f"Summary: {summary}")
