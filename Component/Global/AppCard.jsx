import { Card, Text } from 'react-native-paper';
import { StyleSheet } from 'react-native';

export const AppCard = ({
  title,
  subtitle,
  content,
  onPress,
  elevation = 2,
  style,
  titleStyle,
  subtitleStyle,
  contentStyle,
  ...props
}) => {
  return (
    <Card
      style={[styles.card, style]}
      elevation={elevation}
      onPress={onPress}
      {...props}
    >
      <Card.Title
        title={title}
        subtitle={subtitle}
        titleStyle={[styles.title, titleStyle]}
        subtitleStyle={[styles.subtitle, subtitleStyle]}
      />
      {content && (
        <Card.Content style={[styles.content, contentStyle]}>
          <Text variant="bodyMedium">{content}</Text>
        </Card.Content>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 8,
    borderRadius: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
  },
  content: {
    paddingTop: 8,
  },
});
