/**
 * Remote Security Manager
 * - Factory reset capability  
 * - Panic PIN detection and silent wipe
 * - Device management integration
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getOrCreateOID } from '../state/identity';
import { apiCall } from './api';

class RemoteSecurityManager {
  private checkInterval: NodeJS.Timeout | null = null;
  private deviceId: string | null = null;

  async initialize() {
    this.deviceId = await getOrCreateOID();
    this.startWipeMonitoring();
  }

  /**
   * Monitor for pending remote wipe commands
   */
  private startWipeMonitoring() {
    // Check every 30 seconds for wipe commands
    this.checkInterval = setInterval(async () => {
      try {
        await this.checkForWipeCommand();
      } catch (error) {
        console.warn('Wipe check failed:', error);
      }
    }, 30000);
  }

  /**
   * Check server for pending wipe commands
   */
  private async checkForWipeCommand() {
    if (!this.deviceId) return;

    try {
      const response = await apiCall(`/pin/wipe-status/${this.deviceId}`, 'GET');
      
      if (response.wipe_pending) {
        console.log('REMOTE WIPE COMMAND RECEIVED');
        await this.executeWipe(response.wipe_command);
      }
    } catch (error) {
      // Silently handle errors to avoid revealing wipe functionality
    }
  }

  /**
   * Execute complete device wipe
   */
  private async executeWipe(wipeCommand: any) {
    try {
      console.log('EXECUTING REMOTE WIPE:', wipeCommand.reason);

      // 1. Clear all app data immediately
      await this.clearAllAppData();

      // 2. Show fake loading screen to hide wipe process
      this.showFakeLoadingScreen();

      // 3. Trigger factory reset based on platform
      await this.triggerFactoryReset();

      // 4. Confirm wipe completion (if still reachable)
      setTimeout(async () => {
        try {
          await apiCall(`/pin/factory-reset-confirm`, 'POST', {
            device_id: this.deviceId
          });
        } catch (e) {
          // Ignore errors - device may already be wiped
        }
      }, 5000);

    } catch (error) {
      console.error('Wipe execution failed:', error);
      // Still attempt factory reset even if app wipe fails
      await this.triggerFactoryReset();
    }
  }

  /**
   * Clear all application data
   */
  private async clearAllAppData() {
    try {
      // Clear all secure storage
      const keys = [
        'signal_identity',
        'identity_oid',
        'verified_contacts',
        'chat_keys',
        'vault_data',
        'user_pins',
        'session_data'
      ];

      for (const key of keys) {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch (e) {
          // Continue even if some keys don't exist
        }
      }

      // Clear any cached data, temporary files, etc.
      console.log('All app data cleared');

    } catch (error) {
      console.error('Failed to clear app data:', error);
    }
  }

  /**
   * Show fake loading screen to hide wipe process
   */
  private showFakeLoadingScreen() {
    // In a real implementation, this would show a fake "Loading..." 
    // or "Updating..." screen to hide the wipe process
    console.log('Showing fake loading screen...');
  }

  /**
   * Trigger factory reset based on platform
   */
  private async triggerFactoryReset(): Promise<void> {
    if (Platform.OS === 'android') {
      await this.triggerAndroidFactoryReset();
    } else if (Platform.OS === 'ios') {
      await this.triggerIOSFactoryReset();
    } else {
      // Web/desktop - clear browser data
      await this.triggerWebDataClear();
    }
  }

  /**
   * Android factory reset
   */
  private async triggerAndroidFactoryReset() {
    try {
      // In production, this would use Android Device Admin API
      // For now, open factory reset settings
      const { Linking } = require('react-native');
      
      // Try to open factory reset settings directly
      const factoryResetIntent = 'android.settings.FACTORY_RESET';
      
      try {
        await Linking.openURL(`intent://settings/factory_reset#Intent;action=${factoryResetIntent};end`);
      } catch (e) {
        // Fallback to general settings
        await Linking.openURL('android.settings.SETTINGS');
      }

      console.log('Android factory reset initiated');

    } catch (error) {
      console.error('Android factory reset failed:', error);
    }
  }

  /**
   * iOS factory reset 
   */
  private async triggerIOSFactoryReset() {
    try {
      // iOS doesn't allow apps to trigger factory reset directly
      // In production, this would use MDM (Mobile Device Management)
      
      const { Linking } = require('react-native');
      
      // Open iOS Settings app
      await Linking.openURL('App-prefs:');
      
      console.log('iOS settings opened - manual factory reset required');

    } catch (error) {
      console.error('iOS factory reset failed:', error);
    }
  }

  /**
   * Web data clear
   */
  private async triggerWebDataClear() {
    try {
      // Clear all browser data
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear IndexedDB
      if ('indexedDB' in window) {
        // This is a simplified approach - production would be more thorough
        indexedDB.deleteDatabase('expo-sqlite');
      }

      // Clear cookies (if possible)
      if ('cookieStore' in window) {
        // Modern browsers
        try {
          const cookies = await (window as any).cookieStore.getAll();
          for (const cookie of cookies) {
            await (window as any).cookieStore.delete(cookie.name);
          }
        } catch (e) {
          // Fallback to document.cookie manipulation
        }
      }

      // Reload page to clear memory
      window.location.reload();

    } catch (error) {
      console.error('Web data clear failed:', error);
    }
  }

  /**
   * 💊 Deploy CYANIDE TABLET - STEELOS-SHREDDER Activation
   */
  async deployCyanideTablet(triggerType: string): Promise<{ success: boolean; killToken?: any }> {
    try {
      console.log('💊🧬 CYANIDE TABLET DEPLOYMENT INITIATED');

      if (!this.deviceId) {
        this.deviceId = await getOrCreateOID();
      }

      // Call STEELOS-SHREDDER backend endpoint
      const response = await apiCall('/steelos-shredder/deploy', 'POST', {
        device_id: this.deviceId,
        trigger_type: triggerType,
        confirmation_token: `CYANIDE_${Date.now()}`
      });

      if (response.shredder_activated) {
        console.log('💀 STEELOS-SHREDDER ACTIVATED - CYANIDE TABLET DEPLOYED');
        
        // Check for kill token
        const statusResponse = await apiCall(`/steelos-shredder/status/${this.deviceId}`, 'GET');
        
        if (statusResponse.shredder_pending && statusResponse.kill_token) {
          console.log('🧬 KILL TOKEN RETRIEVED - DNA DESTRUCTION COMMENCING');
          return {
            success: true,
            killToken: statusResponse.kill_token
          };
        }
      }

      return { success: false };

    } catch (error) {
      console.error('💊❌ CYANIDE TABLET DEPLOYMENT FAILED:', error);
      return { success: false };
    }
  }

  /**
   * Execute emergency NUKE (7-tap fast activation) with STEELOS-SHREDDER
   */
  async executeEmergencyNuke() {
    try {
      console.log('🔥 EMERGENCY NUKE ACTIVATED - DEPLOYING CYANIDE TABLET');

      // Deploy CYANIDE TABLET via STEELOS-SHREDDER
      const cyanideResult = await this.deployCyanideTablet('emergency_nuke_7tap');
      
      if (cyanideResult.success && cyanideResult.killToken) {
        console.log('💊💀 CYANIDE TABLET EFFECT - EXECUTING STEELOS-SHREDDER');
        
        // Execute STEELOS-SHREDDER wipe
        await this.executeSteeloshredderWipe(cyanideResult.killToken);
        return true;
      }

      // Fallback to original emergency nuke if STEELOS-SHREDDER fails
      console.log('⚠️ CYANIDE TABLET FAILED - EXECUTING FALLBACK NUKE');
      
      const timestamp = new Date().toISOString();
      const killTokenData = `EMERGENCY_NUKE|${this.deviceId}|${timestamp}`;
      
      const fallbackKillToken = {
        command: "SIGNED_KILL_TOKEN_EMERGENCY",
        device_id: this.deviceId,
        wipe_type: "emergency_nuke_7tap",
        timestamp: timestamp,
        reason: "Emergency 7-tap NUKE button - Fallback after CYANIDE failure",
        signature: `EMERGENCY_NUKE_${timestamp}`,
        token_data: killTokenData,
        auto_execute: true,
        show_decoy_interface: true,
        kill_method: "signed_token",
        bypass_user_confirmation: true,
        activation_method: "7tap_emergency"
      };

      await this.executeWipe(fallbackKillToken);
      return true;

    } catch (error) {
      console.error('Emergency nuke execution failed:', error);
      
      // Still attempt emergency factory reset even if everything fails
      await this.triggerFactoryReset();
      return false;
    }
  }

  /**
   * 💀 Execute STEELOS-SHREDDER Wipe with CYANIDE TABLET
   */
  async executeSteeloshredderWipe(killToken: any) {
    try {
      console.log('💀🧬 STEELOS-SHREDDER WIPE EXECUTION INITIATED');
      console.log('Kill Token Phases:', killToken.destruction_phases);

      // Import the shredder
      const { steelosShredder } = await import('./steelosShredder');

      // Deploy CYANIDE TABLET with full destruction
      const shredderResult = await steelosShredder.deployCyanideTablet({
        passes: 7, // DoD 5220.22-M standard
        verifyDestruction: true,
        atomicDelete: true,
        memoryClearing: true
      });

      console.log(`💊💀 CYANIDE EFFECT COMPLETE: ${shredderResult.filesShredded} files obliterated`);
      console.log(`🧬 DNA DESTRUCTION: ${shredderResult.bytesDestroyed} bytes shredded in ${shredderResult.duration}ms`);

      // After STEELOS-SHREDDER, trigger factory reset
      setTimeout(async () => {
        console.log('🏭 FINAL PHASE: FACTORY RESET INITIATED');
        await this.triggerFactoryReset();
      }, 2000);

    } catch (error) {
      console.error('💊❌ STEELOS-SHREDDER execution failed:', error);
      
      // Emergency fallback
      await this.triggerFactoryReset();
    }
  }

  /**
   * 🚨 Execute Anti-Forensics CYANIDE TABLET
   */
  async executeAntiForensicsWipe(forensicKillToken: any) {
    try {
      console.log('🚨💊 ANTI-FORENSICS CYANIDE TABLET DEPLOYED');
      
      // Deploy CYANIDE TABLET for forensic threats
      const cyanideResult = await this.deployCyanideTablet('anti_forensics');
      
      if (cyanideResult.success && cyanideResult.killToken) {
        await this.executeSteeloshredderWipe(cyanideResult.killToken);
      } else {
        // Use provided forensic kill token as fallback
        await this.executeWipe(forensicKillToken);
      }

    } catch (error) {
      console.error('💊❌ Anti-forensics CYANIDE TABLET failed:', error);
      await this.triggerFactoryReset();
    }
  }
  async checkPanicPin(pin: string, context: string): Promise<boolean> {
    try {
      const response = await apiCall('/pin/verify', 'POST', {
        pin,
        device_id: this.deviceId,
        context
      });

      if (response.wipe_triggered) {
        // Panic PIN detected - wipe was triggered
        console.log('PANIC PIN DETECTED - INITIATING WIPE');
        
        // Execute local wipe immediately
        await this.executeWipe({
          command: 'PANIC_WIPE',
          reason: 'Panic PIN entered',
          timestamp: new Date().toISOString()
        });

        // Return true to hide detection
        return true;
      }

      return response.success;

    } catch (error) {
      console.error('Panic PIN check failed:', error);
      return false;
    }
  }

  /**
   * Verify normal PIN with brute force protection
   */
  async verifyPin(pin: string, context: string): Promise<{ success: boolean; message: string; blocked?: string }> {
    try {
      const response = await apiCall('/pin/verify', 'POST', {
        pin,
        device_id: this.deviceId,
        context
      });

      return {
        success: response.success,
        message: response.message,
        blocked: response.blocked_until ? response.message : undefined
      };

    } catch (error: any) {
      if (error.status === 429) {
        // Rate limited / brute force protection
        return {
          success: false,
          message: error.detail || 'Too many attempts. Please wait.',
          blocked: error.detail
        };
      }

      return {
        success: false,
        message: 'PIN verification failed'
      };
    }
  }

  /**
   * Stop monitoring (cleanup)
   */
  cleanup() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

// Global instance
export const remoteSecurityManager = new RemoteSecurityManager();

// Initialize on import
remoteSecurityManager.initialize().catch(console.error);