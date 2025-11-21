# Get Your Computer's IP Address

## If Using Physical Device (Not Emulator)

You need to replace the API URL with your computer's actual IP address.

### Windows:
1. Open Command Prompt
2. Run: `ipconfig`
3. Look for "IPv4 Address" under your active network adapter
4. Example: `192.168.1.100`

### Mac/Linux:
1. Open Terminal
2. Run: `ifconfig` or `ip addr`
3. Look for your IP address (usually starts with 192.168.x.x or 10.0.x.x)

### Then Update the Code:

In `Component/Home/YTMusicHomeSection.jsx`, change:
```javascript
const getAPIBaseURL = () => {
  const Platform = require('react-native').Platform;
  
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5001';  // For emulator
  } else {
    return 'http://localhost:5001';  // For iOS simulator
  }
};
```

To:
```javascript
const getAPIBaseURL = () => {
  // Replace with YOUR computer's IP address
  return 'http://YOUR_IP_ADDRESS:5001';  // e.g., 'http://192.168.1.100:5001'
};
```

## Current Fix Applied

✅ **Android Emulator**: Uses `10.0.2.2:5001` (maps to host localhost)
✅ **iOS Simulator**: Uses `localhost:5001` (works directly)
❌ **Physical Device**: Needs your computer's IP address

## Make Sure:
1. Your phone and computer are on the same WiFi network
2. Your firewall allows connections on port 5001
3. The Python server is running: `python restapi_prod.py`