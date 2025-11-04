import React, { useRef, useState, useCallback, useEffect } from "react";
import BottomSheet from "@gorhom/bottom-sheet";
import QueueRenderSongs from "./QueueRenderSongs";
import { PlainText } from "../Global/PlainText";
import { SmallText } from "../Global/SmallText";
import { View, StyleSheet, Dimensions, Text, ActivityIndicator } from "react-native";
import Octicons from "react-native-vector-icons/Octicons";
import Svg, { Circle } from "react-native-svg";
import { useThemeContext } from "../../Context/ThemeContext";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const QueueBottomSheet = ({ index, onChange, enablePanDownToClose = true }) => {
  const { theme, themeMode } = useThemeContext();
  const bottomSheetRef = useRef(null);

  // Theme-aware colors
  const getBackgroundColor = () => {
    return themeMode === 'light'
      ? 'rgba(244, 245, 252, 0.95)' // Light theme background
      : 'rgba(10, 10, 10, 0.95)'; // Dark theme background
  };

  const getTextColor = () => {
    return theme.colors.text;
  };

  const getShadowColor = () => {
    return themeMode === 'light' ? "#000" : "#000";
  };

  return (
    <BottomSheet
      index={index}
      onChange={onChange}
      enablePanDownToClose={enablePanDownToClose}
      animateOnMount={true}
      snapPoints={[40, '20%', '60%']}
      ref={bottomSheetRef}
      style={{
        backgroundColor: getBackgroundColor(),
        shadowColor: getShadowColor(),
        shadowOffset: {
          width: 0,
          height: -3,
        },
        shadowOpacity: 0.27,
        shadowRadius: 4.65,
        elevation: 6,
      }}
      enableContentPanningGesture={false}
      enableHandlePanningGesture={true}
      backgroundStyle={{
        backgroundColor: "transparent",
      }}
      handleStyle={{
        backgroundColor: getBackgroundColor(),
        paddingVertical: 10,
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
      }}
      handleComponent={() => (
        <View style={[styles.handleContainer, { backgroundColor: getBackgroundColor() }]}>
          <Octicons name={"chevron-down"} size={40} color={getTextColor()} />
          <PlainText
            text={"Queue"}
            style={[styles.headerText, { color: getTextColor() }]}
          />
          <SmallText
            text={"Press and hold a song to reorder"}
            style={[styles.subHeaderText, { color: getTextColor() }]}
          />
        </View>
      )}
    >
      <QueueRenderSongs/>
    </BottomSheet>
  );
};

// Circular Progress Component
const CircularProgress = ({ progress = 0, size = 40, thickness = 4 }) => {
  const { theme, themeMode } = useThemeContext();
  const circumference = 2 * Math.PI * ((size - thickness) / 2);
  const strokeDashoffset = circumference * (1 - progress / 100);

  const getProgressColor = () => {
    return theme.colors.playingColor || theme.colors.primary;
  };

  const getBackgroundBorderColor = () => {
    return themeMode === 'light'
      ? 'rgba(0, 0, 0, 0.2)'
      : 'rgba(255, 255, 255, 0.2)';
  };

  const getTextColor = () => {
    return theme.colors.text;
  };

  return (
    <View style={{
      width: size,
      height: size,
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: thickness,
        borderColor: getBackgroundBorderColor(),
        position: 'absolute',
      }} />
      <Svg
        width={size}
        height={size}
        style={{
          position: 'absolute',
          transform: [{ rotate: '-90deg' }],
        }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={(size - thickness) / 2}
          strokeWidth={thickness}
          stroke={getProgressColor()}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      <Text style={{
        color: getTextColor(),
        fontSize: size * 0.3,
        fontWeight: 'bold',
      }}>{Math.round(progress)}%</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  handleContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    height: 75,
    width: SCREEN_WIDTH,
    paddingVertical: 5,
  },
  headerText: {
    fontWeight: 'bold',
    fontSize: 18,
    marginTop: -3,
    // Color will be applied dynamically via theme
  },
  subHeaderText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
    // Color will be applied dynamically via theme
  }
});

export default QueueBottomSheet;