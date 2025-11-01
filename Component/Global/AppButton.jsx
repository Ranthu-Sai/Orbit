import { Button } from 'react-native-paper';
import { StyleSheet } from 'react-native';

export const AppButton = ({
  title,
  onPress,
  mode = 'contained',
  disabled = false,
  loading = false,
  icon,
  style,
  contentStyle,
  labelStyle,
  ...props
}) => {
  return (
    <Button
      mode={mode}
      onPress={onPress}
      disabled={disabled || loading}
      loading={loading}
      icon={icon}
      style={[styles.button, style]}
      contentStyle={contentStyle}
      labelStyle={[styles.label, labelStyle]}
      {...props}
    >
      {title}
    </Button>
  );
};

const styles = StyleSheet.create({
  button: {
    marginVertical: 8,
    borderRadius: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
