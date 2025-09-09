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

// Fix event-target-shim resolution issues
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'event-target-shim') {
    return {
      filePath: require.resolve('event-target-shim/dist/event-target-shim.js'),
      type: 'sourceFile',
    };
  }
  // Use default resolver for other modules
  return context.resolveRequest(context, moduleName, platform);
};

// Platform-specific resolvers for problematic modules
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Add platform extensions for better resolution
config.resolver.sourceExts = [...config.resolver.sourceExts, 'web.ts', 'web.tsx', 'web.js', 'web.jsx'];

// Reduce the number of workers to decrease resource usage
config.maxWorkers = 2;

module.exports = config;
