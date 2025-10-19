import { MainWrapper } from "../../Layout/MainWrapper";
import { Linking, Pressable, ScrollView, View, Image, StyleSheet, Dimensions, TouchableOpacity } from "react-native";
import { PlainText } from "../../Component/Global/PlainText";
import { Heading } from "../../Component/Global/Heading";
import { SmallText } from "../../Component/Global/SmallText";
import AntDesign from "react-native-vector-icons/AntDesign";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import Entypo from "react-native-vector-icons/Entypo";
import { useNavigation, useTheme } from "@react-navigation/native";
import { useEffect } from "react";
import LinearGradient from "react-native-linear-gradient";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const AboutProject = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  
  // Removed BackHandler - let RootRoute handle navigation
  
  const openLink = (url) => {
    if (url) {
      Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
    }
  };
  
  return (
    <MainWrapper>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {/* Developer Profile Section */}
        <LinearGradient
          start={{x: 0, y: 0}}
          end={{x: 0, y: 1}}
          colors={['#4a4a4a', '#1e1e1e']}
          style={styles.profileCard}
        >
          <View style={styles.profileHeader}>
            <Image 
              source={require("../../Images/me.jpg")} 
              style={styles.profileImage}
            />
            <View style={styles.profileInfo}>
              <SmallText text="DEVELOPED BY" style={styles.roleText} />
              <Heading text="Gaurav Sharma" style={styles.nameText} />
              
              <View style={styles.socialButtonsContainer}>
                <SocialButton 
                  icon="github" 
                  color="#9c6efa" 
                  onPress={() => openLink("https://github.com/gauravxdev")}
                />
                <SocialButton   
                  icon="linkedin-square" 
                  color="#0a9fef" 
                  onPress={() => openLink("https://www.linkedin.com/in/gauravxdev/")}
                />
                <SocialButton 
                  icon="instagram" 
                  color="#fa7e1e" 
                  onPress={() => openLink("https://www.instagram.com/ohh.its_gaurav")}
                />
                <SocialButton 
                  icon="user" 
                  color="#576574" 
                  onPress={() => openLink("https://gauravxdev.vercel.app/")}
                />
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Community Section */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionHeaderIcon, {backgroundColor: '#475667'}]}>
            <FontAwesome name="users" size={16} color="#FFFFFF" />
          </View>
          <View>
            <PlainText text="Want to stay updated?" style={styles.sectionTitle} />
            <SmallText text="Join the community." style={styles.sectionSubtitle} />
          </View>
        </View>
        
        <View style={styles.communityContainer}>
          <TouchableOpacity 
            style={[styles.communityCard, {backgroundColor: '#0088cc'}]}
            onPress={() => openLink("https://telegram.me/OrbitMusicOfficial")}
            activeOpacity={0.8}
          >
            <View style={styles.communityCardContent}>
              <View>
                <PlainText text="Telegram" style={styles.communityCardTitle} />
                <SmallText text="Orbit Music" style={styles.communityCardSubtitle} />
              </View>
              <MaterialIcons name="send" size={24} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.communityCard, {backgroundColor: '#25D366'}]}
            onPress={() => openLink("https://chat.whatsapp.com/DFnfHsdeqbcHwKudA0e0WC")}
            activeOpacity={0.8}
          >
            <View style={styles.communityCardContent}>
              <View>
                <PlainText text="WhatsApp" style={styles.communityCardTitle} />
                <SmallText text="Orbit" style={styles.communityCardSubtitle} />
              </View>
              <FontAwesome name="whatsapp" size={24} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Contribute Section */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionHeaderIcon, {backgroundColor: '#475667'}]}>
            <MaterialIcons name="code" size={16} color="#FFFFFF" />
          </View>
          <View>
            <PlainText text="Are you a developer?" style={styles.sectionTitle} />
            <SmallText text="Contribute to the project." style={styles.sectionSubtitle} />
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.githubCard, {backgroundColor: '#4056c5'}]}
          activeOpacity={0.8}
          onPress={() => openLink("https://github.com/gauravxdev/orbit")}
        >
          <View style={styles.githubContent}>
            <View style={styles.githubTextContainer}>
              <Heading text="Orbit" style={styles.githubTitle} />
              <SmallText text="An open source music player to listen music for free." style={styles.githubDescription} />
            </View>
            <View style={[styles.githubIconContainer, {backgroundColor: '#6078e7'}]}>
              <AntDesign name="github" size={32} color="#FFFFFF" />
            </View>
          </View>
        </TouchableOpacity>

        {/* Bug Report Section */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionHeaderIcon, {backgroundColor: '#475667'}]}>
            <Entypo name="bug" size={16} color="#FFFFFF" />
          </View>
          <View>
            <PlainText text="Request a new feature?" style={styles.sectionTitle} />
            <SmallText text="Or report a bug?" style={styles.sectionSubtitle} />
          </View>
        </View>
        
        <View style={[styles.bugReportCard, {backgroundColor: '#DC2626'}]}>
          <View style={styles.bugReportContent}>
            <View style={[styles.bugIconContainer, {backgroundColor: '#ff6b6b'}]}>
              <Entypo name="bug" size={36} color="#FFFFFF" />
            </View>
            <SmallText 
              text="You can always request me new features or report a bug in any of my social media handles or you can mail me at:" 
              style={styles.bugReportText} 
            />
            <TouchableOpacity 
              onPress={() => Linking.openURL('mailto:gauravsharma0770@gmail.com')}
              style={[styles.emailContainer, {backgroundColor: '#ff6b6b'}]}
            >
              <MaterialIcons name="email" size={16} color="#FFFFFF" />
              <SmallText 
                text="gauravsharma0770@gmail.com" 
                style={styles.emailText} 
              />
            </TouchableOpacity>
            <SmallText 
              text="Even you can raise an issue in GitHub" 
              style={styles.bugReportText} 
            />
          </View>
        </View>
        
        <View style={styles.versionContainer}>
          <SmallText text="Version 2.0.0" style={styles.versionText} />
          <SmallText text="Made with ❤️ in India" style={styles.versionText} />
        </View>
      </ScrollView>
    </MainWrapper>
  );
};

