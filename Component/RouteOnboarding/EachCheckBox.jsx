import { SpaceBetween } from '../../Layout/SpaceBetween';
import { Pressable, View, Text } from 'react-native';
import { useTheme } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

export const EachCheckBox = ({
  checkbox1,
  checkbox2,
  onCheck1,
  onCheck2,
  data,
}) => {
  return (
    <SpaceBetween
      style={{
        paddingHorizontal: 5,
        justifyContent: 'center',
        gap: 20,
        marginVertical: 5,
      }}
    >
      <EachCheck name={checkbox1} data={data} onpress={onCheck1} />
      <EachCheck name={checkbox2} data={data} onpress={onCheck2} />
    </SpaceBetween>
  );
};
function EachCheck({ name, onpress, data }) {
  const theme = useTheme();
  const isChecked = data.includes(name.toLowerCase());

  const handlePress = () => {
    let newData = [...data];
    if (isChecked) {
      const index = newData.indexOf(name.toLowerCase());
      if (index > -1) {
        newData.splice(index, 1);
      }
    } else {
      newData.push(name.toLowerCase());
    }
    onpress(newData);
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(100)}
      style={{
        alignItems: 'flex-start',
        width: 100,
      }}
    >
      <Pressable
        onPress={handlePress}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 4,
        }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 4,
            borderWidth: 2,
            borderColor: isChecked ? theme.colors.primary : '#FFFFFF',
            backgroundColor: isChecked ? theme.colors.primary : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 8,
          }}
        >
          {isChecked && (
            <MaterialIcons name="check" size={16} color="#FFFFFF" />
          )}
        </View>
        <Text
          style={{
            fontFamily: 'JosefinSans-Regular',
            color: 'white',
            fontSize: 15,
          }}
        >
          {name}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
