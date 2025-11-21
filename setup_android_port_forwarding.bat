@echo off
echo 🔧 Setting up Android Emulator Port Forwarding
echo ================================================

echo.
echo Checking if ADB is available...
where adb >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ADB not found in PATH
    echo 💡 Make sure Android SDK is installed and adb is in your PATH
    pause
    exit /b 1
)

echo ✅ ADB found

echo.
echo Setting up port forwarding for port 5001...
adb reverse tcp:5001 tcp:5001

if %ERRORLEVEL% EQU 0 (
    echo ✅ Port forwarding set up successfully!
    echo.
    echo 📱 Your React Native app can now access the server at:
    echo    http://localhost:5001
    echo.
    echo 🎵 Restart your React Native app to test
) else (
    echo ❌ Port forwarding failed
    echo 💡 Make sure:
    echo    1. Android emulator is running
    echo    2. Only one emulator is running
    echo    3. USB debugging is enabled
)

echo.
pause