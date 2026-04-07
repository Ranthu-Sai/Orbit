import { MainWrapper } from '../../Layout/MainWrapper';
import {
  Linking,
  Pressable,
  ScrollView,
  View,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ToastAndroid,
} from 'react-native';
import { PlainText } from '../../Component/Global/PlainText';
import { Heading } from '../../Component/Global/Heading';
import { SmallText } from '../../Component/Global/SmallText';
import { useNavigation, useTheme } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import {
  Card,
  Button,
  Avatar,
  Chip,
  Text,
  Surface,
  ActivityIndicator,
  useTheme as usePaperTheme,
} from 'react-native-paper';
import AntDesign from 'react-native-vector-icons/AntDesign';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Entypo from 'react-native-vector-icons/Entypo';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DeviceInfo from 'react-native-device-info';
import updateService from '../../Utils/UpdateService';
import UpdateModal from '../../Component/Modals/UpdateModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const AboutProject = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const paperTheme = usePaperTheme();

  // Update state
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const appVersion = DeviceInfo.getVersion();

  // Removed BackHandler - let RootRoute handle navigation

  const openLink = (url) => {
    if (url) {
      Linking.openURL(url).catch((err) =>
        console.error("Couldn't load page", err)
      );
    }
  };

  const checkForUpdates = async () => {
    setIsCheckingUpdate(true);
    try {
      const result = await updateService.checkForUpdate(true); // Force check
      if (result.updateAvailable) {
        setUpdateInfo(result);
        setUpdateModalVisible(true);
      } else {
        ToastAndroid.show("You're up to date! ✓", ToastAndroid.SHORT);
      }
    } catch (error) {
      console.error('Update check failed:', error);
      ToastAndroid.show('Failed to check for updates', ToastAndroid.SHORT);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleUpdateDismiss = async () => {
    setUpdateModalVisible(false);
    if (updateInfo?.latestVersion) {
      await updateService.dismissUpdate(updateInfo.latestVersion);
    }
  };

  const handleUpdateNow = async () => {
    if (updateInfo?.url) {
      await updateService.openUpdateLink(updateInfo.url);
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
              source={require('../../Images/me.jpg')}
              style={[
                styles.profileImage,
                { borderColor: paperTheme.colors.outline },
              ]}
            />
            <View style={styles.profileInfo}>
              <Text
                variant="labelSmall"
                style={[
                  styles.roleText,
                  { color: paperTheme.colors.onSurface, opacity: 0.8 },
                ]}
              >
                DEVELOPED BY
              </Text>
              <Text
                variant="headlineSmall"
                style={[
                  styles.nameText,
                  { color: paperTheme.colors.onSurface },
                ]}
              >
                Gaurav Sharma
              </Text>

              <View style={styles.socialButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.socialButtonTouchable,
                    { backgroundColor: '#6366f1' },
                  ]}
                  onPress={() => openLink('https://github.com/gauravxdev')}
                  activeOpacity={0.7}
                >
                  <AntDesign name="github" size={18} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.socialButtonTouchable,
                    { backgroundColor: '#E1306C' },
                  ]}
                  onPress={() =>
                    openLink('https://www.instagram.com/orbitmusicapp')
                  }
                  activeOpacity={0.7}
                >
                  <AntDesign name="instagram" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Community Section */}
        <View style={styles.sectionHeader}>
          <Surface
            style={[
              styles.sectionHeaderIcon,
              { backgroundColor: paperTheme.colors.surfaceVariant },
            ]}
            elevation={2}
          >
            <FontAwesome
              name="users"
              size={16}
              color={paperTheme.colors.onSurface}
            />
          </Surface>
          <View>
            <Text
              variant="titleMedium"
              style={[
                styles.sectionTitle,
                { color: paperTheme.colors.onSurface },
              ]}
            >
              Join the Community
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.sectionSubtitle,
                { color: paperTheme.colors.onSurfaceVariant },
              ]}
            >
              Updates, feature requests & bug reports.
            </Text>
          </View>
        </View>

        <View style={styles.communityContainer}>
          <Card
            style={styles.communityCard}
            elevation={3}
            onPress={() => openLink('https://telegram.me/OrbitMusicOfficial')}
          >
            <Card.Content
              style={[
                styles.communityCardContent,
                { backgroundColor: '#0088cc' },
              ]}
            >
              <View>
                <Text
                  variant="titleSmall"
                  style={[styles.communityCardTitle, { color: '#FFFFFF' }]}
                >
                  Telegram
                </Text>
                <Text
                  variant="bodySmall"
                  style={[styles.communityCardSubtitle, { color: '#FFFFFF' }]}
                >
                  Orbit Music
                </Text>
              </View>
              <View style={{ transform: [{ rotate: '-30deg' }] }}>
                <MaterialIcons name="send" size={24} color="#FFFFFF" />
              </View>
            </Card.Content>
          </Card>

          <Card
            style={styles.communityCard}
            elevation={3}
            onPress={() => openLink('https://discord.gg/JrMzKes3')}
          >
            <Card.Content
              style={[
                styles.communityCardContent,
                { backgroundColor: '#5865F2' },
              ]}
            >
              <View>
                <Text
                  variant="titleSmall"
                  style={[styles.communityCardTitle, { color: '#FFFFFF' }]}
                >
                  Discord
                </Text>
                <Text
                  variant="bodySmall"
                  style={[styles.communityCardSubtitle, { color: '#FFFFFF' }]}
                >
                  Orbit Community
                </Text>
              </View>
              <Ionicons name="logo-discord" size={24} color="#FFFFFF" />
            </Card.Content>
          </Card>
        </View>

        {/* Support Section */}
        <View style={styles.sectionHeader}>
          <Surface
            style={[
              styles.sectionHeaderIcon,
              { backgroundColor: paperTheme.colors.surfaceVariant },
            ]}
            elevation={2}
          >
            <MaterialCommunityIcons
              name="heart"
              size={16}
              color={paperTheme.colors.onSurface}
            />
          </Surface>
          <View>
            <Text
              variant="titleMedium"
              style={[
                styles.sectionTitle,
                { color: paperTheme.colors.onSurface },
              ]}
            >
              Support the Project
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.sectionSubtitle,
                { color: paperTheme.colors.onSurfaceVariant },
              ]}
            >
              Help keep Orbit free and open source.
            </Text>
          </View>
        </View>

        <View style={styles.supportContainer}>
          <Card
            style={styles.supportCard}
            elevation={3}
            onPress={() => openLink('https://ko-fi.com/itsgauravsharma')}
          >
            <Card.Content
              style={[
                styles.supportCardContent,
                { backgroundColor: '#FF5E5B' },
              ]}
            >
              <View>
                <Text
                  variant="titleSmall"
                  style={[styles.supportCardTitle, { color: '#FFFFFF' }]}
                >
                  Ko-fi
                </Text>
                <Text
                  variant="bodySmall"
                  style={[styles.supportCardSubtitle, { color: '#FFFFFF' }]}
                >
                  Buy me a coffee
                </Text>
              </View>
              <FontAwesome5 name="coffee" size={22} color="#FFFFFF" />
            </Card.Content>
          </Card>

          <Card
            style={styles.supportCard}
            elevation={3}
            onPress={() => openLink('https://orbit-donation.vercel.app/')}
          >
            <Card.Content
              style={[
                styles.supportCardContent,
                { backgroundColor: '#8B5CF6' },
              ]}
            >
              <View>
                <Text
                  variant="titleSmall"
                  style={[styles.supportCardTitle, { color: '#FFFFFF' }]}
                >
                  Donate
                </Text>
                <Text
                  variant="bodySmall"
                  style={[styles.supportCardSubtitle, { color: '#FFFFFF' }]}
                >
                  Support development
                </Text>
              </View>
              <MaterialCommunityIcons
                name="gift-outline"
                size={24}
                color="#FFFFFF"
              />
            </Card.Content>
          </Card>
        </View>

        {/* Contribute Section */}
        <View style={styles.sectionHeader}>
          <Surface
            style={[
              styles.sectionHeaderIcon,
              { backgroundColor: paperTheme.colors.surfaceVariant },
            ]}
            elevation={2}
          >
            <MaterialIcons
              name="code"
              size={16}
              color={paperTheme.colors.onSurface}
            />
          </Surface>
          <View>
            <Text
              variant="titleMedium"
              style={[
                styles.sectionTitle,
                { color: paperTheme.colors.onSurface },
              ]}
            >
              Are you a developer?
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.sectionSubtitle,
                { color: paperTheme.colors.onSurfaceVariant },
              ]}
            >
              Contribute to the project.
            </Text>
          </View>
        </View>

        <Card
          style={styles.githubCard}
          elevation={3}
          onPress={() => openLink('https://github.com/gauravxdev/orbit')}
        >
          <Card.Content
            style={[
              styles.githubContent,
              { backgroundColor: paperTheme.colors.surfaceVariant },
            ]}
          >
            <View style={styles.githubTextContainer}>
              <Text
                variant="titleMedium"
                style={[
                  styles.githubTitle,
                  { color: paperTheme.colors.onSurface },
                ]}
              >
                Orbit
              </Text>
              <Text
                variant="bodySmall"
                style={[
                  styles.githubDescription,
                  { color: paperTheme.colors.onSurfaceVariant },
                ]}
              >
                An open source music player to listen music for free.
              </Text>
            </View>
            <Surface
              style={[
                styles.githubIconContainer,
                { backgroundColor: paperTheme.colors.surface },
              ]}
              elevation={2}
            >
              <AntDesign
                name="github"
                size={32}
                color={paperTheme.colors.onSurface}
              />
            </Surface>
          </Card.Content>
        </Card>

        {/* Check for Updates Section */}
        <View style={styles.sectionHeader}>
          <Surface
            style={[
              styles.sectionHeaderIcon,
              { backgroundColor: paperTheme.colors.surfaceVariant },
            ]}
            elevation={2}
          >
            <MaterialCommunityIcons
              name="update"
              size={16}
              color={paperTheme.colors.onSurface}
            />
          </Surface>
          <View>
            <Text
              variant="titleMedium"
              style={[
                styles.sectionTitle,
                { color: paperTheme.colors.onSurface },
              ]}
            >
              App Updates
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.sectionSubtitle,
                { color: paperTheme.colors.onSurfaceVariant },
              ]}
            >
              Check for the latest version.
            </Text>
          </View>
        </View>

        <Card
          style={styles.updateCard}
          elevation={3}
          onPress={isCheckingUpdate ? undefined : checkForUpdates}
        >
          <Card.Content
            style={[
              styles.updateCardContent,
              { backgroundColor: paperTheme.colors.surfaceVariant },
            ]}
          >
            <View style={styles.updateTextContainer}>
              <Text
                variant="titleMedium"
                style={[
                  styles.updateTitle,
                  { color: paperTheme.colors.onSurface },
                ]}
              >
                Version {appVersion}
              </Text>
              <Text
                variant="bodySmall"
                style={[
                  styles.updateDescription,
                  { color: paperTheme.colors.onSurfaceVariant },
                ]}
              >
                Tap to check for updates
              </Text>
            </View>
            {isCheckingUpdate ? (
              <ActivityIndicator size={24} color={paperTheme.colors.primary} />
            ) : (
              <Surface
                style={[
                  styles.updateIconContainer,
                  { backgroundColor: paperTheme.colors.primaryContainer },
                ]}
                elevation={2}
              >
                <MaterialCommunityIcons
                  name="download"
                  size={24}
                  color={paperTheme.dark ? '#FFFFFF' : '#000000'}
                />
              </Surface>
            )}
          </Card.Content>
        </Card>

        <View style={styles.versionContainer}>
          <Text
            variant="labelSmall"
            style={[
              styles.versionText,
              { color: paperTheme.colors.onSurfaceVariant },
            ]}
          >
            Version {appVersion}
          </Text>
          <Text
            variant="labelSmall"
            style={[
              styles.versionText,
              { color: paperTheme.colors.onSurfaceVariant },
            ]}
          >
            Made with ❤️ in India
          </Text>
        </View>
      </ScrollView>

      {/* Update Modal */}
      <UpdateModal
        visible={updateModalVisible}
        onDismiss={handleUpdateDismiss}
        updateInfo={updateInfo}
        onUpdate={handleUpdateNow}
      />
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
    borderRadius: 16,
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
    fontWeight: '600',
    marginBottom: 4,
  },
  communityCardSubtitle: {
    fontSize: 12,
    opacity: 0.9,
  },
  supportContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  supportCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  supportCardContent: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  supportCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  supportCardSubtitle: {
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
  updateCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  updateCardContent: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  updateTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  updateTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  updateDescription: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.9,
  },
  updateIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
