# ✅ COMPLETE SETUP GUIDE - YTMusic Integration

## The Issue
React Native apps on Android emulator cannot directly access `localhost` on your computer. We need to set up port forwarding.

## ✅ SOLUTION - 3 Simple Steps

### Step 1: Start the Python Server
```bash
python restapi_prod.py
```

**Expected output:**
```
YTMusic REST API server starting on 0.0.0.0:5001
Available endpoints:
  GET /api/homefeed - Get YouTube Music home feed
```

**✅ Server is now running on port 5001**

---

### Step 2: Set Up Port Forwarding (Android Only)

**Run this command ONCE:**
```bash
adb reverse tcp:5001 tcp:5001
```

**Expected output:**
```
5001
```

**What this does:**
- Maps `localhost:5001` on the emulator to `localhost:5001` on your computer
- Now the emulator can access your server using `http://localhost:5001`

**✅ Port forwarding is now active**

---

### Step 3: Restart Your React Native App

1. **Close the app** completely (swipe away from recent apps)
2. **Reopen the app** from the launcher

**Expected logs:**
```
🧪 Testing API directly at: http://localhost:5001
🧪 Direct API test result: {status: "success", sectionsCount: 11, firstSection: "Quick picks"}
✅ API test successful, proceeding with data fetch...
🌐 YTMusic Home - Making API call to: http://localhost:5001/api/homefeed
📡 YTMusic Home - API Response Status: 200 OK
🎵 YTMusic Home - Processing 11 sections from API
✅ Added 10 items from section: "Brb, Being Nostalgic!"
✅ Added 10 items from section: "Albums for you"
🎵 Total processed items: 82 (62 playlists, 20 albums)
```

**Expected UI:**
- ✅ **🎵 YouTube Music Playlists** section with real playlists
- ✅ **💿 YouTube Music Albums** section with real albums
- ✅ No more "Network request failed" errors

---

## Troubleshooting

### If you still get "Network request failed":

1. **Check if server is running:**
   ```bash
   curl http://localhost:5001/health
   ```
   Should return: `{"status":"healthy"}`

2. **Check if port forwarding is active:**
   ```bash
   adb reverse --list
   ```
   Should show: `tcp:5001 tcp:5001`

3. **Re-run port forwarding:**
   ```bash
   adb reverse --remove tcp:5001
   adb reverse tcp:5001 tcp:5001
   ```

4. **Restart everything:**
   - Stop the Python server (Ctrl+C)
   - Close the React Native app
   - Start the Python server again
   - Run `adb reverse tcp:5001 tcp:5001`
   - Restart the React Native app

### If using iOS Simulator:
- No port forwarding needed
- iOS simulator can access `localhost` directly
- Just make sure the server is running

### If using Physical Device:
1. Get your computer's IP address:
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   ```

2. Update the code to use your IP:
   ```javascript
   const getAPIBaseURL = () => {
     return 'http://YOUR_IP_ADDRESS:5001';  // e.g., 'http://192.168.1.100:5001'
   };
   ```

3. Make sure:
   - Phone and computer on same WiFi
   - Firewall allows port 5001

---

## Quick Reference

### Every time you start development:
1. ✅ Start server: `python restapi_prod.py`
2. ✅ Set up port forwarding: `adb reverse tcp:5001 tcp:5001`
3. ✅ Run your app

### If port forwarding gets disconnected:
- Just run `adb reverse tcp:5001 tcp:5001` again
- No need to restart the server or app

---

## Success Indicators ✅

When everything is working:
1. **Server logs**: Shows incoming requests from the app
2. **React Native logs**: Shows successful API calls and data processing
3. **App UI**: Shows YouTube Music sections with real content
4. **No errors**: No "Network request failed" messages

The setup is complete! Your YTMusic integration should now work perfectly. 🎵