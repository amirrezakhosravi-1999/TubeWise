import sys
import os
import requests
import json
from pprint import pprint

# Add parent directory to path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_key_points_extraction(video_url):
    """Test the key points extraction for a YouTube video."""
    try:
        print(f"Testing key points extraction for video: {video_url}")
        
        # Call the API to get the summary
        api_url = "http://localhost:8000/api/summarize"
        payload = {"url": video_url}
        
        print(f"Sending request to {api_url}...")
        response = requests.post(api_url, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            
            print("\n=== Summary ===")
            print(f"Video ID: {result.get('videoId')}")
            print(f"Title: {result.get('title')}")
            
            # Check if key points are available
            key_points = result.get('keyPoints', [])
            print(f"\n=== Key Points ({len(key_points)}) ===")
            
            if key_points:
                for i, point in enumerate(key_points):
                    print(f"{i+1}. [{point.get('timestamp')}] {point.get('point')}")
            else:
                print("No key points available")
                
            # Print raw response for debugging
            print("\n=== Raw Response ===")
            pprint(result)
            
            return len(key_points) > 0
        else:
            print(f"Error: {response.status_code}")
            print(response.text)
            return False
    except Exception as e:
        print(f"Error testing key points extraction: {e}")
        return False

if __name__ == "__main__":
    # Test with different videos
    test_videos = [
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",  # Rick Astley - Never Gonna Give You Up
        "https://www.youtube.com/watch?v=LDEBs9Qw1aU",  # The video that the user mentioned
        "https://www.youtube.com/watch?v=jNQXAC9IVRw"   # Me at the zoo (first YouTube video)
    ]
    
    print("=== Key Points Extraction Test ===")
    
    for video in test_videos:
        print("\n" + "="*50)
        success = test_key_points_extraction(video)
        print(f"Test result: {'SUCCESS' if success else 'FAILURE'}")
        print("="*50)
