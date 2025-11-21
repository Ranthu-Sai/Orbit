import { MainWrapper } from "../Layout/MainWrapper";
import { PaddingConatiner } from "../Layout/PaddingConatiner";
import { View } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import { useState } from "react";
import { useTheme } from "@react-navigation/native";

export const LoginScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = () => {
    // Handle login logic here
    console.log("Email:", email);
    console.log("Password:", password);
    // For now, just log. In real app, authenticate and navigate.
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
          Login
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
            style={{ marginBottom: 24 }}
          />
          <Button
            mode="contained"
            onPress={handleSubmit}
            style={{ marginTop: 8 }}
          >
            Submit
          </Button>
        </View>
      </PaddingConatiner>
    </MainWrapper>
  );
};