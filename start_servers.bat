@echo off
echo 🎵 YTMusic API Server Startup Script (Windows)
echo ================================================

echo.
echo 📋 Server Configuration:
echo    • restapi_prod.py (YTMusic API) → Port 5001
echo    • app.py (Streaming API) → Port 5000
echo.

echo 🚀 Starting YTMusic API Server (Port 5001)...
start "YTMusic API Server" cmd /k "python restapi_prod.py"

timeout /t 3 /nobreak >nul

echo 🚀 Starting Streaming API Server (Port 5000)...
start "Streaming API Server" cmd /k "python app.py"

echo.
echo ✅ Both servers are starting in separate windows
echo 📡 API Endpoints Available:
echo    • http://localhost:5001/api/homefeed - YTMusic home feed
echo    • http://localhost:5001/api/search - YTMusic search
echo    • http://localhost:5000/stream/^<video_id^> - Audio streaming
echo    • http://localhost:5000/search - Song search
echo.
echo 💡 To test the APIs, run: python test_ytmusic_api.py
echo.
pause