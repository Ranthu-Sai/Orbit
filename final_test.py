#!/usr/bin/env python3
"""
Final comprehensive test to verify YTMusic API is working correctly
"""
import requests
import json
import time

def test_ytmusic_api():
    print("🎵 Final YTMusic API Test")
    print("=" * 50)
    
    try:
        # Test the API endpoint
        print("📡 Testing API endpoint...")
        response = requests.get('http://localhost:5001/api/homefeed?limit=10', timeout=10)
        
        if response.status_code != 200:
            print(f"❌ HTTP Error: {response.status_code}")
            return False
            
        data = response.json()
        
        # Validate response structure
        if data.get('status') != 'success':
            print(f"❌ API returned status: {data.get('status')}")
            return False
            
        if not data.get('data', {}).get('feed'):
            print("❌ No feed data in response")
            return False
            
        feed = data['data']['feed']
        print(f"✅ API Response: {len(feed)} sections")
        
        # Count items
        total_playlists = 0
        total_albums = 0
        total_songs = 0
        
        for section in feed:
            if section.get('items'):
                for item in section['items']:
                    if item.get('type') == 'playlist':
                        total_playlists += 1
                    elif item.get('type') == 'album':
                        total_albums += 1
                    elif item.get('type') == 'song':
                        total_songs += 1
        
        print(f"📊 Content Summary:")
        print(f"   Playlists: {total_playlists}")
        print(f"   Albums: {total_albums}")
        print(f"   Songs: {total_songs}")
        
        if total_playlists > 0 or total_albums > 0:
            print(f"\n✅ SUCCESS: Found {total_playlists + total_albums} items for React Native to display!")
            
            # Show some examples
            print(f"\n📋 Sample Content:")
            count = 0
            for section in feed:
                if section.get('items') and count < 5:
                    for item in section['items']:
                        if item.get('type') in ['playlist', 'album'] and count < 5:
                            print(f"   {count + 1}. \"{item.get('title', 'Unknown')}\" ({item.get('type')}) from \"{section.get('sectionTitle', 'Unknown')}\"")
                            count += 1
            
            return True
        else:
            print("❌ No playlists or albums found")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Cannot connect to http://localhost:5001")
        print("💡 Make sure restapi_prod.py is running on port 5001")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_health_endpoint():
    print("\n🏥 Testing Health Endpoint...")
    try:
        response = requests.get('http://localhost:5001/health', timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health Check: {data.get('status', 'unknown')}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def main():
    print("🚀 Starting Final YTMusic API Test Suite")
    print("=" * 60)
    
    # Test health first
    health_ok = test_health_endpoint()
    
    # Test main API
    api_ok = test_ytmusic_api()
    
    print("\n" + "=" * 60)
    print("📋 FINAL RESULTS:")
    print(f"   Health Endpoint: {'✅ PASS' if health_ok else '❌ FAIL'}")
    print(f"   YTMusic API: {'✅ PASS' if api_ok else '❌ FAIL'}")
    
    if health_ok and api_ok:
        print("\n🎉 ALL TESTS PASSED!")
        print("🎵 YTMusic integration should work in React Native now!")
        print("\n📱 Next Steps:")
        print("   1. Make sure restapi_prod.py is running on port 5001")
        print("   2. Run your React Native app")
        print("   3. Check the logs for YTMusic data processing")
        print("   4. You should see playlists and albums in the home feed!")
    else:
        print("\n⚠️  SOME TESTS FAILED")
        print("🔧 Troubleshooting:")
        if not health_ok:
            print("   - Start restapi_prod.py server: python restapi_prod.py")
        if not api_ok:
            print("   - Check server logs for errors")
            print("   - Verify YTMusic API is working")

if __name__ == '__main__':
    main()