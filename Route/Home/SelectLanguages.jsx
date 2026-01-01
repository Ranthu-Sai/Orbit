import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, ToastAndroid } from "react-native";
import { MainWrapper } from "../../Layout/MainWrapper";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Heading } from "../../Component/Global/Heading";
import { SetLanguageValue, GetLanguageValue } from "../../LocalStorage/Languages";
import LinearGradient from "react-native-linear-gradient";
import { useTheme } from "@react-navigation/native";

const { width, height } = Dimensions.get("window");

// Responsive configuration based on screen width
const getResponsiveConfig = () => {
  const isTablet = width >= 768;
  const isLargeTablet = width >= 1024;
  const isSmallPhone = width < 360;

  return {
    // Dynamic column count
    numColumns: isLargeTablet ? 4 : isTablet ? 3 : 2,

    // Responsive padding and spacing
    containerPadding: isTablet ? 30 : isSmallPhone ? 10 : 15,
    cardMargin: isTablet ? 8 : 5,

    // Responsive font sizes
    headingSize: isTablet ? 32 : isSmallPhone ? 20 : 24,
    subHeadingSize: isTablet ? 16 : isSmallPhone ? 12 : 14,
    languageNameSize: isTablet ? 18 : isSmallPhone ? 14 : 16,
    nativeTextSize: isTablet ? 28 : isSmallPhone ? 20 : 24,
    buttonTextSize: isTablet ? 20 : isSmallPhone ? 16 : 18,

    // Responsive dimensions
    cardHeight: isTablet ? 70 : isSmallPhone ? 55 : 60,
    buttonPadding: isTablet ? 18 : isSmallPhone ? 12 : 15,
    headerMarginTop: isTablet ? 30 : 20,
    headerMarginBottom: isTablet ? 30 : 20,
    footerBottom: isTablet ? 40 : 30,
  };
};

const config = getResponsiveConfig();

// Calculate item width based on number of columns
const ITEM_WIDTH = (width - (config.containerPadding * 2) - (config.cardMargin * 2 * config.numColumns)) / config.numColumns;

const LANGUAGES = [
  { id: "hindi", name: "Hindi", native: "हि", color: "#32CD32" },      // Lime Green
  { id: "english", name: "English", native: "EN", color: "#00CED1" },  // Dark Turquoise
  { id: "punjabi", name: "Punjabi", native: "ਪੀ", color: "#FF8C00" },  // Dark Orange
  { id: "tamil", name: "Tamil", native: "த", color: "#8A2BE2" },       // Blue Violet
  { id: "telugu", name: "Telugu", native: "తె", color: "#1E90FF" },    // Dodger Blue
  { id: "urdu", name: "Urdu", native: "اردو", color: "#FFFF00" },      // Yellow
  { id: "rajasthani", name: "Rajasthani", native: "रा", color: "#FF1493" }, // Deep Pink
  { id: "bengali", name: "Bengali", native: "ব", color: "#FF4444" },   // Red
  { id: "marathi", name: "Marathi", native: "म", color: "#ADFF2F" },   // Green Yellow
  { id: "malayalam", name: "Malayalam", native: "മ", color: "#9370DB" }, // Medium Purple
  { id: "gujarati", name: "Gujarati", native: "ગુ", color: "#20B2AA" }, // Light Sea Green
  { id: "kannada", name: "Kannada", native: "ಕ", color: "#EE82EE" },   // Violet
  { id: "odia", name: "Odia", native: "ଓ", color: "#FFD700" },         // Gold
  { id: "assamese", name: "Assamese", native: "অ", color: "#FF69B4" }, // Hot Pink
];

