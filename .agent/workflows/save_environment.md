---
description: How to save crucial environment variables and settings in the Orbit app
---

## Overview
This workflow explains how to persist important environment configuration and user‑specific settings in the **Orbit** React Native application.

### Goals
1. Store **build‑time** configuration (API keys, URLs, feature flags) securely.
2. Persist **run‑time** user settings (theme, playback preferences) across app launches.
3. Keep sensitive data out of version control.

## Prerequisites
- Node.js & npm installed.
- The Orbit project is already set up (`npm start` is running).
- Basic familiarity with the project structure.

## Steps

### 1. Add a `.env` file for build‑time variables
```bash
# // turbo (auto‑run)
# From the project root, create a .env file
# (this command is safe – it only writes a new file)

echo "# Environment variables for Orbit" > .env
```
Add your variables, e.g.:
```
API_BASE_URL=https://api.orbit.example.com
YT_API_KEY=your_youtube_api_key_here
FEATURE_NEW_UI=true
```

### 2. Install `react-native-config`
```bash
# // turbo
npm install react-native-config --save
```
Follow the linking steps (React Native 0.71+ auto‑links). For iOS run `cd ios && pod install`.

### 3. Load variables in JavaScript
```javascript
import Config from "react-native-config";

export const API_BASE_URL = Config.API_BASE_URL;
export const YT_API_KEY = Config.YT_API_KEY;
export const FEATURE_NEW_UI = Config.FEATURE_NEW_UI === "true";
```
Use these constants wherever needed (e.g., in `service.js`).

### 4. Exclude `.env` from version control
Add the following line to `.gitignore` (or create one if missing):
```
# .gitignore entry
.env
```
Commit the updated `.gitignore`.

### 5. Persist run‑time user settings with `AsyncStorage`
Install the community package:
```bash
# // turbo
npm install @react-native-async-storage/async-storage
```
Create a helper `src/Utils/SettingsManager.js`:
```javascript
import AsyncStorage from "@react-native-async-storage/async-storage";

const SETTINGS_KEY = "orbit_user_settings";

export const saveSettings = async (settings) => {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn("Failed to save settings", e);
  }
};

export const loadSettings = async () => {
  try {
    const json = await AsyncStorage.getItem(SETTINGS_KEY);
    return json ? JSON.parse(json) : {};
  } catch (e) {
    console.warn("Failed to load settings", e);
    return {};
  }
};
```
Use `saveSettings` after the user changes theme, playback speed, etc., and call `loadSettings` on app start (e.g., in `App.jsx`).

### 6. (Optional) Secure sensitive keys with native keystore
For production builds, move secrets to native code:
- **Android**: store in `gradle.properties` and reference via `BuildConfig`.
- **iOS**: use Xcode's *Configuration Settings* or Keychain.
Update `react-native-config` to read from those sources.

## Verification
1. Run `npm start` and ensure the app builds without errors.
2. Log `API_BASE_URL` in a component to confirm the value is loaded.
3. Change a user setting (e.g., toggle dark mode), close the app, reopen, and verify the preference persists.

## Maintenance Tips
- Keep `.env.example` in the repo with placeholder values for onboarding new developers.
- Review the `.env` file before each release to avoid shipping test keys.
- Periodically audit stored keys in `AsyncStorage` and clear if they become stale.

---
*Workflow created by Antigravity.*
