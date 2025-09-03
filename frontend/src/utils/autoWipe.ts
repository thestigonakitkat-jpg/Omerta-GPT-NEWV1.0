import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import { api } from './api';
import { steelosShredder } from './steelosShredder';

export interface AutoWipeConfig {
  device_id: string;
  enabled: boolean;
  days_inactive: number;
  wipe_type: 'app_data' | 'full_nuke';
  warning_days: number;
}

export interface AutoWipeStatus {
  device_id: string;
  enabled: boolean;
  days_inactive: number;
  wipe_type: string;
  last_activity: number;
  days_until_wipe: number;
  warning_active: boolean;
  wipe_pending: boolean;
}

export interface AutoWipeResponse {
  success: boolean;
  message: string;
  config?: AutoWipeConfig;
  status?: AutoWipeStatus;
}

class AutoWipeManager {
  private deviceId: string = '';
  private activityTimer: NodeJS.Timeout | null = null;
  private statusCheckTimer: NodeJS.Timeout | null = null;
  
  constructor() {
    this.initializeDeviceId();
    this.startActivityTracking();
    this.startStatusMonitoring();
  }

  private async initializeDeviceId(): Promise<void> {
    try {
      let deviceId = await SecureStore.getItemAsync('omerta_device_id');
      if (!deviceId) {
        // Generate unique device ID
        deviceId = `omerta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await SecureStore.setItemAsync('omerta_device_id', deviceId);
      }
      this.deviceId = deviceId;
    } catch (error) {
      console.error('Failed to initialize device ID:', error);
      // Fallback to temporary ID
      this.deviceId = `temp_${Date.now()}`;
    }
  }

  private startActivityTracking(): void {
    // Update activity every 5 minutes when app is active
    this.activityTimer = setInterval(async () => {
      await this.updateActivity('periodic_update');
    }, 5 * 60 * 1000); // 5 minutes
  }

  private startStatusMonitoring(): void {
    // Check auto-wipe status every 30 minutes
    this.statusCheckTimer = setInterval(async () => {
      await this.checkStatus();
    }, 30 * 60 * 1000); // 30 minutes
  }

  async updateActivity(activityType: string = 'app_usage'): Promise<void> {
    try {
      if (!this.deviceId) {
        await this.initializeDeviceId();
      }

      const payload = {
        device_id: this.deviceId,
        activity_type: activityType
      };

      await api.post('/api/auto-wipe/activity', payload);
      console.log(`Activity updated: ${activityType}`);
    } catch (error) {
      console.error('Failed to update activity:', error);
    }
  }

  async configureAutoWipe(
    enabled: boolean,
    daysInactive: number,
    wipeType: 'app_data' | 'full_nuke',
    warningDays: number = 2
  ): Promise<AutoWipeResponse> {
    try {
      if (!this.deviceId) {
        await this.initializeDeviceId();
      }

      if (daysInactive < 1 || daysInactive > 14) {
        throw new Error('Days inactive must be between 1 and 14');
      }

      if (warningDays >= daysInactive) {
        throw new Error('Warning days must be less than days inactive');
      }

      const payload: AutoWipeConfig = {
        device_id: this.deviceId,
        enabled,
        days_inactive: daysInactive,
        wipe_type: wipeType,
        warning_days: warningDays
      };

      const response = await api.post('/api/auto-wipe/configure', payload);

      if (response.success) {
        const wipeTypeText = wipeType === 'full_nuke' ? 'Full Device NUKE (STEELOS-SHREDDER)' : 'App Data Only';
        Alert.alert(
          '⏰ Auto-Wipe Configured',
          `Auto-wipe is now ${enabled ? 'ENABLED' : 'DISABLED'}.\n\n` +
          `• Trigger: ${daysInactive} days of inactivity\n` +
          `• Action: ${wipeTypeText}\n` +
          `• Warning: ${warningDays} days before wipe\n\n` +
          (wipeType === 'full_nuke' ? '🚨 DANGER: Full NUKE will use STEELOS-SHREDDER for complete data obliteration!' : ''),
          [{ text: 'OK' }]
        );
      }

      return response;
    } catch (error) {
      console.error('Auto-wipe configuration failed:', error);
      Alert.alert('Configuration Failed', `Failed to configure auto-wipe: ${error.message}`);
      throw error;
    }
  }

  async checkStatus(): Promise<AutoWipeStatus | null> {
    try {
      if (!this.deviceId) {
        await this.initializeDeviceId();
      }

      const response = await api.get(`/api/auto-wipe/status/${this.deviceId}`);

      if (response.success && response.status) {
        const status: AutoWipeStatus = response.status;

        // Handle warnings
        if (status.warning_active && !response.wipe_pending) {
          this.showWarning(status);
        }

        // Check for pending wipe
        if (response.wipe_pending) {
          await this.handlePendingWipe();
        }

        return status;
      }

      return null;
    } catch (error) {
      console.error('Failed to check auto-wipe status:', error);
      return null;
    }
  }

  private showWarning(status: AutoWipeStatus): void {
    const wipeTypeText = status.wipe_type === 'full_nuke' ? 'Full Device NUKE' : 'App Data Wipe';
    
    Alert.alert(
      '⚠️ Auto-Wipe Warning',
      `Your device will auto-wipe in ${status.days_until_wipe} days due to inactivity.\n\n` +
      `• Wipe Type: ${wipeTypeText}\n` +
      `• Last Activity: ${new Date(status.last_activity * 1000).toLocaleDateString()}\n\n` +
      'Use the app to reset the timer.',
      [
        { text: 'Dismiss', style: 'cancel' },
        { 
          text: 'Reset Timer', 
          onPress: () => this.updateActivity('manual_reset') 
        }
      ]
    );
  }

  private async handlePendingWipe(): Promise<void> {
    try {
      // Check for wipe token
      const tokenResponse = await api.get(`/api/auto-wipe/token/${this.deviceId}`);

      if (tokenResponse.wipe_pending) {
        if (tokenResponse.wipe_type === 'full_nuke') {
          // Execute STEELOS-SHREDDER
          console.log('💀 AUTO-WIPE: Executing STEELOS-SHREDDER');
          
          Alert.alert(
            '💀 STEELOS-SHREDDER Activated',
            'Device has been inactive too long. Initiating complete data obliteration...',
            [{ text: 'OK' }]
          );

          // Trigger STEELOS-SHREDDER with auto-wipe token
          await steelosShredder.executeWithToken(tokenResponse.token);
          
        } else {
          // Execute app data wipe
          console.log('🧹 AUTO-WIPE: Executing app data wipe');
          
          Alert.alert(
            '🧹 Auto-Wipe Activated',
            'Device has been inactive too long. Clearing app data...',
            [{ text: 'OK' }]
          );

          await this.executeAppDataWipe(tokenResponse.token);
        }
      }
    } catch (error) {
      console.error('Failed to handle pending wipe:', error);
    }
  }

  private async executeAppDataWipe(token: any): Promise<void> {
    try {
      // Clear app data based on wipe targets
      const wipeTargets = token.wipe_targets || [];
      
      for (const target of wipeTargets) {
        switch (target) {
          case 'secure_notes':
            // Clear secure notes from storage
            await SecureStore.deleteItemAsync('secure_notes');
            break;
          case 'chat_messages':
            // Clear chat messages
            await SecureStore.deleteItemAsync('chat_messages');
            break;
          case 'vault_items':
            // Clear vault items
            await SecureStore.deleteItemAsync('vault_items');
            break;
          case 'contact_data':
            // Clear contacts
            await SecureStore.deleteItemAsync('verified_oids_v1');
            break;
          case 'user_settings':
            // Clear user settings (keep device ID)
            const keysToDelete = [
              'chats_pin', 'vault_pin', 'panic_pin',
              'auto_lock_ms', 'theme_mode', 'accent_key'
            ];
            
            for (const key of keysToDelete) {
              try {
                await SecureStore.deleteItemAsync(key);
              } catch {
                // Ignore errors for non-existent keys
              }
            }
            break;
        }
      }

      Alert.alert(
        '✅ App Data Cleared',
        'App data has been wiped due to inactivity. The app will restart.',
        [{ text: 'OK' }]
      );

      // Force app restart or navigation to initial screen
      // This would typically trigger a full app reload
      
    } catch (error) {
      console.error('App data wipe failed:', error);
    }
  }

  async getConfig(): Promise<AutoWipeStatus | null> {
    return await this.checkStatus();
  }

  async disableAutoWipe(): Promise<void> {
    await this.configureAutoWipe(false, 7, 'app_data', 2);
  }

  // Call this when app goes to background
  onAppBackground(): void {
    this.updateActivity('app_background');
  }

  // Call this when app comes to foreground
  onAppForeground(): void {
    this.updateActivity('app_foreground');
    // Immediately check status when app comes back
    this.checkStatus();
  }

  // Call this on login
  onUserLogin(): void {
    this.updateActivity('user_login');
  }

  // Call this on message sent
  onMessageSent(): void {
    this.updateActivity('message_sent');
  }

  // Call this on vault access
  onVaultAccess(): void {
    this.updateActivity('vault_access');
  }

  // Cleanup timers
  destroy(): void {
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
      this.activityTimer = null;
    }
    
    if (this.statusCheckTimer) {
      clearInterval(this.statusCheckTimer);
      this.statusCheckTimer = null;
    }
  }
}

// Export singleton instance
export const autoWipe = new AutoWipeManager();