export const SelectLanguages = ({ navigation }) => {
  const theme = useTheme();
  const { colors } = theme;
  const [selectedLanguages, setSelectedLanguages] = useState([]);

  useEffect(() => {
    const fetchLanguages = async () => {
      const langString = await GetLanguageValue();
      if (langString) {
        setSelectedLanguages(langString.split(","));
      }
    };
    fetchLanguages();
  }, []);

  const toggleLanguage = (id) => {
    setSelectedLanguages((prev) => {
      if (prev.includes(id)) {
        return prev.filter((langId) => langId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const onConfirmPress = async () => {
    if (selectedLanguages.length < 1) {
      alert("Please select at least 1 language");
    } else {
      const Lang = selectedLanguages.join(",");
      await SetLanguageValue(Lang);
      navigation.pop();
      ToastAndroid.showWithGravity(
        `Please restart the app`,
        ToastAndroid.SHORT,
        ToastAndroid.CENTER,
      );
    }
  };

  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const renderItem = ({ item, index }) => {
    const isSelected = selectedLanguages.includes(item.id);
    const activeColor = item.color || "#32CD32";
    const currentConfig = getResponsiveConfig();

    const backgroundColor = isSelected
      ? hexToRgba(activeColor, theme.dark ? 0.25 : 0.15)
      : (theme.dark ? "rgba(30, 30, 40, 0.5)" : "rgba(100, 100, 110, 0.05)");

    const borderColor = isSelected ? activeColor : (theme.dark ? "#444466" : "#CCCCCC");

    return (
      <Animated.View exiting={FadeInDown} entering={FadeInDown.delay(index * 50)} style={{ margin: currentConfig.cardMargin }}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => toggleLanguage(item.id)}
          style={[
            styles.languageCard,
            {
              borderColor: borderColor,
              shadowColor: isSelected ? activeColor : "#000",
              backgroundColor: backgroundColor,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: isSelected ? 0.6 : 0,
              shadowRadius: isSelected ? 8 : 0,
            },
          ]}
        >
          <View style={styles.cardContent}>
            <Text style={[styles.languageName, {
              color: isSelected ? (theme.dark ? "#FFFFFF" : colors.primary) : colors.text,
              fontSize: currentConfig.languageNameSize
            }]}>
              {item.name}
            </Text>
            <Text style={[styles.nativeText, {
              color: isSelected ? (theme.dark ? "#FFFFFF" : activeColor) : activeColor,
              textShadowColor: isSelected ? "transparent" : (theme.dark ? activeColor : "transparent"),
              textShadowRadius: isSelected ? 0 : 2,
              fontSize: currentConfig.nativeTextSize
            }]}>
              {item.native}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <MainWrapper>
      <View style={[styles.container, { paddingHorizontal: config.containerPadding }]}>
        <View style={[styles.header, {
          marginTop: config.headerMarginTop,
          marginBottom: config.headerMarginBottom
        }]}>
          <Heading
            text="Update music languages"
            style={[styles.heading, { fontSize: config.headingSize, color: colors.text }]}
          />
          <Text style={[styles.subHeading, { fontSize: config.subHeadingSize, color: colors.text, opacity: 0.6 }]}>
            Select music languages in the order of preference
          </Text>
        </View>

        <FlatList
          data={LANGUAGES}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          key={config.numColumns}
          numColumns={config.numColumns}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={styles.columnWrapper}
        />

        <View style={[styles.footer, {
          bottom: config.footerBottom,
          paddingHorizontal: config.containerPadding
        }]}>
          <TouchableOpacity style={styles.confirmButton} onPress={onConfirmPress}>
            <LinearGradient
              colors={theme.dark ? ['#FFFFFF', '#F0F0F0'] : ['#000000', '#1A1A1A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.gradientButton, { paddingVertical: config.buttonPadding }]}
            >
              <Text style={[styles.confirmButtonText, {
                fontSize: config.buttonTextSize,
                color: theme.dark ? "#000000" : "#FFFFFF"
              }]}>
                Confirm Changes
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </MainWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
  },
  heading: {
    color: "#FFF",
    fontWeight: "bold",
    textAlign: "center",
  },
  subHeading: {
    color: "#888",
    textAlign: "center",
    marginTop: 5,
  },
  listContainer: {
    paddingBottom: 150,
  },
  columnWrapper: {
    justifyContent: "space-between",
  },
  languageCard: {
    width: ITEM_WIDTH,
    height: config.cardHeight,
    borderRadius: 15,
    borderWidth: 1.5,
    justifyContent: "center",
    paddingHorizontal: width < 360 ? 10 : 15,
    marginVertical: 5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  languageName: {
    fontWeight: "500",
  },
  nativeText: {
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  confirmButton: {
    width: "100%",
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: "rgba(0,0,0,0.2)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  gradientButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: "#000",
    fontWeight: "bold",
    letterSpacing: 1,
  },
});
