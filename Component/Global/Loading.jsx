import { View, ActivityIndicator } from "react-native"
import { useTheme } from '@react-navigation/native';

export const LoadingComponent = ({ loading, height }) => {
  const { colors } = useTheme();
  
  return (
    <>
      {loading && (
        <View style={{
          alignItems: "center",
          justifyContent: "center",
          height: height || "100%",
        }}>
          <ActivityIndicator 
            size="large" 
            color={colors.primary} 
            style={{
              height: 80,
              width: 80,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          />
        </View>
      )}
    </>
  );
};
