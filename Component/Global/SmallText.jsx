import { Text, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { GetFontSizeValue } from '../../LocalStorage/AppSettings';

export const SmallText = ({
  text,
  color,
  style,
  maxLine,
  selectable,
  isArtistName,
}) => {
  const [Size, setSize] = useState(10);
  async function getFont() {
    const data = await GetFontSizeValue();
    if (data === 'Medium') {
      setSize(10);
    } else if (data === 'Small') {
      setSize(10);
    } else {
      setSize(11);
    }
  }

  useEffect(() => {
    getFont();
  }, []);
  return (
    <Text
      selectable={selectable}
      numberOfLines={maxLine ? maxLine : 2}
      style={{
        color: !color ? undefined : color,
        fontSize: Size,
        fontFamily: 'roboto',
        fontWeight: isArtistName ? '500' : '400',
        ...StyleSheet.flatten(style),
      }}
    >
      {text || ''}
    </Text>
  );
};
