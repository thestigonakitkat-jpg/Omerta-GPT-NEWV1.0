import AsyncStorage from '@react-native-async-storage/async-storage';

// OMERTÁ Message Expiration System - Auto-Purge Security
class MessageExpirationManager {
  constructor() {
    this.defaultExpiryWeeks = 6; // 6 weeks default (user requirement)
    this.minExpiryMinutes = 1; // 1 minute minimum
    this.maxExpiryWeeks = 1; // 1 week maximum for slider
    this.cleanupInterval = null;
    this.callbacks = {
      onMessageExpired: null,
      onCleanupComplete: null
    };
  }

  // Initialize expiration system
  async initialize() {
    try {
      console.log('⏰ Initializing OMERTÁ Message Expiration System...');
      
      // Load user settings
      await this.loadSettings();
      
      // Start cleanup routine
      this.startCleanupRoutine();
      
      // Run initial cleanup
      await this.cleanupExpiredMessages();
      
      console.log(`✅ Message Expiration System operational (Default: ${this.defaultExpiryWeeks} weeks)`);
      return true;
    } catch (error) {
      console.error('❌ Message Expiration initialization failed:', error);
      return false;
    }
  }

  // Load user expiration settings
  async loadSettings() {
    try {
      const settings = await AsyncStorage.getItem('@omerta_message_expiration');
      if (settings) {
        const parsed = JSON.parse(settings);
        this.defaultExpiryWeeks = parsed.defaultExpiryWeeks || 6;
        this.minExpiryMinutes = parsed.minExpiryMinutes || 1;
        this.maxExpiryWeeks = parsed.maxExpiryWeeks || 1;
      }
    } catch (error) {
      console.error('Failed to load expiration settings:', error);
    }
  }

