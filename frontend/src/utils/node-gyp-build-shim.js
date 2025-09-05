/**
 * Node-gyp-build shim for React Native/Web environments
 * This resolves the __non_webpack_require__ error for native modules
 */

// For React Native environments, return a no-op function
function nodeGypBuildShim(dir) {
  if (typeof __non_webpack_require__ !== 'undefined') {
    // In Node.js environments with webpack, use the actual require
    return __non_webpack_require__('node-gyp-build')(dir);
  }
  
  // In React Native/Web environments, return a mock that prevents crashes
  console.warn(`node-gyp-build: Shimmed for React Native/Web environment (${dir})`);
  
  // Return an empty object that won't break the calling code
  return {};
}

module.exports = nodeGypBuildShim;