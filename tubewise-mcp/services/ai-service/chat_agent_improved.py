"""Improved ChatAgent that uses OpenAI API for answering questions about videos."""

import os
import time
import re
from typing import List, Dict, Any, Optional, Tuple
import openai

class ImprovedChatAgent:
    """
    Agent responsible for answering questions about videos using OpenAI API.
    """
    
    def __init__(self, name="ImprovedChatAgent"):
        """
        Initialize the agent with OpenAI API key.
        """
        self.name = name
        
        # Get API key from environment variable
        openai.api_key = os.getenv("OPENAI_API_KEY")
        if not openai.api_key:
            raise ValueError("OpenAI API key not found. Please set the OPENAI_API_KEY environment variable.")
        print(f"Agent {name} initialized with OpenAI")
    
    def process(self, data: Tuple[str, Any, str]) -> Dict[str, Any]:
        """
        Generate response to user question about video.
        
        Args:
            data: Tuple containing (transcript, summary, question)
            
        Returns:
            Dict containing the chat response information
        """
        transcript, summary, question = data
        try:
            # Log inputs for debugging
            print(f"Generating chat response for question: {question}")
            print(f"Video title: {summary.title}")
            print(f"Transcript length: {len(transcript.split())} words")
            
            # Generate chat response using OpenAI
            response = self._generate_openai_response(transcript, summary, question)
            print(f"Generated response: {response[:100]}...")  # Print beginning of response for debugging
            
            # Extract timeline suggestions
            timeline_suggestions = self._extract_timeline_suggestions(transcript, summary, question)
            print(f"Generated {len(timeline_suggestions)} timeline suggestions")
            
            # Import the ChatResponse and TimelineSuggestion classes from the main module
            from simple_app import ChatResponse, TimelineSuggestion
            
            # Convert timeline_suggestions to TimelineSuggestion objects
            timeline_suggestion_objects = [
                TimelineSuggestion(
                    timestamp=suggestion["timestamp"],
                    text=suggestion["text"],
                    relevance=suggestion["relevance"]
                ) for suggestion in timeline_suggestions
            ]
            
            # Create a summary dictionary to be included in ChatResponse
            summary_dict = {
                "videoId": summary.videoId,
                "title": summary.title,
                "summary": summary.summary,
                "keyPoints": summary.keyPoints
            }
            
            # Create ChatResponse object with required summary field
            chat_response = ChatResponse(
                videoId=summary.videoId,
                response=response,
                timeline_suggestions=timeline_suggestion_objects,
                summary=summary_dict
            )
            
            print(f"Returning ChatResponse object for video {summary.videoId}")
            return chat_response
        except Exception as e:
            print(f"Error generating chat response: {e}")
            raise Exception(f"Failed to generate chat response: {str(e)}")
    
    def _generate_openai_response(self, transcript: str, summary: Any, question: str) -> str:
        """
        Generate a response to the user's question using OpenAI API.
        
        Args:
            transcript: The video transcript
            summary: The video summary object
            question: The user's question
            
        Returns:
            str: The generated response
        """
        try:
            # Prepare context for OpenAI
            context = f"""VIDEO TITLE: {summary.title}
            
            VIDEO SUMMARY: {summary.summary}
            
            KEY POINTS:
            {self._format_key_points(summary.keyPoints)}
            
            TRANSCRIPT EXCERPT (relevant parts):
            {self._extract_relevant_transcript_parts(transcript, question)}
            """
            
            # Prepare the prompt for OpenAI
            prompt = f"""You are an AI assistant that helps users understand YouTube videos.
            Below is information about a video, including its title, summary, key points, and relevant parts of the transcript.
            Please answer the user's question based on this information.
            
            {context}
            
            USER QUESTION: {question}
            
            Please provide a helpful, informative response that directly answers the question.
            If the information to answer the question is not available in the provided context, say so clearly.
            """
            
            # Call OpenAI API with retry logic
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    response = openai.chat.completions.create(
                        model="gpt-3.5-turbo-16k",
                        messages=[
                            {"role": "system", "content": "You are an expert video content analyzer. Provide accurate, helpful responses to questions about video content."},
                            {"role": "user", "content": prompt}
                        ],
                        max_tokens=500,
                        temperature=0.7,
                    )
                    
                    # Extract the response from the API result
                    answer = response.choices[0].message.content.strip()
                    
                    # Ensure we got a meaningful response
                    if answer and len(answer) > 20:
                        return answer
                    else:
                        print(f"OpenAI returned too short answer, attempt {attempt+1}/{max_retries}")
                        
                except Exception as e:
                    print(f"OpenAI API error, attempt {attempt+1}/{max_retries}: {e}")
                    if attempt < max_retries - 1:
                        time.sleep(2)  # Wait before retrying
            
            # If all attempts failed, return a simple response
            return f"I couldn't generate a detailed response to your question about '{question}'. Please try asking in a different way or check the video summary for information."
            
        except Exception as e:
            print(f"Error generating OpenAI response: {e}")
            return f"I encountered an error while trying to answer your question. Please try again or check the video summary for information."
    
    def _extract_timeline_suggestions(self, transcript: str, summary: Any, question: str) -> List[Dict[str, str]]:
        """
        Extract timeline suggestions based on the user's question.
        
        Args:
            transcript: The video transcript
            summary: The video summary object
            question: The user's question
            
        Returns:
            List[Dict[str, str]]: List of timeline suggestions
        """
        try:
            # Prepare the prompt for OpenAI
            prompt = f"""Based on the following video information and user question, identify 3 specific timestamps in the video that are most relevant to the question.
            For each timestamp, provide a brief explanation of why it's relevant.
            
            VIDEO TITLE: {summary.title}
            
            VIDEO SUMMARY: {summary.summary}
            
            KEY POINTS WITH TIMESTAMPS:
            {self._format_key_points(summary.keyPoints)}
            
            USER QUESTION: {question}
            
            Please provide exactly 3 timestamps in the format [mm:ss] followed by a brief explanation of why each timestamp is relevant to the question.
            Format each suggestion as: [mm:ss] - explanation
            """
            
            # Call OpenAI API
            response = openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an expert at identifying relevant parts of videos based on timestamps and content."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=300,
                temperature=0.7,
            )
            
            # Extract timeline suggestions from the response
            suggestions_text = response.choices[0].message.content.strip()
            
            # Parse timeline suggestions
            suggestions = []
            for line in suggestions_text.split('\n'):
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                    
                # Extract timestamp and explanation
                match = re.match(r'\[?([0-9]+:[0-9]+)\]?\s*-\s*(.+)', line)
                if match:
                    timestamp, explanation = match.groups()
                    suggestions.append({
                        "timestamp": timestamp,
                        "text": explanation.strip(),
                        "relevance": "high"  # Default to high relevance for AI-generated suggestions
                    })
            
            # If we couldn't extract enough suggestions, use key points
            if len(suggestions) < 3 and summary.keyPoints:
                # Sort key points by relevance to the question
                key_points = sorted(
                    summary.keyPoints,
                    key=lambda kp: self._calculate_relevance(kp.point, question),
                    reverse=True
                )
                
                # Add top key points as suggestions
                for kp in key_points:
                    if len(suggestions) >= 3:
                        break
                        
                    # Check if this timestamp is already in suggestions
                    if not any(s["timestamp"] == kp.timestamp for s in suggestions):
                        suggestions.append({
                            "timestamp": kp.timestamp,
                            "text": kp.point,
                            "relevance": "medium"  # Medium relevance for key points
                        })
            
            # If still not enough suggestions, add some default ones
            while len(suggestions) < 3 and summary.keyPoints:
                # Add first, middle, and last key points
                indices = [0, len(summary.keyPoints) // 2, -1]
                for i in indices:
                    if len(suggestions) >= 3:
                        break
                        
                    kp = summary.keyPoints[i]
                    if not any(s["timestamp"] == kp.timestamp for s in suggestions):
                        suggestions.append({
                            "timestamp": kp.timestamp,
                            "text": kp.point,
                            "relevance": "low"  # Low relevance for default suggestions
                        })
            
            return suggestions[:3]  # Limit to top 3 suggestions
            
        except Exception as e:
            print(f"Error extracting timeline suggestions: {e}")
            
            # Fallback to key points if available
            if summary.keyPoints:
                return [
                    {
                        "timestamp": kp.timestamp,
                        "text": kp.point,
                        "relevance": "medium"
                    } for kp in summary.keyPoints[:3]  # Use up to 3 key points
                ]
            else:
                return []
    
    def _extract_relevant_transcript_parts(self, transcript: str, question: str) -> str:
        """
        Extract parts of the transcript that are most relevant to the question.
        
        Args:
            transcript: The video transcript
            question: The user's question
            
        Returns:
            str: Relevant parts of the transcript
        """
        # Split transcript into sentences
        sentences = re.split(r'(?<!\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|\!)\s', transcript)
        
        # Calculate relevance score for each sentence
        sentence_scores = []
        for sentence in sentences:
            score = self._calculate_relevance(sentence, question)
            sentence_scores.append((sentence, score))
        
        # Sort sentences by relevance score
        sentence_scores.sort(key=lambda x: x[1], reverse=True)
        
        # Take top 10 most relevant sentences
        top_sentences = [sentence for sentence, _ in sentence_scores[:10]]
        
        # Combine sentences into a coherent text
        return " ".join(top_sentences)
    
    def _calculate_relevance(self, text: str, question: str) -> float:
        """
        Calculate the relevance of a text to a question.
        
        Args:
            text: The text to evaluate
            question: The question to compare against
            
        Returns:
            float: Relevance score (higher is more relevant)
        """
        # Simple relevance calculation based on word overlap
        question_words = set(question.lower().split())
        text_words = set(text.lower().split())
        
        # Remove common stop words
        stop_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "with", "about", "is", "are", "was", "were"}
        question_words = question_words - stop_words
        
        # Calculate overlap
        overlap = len(question_words.intersection(text_words))
        
        # Weight by question word coverage
        if len(question_words) > 0:
            return overlap / len(question_words)
        else:
            return 0.0
    
    def _format_key_points(self, key_points: List[Any]) -> str:
        """
        Format key points for inclusion in the prompt.
        
        Args:
            key_points: List of KeyPoint objects
            
        Returns:
            str: Formatted key points
        """
        formatted_points = []
        for i, kp in enumerate(key_points):
            formatted_points.append(f"{i+1}. [{kp.timestamp}] {kp.point}")
        
        return "\n".join(formatted_points)
