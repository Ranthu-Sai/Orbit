import { Dimensions, TextInput, View, Text, StyleSheet, TouchableOpacity, Keyboard, StatusBar, ImageBackground, Platform } from "react-native";
import Animated, { FadeInDown, useAnimatedStyle, withTiming, useSharedValue } from "react-native-reanimated";
import { useState, useEffect, useCallback } from "react";
import { SetUserNameValue } from "../../LocalStorage/StoreUserName";
import { UserCircle2 } from "lucide-react-native";
import PlaylistSelectorWrapper from "../../Component/Playlist/PlaylistSelectorWrapper";

const SlideImage = require("../../Images/slide.jpg");
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const Slide1 = ({ navigation }) => {
  const [Name, setName] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const bottomOffset = useSharedValue(0);

  // Setup keyboard listeners
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const height = e.endCoordinates.height;
        setKeyboardHeight(height);
        bottomOffset.value = withTiming(height, { duration: 250 });
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        bottomOffset.value = withTiming(0, { duration: 250 });
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const inputAnimatedStyle = useAnimatedStyle(() => ({
    bottom: bottomOffset.value + 10,
  }));

  async function NextPress(name) {
    Keyboard.dismiss();
    if (name === "") {
      alert("Please Enter name!")
    } else {
      await SetUserNameValue(name.trim())
      navigation.replace("Slide2")
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar
        backgroundColor="transparent"
        barStyle="light-content"
        translucent={true}
      />

      {/* Background Image - Full Screen Edge to Edge */}
      <ImageBackground
        source={SlideImage}
        style={styles.backgroundContainer}
        resizeMode="cover"
      >
        {/* Title Section - Centered */}
        <View style={styles.titleSection}>
          <Animated.View entering={FadeInDown.duration(500)} style={styles.titleContainer}>
            <Text style={[styles.titleCyan, styles.glowingText]}>Orbit</Text>
            <Text style={styles.titleWhite}>Music.</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200)}>
            <Text style={styles.slogan}>Your universe of music.</Text>
          </Animated.View>
        </View>

        {/* Input Section - Absolutely positioned at bottom */}
        <Animated.View style={[styles.bottomSection, inputAnimatedStyle]}>
          <Animated.View entering={FadeInDown.delay(400)} style={styles.inputContainer}>
            <UserCircle2 size={20} color="#98bad5" style={styles.inputIcon} />
            <TextInput
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={Name}
              onChangeText={(text) => setName(text)}
              placeholder="Enter Your Name"
              style={styles.input}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(500)} style={{ width: '100%' }}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => NextPress(Name)}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Get Started</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </ImageBackground>

      <PlaylistSelectorWrapper />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1820',
  },
  backgroundContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  titleSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: SCREEN_HEIGHT * 0.22, // Uplift text
  },
  titleContainer: {
    marginBottom: 5,
    alignItems: 'center',
  },
  titleCyan: {
    fontSize: SCREEN_WIDTH * 0.15,
    fontWeight: 'bold',
    color: '#60a5fa', // Glowing Blue
    lineHeight: SCREEN_WIDTH * 0.17,
    textAlign: 'center',
    transform: [{ translateX: -8 }], // Visual correction to align with "Music."
  },
  glowingText: {
    textShadowColor: 'rgba(96, 165, 250, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    elevation: 5,
  },
  titleWhite: {
    fontSize: SCREEN_WIDTH * 0.15,
    fontWeight: 'bold',
    color: '#FFFFFF',
    lineHeight: SCREEN_WIDTH * 0.17,
    textAlign: 'center',
  },
  slogan: {
    fontSize: SCREEN_WIDTH * 0.045,
    color: '#FFFFFF',
    marginBottom: 0,
    textAlign: 'center',
    opacity: 0.8,
  },
  bottomSection: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(53, 58, 70, 0.8)',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    width: '100%',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    padding: 0,
  },
  button: {
    backgroundColor: '#FFFFFF',
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#000000',
  },
});