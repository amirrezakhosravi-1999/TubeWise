import requests
import json
import sys
import os

# Add parent directory to path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_api_health():
    """Test the API health endpoint."""
    try:
        response = requests.get("http://localhost:8000/health")
        print(f"Health check status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error connecting to API: {e}")
        return False

def test_video_summary(video_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"):
    """Test the video summary endpoint."""
    try:
        payload = {"url": video_url}
        response = requests.post("http://localhost:8000/api/summarize", json=payload)
        print(f"Summary status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"Video ID: {result.get('videoId')}")
            print(f"Summary length: {len(result.get('summary', ''))}")
            print(f"Key points: {len(result.get('keyPoints', []))}")
        else:
            print(f"Error response: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error testing summary: {e}")
        return False

def test_chat_with_video(video_id="dQw4w9WgXcQ", message="What is this video about?"):
    """Test the chat with video endpoint."""
    try:
        payload = {"videoId": video_id, "message": message}
        response = requests.post("http://localhost:8000/api/chat", json=payload)
        print(f"Chat status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"Response: {result.get('response')[:100]}...")
        else:
            print(f"Error response: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error testing chat: {e}")
        return False

def test_content_generation(video_id="dQw4w9WgXcQ", content_type="twitter"):
    """Test the content generation endpoint."""
    try:
        payload = {"videoId": video_id, "contentType": content_type}
        response = requests.post("http://localhost:8000/api/generate", json=payload)
        print(f"Content generation status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"Generated content: {result.get('content')[:100]}...")
        else:
            print(f"Error response: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error testing content generation: {e}")
        return False

def run_all_tests():
    """Run all API tests."""
    print("=== TubeWise API Tests ===")
    
    print("\n1. Testing API Health")
    health_ok = test_api_health()
    
    if not health_ok:
        print("API health check failed. Make sure the API server is running.")
        return False
    
    print("\n2. Testing Video Summary")
    summary_ok = test_video_summary()
    
    print("\n3. Testing Chat with Video")
    chat_ok = test_chat_with_video()
    
    print("\n4. Testing Content Generation")
    content_ok = test_content_generation()
    
    # Print summary
    print("\n=== Test Results ===")
    print(f"API Health: {'✅ PASS' if health_ok else '❌ FAIL'}")
    print(f"Video Summary: {'✅ PASS' if summary_ok else '❌ FAIL'}")
    print(f"Chat with Video: {'✅ PASS' if chat_ok else '❌ FAIL'}")
    print(f"Content Generation: {'✅ PASS' if content_ok else '❌ FAIL'}")
    
    return all([health_ok, summary_ok, chat_ok, content_ok])

if __name__ == "__main__":
    run_all_tests()
