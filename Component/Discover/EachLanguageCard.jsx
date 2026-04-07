import { Pressable } from 'react-native';
import { PlainText } from '../Global/PlainText';
import { useNavigation, useTheme } from '@react-navigation/native';

export const EachLanguageCard = ({ language }) => {
  const { colors, dark } = useTheme();
  const navigation = useNavigation();
  return (
    <Pressable
      onPress={() => {
        navigation.navigate('LanguageDetail', {
          language: language.toLowerCase(),
        });
      }}
      style={{
        backgroundColor: dark ? 'rgba(43,47,44,0.84)' : '#E0E0E0', // Light gray for light theme
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <PlainText
        text={language}
        style={{ paddingRight: 0, color: colors.text }}
      />
    </Pressable>
  );
};
