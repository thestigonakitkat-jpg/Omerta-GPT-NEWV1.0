import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// OMERTÁ Auto-Reboot System - Scheduled Security Restart
class AutoRebootManager {
  constructor() {
    this.isEnabled = true;
    this.rebootTimes = ['02:00', '14:00']; // 2 AM and 2 PM
    this.chatDelayMinutes = 10; // Delay reboot if chat is active
    this.warningMinutes = 5; // Warn user 5 minutes before reboot
    this.currentTimer = null;
    this.warningTimer = null;
    this.isDelayed = false;
    this.callbacks = {
      onRebootScheduled: null,
      onRebootWarning: null,
      onRebootExecuted: null,
      onRebootDelayed: null
    };
  }

  // Initialize auto-reboot system
  async initialize() {
    try {
      console.log('🔄 Initializing OMERTÁ Auto-Reboot System...');
      
      // Load settings from storage
      await this.loadSettings();
      
      // Schedule next reboot
      this.scheduleNextReboot();
      
      // Check if we missed a reboot while app was closed
      await this.checkMissedReboot();
      
      console.log('✅ Auto-Reboot System operational');
      console.log(`📅 Next scheduled reboots: ${this.rebootTimes.join(', ')}`);
      
      return true;
    } catch (error) {
      console.error('❌ Auto-Reboot initialization failed:', error);
      return false;
    }
  }

  // Load settings from storage
  async loadSettings() {
    try {
      const settings = await AsyncStorage.getItem('@omerta_autoreboot_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        this.isEnabled = parsed.isEnabled ?? true;
        this.rebootTimes = parsed.rebootTimes ?? ['02:00', '14:00'];
        this.chatDelayMinutes = parsed.chatDelayMinutes ?? 10;
        this.warningMinutes = parsed.warningMinutes ?? 5;
      }
    } catch (error) {
      console.error('Failed to load auto-reboot settings:', error);
    }
  }

  // Save settings to storage
  async saveSettings() {
    try {
      const settings = {
        isEnabled: this.isEnabled,
        rebootTimes: this.rebootTimes,
        chatDelayMinutes: this.chatDelayMinutes,
        warningMinutes: this.warningMinutes
      };
      await AsyncStorage.setItem('@omerta_autoreboot_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save auto-reboot settings:', error);
    }
  }

  // Schedule the next reboot
  scheduleNextReboot() {
    if (!this.isEnabled) {
      console.log('🔄 Auto-reboot is disabled');
      return;
    }

    const nextRebootTime = this.getNextRebootTime();
    const timeUntilReboot = nextRebootTime.getTime() - Date.now();
    const warningTime = timeUntilReboot - (this.warningMinutes * 60 * 1000);

    console.log(`⏰ Next reboot scheduled for: ${nextRebootTime.toLocaleString()}`);
    console.log(`⏰ Warning will show at: ${new Date(Date.now() + warningTime).toLocaleString()}`);

    // Clear existing timers
    if (this.currentTimer) clearTimeout(this.currentTimer);
    if (this.warningTimer) clearTimeout(this.warningTimer);

    // Schedule warning
    if (warningTime > 0) {
      this.warningTimer = setTimeout(() => {
        this.showRebootWarning();
      }, warningTime);
    }

    // Schedule reboot
    this.currentTimer = setTimeout(() => {
      this.executeReboot();
    }, timeUntilReboot);

    // Save next reboot time
    AsyncStorage.setItem('@omerta_next_reboot', nextRebootTime.toISOString());

    // Callback for reboot scheduled
    if (this.callbacks.onRebootScheduled) {
      this.callbacks.onRebootScheduled(nextRebootTime);
    }
  }

  // Get next reboot time
  getNextRebootTime() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    for (const timeStr of this.rebootTimes) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const rebootTime = new Date(today.getTime());
      rebootTime.setHours(hours, minutes, 0, 0);
      
