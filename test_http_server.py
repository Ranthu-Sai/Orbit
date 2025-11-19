#!/usr/bin/env python3
"""
HTTP Test Server for Chaquopy YouTube Endpoints
Run this server and then use Postman or browser to test endpoints
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os

# Add the android python directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'android/app/src/main/python'))

try:
    # Import our YouTube API module
    from youtube_api import call_function
    import json

    app = Flask(__name__)
    CORS(app)

    @app.route('/test/<function_name>', methods=['GET', 'POST'])
    def test_endpoint(function_name):
        """Dynamic endpoint that maps to Python functions"""
        try:
            # Get parameters from URL args or JSON body
            params = {}

            if request.method == 'POST' and request.is_json:
                params = request.get_json()
            else:
                # Get from URL parameters
                for key, value in request.args.items():
                    # Try to parse as JSON first, then fall back to string
                    try:
                        params[key] = json.loads(value)
                    except (json.JSONDecodeError, TypeError):
                        params[key] = value

            print(f"Testing function: {function_name}")
            print(f"Parameters: {params}")

            # Call the Python function
            result_json = call_function(function_name, params)
            result = json.loads(result_json)

            return jsonify(result)

        except Exception as e:
            error_response = {
                "error": f"HTTP endpoint error: {str(e)}",
                "function": function_name,
                "params": params if 'params' in locals() else {}
            }
            print(f"Error in {function_name}: {e}")
            return jsonify(error_response), 500

    @app.route('/', methods=['GET'])
    def index():
        """List all available endpoints"""
        endpoints = {
            "status": "Chaquopy YouTube API Test Server",
            "version": "1.0",
            "available_endpoints": {
                "GET/POST /test/get_home": {
                    "description": "Get YouTube Music home feed",
                    "params": {"limit": 10}
                },
                "GET/POST /test/search": {
                    "description": "Search YouTube Music",
                    "params": {"query": "song name", "filter": "songs", "limit": 5}
                },
                "GET/POST /test/get_stream_url": {
                    "description": "Get stream URL for video",
                    "params": {"video_id": "VIDEO_ID"}
                },
                "GET/POST /test/get_video_info": {
                    "description": "Get video metadata",
                    "params": {"video_id": "VIDEO_ID"}
                },
                "GET/POST /test/get_adaptive_streams": {
                    "description": "Get DASH adaptive streams",
                    "params": {"video_id": "VIDEO_ID"}
                },
                "GET/POST /test/get_highest_quality_stream": {
                    "description": "Get best quality stream",
                    "params": {"video_id": "VIDEO_ID", "audio_only": True}
                },
                "GET/POST /test/search_and_stream": {
                    "description": "Search and get stream (combined)",
                    "params": {"song_name": "song", "artist_name": "artist"}
                },
                "GET/POST /test/get_charts": {
                    "description": "Get music charts",
                    "params": {"country": "US"}
                },
                "GET/POST /test/clear_cache": {
                    "description": "Clear all cached data",
                    "params": {}
                }
            },
            "examples": {
                "curl_search": 'curl "http://localhost:8080/test/search?query=hello&filter=songs&limit=3"',
                "curl_video_info": 'curl "http://localhost:8080/test/get_video_info?video_id=dQw4w9WgXcQ"',
                "curl_adaptive": 'curl "http://localhost:8080/test/get_adaptive_streams?video_id=dQw4w9WgXcQ"',
                "post_example": 'curl -X POST -H "Content-Type: application/json" -d \'{"query":"hello","filter":"songs"}\' http://localhost:8080/test/search'
            }
        }
        return jsonify(endpoints)

    @app.route('/health', methods=['GET'])
    def health():
        """Health check"""
        return jsonify({
            "status": "healthy",
            "server": "Chaquopy Test Server",
            "endpoints_loaded": "youtube_api"
        })

    def run_server():
        print("🎵 Chaquopy YouTube API Test Server")
        print("=" * 50)
        print("Server starting on http://localhost:8080")
        print("\nAvailable endpoints:")
        print("📄 GET  /              - List all endpoints")
        print("🏥 GET  /health        - Health check")
        print("🧪 GET  /test/<func>   - Test any function via URL params")
        print("🧪 POST /test/<func>   - Test any function via JSON body")
        print("\n📋 Examples:")
        print('curl "http://localhost:8080/test/search?query=hello&filter=songs&limit=3"')
        print('curl "http://localhost:8080/test/get_video_info?video_id=dQw4w9WgXcQ"')
        print('curl -X POST -H "Content-Type: application/json" -d \'{"video_id":"dQw4w9WgXcQ"}\' http://localhost:8080/test/get_adaptive_streams')
        print("\n🔍 Open http://localhost:8080 in your browser for full documentation")
        print("\n❌ Press Ctrl+C to stop the server")
        print("=" * 50)

        app.run(host='0.0.0.0', port=8080, debug=True)

    if __name__ == '__main__':
        run_server()

except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you have installed the required packages:")
    print("pip install ytmusicapi pytubefix diskcache flask flask-cors")
    sys.exit(1)
except Exception as e:
    print(f"❌ Unexpected error: {e}")
    sys.exit(1)
