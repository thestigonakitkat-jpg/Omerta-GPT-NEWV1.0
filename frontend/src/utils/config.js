// Configuration and Environment Management

// Check if we're in a Tor-enabled environment
export const TOR_MODE = false; // Would be enabled via environment variable

// API base URL - normally from environment
export const API_BASE = TOR_MODE ? 
  'http://your-onion-address.onion' : 
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

// WebSocket URL
export const WS_BASE = API_BASE.replace('http', 'ws');

// Security configuration
export const SECURITY_CONFIG = {
  // Message settings
  MESSAGE_TTL: 48 * 3600, // 48 hours
  MAX_MESSAGE_SIZE: 10 * 1024, // 10KB
  AUTO_REKEY_THRESHOLD: 200, // messages
  AUTO_REKEY_TIME: 7 * 24 * 3600 * 1000, // 7 days
  
  // Note settings
  NOTE_TTL: 7 * 24 * 3600, // 7 days
  NOTE_MAX_VIEWS: 1,
  
  // Session settings
  SESSION_TIMEOUT: 10 * 60 * 1000, // 10 minutes
  HEARTBEAT_INTERVAL: 30 * 1000, // 30 seconds
  
  // Device settings
  DEVICE_CHECK_INTERVAL: 5 * 60 * 1000, // 5 minutes
  THREAT_CHECK_INTERVAL: 30 * 1000, // 30 seconds
  
  // Reboot settings
  AUTO_REBOOT_TIMES: ['02:00', '14:00'], // 2 AM and 2 PM
  REBOOT_DELAY_CHAT_ACTIVE: 15 * 60 * 1000, // 15 minutes
};

// Feature flags
export const FEATURES = {
  VANISH_PROTOCOL: true,
  STEELOS_SHREDDER: true,
  DEFCON_ONE: true,
  GRAPHITE_DEFENSE: true,
  AUTO_REBOOT: true,
  CLIPBOARD_RESTRICTION: true,
  SCREENSHOT_DETECTION: true,
  THREAT_MONITORING: true,
  CONTACT_VERIFICATION: true,
  REMOTE_KILL: true,
  TOR_MODE: TOR_MODE,
  CALLS_ENABLED: !TOR_MODE, // Disable calls in Tor mode
};

// Logging configuration
export const LOG_CONFIG = {
  ENABLE_CONSOLE_LOGS: __DEV__,
  ENABLE_ERROR_REPORTING: false, // Privacy-first: no automatic reporting
  LOG_LEVEL: __DEV__ ? 'debug' : 'error',
};

// Theme configuration
export const THEME_CONFIG = {
  DEFAULT_MODE: 'dark',
  ACCENT_COLOR: 'chrome',
  MATRIX_INTENSITY: {
    LOW: 0.1,
    MEDIUM: 0.3,
    HIGH: 0.6,
    CRITICAL: 0.8,
  },
};

/**
 * Get environment-specific configuration
 */
export function getEnvironmentConfig() {
  return {
    isDevelopment: __DEV__,
    isProduction: !__DEV__,
    platform: typeof window !== 'undefined' ? 'web' : 'mobile',
    apiBase: API_BASE,
    wsBase: WS_BASE,
    features: FEATURES,
    security: SECURITY_CONFIG,
    theme: THEME_CONFIG,
  };
}