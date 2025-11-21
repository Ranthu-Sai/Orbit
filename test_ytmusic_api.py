#!/usr/bin/env python3
"""
Test script to verify YTMusic API is working correctly
"""
import requests
import json
import time

def test_endpoint(url, description):
    """Test a single API endpoint"""
    print(f"\n🧪 Testing {description}")
    print(f"   URL: {url}")
    
    try:
        start_time = time.time()
        response = requests.get(url, timeout=10)
        end_time = time.time()
        
        print(f"   Status: {response.status_code}")
        print(f"   Response time: {end_time - start_time:.2f}s")
        
        if response.status_code == 200:
            data = response.json()
            
            if 'homefeed' in url:
                # Test homefeed response
                if data.get('status') == 'success' and data.get('data', {}).get('feed'):
                    feed_sections = len(data['data']['feed'])
                    total_items = sum(len(section.get('items', [])) for section in data['data']['feed'])
                    print(f"   ✅ Success: {feed_sections} sections, {total_items} total items")
                    
                    # Show sample data
                    if total_items > 0:
                        first_section = data['data']['feed'][0]
                        print(f"   📋 First section: '{first_section.get('sectionTitle', 'Unknown')}'")
                        if first_section.get('items'):
                            first_item = first_section['items'][0]
                            print(f"   🎵 First item: '{first_item.get('title', 'Unknown')}' ({first_item.get('type', 'unknown')})")
                else:
                    print(f"   ❌ Invalid response structure")
                    print(f"   📄 Response: {json.dumps(data, indent=2)[:200]}...")
                    
            elif 'health' in url:
                # Test health response
                if data.get('status') == 'healthy':
                    print(f"   ✅ Service healthy")
                else:
                    print(f"   ⚠️  Service status: {data.get('status', 'unknown')}")
            
            return True
            
        else:
            print(f"   ❌ HTTP Error: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   📄 Error: {error_data}")
            except:
                print(f"   📄 Response: {response.text[:200]}...")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"   ❌ Connection Error: Cannot connect to server")
        print(f"   💡 Make sure the server is running on the correct port")
        return False
    except requests.exceptions.Timeout:
        print(f"   ❌ Timeout Error: Server took too long to respond")
        return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def main():
    print("🧪 YTMusic API Test Suite")
    print("=" * 50)
    
    # Test endpoints
    tests = [
        ('http://localhost:5001/health', 'YTMusic API Health Check'),
        ('http://localhost:5001/api/homefeed?limit=5', 'YTMusic Home Feed'),
        ('http://localhost:5000/health', 'Streaming API Health Check'),
    ]
    
    results = []
    
    for url, description in tests:
        success = test_endpoint(url, description)
        results.append((description, success))
    
    # Summary
    print(f"\n📊 Test Results Summary")
    print("=" * 30)
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for description, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"   {status} {description}")
    
    print(f"\n🏆 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! YTMusic API is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the server configuration.")
        print("\n💡 Troubleshooting tips:")
        print("   1. Make sure both servers are running:")
        print("      python restapi_prod.py  # Port 5001")
        print("      python app.py           # Port 5000")
        print("   2. Check for port conflicts")
        print("   3. Verify network connectivity")

if __name__ == '__main__':
    main()