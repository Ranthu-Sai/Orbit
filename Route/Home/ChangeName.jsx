import {
  Dimensions,
  TextInput,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ToastAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useState, useEffect } from 'react';
import {
  SetUserNameValue,
  GetUserNameValue,
} from '../../LocalStorage/StoreUserName';
import { UserCircle2 } from 'lucide-react-native';
import ScreenSVG from '../../Images/screen.svg';

export const ChangeName = ({ navigation }) => {
  const [Name, setName] = useState('');

  useEffect(() => {
    const fetchName = async () => {
      const storedName = await GetUserNameValue();
      if (storedName) {
        setName(storedName);
      }
    };
    fetchName();
  }, []);

  async function OnConfirm(name) {
    if (name === '') {
      alert('Please Enter name!');
    } else {
      await SetUserNameValue(name.trim());
      navigation.pop();
      ToastAndroid.showWithGravity(
        'Please restart the app',
        ToastAndroid.SHORT,
        ToastAndroid.CENTER
      );
    }
  }

  return (
    <View style={styles.container}>
      {/* Background SVG - Full Screen */}
      <ScreenSVG
        width="100%"
        height="100%"
        style={styles.backgroundContainer}
        preserveAspectRatio="xMidYMid slice"
      />

      {/* Status Bar */}
      <StatusBar
        backgroundColor="transparent"
        barStyle="light-content"
        translucent={true}
      />

      {/* Content with SafeArea */}
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.contentContainer}
        >
          {/* Title */}
          <Animated.View
            entering={FadeInDown.duration(500)}
            style={styles.titleContainer}
          >
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
          <Animated.View
            entering={FadeInDown.delay(400)}
            style={styles.inputContainer}
          >
            <UserCircle2 size={20} color="#98bad5" style={styles.inputIcon} />
            <TextInput
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={Name}
              onChangeText={(text) => setName(text)}
              placeholder="Enter Your Name"
              style={styles.input}
            />
          </Animated.View>

          {/* Confirm Button */}
          <Animated.View
            entering={FadeInDown.delay(500)}
            style={{ width: '100%' }}
          >
            <TouchableOpacity
              style={styles.button}
              onPress={() => OnConfirm(Name)}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Change Name</Text>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1820',
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
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
    fontSize: Dimensions.get('window').width * 0.2,
    fontWeight: 'bold',
    color: '#9db6d3ff',
    lineHeight: Dimensions.get('window').width * 0.22,
  },
  titleWhite: {
    fontSize: Dimensions.get('window').width * 0.2,
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
