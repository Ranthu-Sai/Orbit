#!/usr/bin/env python3
"""
Quick script to check if the YTMusic server is running
"""
import requests
import subprocess
import sys
import os

def check_port_5001():
    """Check if anything is running on port 5001"""
    try:
        if os.name == 'nt':  # Windows
            result = subprocess.run(['netstat', '-an'], capture_output=True, text=True)
            if ':5001' in result.stdout:
                print("✅ Port 5001 is in use")
                return True
        else:  # Mac/Linux
            result = subprocess.run(['lsof', '-i', ':5001'], capture_output=True, text=True)
            if result.stdout:
                print("✅ Port 5001 is in use")
                return True
        
        print("❌ Port 5001 is not in use")
        return False
    except Exception as e:
        print(f"⚠️  Could not check port status: {e}")
        return False

def test_ytmusic_server():
    """Test if YTMusic server is responding"""
    try:
        print("🧪 Testing YTMusic server...")
        
        # Test health endpoint
        health_response = requests.get('http://localhost:5001/health', timeout=5)
        if health_response.status_code == 200:
            print("✅ Health endpoint working")
            
            # Test homefeed endpoint
            homefeed_response = requests.get('http://localhost:5001/api/homefeed?limit=3', timeout=10)
            if homefeed_response.status_code == 200:
                data = homefeed_response.json()
                if data.get('status') == 'success':
                    sections = len(data.get('data', {}).get('feed', []))
                    print(f"✅ YTMusic API working! Found {sections} sections")
                    return True
                else:
                    print(f"❌ API returned status: {data.get('status')}")
            else:
                print(f"❌ Homefeed endpoint failed: {homefeed_response.status_code}")
        else:
            print(f"❌ Health endpoint failed: {health_response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server - server is not running")
    except requests.exceptions.Timeout:
        print("❌ Server timeout - server may be overloaded")
    except Exception as e:
        print(f"❌ Server test failed: {e}")
    
    return False

def main():
    print("🔍 YTMusic Server Status Check")
    print("=" * 40)
    
    # Check if port is in use
    port_in_use = check_port_5001()
    
    # Test server response
    server_working = test_ytmusic_server()
    
    print("\n📋 RESULTS:")
    print(f"   Port 5001 in use: {'✅ Yes' if port_in_use else '❌ No'}")
    print(f"   Server responding: {'✅ Yes' if server_working else '❌ No'}")
    
    if server_working:
        print("\n🎉 YTMusic server is running correctly!")
        print("📱 Your React Native app should now work")
    else:
        print("\n🚨 YTMusic server is NOT running")
        print("🔧 To fix:")
        print("   1. Open a terminal")
        print("   2. Run: python restapi_prod.py")
        print("   3. Wait for 'server starting on 0.0.0.0:5001' message")
        print("   4. Then test your React Native app")

if __name__ == '__main__':
    main()