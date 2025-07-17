import requests
import json
from pprint import pprint

def debug_key_points(video_url):
    """Debug the key points extraction for a YouTube video."""
    try:
        print(f"Debugging key points extraction for video: {video_url}")
        
        # Call the API to get the summary
        api_url = "http://localhost:8000/api/summarize"
        payload = {"url": video_url}
        
        print(f"Sending request to {api_url}...")
        response = requests.post(api_url, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            
            # Print raw response for debugging
            print("\n=== Raw Response ===")
            pprint(result)
            
            # Check if key points are available
            key_points = result.get('keyPoints', [])
            print(f"\n=== Key Points ({len(key_points)}) ===")
            
            if key_points:
                for i, point in enumerate(key_points):
                    print(f"{i+1}. Structure: {type(point)}")
                    for key, value in point.items():
                        print(f"   - {key}: {value} (type: {type(value)})")
            else:
                print("No key points available")
            
            # Check if key_points is None or empty list
            if key_points is None:
                print("key_points is None")
            elif len(key_points) == 0:
                print("key_points is an empty list")
            else:
                print(f"key_points has {len(key_points)} items")
                
            return key_points
        else:
            print(f"Error: {response.status_code}")
            print(response.text)
            return None
    except Exception as e:
        print(f"Error debugging key points extraction: {e}")
        return None

if __name__ == "__main__":
    # Test with the video that the user mentioned
    video_url = "https://www.youtube.com/watch?v=LDEBs9Qw1aU"
    
    print("=== Key Points Debugging ===")
    key_points = debug_key_points(video_url)
    
    # If key_points is not None and not empty, check the structure
    if key_points and len(key_points) > 0:
        print("\n=== First Key Point Structure ===")
        first_point = key_points[0]
        print(f"Type: {type(first_point)}")
        print(f"Keys: {first_point.keys()}")
        print(f"Values: {first_point.values()}")
        
        # Check if the expected keys are present
        expected_keys = ['timestamp', 'point']
        for key in expected_keys:
            if key in first_point:
                print(f"Key '{key}' is present with value: {first_point[key]}")
            else:
                print(f"Key '{key}' is missing")
    
    print("\n=== Debugging Complete ===")
