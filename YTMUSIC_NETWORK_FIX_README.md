# YTMusic Network Error Fix 🎵

## Problem Solved
Fixed the "ERROR YTMusic homefeed error: [AxiosError: Network Error]" that was preventing YouTube Music content from loading in the React Native app.

## Root Cause
The issue was caused by **port conflicts** between two Python servers that were both trying to run on port 5000:
- `restapi_prod.py` (YTMusic API server)
- `app.py` (Streaming API server)

## Solution Overview
1. **Separated server ports**: YTMusic API → Port 5001, Streaming API → Port 5000
2. **Updated React Native code** to use the correct port (5001) for YTMusic API calls
3. **Enhanced error handling** with better diagnostics
4. **Created helper scripts** for easy server management and testing

## Quick Start 🚀

### Step 1: Start the Servers

**Option A: Automated (Recommended)**
```bash
python start_servers.py
```

**Option B: Windows Batch File**
```cmd
start_servers.bat
```

**Option C: Manual**
```bash
# Terminal 1 - YTMusic API Server
python restapi_prod.py

# Terminal 2 - Streaming API Server  
python app.py
```

### Step 2: Test the Fix
```bash
python test_ytmusic_api.py
```

### Step 3: Run Your React Native App
The YTMusic homefeed should now load without network errors!

## Server Configuration 📡

| Server | Port | Purpose | Key Endpoints |
|--------|------|---------|---------------|
| `restapi_prod.py` | **5001** | YTMusic API | `/api/homefeed`, `/api/search` |
| `app.py` | **5000** | Streaming | `/stream/<id>`, `/search` |

## API Endpoints 🔗

### YTMusic API Server (Port 5001)
- `GET /api/homefeed?limit=10` - Get YouTube Music home feed
- `GET /api/search?query=song` - Search YouTube Music
- `GET /health` - Health check

### Streaming API Server (Port 5000)  
- `GET /stream/<video_id>` - Get audio stream URL
- `POST /search` - Search for songs
- `GET /health` - Health check

## Troubleshooting 🔧

### Network Error Still Occurring?

1. **Check if servers are running:**
   ```bash
   # Test YTMusic API
   curl http://localhost:5001/health
   
   # Test Streaming API  
   curl http://localhost:5000/health
   ```

2. **Check for port conflicts:**
   ```bash
   # Windows
   netstat -an | findstr :5001
   netstat -an | findstr :5000
   
   # Linux/Mac
   lsof -i :5001
   lsof -i :5000
   ```

3. **Run the test script:**
   ```bash
   python test_ytmusic_api.py
   ```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Connection refused" | Server not running | Start `restapi_prod.py` |
| "Port already in use" | Port conflict | Kill conflicting process or change port |
| "Module not found" | Missing dependencies | `pip install ytmusicapi flask flask-cors` |
| "Empty response" | Wrong port | Check React Native code uses port 5001 |

## Files Changed 📝

### Modified Files
- `restapi_prod.py` - Changed default port to 5001
- `app.py` - Added startup logging  
- `Component/Home/YTMusicHomeSection.jsx` - Updated API URL to port 5001
- `Api/YTMusic.js` - Updated API URL to port 5001
- `YTMUSIC_FIX_SUMMARY.md` - Updated documentation

### New Files
- `start_servers.py` - Automated server startup script
- `start_servers.bat` - Windows batch file for server startup
- `test_ytmusic_api.py` - API testing script
- `YTMUSIC_NETWORK_FIX_README.md` - This file

## Dependencies 📦

Make sure you have these Python packages installed:
```bash
pip install ytmusicapi flask flask-cors requests pytubefix
```

## Success Indicators ✅

When the fix is working correctly, you should see:

1. **In React Native logs:**
   ```
   YTMusic Home - Raw API response: {status: "success", data: {feed: [...]}}
   YTMusic Home - Total items collected: X
   ```

2. **In the app:**
   - "🎵 YouTube Music Playlists" section with actual playlists
   - "💿 YouTube Music Albums" section with actual albums
   - No more "No playlists or albums available" message

3. **Server logs:**
   ```
   YTMusic REST API server starting on 0.0.0.0:5001
   YTMusic Streaming API server starting on 0.0.0.0:5000
   ```

## Need Help? 🆘

If you're still experiencing issues:

1. Run `python test_ytmusic_api.py` and share the output
2. Check the React Native logs for any error messages
3. Verify both servers are running on the correct ports
4. Make sure your network allows connections to localhost

The fix separates the concerns properly and should resolve all network connectivity issues with the YTMusic integration!