import os
import json
import httpx
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class FactCheckResult(BaseModel):
    claim: str
    is_correct: bool
    confidence: float
    explanation: str
    sources: List[Dict[str, str]]

class PerplexityService:
    """Service for fact-checking using Perplexity API"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("PERPLEXITY_API_KEY")
        if not self.api_key:
            raise ValueError("Perplexity API key is required")
        
        self.api_url = "https://api.perplexity.ai/chat/completions"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    async def fact_check_claim(self, claim: str) -> FactCheckResult:
        """
        Fact-check a single claim using Perplexity API
        
        Args:
            claim: The claim to fact-check
            
        Returns:
            FactCheckResult object with the fact-checking results
        """
        prompt = f"""
        I need you to fact-check the following claim and provide sources:
        
        CLAIM: {claim}
        
        Please determine if this claim is correct, partially correct, or incorrect.
        Provide a confidence score between 0 and 1, where 1 is completely confident.
        Explain your reasoning and provide at least 2-3 reliable sources with URLs.
        
        Format your response as a JSON object with the following structure:
        {{
            "is_correct": true/false,
            "confidence": 0.XX,
            "explanation": "Your explanation here",
            "sources": [
                {{"title": "Source Title", "url": "https://source.url", "snippet": "Relevant quote from source"}}
            ]
        }}
        """
        
        payload = {
            "model": "llama-3-sonar-large-32k-online",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1,
            "max_tokens": 2048
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                self.api_url,
                headers=self.headers,
                json=payload
            )
            
            if response.status_code != 200:
                raise Exception(f"Perplexity API error: {response.text}")
            
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            
            # Extract JSON from the response
            try:
                # Find JSON in the response (it might be wrapped in markdown code blocks)
                json_str = content
                if "```json" in content:
                    json_str = content.split("```json")[1].split("```")[0].strip()
                elif "```" in content:
                    json_str = content.split("```")[1].split("```")[0].strip()
                
                fact_check_data = json.loads(json_str)
                
                # Create and return FactCheckResult
                return FactCheckResult(
                    claim=claim,
                    is_correct=fact_check_data.get("is_correct", False),
                    confidence=fact_check_data.get("confidence", 0.0),
                    explanation=fact_check_data.get("explanation", "No explanation provided"),
                    sources=fact_check_data.get("sources", [])
                )
            except Exception as e:
                # If JSON parsing fails, try to extract information manually
                return FactCheckResult(
                    claim=claim,
                    is_correct=False,
                    confidence=0.0,
                    explanation=f"Error parsing response: {str(e)}",
                    sources=[]
                )
    
    async def fact_check_claims(self, claims: List[str]) -> List[FactCheckResult]:
        """
        Fact-check multiple claims using Perplexity API
        
        Args:
            claims: List of claims to fact-check
            
        Returns:
            List of FactCheckResult objects with the fact-checking results
        """
        results = []
        for claim in claims:
            result = await self.fact_check_claim(claim)
            results.append(result)
        
        return results
