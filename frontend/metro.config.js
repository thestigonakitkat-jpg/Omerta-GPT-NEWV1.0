const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Add WASM asset support for argon2-browser
config.resolver.assetExts = config.resolver.assetExts || [];
config.resolver.assetExts.push('wasm');

// Ensure Metro can resolve WASM files
config.resolver.platforms = ['web', 'native', 'ios', 'android'];

// Fix __non_webpack_require__ issues for node-gyp-build and Signal Protocol
config.resolver.alias = {
  'node-gyp-build': require.resolve('./src/utils/node-gyp-build-shim.js'),
};

// Reduce the number of workers to decrease resource usage
config.maxWorkers = 2;

module.exports = config;
