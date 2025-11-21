#!/usr/bin/env python3
"""
Script to start both YTMusic API servers correctly
"""
import subprocess
import sys
import time
import os

def start_server(script_name, port, description):
    """Start a Python server script"""
    print(f"\n🚀 Starting {description} on port {port}...")
    print(f"   Command: python {script_name}")
    
    try:
        # Start the server process
        process = subprocess.Popen([
            sys.executable, script_name
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        # Give it a moment to start
        time.sleep(2)
        
        # Check if process is still running
        if process.poll() is None:
            print(f"✅ {description} started successfully (PID: {process.pid})")
            return process
        else:
            stdout, stderr = process.communicate()
            print(f"❌ {description} failed to start")
            print(f"   Error: {stderr}")
            return None
            
    except Exception as e:
        print(f"❌ Failed to start {description}: {e}")
        return None

def main():
    print("🎵 YTMusic API Server Startup Script")
    print("=" * 50)
    
    # Check if required files exist
    if not os.path.exists('restapi_prod.py'):
        print("❌ restapi_prod.py not found!")
        return
        
    if not os.path.exists('app.py'):
        print("❌ app.py not found!")
        return
    
    print("\n📋 Server Configuration:")
    print("   • restapi_prod.py (YTMusic API) → Port 5001")
    print("   • app.py (Streaming API) → Port 5000")
    
    # Start the servers
    processes = []
    
    # Start YTMusic API server (for homefeed, search, etc.)
    ytmusic_process = start_server('restapi_prod.py', 5001, 'YTMusic API Server')
    if ytmusic_process:
        processes.append(('YTMusic API', ytmusic_process))
    
    # Start Streaming API server (for audio streaming)
    streaming_process = start_server('app.py', 5000, 'Streaming API Server')
    if streaming_process:
        processes.append(('Streaming API', streaming_process))
    
    if not processes:
        print("\n❌ No servers started successfully!")
        return
    
    print(f"\n✅ Started {len(processes)} server(s) successfully!")
    print("\n📡 API Endpoints Available:")
    if ytmusic_process:
        print("   • http://localhost:5001/api/homefeed - YTMusic home feed")
        print("   • http://localhost:5001/api/search - YTMusic search")
        print("   • http://localhost:5001/health - YTMusic API health")
    if streaming_process:
        print("   • http://localhost:5000/stream/<video_id> - Audio streaming")
        print("   • http://localhost:5000/search - Song search")
        print("   • http://localhost:5000/health - Streaming API health")
    
    print(f"\n🔄 Servers running... Press Ctrl+C to stop all servers")
    
    try:
        # Keep the script running and monitor processes
        while True:
            time.sleep(5)
            
            # Check if processes are still alive
            for name, process in processes[:]:
                if process.poll() is not None:
                    print(f"\n⚠️  {name} server stopped unexpectedly!")
                    processes.remove((name, process))
            
            if not processes:
                print("\n❌ All servers stopped!")
                break
                
    except KeyboardInterrupt:
        print(f"\n\n🛑 Stopping all servers...")
        
        # Terminate all processes
        for name, process in processes:
            try:
                process.terminate()
                process.wait(timeout=5)
                print(f"   ✅ Stopped {name} server")
            except subprocess.TimeoutExpired:
                process.kill()
                print(f"   🔪 Force killed {name} server")
            except Exception as e:
                print(f"   ❌ Error stopping {name} server: {e}")
        
        print("🏁 All servers stopped.")

if __name__ == '__main__':
    main()