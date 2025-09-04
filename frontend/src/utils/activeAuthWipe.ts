/**
 * 🕒 ACTIVE AUTHENTICATION WIPE SYSTEM
 * 
 * Requires user to actively enter their PIN/code within specified intervals
 * Different from general auto-wipe - this specifically requires OMERTA app authentication
 * 
 * Security: Prevents scenarios where device is used but user cannot access OMERTA
 */

import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import { api } from './api';
import { steelosShredder } from './steelosShredder';

export interface ActiveAuthConfig {
  enabled: boolean;
  auth_interval_hours: number; // 24, 48, 72, 96, 120, 144, 168 (1-7 days)
  wipe_type: 'app_data' | 'full_nuke';
  warning_hours: number; // Hours before wipe to show warnings
  last_authentication: number; // Last time user entered PIN in OMERTA
  device_id: string;
}

export interface ActiveAuthStatus {
  enabled: boolean;
  auth_interval_hours: number;
  wipe_type: string;
  last_authentication: number;
  hours_until_auth_required: number;
  warning_active: boolean;
  auth_overdue: boolean;
  wipe_pending: boolean;
}

export interface ActiveAuthResponse {
  success: boolean;
  message: string;
  config?: ActiveAuthConfig;
  status?: ActiveAuthStatus;
}

class ActiveAuthenticationWipeManager {
  private static instance: ActiveAuthenticationWipeManager;
  private deviceId: string = '';
  private statusCheckTimer: NodeJS.Timeout | null = null;
  private warningTimer: NodeJS.Timeout | null = null;
  
  private constructor() {
    this.initializeDeviceId();
    this.startStatusMonitoring();
  }

  public static getInstance(): ActiveAuthenticationWipeManager {
    if (!ActiveAuthenticationWipeManager.instance) {
      ActiveAuthenticationWipeManager.instance = new ActiveAuthenticationWipeManager();
    }
    return ActiveAuthenticationWipeManager.instance;
  }

