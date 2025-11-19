#!/usr/bin/env python3
"""
Standalone test script for Chaquopy YouTube endpoints
Run this to test all Python functions before implementing in Android
"""
import sys
import os

# Add the android python directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'android/app/src/main/python'))

try:
    # Import our YouTube API module
    from youtube_api import *

    def test_all_endpoints():
        print("🎵 Testing Chaquopy YouTube Endpoints")
        print("=" * 50)

        # Test basic functionality
        print("\n1. Testing ytmusicapi connection...")
        try:
            session = get_ytmusic_session()
            print("✅ YTMusic session created successfully")
        except Exception as e:
            print(f"❌ YTMusic session failed: {e}")
            return

        # Test cache functions
        print("\n2. Testing cache operations...")
        try:
            result = clear_cache()
            print("✅ Cache operations working")
            print(f"   Clear result: {result}")
        except Exception as e:
            print(f"❌ Cache operations failed: {e}")

        # Test home feed (might be empty due to no auth)
        print("\n3. Testing home feed...")
        try:
            home_data = get_home(5)
            home_json = json.loads(home_data)
            if "error" in home_json:
                print(f"⚠️  Home feed returned error (expected for no auth): {home_json['error']}")
            else:
                print("✅ Home feed working")
        except Exception as e:
            print(f"❌ Home feed failed: {e}")

        # Test search functionality
        print("\n4. Testing search...")
        try:
            search_results = search("hello", "songs", 3)
            search_json = json.loads(search_results)
            if "error" in search_json:
                print(f"⚠️  Search returned error: {search_json['error']}")
            else:
                results_count = len(search_json.get('results', []))
                print(f"✅ Search working - found {results_count} results")
        except Exception as e:
            print(f"❌ Search failed: {e}")

        # Test pytubefix functions with a real video ID
        print("\n5. Testing PyTubeFix functions...")
        test_video_id = "dQw4w9WgXcQ"  # Rick Astley - Never Gonna Give You Up

        # Test video info
        print("   5a. Testing get_video_info...")
        try:
            info_data = get_video_info(test_video_id)
            info_json = json.loads(info_data)
            if "error" in info_json:
                print(f"⚠️  Video info returned error: {info_json['error']}")
            else:
                print(f"✅ Video info working - Title: {info_json.get('title', 'Unknown')}")
        except Exception as e:
            print(f"❌ Video info failed: {e}")

        # Test adaptive streams
        print("   5b. Testing get_adaptive_streams...")
        try:
            streams_data = get_adaptive_streams(test_video_id)
            streams_json = json.loads(streams_data)
            if "error" in streams_json:
                print(f"⚠️  Adaptive streams returned error: {streams_json['error']}")
            else:
                audio_count = len(streams_json.get('dash_audio', []))
                video_count = len(streams_json.get('dash_video', []))
                print(f"✅ Adaptive streams working - {audio_count} audio, {video_count} video streams")
        except Exception as e:
            print(f"❌ Adaptive streams failed: {e}")

        # Test highest quality stream
        print("   5c. Testing get_highest_quality_stream...")
        try:
            hq_data = get_highest_quality_stream(test_video_id, True)
            hq_json = json.loads(hq_data)
            if "error" in hq_json:
                print(f"⚠️  Highest quality stream returned error: {hq_json['error']}")
            else:
                quality = hq_json.get('quality', 'Unknown')
                print(f"✅ Highest quality stream working - Best: {quality}")
        except Exception as e:
            print(f"❌ Highest quality stream failed: {e}")

        # Test standard stream URL
        print("   5d. Testing get_stream_url...")
        try:
            stream_data = get_stream_url(test_video_id)
            stream_json = json.loads(stream_data)
            if "error" in stream_json:
                print(f"⚠️  Stream URL returned error: {stream_json['error']}")
            else:
                quality = stream_json.get('quality', 'Unknown')
                print(f"✅ Stream URL working - Quality: {quality}")
        except Exception as e:
            print(f"❌ Stream URL failed: {e}")

        # Test charts (might require region-specific data)
        print("\n6. Testing charts...")
        try:
            charts_data = get_charts('US')
            charts_json = json.loads(charts_data)
            if "error" in charts_json:
                print(f"⚠️  Charts returned error: {charts_json['error']}")
            else:
                print("✅ Charts working")
        except Exception as e:
            print(f"❌ Charts failed: {e}")

        print("\n" + "=" * 50)
        print("🎉 Testing completed!")
        print("\nNote: Some functions may show 'expected errors' due to:")
        print("- No YouTube authentication (home feed, some searches)")
        print("- Network/API limitations")
        print("- Video availability")
        print("\nThe core PyTubeFix functionality should work regardless.")

    if __name__ == "__main__":
        test_all_endpoints()

except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you have installed the required packages:")
    print("pip install ytmusicapi pytubefix diskcache")
    sys.exit(1)
except Exception as e:
    print(f"❌ Unexpected error: {e}")
    sys.exit(1)
