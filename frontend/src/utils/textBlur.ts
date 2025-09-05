import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

export interface TextBlurConfig {
  enabled: boolean;
  blurDelay: number; // in seconds (1 to 3600 - 1 hour max)
  requirePinToDisable: boolean;
  currentPin: string;
}

const TEXT_BLUR_STORAGE_KEY = 'text_blur_config';
const DEFAULT_CONFIG: TextBlurConfig = {
  enabled: false,
  blurDelay: 5, // 5 seconds default
  requirePinToDisable: false,
  currentPin: ''
};

class TextBlurManager {
  private config: TextBlurConfig = DEFAULT_CONFIG;
  private blurTimers: Map<string, NodeJS.Timeout> = new Map();
  private listeners: Array<(config: TextBlurConfig) => void> = [];

  constructor() {
    this.loadConfig();
  }

  // Load configuration from storage
  async loadConfig(): Promise<TextBlurConfig> {
    try {
      const stored = await SecureStore.getItemAsync(TEXT_BLUR_STORAGE_KEY);
      if (stored) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
      this.notifyListeners();
      return this.config;
    } catch (error) {
      console.error('Failed to load text blur config:', error);
      return DEFAULT_CONFIG;
    }
  }

  // Save configuration to storage
  async saveConfig(config: Partial<TextBlurConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...config };
      await AsyncStorage.setItem(TEXT_BLUR_STORAGE_KEY, JSON.stringify(this.config));
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to save text blur config:', error);
      throw error;
    }
  }

  // Get current configuration
  getConfig(): TextBlurConfig {
    return { ...this.config };
  }

  // Enable/disable text blur
  async setEnabled(enabled: boolean, pin?: string): Promise<boolean> {
    if (!enabled && this.config.requirePinToDisable) {
      if (!pin || pin !== this.config.currentPin) {
        throw new Error('Incorrect PIN. Cannot disable text blur protection.');
      }
    }

    await this.saveConfig({ enabled });
    
    // Clear all active timers if disabled
    if (!enabled) {
      this.clearAllTimers();
    }

    return true;
  }

  // Set blur delay (1 second to 1 hour)
  async setBlurDelay(seconds: number): Promise<void> {
    if (seconds < 1 || seconds > 3600) {
      throw new Error('Blur delay must be between 1 second and 1 hour (3600 seconds)');
    }

    await this.saveConfig({ blurDelay: seconds });
  }

  // Set PIN requirement for disabling
  async setPinProtection(enabled: boolean, pin?: string): Promise<void> {
    if (enabled && (!pin || pin.length < 4)) {
      throw new Error('PIN must be at least 4 digits long');
    }

    await this.saveConfig({ 
      requirePinToDisable: enabled,
      currentPin: enabled ? pin! : ''
    });
  }

  // Start blur timer for a specific element
  startBlurTimer(elementId: string, onBlur: () => void): void {
    if (!this.config.enabled) return;

    // Clear existing timer for this element
    this.clearTimer(elementId);

    // Set new timer
    const timer = setTimeout(() => {
      onBlur();
      this.blurTimers.delete(elementId);
    }, this.config.blurDelay * 1000);

    this.blurTimers.set(elementId, timer);
  }

  // Clear specific timer
  clearTimer(elementId: string): void {
    const timer = this.blurTimers.get(elementId);
    if (timer) {
      clearTimeout(timer);
      this.blurTimers.delete(elementId);
    }
  }

  // Clear all timers
  clearAllTimers(): void {
    this.blurTimers.forEach((timer) => clearTimeout(timer));
    this.blurTimers.clear();
  }

  // Reset timer for element (restart countdown)
  resetTimer(elementId: string, onBlur: () => void): void {
    if (!this.config.enabled) return;
    this.startBlurTimer(elementId, onBlur);
  }

  // Add configuration change listener
  addListener(listener: (config: TextBlurConfig) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners of config changes
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.config));
  }

  // Utility method to format delay time for display
  formatDelay(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const remainingMinutes = Math.floor((seconds % 3600) / 60);
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
  }

  // Get preset delay options
  getDelayPresets(): Array<{ value: number; label: string; description: string }> {
    return [
      { value: 1, label: '1s', description: 'Instant blur' },
      { value: 3, label: '3s', description: 'Quick blur' },
      { value: 5, label: '5s', description: 'Default' },
      { value: 10, label: '10s', description: 'Relaxed' },
      { value: 30, label: '30s', description: 'Extended' },
      { value: 60, label: '1m', description: 'Long read' },
      { value: 300, label: '5m', description: 'Very long' },
      { value: 900, label: '15m', description: 'Meeting mode' },
      { value: 1800, label: '30m', description: 'Study mode' },
      { value: 3600, label: '1h', description: 'Maximum' }
    ];
  }
}

// Export singleton instance
export const textBlur = new TextBlurManager();

// React hook for easy component integration
export function useTextBlur() {
  return textBlur;
}