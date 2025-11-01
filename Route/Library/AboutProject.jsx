import { MainWrapper } from "../../Layout/MainWrapper";
import { Linking, Pressable, ScrollView, View, Image, StyleSheet, Dimensions, TouchableOpacity } from "react-native";
import { PlainText } from "../../Component/Global/PlainText";
import { Heading } from "../../Component/Global/Heading";
import { SmallText } from "../../Component/Global/SmallText";
import { useNavigation, useTheme } from "@react-navigation/native";
import { useEffect } from "react";
import {
  Card,
  Button,
  Avatar,
  Chip,
  Text,
  Surface,
  useTheme as usePaperTheme
} from 'react-native-paper';
import AntDesign from "react-native-vector-icons/AntDesign";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import Entypo from "react-native-vector-icons/Entypo";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const AboutProject = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const paperTheme = usePaperTheme();

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
        <Card style={styles.profileCard} elevation={4}>
          <Card.Content style={styles.profileHeader}>
            <Avatar.Image
              size={100}
              source={require("../../Images/me.jpg")}
              style={[styles.profileImage, {borderColor: paperTheme.colors.outline}]}
            />
            <View style={styles.profileInfo}>
              <Text variant="labelSmall" style={[styles.roleText, {color: paperTheme.colors.onSurface, opacity: 0.8}]}>
                DEVELOPED BY
              </Text>
              <Text variant="headlineSmall" style={[styles.nameText, {color: paperTheme.colors.onSurface}]}>
                Gaurav Sharma
              </Text>

              <View style={styles.socialButtonsContainer}>
                <TouchableOpacity
                  style={[styles.socialButtonTouchable, {backgroundColor: '#9c6efa'}]}
                  onPress={() => openLink("https://github.com/gauravxdev")}
                  activeOpacity={0.7}
                >
                  <AntDesign name="github" size={18} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.socialButtonTouchable, {backgroundColor: '#0a9fef'}]}
                  onPress={() => openLink("https://www.linkedin.com/in/gauravxdev/")}
                  activeOpacity={0.7}
                >
                  <AntDesign name="linkedin-square" size={18} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.socialButtonTouchable, {backgroundColor: '#fa7e1e'}]}
                  onPress={() => openLink("https://www.instagram.com/ohh.its_gaurav")}
                  activeOpacity={0.7}
                >
                  <AntDesign name="instagram" size={18} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.socialButtonTouchable, {backgroundColor: '#576574'}]}
                  onPress={() => openLink("https://gauravxdev.vercel.app/")}
                  activeOpacity={0.7}
                >
                  <AntDesign name="user" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Community Section */}
        <View style={styles.sectionHeader}>
          <Surface style={[styles.sectionHeaderIcon, {backgroundColor: paperTheme.colors.surfaceVariant}]} elevation={2}>
            <FontAwesome name="users" size={16} color={paperTheme.colors.onSurface} />
          </Surface>
          <View>
            <Text variant="titleMedium" style={[styles.sectionTitle, {color: paperTheme.colors.onSurface}]}>
              Want to stay updated?
            </Text>
            <Text variant="bodyMedium" style={[styles.sectionSubtitle, {color: paperTheme.colors.onSurfaceVariant}]}>
              Join the community.
            </Text>
          </View>
        </View>

        <View style={styles.communityContainer}>
          <Card
            style={styles.communityCard}
            elevation={3}
            onPress={() => openLink("https://telegram.me/OrbitMusicOfficial")}
          >
            <Card.Content style={[styles.communityCardContent, {backgroundColor: '#0088cc'}]}>
              <View>
                <Text variant="titleSmall" style={[styles.communityCardTitle, {color: '#FFFFFF'}]}>
                  Telegram
                </Text>
                <Text variant="bodySmall" style={[styles.communityCardSubtitle, {color: '#FFFFFF'}]}>
                  Orbit Music
                </Text>
              </View>
              <MaterialIcons name="send" size={24} color="#FFFFFF" />
            </Card.Content>
          </Card>

          <Card
            style={styles.communityCard}
            elevation={3}
            onPress={() => openLink("https://chat.whatsapp.com/DFnfHsdeqbcHwKudA0e0WC")}
          >
            <Card.Content style={[styles.communityCardContent, {backgroundColor: '#25D366'}]}>
              <View>
                <Text variant="titleSmall" style={[styles.communityCardTitle, {color: '#FFFFFF'}]}>
                  WhatsApp
                </Text>
                <Text variant="bodySmall" style={[styles.communityCardSubtitle, {color: '#FFFFFF'}]}>
                  Orbit
                </Text>
              </View>
              <FontAwesome name="whatsapp" size={24} color="#FFFFFF" />
            </Card.Content>
          </Card>
        </View>

        {/* Contribute Section */}
        <View style={styles.sectionHeader}>
          <Surface style={[styles.sectionHeaderIcon, {backgroundColor: paperTheme.colors.surfaceVariant}]} elevation={2}>
            <MaterialIcons name="code" size={16} color={paperTheme.colors.onSurface} />
          </Surface>
          <View>
            <Text variant="titleMedium" style={[styles.sectionTitle, {color: paperTheme.colors.onSurface}]}>
              Are you a developer?
            </Text>
            <Text variant="bodyMedium" style={[styles.sectionSubtitle, {color: paperTheme.colors.onSurfaceVariant}]}>
              Contribute to the project.
            </Text>
          </View>
        </View>

        <Card
          style={styles.githubCard}
          elevation={3}
          onPress={() => openLink("https://github.com/gauravxdev/orbit")}
        >
          <Card.Content style={[styles.githubContent, {backgroundColor: paperTheme.colors.surfaceVariant}]}>
            <View style={styles.githubTextContainer}>
              <Text variant="titleMedium" style={[styles.githubTitle, {color: paperTheme.colors.onSurface}]}>
                Orbit
              </Text>
              <Text variant="bodySmall" style={[styles.githubDescription, {color: paperTheme.colors.onSurfaceVariant}]}>
                An open source music player to listen music for free.
              </Text>
            </View>
            <Surface style={[styles.githubIconContainer, {backgroundColor: paperTheme.colors.surface}]} elevation={2}>
              <AntDesign name="github" size={32} color={paperTheme.colors.onSurface} />
            </Surface>
          </Card.Content>
        </Card>

        {/* Bug Report Section */}
        <View style={styles.sectionHeader}>
          <Surface style={[styles.sectionHeaderIcon, {backgroundColor: paperTheme.colors.surfaceVariant}]} elevation={2}>
            <Entypo name="bug" size={16} color={paperTheme.colors.onSurface} />
          </Surface>
          <View>
            <Text variant="titleMedium" style={[styles.sectionTitle, {color: paperTheme.colors.onSurface}]}>
              Request a new feature?
            </Text>
            <Text variant="bodyMedium" style={[styles.sectionSubtitle, {color: paperTheme.colors.onSurfaceVariant}]}>
              Or report a bug?
            </Text>
          </View>
        </View>

        <Card style={[styles.bugReportCard, {backgroundColor: '#2a1a1a'}]} elevation={3}>
          <Card.Content style={styles.bugReportContent}>
            <Surface style={[styles.bugIconContainer, {backgroundColor: '#ff6b6b'}]} elevation={3}>
              <Entypo name="bug" size={36} color="#FFFFFF" />
            </Surface>
            <Text variant="bodySmall" style={[styles.bugReportText, {color: '#f0f0f0'}]}>
              You can always request me new features or report a bug in any of my social media handles or you can mail me at:
            </Text>
            <Button
              mode="contained"
              onPress={() => Linking.openURL('mailto:gauravsharma0770@gmail.com')}
              style={[styles.emailContainer, {backgroundColor: '#ff6b6b'}]}
              contentStyle={{flexDirection: 'row', alignItems: 'center'}}
              icon="email"
              labelStyle={{color: '#FFFFFF'}}
            >
              gauravsharma0770@gmail.com
            </Button>
            <Text variant="bodySmall" style={[styles.bugReportText, {color: '#f0f0f0'}]}>
              Even you can raise an issue in GitHub
            </Text>
          </Card.Content>
        </Card>
        
        <View style={styles.versionContainer}>
          <Text variant="labelSmall" style={[styles.versionText, {color: paperTheme.colors.onSurfaceVariant}]}>
            Version 2.0.0
          </Text>
          <Text variant="labelSmall" style={[styles.versionText, {color: paperTheme.colors.onSurfaceVariant}]}>
            Made with ❤️ in India
          </Text>
        </View>
      </ScrollView>
    </MainWrapper>
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
    marginBottom: 24,
    overflow: 'hidden',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 0,
  },
  profileImage: {
    borderWidth: 2,
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  socialButtonTouchable: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  socialButton: {
    margin: 0,
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
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  communityCardSubtitle: {
    fontSize: 12,
    opacity: 0.9,
  },
  githubCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
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
  githubIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  githubTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  githubDescription: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.9,
  },
  bugReportCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  bugReportContent: {
    padding: 16,
    alignItems: 'center',
  },
  bugIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emailContainer: {
    borderRadius: 20,
    marginVertical: 12,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
});
