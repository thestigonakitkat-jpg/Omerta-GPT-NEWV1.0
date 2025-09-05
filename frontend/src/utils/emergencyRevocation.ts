/**
 * 🚨 EMERGENCY REVOCATION SYSTEM
 * 
 * Handles emergency ID revocation tokens that can be triggered via web portal
 * by trusted contacts when user is kidnapped/coerced and cannot access device.
 */

import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import { api } from './api';
import { steelosShredder } from './steelosShredder';

export interface EmergencyRevocationToken {
  command: string;
  omerta_id: string;
  revocation_id: string;
  wipe_type: string;
  timestamp: number;
  trigger_type: string;
  reason: string;
  emergency_contact: string;
  signature: string;
  auto_execute: boolean;
  show_cyanide_animation: boolean;
  kill_method: string;
  bypass_user_confirmation: boolean;
  network_broadcast: boolean;
  destruction_phases: string[];
}

export interface EmergencyRevocationStatus {
  emergency_revocation_pending: boolean;
  token?: EmergencyRevocationToken;
  message: string;
}

class EmergencyRevocationManager {
  private static instance: EmergencyRevocationManager;
  private deviceId: string = '';
  private checkTimer: NodeJS.Timeout | null = null;
  
  private constructor() {
    this.initializeDeviceId();
    this.startEmergencyMonitoring();
  }

  public static getInstance(): EmergencyRevocationManager {
    if (!EmergencyRevocationManager.instance) {
      EmergencyRevocationManager.instance = new EmergencyRevocationManager();
    }
    return EmergencyRevocationManager.instance;
  }

  private async initializeDeviceId(): Promise<void> {
    try {
      // Use fallback for web compatibility
      if (typeof window !== 'undefined' && !SecureStore.getItemAsync) {
        this.deviceId = `web_emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return;
      }
      
      let deviceId = await SecureStore.getItemAsync('omerta_device_id');
      if (!deviceId) {
        deviceId = `omerta_emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await SecureStore.setItemAsync('omerta_device_id', deviceId);
      }
      this.deviceId = deviceId;
    } catch (error) {
      console.error('Failed to initialize device ID:', error);
      this.deviceId = `temp_emergency_${Date.now()}`;
    }
  }

