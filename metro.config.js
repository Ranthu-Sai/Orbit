const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    assetExts: require('@react-native/metro-config')
      .getDefaultConfig(__dirname)
      .resolver.assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [
      ...require('@react-native/metro-config').getDefaultConfig(__dirname)
        .resolver.sourceExts,
      'svg',
    ],
    alias: {
      crypto: 'crypto-js',
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