      // If this reboot time hasn't passed today, use it
      if (rebootTime.getTime() > now.getTime()) {
        return rebootTime;
      }
    }
    
    // All reboot times for today have passed, use first one tomorrow
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const [hours, minutes] = this.rebootTimes[0].split(':').map(Number);
    tomorrow.setHours(hours, minutes, 0, 0);
    
    return tomorrow;
  }

  // Check if we missed a reboot while app was closed
  async checkMissedReboot() {
    try {
      const lastRebootStr = await AsyncStorage.getItem('@omerta_next_reboot');
      if (lastRebootStr) {
        const lastRebootTime = new Date(lastRebootStr);
        const now = new Date();
        
        if (now.getTime() > lastRebootTime.getTime()) {
          console.log('🔄 Missed scheduled reboot detected');
          
          // Show missed reboot notification
          Alert.alert(
            '🔄 Security Notice',
            'A scheduled security reboot was missed while the app was closed. For optimal security, regular reboots are recommended.',
            [
              { text: 'Reboot Now', onPress: () => this.executeReboot() },
              { text: 'Continue', style: 'cancel' }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Failed to check missed reboot:', error);
    }
  }

  // Show reboot warning
  showRebootWarning() {
    const warningMessage = `OMERTÁ will perform a security reboot in ${this.warningMinutes} minutes. Save any important work.`;
    
    console.log(`⚠️ ${warningMessage}`);
    
    Alert.alert(
      '🔄 Scheduled Security Reboot',
      warningMessage,
      [
        { 
          text: 'Delay 10 minutes', 
          onPress: () => this.delayReboot() 
        },
        { 
          text: 'Reboot Now', 
          onPress: () => this.executeReboot() 
        },
        { 
          text: 'OK', 
          style: 'cancel' 
        }
      ]
    );

    // Callback for warning shown
    if (this.callbacks.onRebootWarning) {
      this.callbacks.onRebootWarning();
    }
  }

  // Delay reboot if user is active
  delayReboot() {
    console.log('🔄 Auto-reboot delayed by user request');
    
    this.isDelayed = true;
    
    // Clear current timer
    if (this.currentTimer) clearTimeout(this.currentTimer);
    
    // Schedule reboot for 10 minutes later
    this.currentTimer = setTimeout(() => {
      this.executeReboot();
    }, this.chatDelayMinutes * 60 * 1000);

    // Callback for reboot delayed
    if (this.callbacks.onRebootDelayed) {
      this.callbacks.onRebootDelayed();
    }
  }

  // Check if chat is active (to delay reboot)
  isChatActive() {
    // This would be set by the chat component when user is actively messaging
    return this.chatActiveTimestamp && 
           (Date.now() - this.chatActiveTimestamp) < (this.chatDelayMinutes * 60 * 1000);
  }

  // Set chat activity timestamp
  setChatActive() {
    this.chatActiveTimestamp = Date.now();
    console.log('💬 Chat activity detected - reboot delay may apply');
  }

  // Execute the reboot
  executeReboot() {
    console.log('🔄 EXECUTING SECURITY REBOOT...');
    
    // Check if chat is active and should delay
    if (this.isChatActive() && !this.isDelayed) {
      console.log('💬 Chat is active - delaying reboot');
      this.delayReboot();
      return;
    }

    // Show reboot execution alert
    Alert.alert(
      '🔄 Security Reboot',
      'OMERTÁ is performing a scheduled security restart to prevent surveillance persistence.',
      [
        {
          text: 'Continue',
          onPress: () => {
            // In a real app, this would restart the app
            // For demo purposes, we'll just reset to login screen
            this.performRebootActions();
          }
        }
      ]
    );

    // Callback for reboot executed
    if (this.callbacks.onRebootExecuted) {
      this.callbacks.onRebootExecuted();
    }
  }

  // Perform actual reboot actions
  async performRebootActions() {
    try {
      console.log('🔄 Performing security reboot actions...');
      
      // Clear sensitive data from memory
      await this.clearSensitiveData();
      
      // Reset app state
      await this.resetAppState();
      
      // Schedule next reboot
      this.scheduleNextReboot();
      
      console.log('✅ Security reboot completed');
      
      // In a real implementation, this would restart the app
      // For now, we simulate by clearing authentication
      
    } catch (error) {
      console.error('❌ Reboot actions failed:', error);
    }
  }

  // Clear sensitive data during reboot
  async clearSensitiveData() {
    try {
      // Clear temporary data (keep user settings)
      const keysToRemove = [
        '@omerta_session_temp',
        '@omerta_active_chats',
        '@omerta_threat_cache',
      ];
      
      for (const key of keysToRemove) {
        await AsyncStorage.removeItem(key);
      }
      
      console.log('🧹 Sensitive data cleared during reboot');
    } catch (error) {
      console.error('Failed to clear sensitive data:', error);
    }
  }

  // Reset app state during reboot
  async resetAppState() {
    try {
      // Mark reboot as completed
      await AsyncStorage.setItem('@omerta_last_reboot', new Date().toISOString());
      
      // Reset any in-memory caches
      // This would integrate with your state management system
      
      console.log('🔄 App state reset completed');
    } catch (error) {
      console.error('Failed to reset app state:', error);
    }
  }

  // Enable/disable auto-reboot
  async setEnabled(enabled) {
    this.isEnabled = enabled;
    await this.saveSettings();
    
    if (enabled) {
      this.scheduleNextReboot();
      console.log('✅ Auto-reboot enabled');
    } else {
      if (this.currentTimer) clearTimeout(this.currentTimer);
      if (this.warningTimer) clearTimeout(this.warningTimer);
      console.log('❌ Auto-reboot disabled');
    }
  }

  // Update reboot schedule
  async updateSchedule(rebootTimes) {
    this.rebootTimes = rebootTimes;
    await this.saveSettings();
    this.scheduleNextReboot();
    console.log(`📅 Reboot schedule updated: ${rebootTimes.join(', ')}`);
  }

  // Set callbacks
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // Get status information
  getStatus() {
    const nextReboot = this.getNextRebootTime();
    const timeUntilReboot = nextReboot.getTime() - Date.now();
    
    return {
      isEnabled: this.isEnabled,
      nextRebootTime: nextReboot,
      timeUntilReboot: timeUntilReboot,
      rebootTimes: this.rebootTimes,
      isDelayed: this.isDelayed,
      chatActive: this.isChatActive()
    };
  }

  // Stop auto-reboot system
  stop() {
    if (this.currentTimer) clearTimeout(this.currentTimer);
    if (this.warningTimer) clearTimeout(this.warningTimer);
    console.log('🔄 Auto-reboot system stopped');
  }
}

// Export singleton instance
export const autoRebootManager = new AutoRebootManager();
export default autoRebootManager;