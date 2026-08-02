module.exports = {
  presets: ['@react-native/babel-preset'],
  plugins: [
    'react-native-reanimated/plugin',
    ['module:react-native-dotenv', {
      moduleName: '@env',
      path: '.env',
    }],
  ],
  env: {
    production: {
      plugins: ['react-native-reanimated/plugin', 'react-native-paper/babel'],
    },
  },
};
