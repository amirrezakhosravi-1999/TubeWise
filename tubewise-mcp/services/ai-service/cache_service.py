import json
import redis
import os
import time
from typing import Any, Dict, List, Optional, Union
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Redis connection settings
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "")
REDIS_DB = int(os.getenv("REDIS_DB", "0"))

# Cache expiration times (in seconds)
DEFAULT_CACHE_TTL = 60 * 60 * 24 * 7  # 7 days
TRANSCRIPT_CACHE_TTL = 60 * 60 * 24 * 30  # 30 days
SUMMARY_CACHE_TTL = 60 * 60 * 24 * 7  # 7 days
COMPARISON_CACHE_TTL = 60 * 60 * 24 * 3  # 3 days

class CacheService:
    """Service for caching video transcripts, summaries, and analysis results."""
    
    def __init__(self):
        """Initialize the cache service with Redis connection."""
        try:
            self.redis = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                password=REDIS_PASSWORD,
                db=REDIS_DB,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5
            )
            # Test connection
            self.redis.ping()
            logger.info("Connected to Redis cache")
        except redis.ConnectionError as e:
            logger.warning(f"Could not connect to Redis: {e}. Using fallback in-memory cache.")
            self.redis = None
            self.memory_cache = {}
    
    def _get_key(self, key_type: str, identifier: str) -> str:
        """Generate a cache key with a prefix for organization.
        
        Args:
            key_type: Type of data (e.g., 'transcript', 'summary')
            identifier: Unique identifier (e.g., video ID)
            
        Returns:
            Formatted cache key
        """
        return f"tubewise:{key_type}:{identifier}"
    
    def set(self, key_type: str, identifier: str, data: Any, ttl: int = DEFAULT_CACHE_TTL) -> bool:
        """Store data in the cache.
        
        Args:
            key_type: Type of data being stored
            identifier: Unique identifier
            data: Data to store (will be JSON serialized)
            ttl: Time-to-live in seconds
            
        Returns:
            True if successful, False otherwise
        """
        key = self._get_key(key_type, identifier)
        
        try:
            # Convert data to JSON string
            json_data = json.dumps(data)
            
            if self.redis:
                return self.redis.setex(key, ttl, json_data)
            else:
                # Fallback to in-memory cache
                self.memory_cache[key] = {
                    'data': json_data,
                    'expires_at': time.time() + ttl
                }
                return True
        except Exception as e:
            logger.error(f"Error setting cache for {key}: {e}")
            return False
    
    def get(self, key_type: str, identifier: str) -> Optional[Any]:
        """Retrieve data from the cache.
        
        Args:
            key_type: Type of data to retrieve
            identifier: Unique identifier
            
        Returns:
            Cached data if found and not expired, None otherwise
        """
        key = self._get_key(key_type, identifier)
        
        try:
            if self.redis:
                data = self.redis.get(key)
            else:
                # Fallback to in-memory cache
                cache_item = self.memory_cache.get(key)
                if cache_item and time.time() < cache_item['expires_at']:
                    data = cache_item['data']
                else:
                    data = None
            
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            logger.error(f"Error getting cache for {key}: {e}")
            return None
    
    def delete(self, key_type: str, identifier: str) -> bool:
        """Remove data from the cache.
        
        Args:
            key_type: Type of data to remove
            identifier: Unique identifier
            
        Returns:
            True if successful, False otherwise
        """
        key = self._get_key(key_type, identifier)
        
        try:
            if self.redis:
                return bool(self.redis.delete(key))
            else:
                # Fallback to in-memory cache
                if key in self.memory_cache:
                    del self.memory_cache[key]
                    return True
                return False
        except Exception as e:
            logger.error(f"Error deleting cache for {key}: {e}")
            return False
    
    def cache_transcript(self, video_id: str, transcript_data: Dict) -> bool:
        """Cache a video transcript.
        
        Args:
            video_id: YouTube video ID
            transcript_data: Transcript data to cache
            
        Returns:
            True if successful, False otherwise
        """
        return self.set("transcript", video_id, transcript_data, TRANSCRIPT_CACHE_TTL)
    
    def get_transcript(self, video_id: str) -> Optional[Dict]:
        """Get a cached video transcript.
        
        Args:
            video_id: YouTube video ID
            
        Returns:
            Cached transcript if found, None otherwise
        """
        return self.get("transcript", video_id)
    
    def cache_summary(self, video_id: str, summary_data: Dict) -> bool:
        """Cache a video summary.
        
        Args:
            video_id: YouTube video ID
            summary_data: Summary data to cache
            
        Returns:
            True if successful, False otherwise
        """
        return self.set("summary", video_id, summary_data, SUMMARY_CACHE_TTL)
    
    def get_summary(self, video_id: str) -> Optional[Dict]:
        """Get a cached video summary.
        
        Args:
            video_id: YouTube video ID
            
        Returns:
            Cached summary if found, None otherwise
        """
        return self.get("summary", video_id)
    
    def cache_comparison(self, video_ids: List[str], comparison_data: Dict) -> bool:
        """Cache a video comparison result.
        
        Args:
            video_ids: List of YouTube video IDs
            comparison_data: Comparison data to cache
            
        Returns:
            True if successful, False otherwise
        """
        # Sort video IDs to ensure consistent cache keys
        sorted_ids = sorted(video_ids)
        comparison_id = "-".join(sorted_ids)
        return self.set("comparison", comparison_id, comparison_data, COMPARISON_CACHE_TTL)
    
    def get_comparison(self, video_ids: List[str]) -> Optional[Dict]:
        """Get a cached video comparison result.
        
        Args:
            video_ids: List of YouTube video IDs
            
        Returns:
            Cached comparison if found, None otherwise
        """
        # Sort video IDs to ensure consistent cache keys
        sorted_ids = sorted(video_ids)
        comparison_id = "-".join(sorted_ids)
        return self.get("comparison", comparison_id)
    
    def cache_chat_response(self, video_id: str, query: str, response_data: Dict) -> bool:
        """Cache a chat response for a specific video and query.
        
        Args:
            video_id: YouTube video ID
            query: User query
            response_data: Chat response data to cache
            
        Returns:
            True if successful, False otherwise
        """
        # Create a hash of the query to use as part of the cache key
        query_hash = str(hash(query.lower().strip()))
        chat_id = f"{video_id}:{query_hash}"
        return self.set("chat", chat_id, response_data, DEFAULT_CACHE_TTL)
    
    def get_chat_response(self, video_id: str, query: str) -> Optional[Dict]:
        """Get a cached chat response for a specific video and query.
        
        Args:
            video_id: YouTube video ID
            query: User query
            
        Returns:
            Cached chat response if found, None otherwise
        """
        # Create a hash of the query to use as part of the cache key
        query_hash = str(hash(query.lower().strip()))
        chat_id = f"{video_id}:{query_hash}"
        return self.get("chat", chat_id)
    
    def clear_video_cache(self, video_id: str) -> bool:
        """Clear all cached data for a specific video.
        
        Args:
            video_id: YouTube video ID
            
        Returns:
            True if successful, False otherwise
        """
        success = True
        
        # Delete transcript cache
        if not self.delete("transcript", video_id):
            success = False
        
        # Delete summary cache
        if not self.delete("summary", video_id):
            success = False
        
        # Delete chat caches (requires pattern matching in Redis)
        if self.redis:
            try:
                chat_pattern = self._get_key("chat", f"{video_id}:*")
                chat_keys = self.redis.keys(chat_pattern)
                
                if chat_keys:
                    if not self.redis.delete(*chat_keys):
                        success = False
            except Exception as e:
                logger.error(f"Error clearing chat cache for video {video_id}: {e}")
                success = False
        
        return success
    
    def health_check(self) -> bool:
        """Check if the cache service is healthy.
        
        Returns:
            True if healthy, False otherwise
        """
        try:
            if self.redis:
                return self.redis.ping()
            return True  # In-memory cache is always "healthy"
        except Exception:
            return False

# Create a singleton instance
cache_service = CacheService()
