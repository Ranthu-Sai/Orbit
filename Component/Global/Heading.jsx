import { Dimensions, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Spacer } from './Spacer';
import { useEffect, useState } from 'react';
import { GetFontSizeValue } from '../../LocalStorage/AppSettings';

export const Heading = ({ text, description, style, nospace }) => {
  const width = Dimensions.get('window').width;
  const [Size, setSize] = useState(width * 0.055);
  async function getFont() {
    const data = await GetFontSizeValue();
    if (data === 'Medium') {
      setSize(width * 0.055);
    } else if (data === 'Small') {
      setSize(width * 0.045);
    } else {
      setSize(width * 0.065);
    }
  }

  useEffect(() => {
    getFont();
  }, []);
  return (
    <>
      {!nospace && <Spacer />}
      {description && (
        <Text
          style={{
            fontSize: Size * 0.6,
            fontWeight: '700',
            color: style?.color || '#aaaaaa', // Fallback to neutral gray if no style color provided
            textTransform: 'uppercase',
            marginBottom: -4,
            letterSpacing: 0.5,
          }}
        >
          {description}
        </Text>
      )}
      <Text
        variant="headlineMedium"
        numberOfLines={2}
        style={{
          fontWeight: 900,
          fontSize: Size,
          fontFamily: 'roboto',
          ...StyleSheet.flatten(style),
        }}
      >
        {text || ''}
      </Text>
      {!nospace && <Spacer />}
    </>
  );
};
