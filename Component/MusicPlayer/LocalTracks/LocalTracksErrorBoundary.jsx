import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeManager } from '../ThemeManager/useThemeManager';
import Ionicons from 'react-native-vector-icons/Ionicons';

/**
 * LocalTracksErrorBoundary - Error boundary for local tracks file operations
 *
 * This component provides error boundary functionality including:
 * - Catching and handling file operation errors
 * - Displaying user-friendly error messages
 * - Providing recovery options
 * - Logging errors for debugging
 */

export class LocalTracksErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: 'unknown',
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error: error,
      errorType: LocalTracksErrorBoundary.categorizeError(error),
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('LocalTracksErrorBoundary: Caught error:', error);
    console.error('LocalTracksErrorBoundary: Error info:', errorInfo);

    this.setState({
      error: error,
      errorInfo: errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  static categorizeError(error) {
    if (!error) {
      return 'unknown';
    }

    const message = error.message?.toLowerCase() || '';

    if (message.includes('permission')) {
      return 'permission';
    } else if (message.includes('not found') || message.includes('enoent')) {
      return 'file_not_found';
    } else if (message.includes('storage') || message.includes('disk')) {
      return 'storage';
    } else if (message.includes('network') || message.includes('timeout')) {
      return 'network';
    } else if (message.includes('parse') || message.includes('json')) {
      return 'data_corruption';
    } else {
      return 'unknown';
    }
  }

  getErrorMessage() {
    const { errorType, error } = this.state;

    switch (errorType) {
      case 'permission':
        return {
          title: 'Permission Error',
          message:
            'Unable to access local music files. Please check app permissions.',
          icon: 'lock-closed',
        };
      case 'file_not_found':
        return {
          title: 'Files Not Found',
          message:
            'Some music files could not be found. They may have been moved or deleted.',
          icon: 'document-outline',
        };
      case 'storage':
        return {
          title: 'Storage Error',
          message:
            'Unable to access device storage. Please check available space.',
          icon: 'server-outline',
        };
      case 'network':
        return {
          title: 'Network Error',
          message: 'Network error while accessing local files.',
          icon: 'wifi-outline',
        };
      case 'data_corruption':
        return {
          title: 'Data Error',
          message: 'Local music data appears to be corrupted. Try refreshing.',
          icon: 'warning-outline',
        };
      default:
        return {
          title: 'Unexpected Error',
          message:
            error?.message ||
            'An unexpected error occurred while loading local music.',
          icon: 'alert-circle-outline',
        };
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: 'unknown',
    });

    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: 'unknown',
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      const errorInfo = this.getErrorMessage();

      return (
        <LocalTracksErrorFallback
          errorInfo={errorInfo}
          onRetry={this.handleRetry}
          onReset={this.handleReset}
          showRetry={this.props.showRetry !== false}
          showReset={this.props.showReset !== false}
          style={this.props.fallbackStyle}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * LocalTracksErrorFallback - Fallback UI component for error states
 */
const LocalTracksErrorFallback = ({
  errorInfo,
  onRetry,
  onReset,
  showRetry = true,
  showReset = true,
  style,
}) => {
  const { getTextColor, getButtonBackgroundColor } = useThemeManager();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        <Ionicons
          name={errorInfo.icon}
          size={48}
          color={getTextColor('secondary')}
          style={styles.icon}
        />

        <Text style={[styles.title, { color: getTextColor('primary') }]}>
          {errorInfo.title}
        </Text>

        <Text style={[styles.message, { color: getTextColor('secondary') }]}>
          {errorInfo.message}
        </Text>

        <View style={styles.buttonContainer}>
          {showRetry && (
            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: getButtonBackgroundColor(0.1) },
              ]}
              onPress={onRetry}
            >
              <Ionicons
                name="refresh"
                size={20}
                color={getTextColor('primary')}
              />
              <Text
                style={[styles.buttonText, { color: getTextColor('primary') }]}
              >
                Retry
              </Text>
            </TouchableOpacity>
          )}

          {showReset && (
            <TouchableOpacity
              style={[
                styles.button,
                styles.resetButton,
                { backgroundColor: getButtonBackgroundColor(0.05) },
              ]}
              onPress={onReset}
            >
              <Ionicons
                name="reload"
                size={20}
                color={getTextColor('secondary')}
              />
              <Text
                style={[
                  styles.buttonText,
                  { color: getTextColor('secondary') },
                ]}
              >
                Reset
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  resetButton: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export { LocalTracksErrorFallback };