  // Save expiration settings
  async saveSettings() {
    try {
      const settings = {
        defaultExpiryWeeks: this.defaultExpiryWeeks,
        minExpiryMinutes: this.minExpiryMinutes,
        maxExpiryWeeks: this.maxExpiryWeeks
      };
      await AsyncStorage.setItem('@omerta_message_expiration', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save expiration settings:', error);
    }
  }

  // Calculate expiry timestamp for new message
  calculateExpiryTime(customExpiryMinutes = null) {
    const now = Date.now();
    
    if (customExpiryMinutes) {
      // Use custom expiry (1 minute to 1 week)
      const clampedMinutes = Math.max(
        this.minExpiryMinutes,
        Math.min(customExpiryMinutes, this.maxExpiryWeeks * 7 * 24 * 60)
      );
      return now + (clampedMinutes * 60 * 1000);
    } else {
      // Use default expiry (6 weeks)
      return now + (this.defaultExpiryWeeks * 7 * 24 * 60 * 60 * 1000);
    }
  }

  // Add message with expiration
  async addExpiringMessage(messageData, customExpiryMinutes = null) {
    try {
      const expiryTime = this.calculateExpiryTime(customExpiryMinutes);
      const messageWithExpiry = {
        ...messageData,
        id: messageData.id || `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        createdAt: Date.now(),
        expiresAt: expiryTime,
        autoExpiry: true
      };

      // Store in expiring messages list
      const existingMessages = await this.getExpiringMessages();
      existingMessages.push(messageWithExpiry);
      
      await AsyncStorage.setItem('@omerta_expiring_messages', JSON.stringify(existingMessages));
      
      console.log(`⏰ Message scheduled for expiry: ${messageWithExpiry.id} (${new Date(expiryTime).toLocaleString()})`);
      
      return messageWithExpiry;
    } catch (error) {
      console.error('Failed to add expiring message:', error);
      return messageData;
    }
  }

  // Get all expiring messages
  async getExpiringMessages() {
    try {
      const messages = await AsyncStorage.getItem('@omerta_expiring_messages');
      return messages ? JSON.parse(messages) : [];
    } catch (error) {
      console.error('Failed to get expiring messages:', error);
      return [];
    }
  }

  // Clean up expired messages
  async cleanupExpiredMessages() {
    try {
      const messages = await this.getExpiringMessages();
      const now = Date.now();
      const expiredMessages = [];
      const activeMessages = [];

      messages.forEach(message => {
        if (message.expiresAt <= now) {
          expiredMessages.push(message);
        } else {
          activeMessages.push(message);
        }
      });

      if (expiredMessages.length > 0) {
        // Save only active messages
        await AsyncStorage.setItem('@omerta_expiring_messages', JSON.stringify(activeMessages));
        
        // Clean up from other storage systems
        for (const message of expiredMessages) {
          await this.purgeMessageFromAllSystems(message);
        }

        console.log(`🧹 Expired ${expiredMessages.length} messages from system`);

        // Callback for expired messages
        if (this.callbacks.onMessageExpired) {
          expiredMessages.forEach(msg => this.callbacks.onMessageExpired(msg));
        }
      }

      // Callback for cleanup complete
      if (this.callbacks.onCleanupComplete) {
        this.callbacks.onCleanupComplete({
          expired: expiredMessages.length,
          active: activeMessages.length
        });
      }

      return {
        expired: expiredMessages.length,
        active: activeMessages.length
      };
    } catch (error) {
      console.error('Failed to cleanup expired messages:', error);
      return { expired: 0, active: 0 };
    }
  }

  // Purge message from all systems
  async purgeMessageFromAllSystems(message) {
    try {
      // Remove from secure chat storage
      await AsyncStorage.removeItem(`@omerta_chat_${message.id}`);
      
      // Remove from contacts vault if stored there
      await AsyncStorage.removeItem(`@omerta_contact_msg_${message.id}`);
      
      // Remove from any cached message data
      await AsyncStorage.removeItem(`@omerta_msg_cache_${message.id}`);
      
      console.log(`💀 Message completely purged: ${message.id}`);
    } catch (error) {
      console.error(`Failed to purge message ${message.id}:`, error);
    }
  }

  // Start cleanup routine (runs every hour)
  startCleanupRoutine() {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(async () => {
      await this.cleanupExpiredMessages();
    }, 60 * 60 * 1000); // Every hour

    console.log('🕐 Message expiration cleanup routine started (hourly)');
  }

  // Stop cleanup routine
  stopCleanupRoutine() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🕐 Message expiration cleanup routine stopped');
    }
  }

  // Set default expiry time
  async setDefaultExpiry(weeks) {
    const clampedWeeks = Math.max(1, Math.min(weeks, 24)); // 1-24 weeks max
    this.defaultExpiryWeeks = clampedWeeks;
    await this.saveSettings();
    console.log(`⏰ Default message expiry set to ${clampedWeeks} weeks`);
  }

  // Get expiry slider options (1 minute to 1 week)
  getSliderOptions() {
    return [
      { label: '1 minute', minutes: 1 },
      { label: '5 minutes', minutes: 5 },
      { label: '15 minutes', minutes: 15 },
      { label: '30 minutes', minutes: 30 },
      { label: '1 hour', minutes: 60 },
      { label: '2 hours', minutes: 120 },
      { label: '6 hours', minutes: 360 },
      { label: '12 hours', minutes: 720 },
      { label: '1 day', minutes: 1440 },
      { label: '3 days', minutes: 4320 },
      { label: '1 week', minutes: 10080 }
    ];
  }

  // Check if message is close to expiry (within 1 hour)
  isMessageNearExpiry(message) {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    return message.expiresAt && (message.expiresAt - now) <= oneHour;
  }

  // Get time until expiry
  getTimeUntilExpiry(message) {
    if (!message.expiresAt) return null;
    
    const now = Date.now();
    const timeLeft = message.expiresAt - now;
    
    if (timeLeft <= 0) return { expired: true };
    
    const minutes = Math.floor(timeLeft / (60 * 1000));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);

    if (weeks > 0) return { weeks, label: `${weeks}w` };
    if (days > 0) return { days, label: `${days}d` };
    if (hours > 0) return { hours, label: `${hours}h` };
    return { minutes, label: `${minutes}m` };
  }

  // Set callbacks
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // Get system status
  getStatus() {
    return {
      defaultExpiryWeeks: this.defaultExpiryWeeks,
      minExpiryMinutes: this.minExpiryMinutes,
      maxExpiryWeeks: this.maxExpiryWeeks,
      cleanupRunning: !!this.cleanupInterval,
      sliderOptions: this.getSliderOptions()
    };
  }

  // Force cleanup now
  async forceCleanup() {
    console.log('🧹 Forcing immediate message cleanup...');
    return await this.cleanupExpiredMessages();
  }

  // Stop system
  stop() {
    this.stopCleanupRoutine();
    console.log('⏰ Message Expiration System stopped');
  }
}

// Export singleton instance
export const messageExpirationManager = new MessageExpirationManager();
export default messageExpirationManager;