  private async initializeDeviceId(): Promise<void> {
    try {
      let deviceId = await SecureStore.getItemAsync('omerta_device_id');
      if (!deviceId) {
        deviceId = `omerta_auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await SecureStore.setItemAsync('omerta_device_id', deviceId);
      }
      this.deviceId = deviceId;
    } catch (error) {
      console.error('Failed to initialize device ID:', error);
      this.deviceId = `temp_auth_${Date.now()}`;
    }
  }

  private startStatusMonitoring(): void {
    // Check authentication status every 30 minutes
    this.statusCheckTimer = setInterval(async () => {
      await this.checkAuthenticationStatus();
    }, 30 * 60 * 1000); // 30 minutes
  }

  /**
   * 🔧 CONFIGURE ACTIVE AUTHENTICATION REQUIREMENTS
   */
  async configureActiveAuth(
    enabled: boolean,
    authIntervalHours: number,
    wipeType: 'app_data' | 'full_nuke',
    warningHours: number = 6
  ): Promise<ActiveAuthResponse> {
    try {
      if (!this.deviceId) {
        await this.initializeDeviceId();
      }

      // Validate intervals (24h to 168h = 1-7 days)
      const validIntervals = [24, 48, 72, 96, 120, 144, 168];
      if (!validIntervals.includes(authIntervalHours)) {
        throw new Error('Invalid interval. Must be 24, 48, 72, 96, 120, 144, or 168 hours');
      }

      if (warningHours >= authIntervalHours) {
        throw new Error('Warning hours must be less than authentication interval');
      }

      const config: ActiveAuthConfig = {
        enabled,
        auth_interval_hours: authIntervalHours,
        wipe_type: wipeType,
        warning_hours: warningHours,
        last_authentication: Date.now(), // Set current time as baseline
        device_id: this.deviceId
      };

      // Store configuration locally
      await SecureStore.setItemAsync('omerta_active_auth_config', JSON.stringify(config));

      // Send to backend for server-side tracking
      const payload = {
        device_id: this.deviceId,
        enabled,
        auth_interval_hours: authIntervalHours,
        wipe_type: wipeType,
        warning_hours: warningHours
      };

      const response = await api.post('/api/active-auth/configure', payload);

      if (response.success) {
        const intervalText = this.formatInterval(authIntervalHours);
        const wipeTypeText = wipeType === 'full_nuke' ? 'Full Device NUKE (STEELOS-SHREDDER)' : 'App Data Only';
        
        Alert.alert(
          '🕒 Active Authentication Configured',
          `Dead Man's Switch is now ${enabled ? 'ENABLED' : 'DISABLED'}.\n\n` +
          `• Authentication Required: Every ${intervalText}\n` +
          `• Action if Missed: ${wipeTypeText}\n` +
          `• Warning Period: ${warningHours} hours before wipe\n\n` +
          (wipeType === 'full_nuke' ? '🚨 CRITICAL: Full NUKE will use STEELOS-SHREDDER for complete obliteration!' : '') +
          '\n\nYou must actively enter your PIN in OMERTA within the specified interval.',
          [{ text: 'OK' }]
        );
      }

      return {
        success: true,
        message: 'Active authentication configured successfully',
        config
      };

    } catch (error) {
      console.error('Active auth configuration failed:', error);
      Alert.alert('Configuration Failed', `Failed to configure active authentication: ${error.message}`);
      throw error;
    }
  }

  /**
   * ✅ RECORD SUCCESSFUL AUTHENTICATION
   */
  async recordAuthentication(authenticationType: string = 'pin_entry'): Promise<void> {
    try {
      if (!this.deviceId) {
        await this.initializeDeviceId();
      }

      const authTimestamp = Date.now();

      // Update local config
      const configString = await SecureStore.getItemAsync('omerta_active_auth_config');
      if (configString) {
        const config: ActiveAuthConfig = JSON.parse(configString);
        config.last_authentication = authTimestamp;
        await SecureStore.setItemAsync('omerta_active_auth_config', JSON.stringify(config));
      }

      // Notify backend
      const payload = {
        device_id: this.deviceId,
        authentication_type: authenticationType,
        timestamp: authTimestamp
      };

      await api.post('/api/active-auth/authenticate', payload);

      console.log(`🔐 Active Auth: Authentication recorded (${authenticationType})`);

    } catch (error) {
      console.error('Failed to record authentication:', error);
    }
  }

  /**
   * 📊 CHECK AUTHENTICATION STATUS
   */
  async checkAuthenticationStatus(): Promise<ActiveAuthStatus | null> {
    try {
      if (!this.deviceId) {
        await this.initializeDeviceId();
      }

      const configString = await SecureStore.getItemAsync('omerta_active_auth_config');
      if (!configString) {
        return null; // No active auth configured
      }

      const config: ActiveAuthConfig = JSON.parse(configString);
      
      if (!config.enabled) {
        return null; // Active auth disabled
      }

      const currentTime = Date.now();
      const timeSinceAuth = currentTime - config.last_authentication;
      const authIntervalMs = config.auth_interval_hours * 60 * 60 * 1000;
      const warningMs = config.warning_hours * 60 * 60 * 1000;

      const hoursUntilAuthRequired = Math.max(0, (authIntervalMs - timeSinceAuth) / (60 * 60 * 1000));
      const authOverdue = timeSinceAuth >= authIntervalMs;
      const warningActive = timeSinceAuth >= (authIntervalMs - warningMs) && !authOverdue;

      const status: ActiveAuthStatus = {
        enabled: config.enabled,
        auth_interval_hours: config.auth_interval_hours,
        wipe_type: config.wipe_type,
        last_authentication: config.last_authentication,
        hours_until_auth_required: Math.floor(hoursUntilAuthRequired),
        warning_active: warningActive,
        auth_overdue: authOverdue,
        wipe_pending: authOverdue
      };

      // Handle warnings
      if (warningActive) {
        this.showAuthenticationWarning(status);
      }

      // Handle overdue authentication
      if (authOverdue) {
        await this.handleOverdueAuthentication(config);
      }

      return status;

    } catch (error) {
      console.error('Failed to check authentication status:', error);
      return null;
    }
  }

  private showAuthenticationWarning(status: ActiveAuthStatus): void {
    const intervalText = this.formatInterval(status.auth_interval_hours);
    const wipeTypeText = status.wipe_type === 'full_nuke' ? 'Full Device NUKE' : 'App Data Wipe';
    
    Alert.alert(
      '⚠️ Authentication Required Soon',
      `Your OMERTA active authentication is due!\n\n` +
      `• Required Interval: Every ${intervalText}\n` +
      `• Time Remaining: ${status.hours_until_auth_required} hours\n` +
      `• Action if Missed: ${wipeTypeText}\n\n` +
      'Enter your PIN in OMERTA to reset the timer.',
      [
        { text: 'Later', style: 'cancel' },
        { 
          text: 'Authenticate Now', 
          onPress: () => {
            // This would trigger navigation to PIN entry
            Alert.alert('Navigate to OMERTA', 'Please open OMERTA and enter your PIN to authenticate.');
          }
        }
      ]
    );
  }

  private async handleOverdueAuthentication(config: ActiveAuthConfig): Promise<void> {
    try {
      console.log('🚨 Active Auth: Authentication overdue - initiating wipe sequence');

      if (config.wipe_type === 'full_nuke') {
        // Execute STEELOS-SHREDDER
        Alert.alert(
          '💀 STEELOS-SHREDDER Activated',
          'Active authentication requirement not met. Initiating complete data obliteration...',
          [{ text: 'OK' }]
        );

        // Create wipe token for STEELOS-SHREDDER
        const wipeToken = {
          command: "ACTIVE_AUTH_STEELOS_SHREDDER",
          device_id: this.deviceId,
          wipe_type: "steelos_shredder_obliteration", 
          timestamp: Date.now(),
          trigger_type: "active_auth_overdue",
          reason: `Active authentication not provided within ${config.auth_interval_hours} hours`,
          auto_execute: true,
          show_cyanide_animation: true
        };

        await steelosShredder.executeWithToken(wipeToken);

      } else {
        // Execute app data wipe
        Alert.alert(
          '🧹 Active Auth Wipe',
          'Active authentication requirement not met. Clearing app data...',
          [{ text: 'OK' }]
        );

        await this.executeAppDataWipe();
      }

    } catch (error) {
      console.error('Failed to handle overdue authentication:', error);
    }
  }

  private async executeAppDataWipe(): Promise<void> {
    try {
      console.log('🧹 Executing app data wipe due to overdue active authentication');

      const keysToDelete = [
        'chats_pin', 'vault_pin', 'panic_pin',
        'verified_oids_v1', 'secure_notes', 'chat_messages',
        'vault_items', 'omerta_active_auth_config'
      ];

      for (const key of keysToDelete) {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch {
          // Ignore errors for non-existent keys
        }
      }

      Alert.alert(
        '✅ App Data Cleared',
        'App data has been wiped due to overdue active authentication. The app will restart.',
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('App data wipe failed:', error);
    }
  }

  private formatInterval(hours: number): string {
    if (hours === 24) return '24 hours (1 day)';
    if (hours === 48) return '48 hours (2 days)';
    if (hours === 72) return '72 hours (3 days)';
    if (hours === 96) return '96 hours (4 days)';
    if (hours === 120) return '120 hours (5 days)';
    if (hours === 144) return '144 hours (6 days)';
    if (hours === 168) return '168 hours (7 days)';
    return `${hours} hours`;
  }

  /**
   * 📈 GET CURRENT CONFIGURATION
   */
  async getConfig(): Promise<ActiveAuthConfig | null> {
    try {
      const configString = await SecureStore.getItemAsync('omerta_active_auth_config');
      if (!configString) return null;
      
      return JSON.parse(configString);
    } catch (error) {
      console.error('Failed to get active auth config:', error);
      return null;
    }
  }

  /**
   * ❌ DISABLE ACTIVE AUTHENTICATION
   */
  async disableActiveAuth(): Promise<void> {
    await this.configureActiveAuth(false, 72, 'app_data', 6);
  }

  // Call when app becomes active
  onAppForeground(): void {
    this.checkAuthenticationStatus();
  }

  // Cleanup timers
  destroy(): void {
    if (this.statusCheckTimer) {
      clearInterval(this.statusCheckTimer);
      this.statusCheckTimer = null;
    }
    
    if (this.warningTimer) {
      clearInterval(this.warningTimer);
      this.warningTimer = null;
    }
  }
}

// Export singleton instance
export const activeAuthWipe = ActiveAuthenticationWipeManager.getInstance();