// Social Media Button Component
const SocialButton = ({ icon, color, onPress }) => {
  return (
    <TouchableOpacity 
      style={[styles.socialButton, {backgroundColor: color}]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <AntDesign name={icon} size={18} color="#FFFFFF" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 5,
    paddingBottom: 120,
  },
  profileCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    elevation: 3,
    overflow: 'hidden',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#777777',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  roleText: {
    fontSize: 12,
    letterSpacing: 1,
    opacity: 0.8,
    marginBottom: 2,
    color: '#e0e0e0',
  },
  nameText: {
    fontSize: 22,
    marginBottom: 12,
    color: '#ffffff',
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  socialButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
    gap: 12,
  },
  sectionHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    fontSize: 14,
    opacity: 0.8, // Review if opacity is still needed with theme.colors.textSecondary
  },
  communityContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  communityCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
  },
  communityCardContent: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  communityCardTitle: {
    fontSize: 16,
    marginBottom: 4,
    color: '#ffffff',
  },
  communityCardSubtitle: {
    fontSize: 12,
    opacity: 0.9,
    color: '#e0e0e0',
  },
  githubCard: {
    backgroundColor: '#2d333b',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    elevation: 3,
  },
  githubContent: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  githubTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  githubTitle: {
    fontSize: 18,
    marginBottom: 4,
    color: '#ffffff',
  },
  githubDescription: {
    fontSize: 14,
    opacity: 0.9,
    lineHeight: 20,
    color: '#e0e0e0',
  },
  githubIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#161b22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bugReportCard: {
    backgroundColor: '#2a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    elevation: 3,
  },
  bugReportContent: {
    padding: 16,
    alignItems: 'center',
  },
  bugIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  bugReportText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
    color: '#f0f0f0',
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a3a3a',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginVertical: 12,
    gap: 8,
  },
  emailText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  versionText: {
    fontSize: 12,
    opacity: 0.7, // Review if opacity is still needed with theme.colors.textSecondary
    marginBottom: 4,
  },
});