  private startEmergencyMonitoring(): void {
    // Check for emergency revocation every 5 minutes
    this.checkTimer = setInterval(async () => {
      await this.checkForEmergencyRevocation();
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * 🚨 CHECK FOR EMERGENCY REVOCATION
   */
  async checkForEmergencyRevocation(): Promise<boolean> {
    try {
      if (!this.deviceId) {
        await this.initializeDeviceId();
      }

      const response = await api.get(`/api/emergency/token/${this.deviceId}`);

      if (response.emergency_revocation_pending && response.token) {
        console.log('🚨 EMERGENCY REVOCATION DETECTED');
        await this.handleEmergencyRevocation(response.token);
        return true;
      }

      return false;

    } catch (error) {
      console.error('Emergency revocation check failed:', error);
      return false;
    }
  }

  /**
   * 💀 HANDLE EMERGENCY REVOCATION
   */
  private async handleEmergencyRevocation(token: EmergencyRevocationToken): Promise<void> {
    try {
      console.log('💀 EMERGENCY ID REVOCATION: Executing STEELOS-SHREDDER');

      // Show emergency alert
      Alert.alert(
        '🚨 EMERGENCY ID REVOCATION',
        `Emergency revocation triggered by: ${token.emergency_contact}\n\n` +
        `Reason: ${token.reason}\n\n` +
        `Revocation ID: ${token.revocation_id}\n\n` +
        'Initiating STEELOS-SHREDDER for complete data obliteration...',
        [{ text: 'ACKNOWLEDGED', style: 'destructive' }]
      );

      // Execute STEELOS-SHREDDER with emergency token
      await steelosShredder.executeWithToken(token);

      // Log the emergency event
      await this.logEmergencyEvent(token);

      // Clear all local data immediately
      await this.emergencyDataClear();

    } catch (error) {
      console.error('Emergency revocation execution failed:', error);
      
      // Fallback emergency wipe if STEELOS-SHREDDER fails
      await this.emergencyFallbackWipe();
    }
  }

  /**
   * 📝 LOG EMERGENCY EVENT
   */
  private async logEmergencyEvent(token: EmergencyRevocationToken): Promise<void> {
    try {
      const emergencyLog = {
        event: 'emergency_id_revocation',
        revocation_id: token.revocation_id,
        omerta_id: token.omerta_id,
        emergency_contact: token.emergency_contact,
        reason: token.reason,
        timestamp: Date.now(),
        device_id: this.deviceId,
        execution_method: token.kill_method
      };

      // Store emergency log (will be destroyed with STEELOS-SHREDDER)
      await SecureStore.setItemAsync('emergency_revocation_log', JSON.stringify(emergencyLog));

      console.log(`📝 Emergency revocation logged: ${token.revocation_id}`);

    } catch (error) {
      console.error('Failed to log emergency event:', error);
    }
  }

  /**
   * 🧹 EMERGENCY DATA CLEAR
   */
  private async emergencyDataClear(): Promise<void> {
    try {
      // List of all keys to clear in emergency
      const emergencyKeys = [
        'omerta_device_id',
        'chats_pin', 'vault_pin', 'panic_pin',
        'verified_oids_v1', 'secure_notes', 'chat_messages',
        'vault_items', 'omerta_active_auth_config',
        'omerta_dna', 'omerta_dna_secret',
        'auto_lock_ms', 'theme_mode', 'accent_key',
        'user_identity', 'contact_data',
        'omerta_quarantine_*' // Pattern for quarantine data
      ];

      for (const key of emergencyKeys) {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch {
          // Continue clearing other keys even if one fails
        }
      }

      console.log('🧹 Emergency data clear completed');

    } catch (error) {
      console.error('Emergency data clear failed:', error);
    }
  }

  /**
   * ⚠️ EMERGENCY FALLBACK WIPE
   */
  private async emergencyFallbackWipe(): Promise<void> {
    try {
      console.log('⚠️ EMERGENCY FALLBACK WIPE: STEELOS-SHREDDER failed, executing fallback');

      Alert.alert(
        '⚠️ EMERGENCY FALLBACK WIPE',
        'Primary obliteration failed. Executing emergency fallback data destruction.',
        [{ text: 'OK' }]
      );

      // Clear all data manually
      await this.emergencyDataClear();

      // Force app restart/reload
      // This would typically trigger a complete app reset

    } catch (error) {
      console.error('Emergency fallback wipe failed:', error);
    }
  }

  /**
   * 🔍 MANUAL EMERGENCY CHECK
   */
  async manualEmergencyCheck(): Promise<boolean> {
    console.log('🔍 Manual emergency revocation check initiated');
    return await this.checkForEmergencyRevocation();
  }

  /**
   * 📊 GET EMERGENCY STATUS
   */
  async getEmergencyStatus(): Promise<EmergencyRevocationStatus> {
    try {
      if (!this.deviceId) {
        await this.initializeDeviceId();
      }

      const response = await api.get(`/api/emergency/token/${this.deviceId}`);
      
      return {
        emergency_revocation_pending: response.emergency_revocation_pending || false,
        token: response.token,
        message: response.message || 'No emergency revocation pending'
      };

    } catch (error) {
      console.error('Failed to get emergency status:', error);
      return {
        emergency_revocation_pending: false,
        message: 'Failed to check emergency status'
      };
    }
  }

  /**
   * 🔗 GET EMERGENCY PORTAL URL
   */
  getEmergencyPortalURL(): string {
    // This would be the actual deployed backend URL
    // For development, using the current backend URL
    return `${process.env.EXPO_PUBLIC_BACKEND_URL}/emergency`;
  }

  /**
   * 📋 GET EMERGENCY CONTACT INFO
   */
  getEmergencyContactInfo(): string {
    return `
🚨 EMERGENCY ID REVOCATION

If you cannot access this device and need emergency help:

1. Go to: ${this.getEmergencyPortalURL()}
2. Enter your OMERTA ID
3. Enter your panic passphrase
4. Provide emergency contact details
5. Submit revocation request

⚠️ This will permanently destroy all data and revoke your OMERTA ID.

🕒 Standard Process: 24-hour delay
⚡ Immediate: For critical emergencies only

Share this information with trusted contacts only.
    `;
  }

  // Call when app goes to background
  onAppBackground(): void {
    // Immediate emergency check when app goes to background
    this.checkForEmergencyRevocation();
  }

  // Call when app comes to foreground
  onAppForeground(): void {
    // Immediate emergency check when app comes to foreground
    this.checkForEmergencyRevocation();
  }

  // Cleanup
  destroy(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }
}

// Export singleton instance
export const emergencyRevocation = EmergencyRevocationManager.getInstance();