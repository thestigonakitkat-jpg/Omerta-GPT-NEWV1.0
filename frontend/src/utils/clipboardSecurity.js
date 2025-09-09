import { Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';

// OMERTÁ Clipboard Security - Disable clipboard in sensitive areas
class ClipboardSecurityManager {
  constructor() {
    this.isRestricted = false;
    this.restrictedAreas = new Set();
    this.originalSetString = null;
    this.originalGetString = null;
  }

  // Initialize clipboard security
  initialize() {
    console.log('📋 Initializing OMERTÁ Clipboard Security...');
    
    // Store original clipboard methods
    this.originalSetString = Clipboard.setString;
    this.originalGetString = Clipboard.getStringAsync;
    
    console.log('✅ Clipboard Security initialized');
  }

  // Enable clipboard restrictions
  enableRestrictions(area = 'app') {
    this.isRestricted = true;
    this.restrictedAreas.add(area);
    
    // Override clipboard methods
    this.interceptClipboardOperations();
    
    console.log(`🚫 Clipboard restrictions enabled for: ${area}`);
  }

  // Disable clipboard restrictions
  disableRestrictions(area = 'app') {
    this.restrictedAreas.delete(area);
    
    if (this.restrictedAreas.size === 0) {
      this.isRestricted = false;
      this.restoreClipboardOperations();
      console.log('✅ Clipboard restrictions disabled');
    } else {
      console.log(`✅ Clipboard restrictions disabled for: ${area}`);
    }
  }

  // Intercept clipboard operations
  interceptClipboardOperations() {
    // Override setString to block copying
    Clipboard.setString = (text) => {
      if (this.isRestricted) {
        console.log('🚫 Clipboard copy blocked - OMERTÁ security restriction');
        Alert.alert(
          '🔒 Security Restriction',
          'Clipboard copying is disabled in secure areas for your protection.',
          [{ text: 'OK' }]
        );
        return Promise.resolve();
      }
      return this.originalSetString(text);
    };

    // Override getStringAsync to block pasting
    Clipboard.getStringAsync = () => {
      if (this.isRestricted) {
        console.log('🚫 Clipboard paste blocked - OMERTÁ security restriction');
        Alert.alert(
          '🔒 Security Restriction', 
          'Clipboard pasting is disabled in secure areas for your protection.',
          [{ text: 'OK' }]
        );
        return Promise.resolve('');
      }
      return this.originalGetString();
    };
  }

  // Restore original clipboard operations
  restoreClipboardOperations() {
    if (this.originalSetString) {
      Clipboard.setString = this.originalSetString;
    }
    if (this.originalGetString) {
      Clipboard.getStringAsync = this.originalGetString;
    }
  }

  // Clear clipboard completely
  async clearClipboard() {
    try {
      await Clipboard.setString('');
      console.log('🧹 Clipboard cleared for security');
    } catch (error) {
      console.error('Failed to clear clipboard:', error);
    }
  }

  // Secure area management
  enterSecureArea(areaName) {
    this.enableRestrictions(areaName);
    this.clearClipboard();
    console.log(`🔒 Entered secure area: ${areaName}`);
  }

  exitSecureArea(areaName) {
    this.disableRestrictions(areaName);
    console.log(`🔓 Exited secure area: ${areaName}`);
  }

  // Get current restriction status
  getStatus() {
    return {
      isRestricted: this.isRestricted,
      restrictedAreas: Array.from(this.restrictedAreas),
      areasCount: this.restrictedAreas.size
    };
  }
}

// Export singleton instance
export const clipboardSecurityManager = new ClipboardSecurityManager();
export default clipboardSecurityManager;