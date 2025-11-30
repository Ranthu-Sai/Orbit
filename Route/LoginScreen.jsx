import { MainWrapper } from "../Layout/MainWrapper";
import { PaddingConatiner } from "../Layout/PaddingConatiner";
import { View, Alert } from "react-native";
import { Text, TextInput, Button, HelperText } from "react-native-paper";
import { useState } from "react";
import { useTheme } from "@react-navigation/native";
import { dabLogin } from "../Api/DabAPI";
import DabAuthService from "../Utils/DabAuthService";

export const LoginScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    // Validation
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await dabLogin(email, password);

      if (response.success) {
        // Show success message
        Alert.alert("Success", "Logged in successfully!");

        // Navigate back or to home
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate("Home");
        }
      } else {
        setError(response.message || "Login failed. Please try again.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("An unexpected error occurred. Please try again.");
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
          DAB Music Login
        </Text>
        <View style={{ padding: 16 }}>
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
            style={{ marginBottom: 8 }}
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
            style={{ marginBottom: 8 }}
            disabled={loading}
            error={!!error}
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
            loading={loading}
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.navigate("Register")}
            style={{ marginTop: 8 }}
            disabled={loading}
          >
            Don't have an account? Register
          </Button>
        </View>
      </PaddingConatiner>
    </MainWrapper>
  );
};