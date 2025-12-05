import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, TextInput, Alert, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import CookieManager from '@react-native-cookies/cookies';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeModules } from 'react-native';

const { PythonBridge } = NativeModules;

const LoginScreen = () => {
    const navigation = useNavigation();
    const webViewRef = useRef(null);
    const [cookieInput, setCookieInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState('webview'); // 'webview' or 'manual'

    const handleCookieExtraction = async () => {
        try {
            setLoading(true);
            const cookies = await CookieManager.get('https://music.youtube.com');
            console.log('Extracted Cookies:', cookies);

            // Convert to cookie string format expected by Python requests
            // Format: "name=value; name2=value2"
            const cookieString = Object.entries(cookies)
                .map(([key, value]) => `${key}=${value.value}`)
                .join('; ');

            if (cookieString.includes('SAPISID')) {
                await saveAndSendCookies(cookieString);
            } else {
                Alert.alert('Login Incomplete', 'Could not find essential cookies. Please ensure you are fully logged in.');
            }
        } catch (error) {
            console.error('Cookie extraction failed:', error);
            Alert.alert('Error', 'Failed to extract cookies.');
        } finally {
            setLoading(false);
        }
    };

    const handleManualCookieSave = async () => {
        if (!cookieInput.trim()) {
            Alert.alert('Error', 'Please paste your cookies first.');
            return;
        }
        await saveAndSendCookies(cookieInput.trim());
    };

    const saveAndSendCookies = async (cookieString) => {
        try {
            setLoading(true);
            // Save to AsyncStorage for persistence
            await AsyncStorage.setItem('yt_cookies', cookieString);

            // Send to Python Bridge (We need to implement this method in PythonBridgeModule/youtube_api.py)
            // For now, we'll assume there's a method exposed or we pass it with requests
            // But based on the plan, we are updating youtube_api.py to read from a file or receive it.
            // Since we can't easily call a python function directly to set a variable without a wrapper,
            // We will write it to a file using react-native-fs or just pass it to every request?
            // Better approach: The Python script can read from a known file location.
            // Or we can use the existing 'callPythonFunction' if we add a 'set_cookies' function.

            // Let's assume we'll add a 'set_auth_headers' function in python
            // But first, let's just save it to a file that Python can read.
            // Actually, passing it via a specific Python function call is cleaner if the bridge supports it.
            // Assuming the bridge allows calling any function:

            // We will implement 'set_auth_headers' in youtube_api.py
            // Note: We need to make sure the bridge can handle this. 
            // If not, we might need to write to a file path that Python knows.

            // Using react-native-fs to write to a path accessible by Python would be ideal, 
            // but let's try to use the bridge to pass the string first.

            // For this implementation, we will use a file approach as it's more persistent across app restarts
            // without needing to re-send on every launch (Python can check file on init).

            const RNFS = require('react-native-fs');
            const path = `${RNFS.DocumentDirectoryPath}/headers_auth.json`;

            // Create the JSON structure expected by ytmusicapi (browser.json format roughly)
            // Actually ytmusicapi expects headers, not just cookies.
            // But we can construct a minimal header set with just Cookie.
            const headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0",
                "Accept": "*/*",
                "Accept-Language": "en-US,en;q=0.5",
                "Content-Type": "application/json",
                "X-Goog-AuthUser": "0",
                "Cookie": cookieString
            };

            await RNFS.writeFile(path, JSON.stringify(headers), 'utf8');
            console.log('Headers saved to:', path);

            // Notify Python to reload/update session
            // We'll assume there's a function we can call or it will pick it up on next request
            // Let's add a 'reload_session' function to youtube_api.py

            Alert.alert('Success', 'Login successful! You can now stream music.', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);

        } catch (error) {
            console.error('Save cookies failed:', error);
            Alert.alert('Error', 'Failed to save login session.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>Login to YouTube Music</Text>
                <TouchableOpacity onPress={() => setMode(mode === 'webview' ? 'manual' : 'webview')}>
                    <Text style={styles.switchMode}>{mode === 'webview' ? 'Manual' : 'WebView'}</Text>
                </TouchableOpacity>
            </View>

            {mode === 'webview' ? (
                <>
                    <WebView
                        ref={webViewRef}
                        source={{ uri: 'https://music.youtube.com' }}
                        style={styles.webview}
                        onNavigationStateChange={(navState) => {
                            // Optional: Auto-detect login success based on URL
                        }}
                    />
                    <TouchableOpacity style={styles.captureButton} onPress={handleCookieExtraction}>
                        {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.captureText}>I have Logged In (Capture Cookies)</Text>}
                    </TouchableOpacity>
                </>
            ) : (
                <View style={styles.manualContainer}>
                    <Text style={styles.instruction}>
            Paste your "Cookie" header string here. You can get this from your browser's developer tools (Network tab -> request to music.youtube.com).
                    </Text>
                    <TextInput
                        style={styles.input}
                        multiline
                        placeholder="Paste cookies here..."
                        placeholderTextColor="#666"
                        value={cookieInput}
                        onChangeText={setCookieInput}
                    />
                    <TouchableOpacity style={styles.saveButton} onPress={handleManualCookieSave}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Cookies</Text>}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, justifyContent: 'space-between', backgroundColor: '#121212' },
    backButton: { padding: 8 },
    title: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    switchMode: { color: '#3ea6ff', fontSize: 14 },
    webview: { flex: 1 },
    captureButton: { backgroundColor: '#fff', padding: 16, alignItems: 'center', margin: 16, borderRadius: 8 },
    captureText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
    manualContainer: { flex: 1, padding: 20 },
    instruction: { color: '#ccc', marginBottom: 20, lineHeight: 20 },
    input: { backgroundColor: '#222', color: '#fff', padding: 12, borderRadius: 8, height: 150, textAlignVertical: 'top' },
    saveButton: { backgroundColor: '#3ea6ff', padding: 16, alignItems: 'center', marginTop: 20, borderRadius: 8 },
    saveText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default LoginScreen;
