/**
 * VIP Chat Recovery System
 * 3-fast-taps to access VIP chats, long-hold to move chats to VIP
 * Auto-erase after 5 wrong VIP PINs
 */

import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

const VIP_STORAGE_KEY = 'vip_chat_data';
const VIP_PIN_ATTEMPTS_KEY = 'vip_pin_attempts';
const MAX_VIP_PIN_ATTEMPTS = 5;

export interface VipChatData {
  chatId: string;
  contactName: string;
  lastMessage: string;
  timestamp: number;
  encrypted: boolean;
}

export interface VipConfig {
  enabled: boolean;
  pin: string;
  autoEraseAfterFailedAttempts: boolean;
  chats: VipChatData[];
  pinAttempts: number;
  lastAttemptTime: number;
}

class VipChatManager {
  private config: VipConfig = {
    enabled: false,
    pin: '',
    autoEraseAfterFailedAttempts: true,
    chats: [],
    pinAttempts: 0,
    lastAttemptTime: 0
  };

  private tapCount = 0;
  private tapTimer: NodeJS.Timeout | null = null;
  private listeners: Array<() => void> = [];

  constructor() {
    this.loadConfig();
  }

  async loadConfig(): Promise<void> {
    try {
      const stored = await SecureStore.getItemAsync(VIP_STORAGE_KEY);
      if (stored) {
        this.config = { ...this.config, ...JSON.parse(stored) };
      }
      
      const attempts = await SecureStore.getItemAsync(VIP_PIN_ATTEMPTS_KEY);
      if (attempts) {
        this.config.pinAttempts = parseInt(attempts, 10);
      }
    } catch (error) {
      console.error('Failed to load VIP config:', error);
    }
  }

  async saveConfig(): Promise<void> {
    try {
      await SecureStore.setItemAsync(VIP_STORAGE_KEY, JSON.stringify(this.config));
      await SecureStore.setItemAsync(VIP_PIN_ATTEMPTS_KEY, this.config.pinAttempts.toString());
    } catch (error) {
      console.error('Failed to save VIP config:', error);
    }
  }

  // 3-fast-taps detection
  handleTap(): boolean {
    this.tapCount++;
    
    if (this.tapTimer) {
      clearTimeout(this.tapTimer);
    }

    if (this.tapCount >= 3) {
      // 3 taps detected - show VIP access
      this.tapCount = 0;
      return true;
    }

    // Reset tap count after 1 second
    this.tapTimer = setTimeout(() => {
      this.tapCount = 0;
    }, 1000);

    return false;
  }

  async setupVipPin(pin: string): Promise<void> {
    if (pin.length < 4) {
      throw new Error('VIP PIN must be at least 4 digits');
    }

    this.config.enabled = true;
    this.config.pin = pin;
    this.config.pinAttempts = 0;
    await this.saveConfig();
  }

  async verifyVipPin(enteredPin: string): Promise<boolean> {
    if (!this.config.enabled) return false;

    if (enteredPin === this.config.pin) {
      // Correct PIN - reset attempts
      this.config.pinAttempts = 0;
      await this.saveConfig();
      return true;
    } else {
      // Wrong PIN - increment attempts
      this.config.pinAttempts++;
      this.config.lastAttemptTime = Date.now();
      await this.saveConfig();

      if (this.config.pinAttempts >= MAX_VIP_PIN_ATTEMPTS) {
        // Auto-erase VIP chats after 5 wrong attempts
        await this.eraseAllVipChats();
        Alert.alert(
          'VIP Security Alert',
          'Too many failed PIN attempts. All VIP chats have been permanently erased.',
          [{ text: 'OK', style: 'destructive' }]
        );
      } else {
        const remaining = MAX_VIP_PIN_ATTEMPTS - this.config.pinAttempts;
        Alert.alert(
          'Incorrect VIP PIN',
          `${remaining} attempts remaining before auto-erase.`,
          [{ text: 'OK', style: 'cancel' }]
        );
      }

      return false;
    }
  }

  async moveToVip(chatId: string, contactName: string, lastMessage: string): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('VIP system not enabled. Set up VIP PIN first.');
    }

    // Remove from regular chats and add to VIP
    const vipChat: VipChatData = {
      chatId,
      contactName,
      lastMessage,
      timestamp: Date.now(),
      encrypted: true
    };

    // Remove existing VIP chat if it exists
    this.config.chats = this.config.chats.filter(chat => chat.chatId !== chatId);
    
    // Add to VIP chats
    this.config.chats.push(vipChat);
    
    await this.saveConfig();
    this.notifyListeners();

    Alert.alert(
      'Chat Moved to VIP',
      `"${contactName}" has been moved to VIP chats. Access via 3-fast-taps.`,
      [{ text: 'OK' }]
    );
  }

  async removeFromVip(chatId: string): Promise<void> {
    this.config.chats = this.config.chats.filter(chat => chat.chatId !== chatId);
    await this.saveConfig();
    this.notifyListeners();
  }

  async eraseAllVipChats(): Promise<void> {
    // Nuclear option - complete VIP system reset
    this.config.chats = [];
    this.config.enabled = false;
    this.config.pin = '';
    this.config.pinAttempts = 0;
    
    await this.saveConfig();
    this.notifyListeners();

    // Also clear from secure storage completely
    try {
      await SecureStore.deleteItemAsync(VIP_STORAGE_KEY);
      await SecureStore.deleteItemAsync(VIP_PIN_ATTEMPTS_KEY);
    } catch (error) {
      console.error('Failed to clear VIP storage:', error);
    }
  }

  getVipChats(): VipChatData[] {
    return [...this.config.chats];
  }

  isVipEnabled(): boolean {
    return this.config.enabled;
  }

  getRemainingAttempts(): number {
    return Math.max(0, MAX_VIP_PIN_ATTEMPTS - this.config.pinAttempts);
  }

  addListener(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  // Long-hold detection helper
  createLongHoldHandler(chatId: string, contactName: string, lastMessage: string) {
    let pressTimer: NodeJS.Timeout | null = null;

    return {
      onPressIn: () => {
        pressTimer = setTimeout(async () => {
          if (this.config.enabled) {
            Alert.alert(
              'Move to VIP Chat?',
              `Move "${contactName}" to VIP chats? This will hide it from normal chat list.`,
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Move to VIP', 
                  style: 'destructive',
                  onPress: () => this.moveToVip(chatId, contactName, lastMessage)
                }
              ]
            );
          } else {
            Alert.alert(
              'VIP Chat Setup',
              'Set up VIP PIN first in Settings to use VIP chats.',
              [{ text: 'OK' }]
            );
          }
        }, 1000); // 1 second long hold
      },
      onPressOut: () => {
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      }
    };
  }
}

export const vipChatManager = new VipChatManager();