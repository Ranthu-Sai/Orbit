import { MainWrapper } from "../Layout/MainWrapper";
import { PaddingConatiner } from "../Layout/PaddingConatiner";
import { View, Alert, ToastAndroid } from "react-native";
import { Text, TextInput, Button, HelperText } from "react-native-paper";
import { useState } from "react";
import { useTheme } from "@react-navigation/native";
import { dabRegister } from "../Api/DabAPI";

export const RegisterScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    // Validation
    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }

    if (!email.trim()) {
      setError("Please enter an email");
      return;
    }

    if (!password) {
      setError("Please enter a password");
      return;
    }

    if (!confirmPassword) {
      setError("Please confirm your password");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setError("");
    setLoading(true);

    try {
      console.log("🔐 Attempting DAB registration...");
      const result = await dabRegister(username, email, password, inviteCode || null);

      console.log("📋 Registration result:", result);

      if (result.success) {
        // Show success message and navigate
        if (typeof ToastAndroid !== 'undefined') {
          ToastAndroid.show("Registration successful! Please login.", ToastAndroid.SHORT);
        } else {
          Alert.alert("Success", "Registration successful! Please login.");
        }

        // Auto-navigate to login
        navigation.replace("Login");
      } else {
        const errorMessage = result.message || "Registration failed";
        console.log("📛 Registration failed:", errorMessage);
        console.log("📛 Full error details:", result.error);

        setError(errorMessage);
        Alert.alert("Registration Failed", errorMessage);
      }
    } catch (error) {
      console.error("Register error:", error);
      const errorMsg = error.message || "An unexpected error occurred";
      setError(errorMsg);
      Alert.alert("Error", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainWrapper>
      <PaddingConatiner>
        <Text
          variant="headlineMedium"
          style={{
            textAlign: "left",
            marginBottom: 20,
            marginLeft: 16,
            color: colors.text,
            fontWeight: "bold",
          }}
        >
          DAB Music Register
        </Text>
        <View style={{ padding: 16 }}>
          <TextInput
            label="Username"
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              setError("");
            }}
            mode="outlined"
            autoCapitalize="none"
            style={{ marginBottom: 12 }}
            disabled={loading}
            error={!!error}
          />
          <TextInput
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError("");
            }}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            style={{ marginBottom: 12 }}
            disabled={loading}
            error={!!error}
          />
          <TextInput
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError("");
            }}
            mode="outlined"
            secureTextEntry
            style={{ marginBottom: 12 }}
            disabled={loading}
            error={!!error}
          />
          <TextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              setError("");
            }}
            mode="outlined"
            secureTextEntry
            style={{ marginBottom: 12 }}
            disabled={loading}
            error={!!error}
          />
          <TextInput
            label="Invite Code (Optional)"
            value={inviteCode}
            onChangeText={(text) => {
              setInviteCode(text);
              setError("");
            }}
            mode="outlined"
            autoCapitalize="characters"
            style={{ marginBottom: 12 }}
            disabled={loading}
          />

          {error ? (
            <HelperText type="error" visible={!!error} style={{ marginBottom: 8 }}>
              {error}
            </HelperText>
          ) : null}

          <Button
            mode="contained"
            onPress={handleSubmit}
            style={{ marginTop: 16 }}
            textColor="white"
            loading={loading}
            disabled={loading}
          >
            {loading ? "Registering..." : "Register"}
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.navigate("Login")}
            style={{ marginTop: 8 }}
            disabled={loading}
          >
            Already have an account? Login
          </Button>
        </View>
      </PaddingConatiner>
    </MainWrapper>
  );
};