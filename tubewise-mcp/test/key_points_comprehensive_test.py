import sys
import os
import requests
import json
import time
import webbrowser
from pprint import pprint

# Add parent directory to path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_key_points_extraction_and_display(video_url):
    """Test the key points extraction and display for a YouTube video."""
    try:
        print(f"Testing key points extraction and display for video: {video_url}")
        
        # Step 1: Call the API to get the summary
        api_url = "http://localhost:8000/api/summarize"
        payload = {"url": video_url}
        
        print(f"Step 1: Sending request to {api_url}...")
        response = requests.post(api_url, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            
            print("\n=== Summary ===")
            print(f"Video ID: {result.get('videoId')}")
            print(f"Title: {result.get('title')}")
            
            # Step 2: Check if key points are available
            key_points = result.get('keyPoints', [])
            print(f"\n=== Key Points ({len(key_points)}) ===")
            
            if key_points:
                for i, point in enumerate(key_points):
                    print(f"{i+1}. [{point.get('timestamp')}] {point.get('point')}")
            else:
                print("No key points available")
            
            # Step 3: Generate a test HTML file to display the key points
            html_content = generate_test_html(result)
            test_html_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "key_points_test_result.html")
            
            with open(test_html_path, "w", encoding="utf-8") as f:
                f.write(html_content)
            
            print(f"\nStep 3: Generated test HTML file at {test_html_path}")
            
            # Step 4: Open the test HTML file in a browser
            print("Step 4: Opening test HTML file in browser...")
            webbrowser.open(f"file://{test_html_path}")
            
            return len(key_points) > 0
        else:
            print(f"Error: {response.status_code}")
            print(response.text)
            return False
    except Exception as e:
        print(f"Error testing key points extraction and display: {e}")
        return False

def generate_test_html(result):
    """Generate a test HTML file to display the key points."""
    video_id = result.get('videoId', '')
    title = result.get('title', 'Unknown Title')
    summary = result.get('summary', 'No summary available')
    key_points = result.get('keyPoints', [])
    
    # Generate key points HTML
    key_points_html = ""
    if key_points:
        for point in key_points:
            timestamp = point.get('timestamp', '0:00')
            point_text = point.get('point', 'No point text')
            key_points_html += f"""
            <li>
                <span class="timestamp" onclick="openYouTube('{video_id}', '{timestamp}')">{timestamp}</span>
                <span class="point">{point_text}</span>
            </li>
            """
    else:
        key_points_html = '<p class="no-key-points">No key points available</p>'
    
    # Generate HTML content
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TubeWise - {title}</title>
    <style>
        body {{
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }}
        h1 {{
            color: #6B46C1;
            border-bottom: 2px solid #E2E8F0;
            padding-bottom: 10px;
        }}
        .video-container {{
            margin-bottom: 20px;
        }}
        .summary-container {{
            margin-bottom: 30px;
            padding: 15px;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
        }}
        .key-points-container {{
            margin-bottom: 30px;
            padding: 15px;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
        }}
        .timestamp {{
            background-color: #805AD5;
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            margin-right: 8px;
            cursor: pointer;
        }}
        .point {{
            color: #4A5568;
        }}
        .key-points-list {{
            list-style-type: none;
            padding: 0;
        }}
        .key-points-list li {{
            margin-bottom: 10px;
            display: flex;
            align-items: flex-start;
        }}
        .no-key-points {{
            color: #A0AEC0;
            font-style: italic;
        }}
    </style>
</head>
<body>
    <h1>TubeWise - Key Points Test</h1>
    
    <div class="video-container">
        <h2>Video</h2>
        <iframe width="560" height="315" src="https://www.youtube.com/embed/{video_id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
    </div>
    
    <div class="summary-container">
        <h2>Summary</h2>
        <p>{summary}</p>
    </div>
    
    <div class="key-points-container">
        <h2>Key Points with Timestamps</h2>
        <ul class="key-points-list">
            {key_points_html}
        </ul>
    </div>
    
    <script>
        function openYouTube(videoId, timestamp) {{
            // Convert timestamp to seconds
            let seconds = 0;
            const parts = timestamp.split(':');
            
            if (parts.length === 3) {{
                // HH:MM:SS format
                seconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
            }} else if (parts.length === 2) {{
                // MM:SS format
                seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
            }} else {{
                // SS format
                seconds = parseInt(parts[0]);
            }}
            
            // Open YouTube at specific timestamp
            window.open(`https://www.youtube.com/watch?v=${{videoId}}&t=${{seconds}}s`, '_blank');
        }}
    </script>
</body>
</html>
"""
    
    return html_content

if __name__ == "__main__":
    # Test with different videos
    test_videos = [
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",  # Rick Astley - Never Gonna Give You Up
        "https://www.youtube.com/watch?v=LDEBs9Qw1aU",  # The video that the user mentioned
        "https://www.youtube.com/watch?v=jNQXAC9IVRw"   # Me at the zoo (first YouTube video)
    ]
    
    print("=== Key Points Extraction and Display Test ===")
    
    # Automatically select the second video (the one the user mentioned)
    video_url = test_videos[1]
    
    print(f"\nTesting video: {video_url}")
    print("\n" + "="*50)
    success = test_key_points_extraction_and_display(video_url)
    print(f"Test result: {'SUCCESS' if success else 'FAILURE'}")
    print("="*50)
