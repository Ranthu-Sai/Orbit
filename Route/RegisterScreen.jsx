import { MainWrapper } from "../Layout/MainWrapper";
import { PaddingConatiner } from "../Layout/PaddingConatiner";
import { View } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import { useState } from "react";
import { useTheme } from "@react-navigation/native";

export const RegisterScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = () => {
    // Handle register logic here
    if (password !== confirmPassword) {
      console.log("Passwords do not match");
      return;
    }
    console.log("Email:", email);
    console.log("Password:", password);
    // For now, just log. In real app, register and navigate.
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
          Register
        </Text>
        <View style={{ padding: 16 }}>
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            style={{ marginBottom: 16 }}
          />
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry
            style={{ marginBottom: 16 }}
          />
          <TextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            mode="outlined"
            secureTextEntry
            style={{ marginBottom: 24 }}
          />
          <Button
            mode="contained"
            onPress={handleSubmit}
            style={{ marginTop: 8 }}
          >
            Register
          </Button>
        </View>
      </PaddingConatiner>
    </MainWrapper>
  );
};