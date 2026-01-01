import { Dimensions, Pressable, View, Animated } from "react-native";
import { PlainText } from "../Global/PlainText";
import { useNavigation, useTheme } from "@react-navigation/native";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRef } from "react";

export const EachLibraryCard = ({ icon, text, navigate }) => {
  const width = Dimensions.get("window").width;
  const containerWidth = width * 0.9; // Adjusted for one card per row
  const navigation = useNavigation();
  const scaleValue = useRef(new Animated.Value(1)).current;
  const { colors } = useTheme();

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <Pressable
        onPress={() => {
          navigation.navigate(navigate, { previousScreen: 'Library' });
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{
          marginVertical: 4, // Reduced vertical margin for tighter spacing
          height: 60, // Fixed height for a row-like appearance
          width: containerWidth,
          flexDirection: "row", // Align items in a row
          alignItems: "center",
          paddingHorizontal: 15,
        }}
      >
        <MaterialCommunityIcons name={icon} size={25} color={colors.text} />
        <View style={{
          marginLeft: 20, // Increased space between icon and text
        }}>
          <PlainText text={text} style={{ fontSize: 18, fontWeight: 'bold' }} />
        </View>
      </Pressable>
    </Animated.View>
  );
};