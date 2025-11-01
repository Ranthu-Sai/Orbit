module.exports = {
  presets: ['@react-native/babel-preset'],
  plugins: [
    'react-native-reanimated/plugin',
  ],
  env: {
    production: {
      plugins: ['react-native-reanimated/plugin', 'react-native-paper/babel'],
    },
  },
};
