import { MainWrapper } from "../../Layout/MainWrapper";
import { Dimensions, TextInput, View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useState } from "react";
import { SetUserNameValue } from "../../LocalStorage/StoreUserName";
import { UserCircle2 } from "lucide-react-native";
import LinearGradient from "react-native-linear-gradient";

export const Slide1 = ({ navigation }) => {
  const [Name, setName] = useState("");

  async function NextPress(name) {
    if (name === "") {
      alert("Please Enter name!")
    } else {
      await SetUserNameValue(name.trim())
      navigation.replace("Slide2")
    }
  }

  return (
    <MainWrapper>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#0a0e1a', '#1a1f2e', '#0a0e1a']}
        style={styles.backgroundContainer}
      />

      {/* Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.contentContainer}
      >
        {/* Title */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.titleContainer}>
          <Text style={styles.titleCyan}>Orbit</Text>
          <Text style={styles.titleWhite}>Music.</Text>
        </Animated.View>

        {/* Slogan */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <Text style={styles.slogan}>Your universe of music.</Text>
        </Animated.View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Input Field */}
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

        {/* Get Started Button */}
        <Animated.View entering={FadeInDown.delay(500)} style={{ width: '100%' }}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => NextPress(Name)}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </MainWrapper>
  );
};

const styles = StyleSheet.create({
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  titleContainer: {
    marginBottom: 0,
  },
  titleCyan: {
    fontSize: Dimensions.get('window').width * 0.20,
    fontWeight: 'bold',
    color: '#98bad5',
    lineHeight: Dimensions.get('window').width * 0.22,
  },
  titleWhite: {
    fontSize: Dimensions.get('window').width * 0.20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    lineHeight: Dimensions.get('window').width * 0.22,
  },
  slogan: {
    fontSize: Dimensions.get('window').width * 0.055,
    color: '#FFFFFF',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(53, 58, 70, 0.8)',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  button: {
    backgroundColor: '#FFFFFF',
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#000000',
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
});