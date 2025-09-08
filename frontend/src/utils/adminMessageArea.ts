/**
 * Admin Message Area System
 * Secret tap/long-hold for Admin login and hidden admin functionality
 */

import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

export interface AdminConfig {
  enabled: boolean;
  adminPin: string;
  secretTapSequence: number[];
  lastAdminAccess: number;
  adminMode: boolean;
  sessionTimeout: number; // minutes
}

export interface AdminMessage {
  id: string;
  type: 'system' | 'security' | 'debug' | 'emergency';
  message: string;
  timestamp: number;
  level: 'info' | 'warning' | 'critical';
  metadata?: Record<string, any>;
}

class AdminMessageManager {
  private config: AdminConfig = {
    enabled: false,
    adminPin: '',
    secretTapSequence: [3, 7, 1, 4], // Secret sequence: 3 taps, 7 taps, 1 tap, 4 taps
    lastAdminAccess: 0,
    adminMode: false,
    sessionTimeout: 15 // 15 minutes
  };

  private adminMessages: AdminMessage[] = [];
  private currentTapSequence: number[] = [];
  private tapCount = 0;
  private sequenceTimer: NodeJS.Timeout | null = null;
  private sessionTimer: NodeJS.Timeout | null = null;
  private listeners: Array<() => void> = [];

  constructor() {
    this.loadConfig();
  }

  async loadConfig(): Promise<void> {
    try {
      const stored = await SecureStore.getItemAsync('admin_config');
      if (stored) {
        this.config = { ...this.config, ...JSON.parse(stored) };
      }

      const messages = await SecureStore.getItemAsync('admin_messages');
      if (messages) {
        this.adminMessages = JSON.parse(messages);
      }
    } catch (error) {
      console.error('Failed to load admin config:', error);
    }
  }

  async saveConfig(): Promise<void> {
    try {
      await SecureStore.setItemAsync('admin_config', JSON.stringify(this.config));
      await SecureStore.setItemAsync('admin_messages', JSON.stringify(this.adminMessages));
    } catch (error) {
      console.error('Failed to save admin config:', error);
    }
  }

  // Secret tap sequence detection
  handleSecretTap(): boolean {
    this.tapCount++;

    // Clear existing sequence timer
    if (this.sequenceTimer) {
      clearTimeout(this.sequenceTimer);
    }

    // Set new timer - if no more taps in 2 seconds, record this tap count
    this.sequenceTimer = setTimeout(() => {
      if (this.tapCount > 0) {
        this.currentTapSequence.push(this.tapCount);
        this.tapCount = 0;

        // Check if we have enough numbers in sequence
        if (this.currentTapSequence.length >= this.config.secretTapSequence.length) {
          const isMatch = this.checkSecretSequence();
          if (isMatch) {
            this.currentTapSequence = [];
            this.promptAdminLogin();
            return true;
          } else {
            // Reset if sequence is wrong
            this.currentTapSequence = [];
          }
        }
      }
    }, 2000);

    return false;
  }

  private checkSecretSequence(): boolean {
    if (this.currentTapSequence.length !== this.config.secretTapSequence.length) {
      return false;
    }

    for (let i = 0; i < this.config.secretTapSequence.length; i++) {
      if (this.currentTapSequence[i] !== this.config.secretTapSequence[i]) {
        return false;
      }
    }

    return true;
  }

  private promptAdminLogin(): void {
    Alert.prompt(
      '🔐 Admin Access',
      'Enter admin PIN to access system administration:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Login', 
          onPress: (pin) => this.verifyAdminPin(pin || '')
        }
      ],
      'secure-text'
    );
  }

  async verifyAdminPin(enteredPin: string): Promise<boolean> {
    if (!this.config.enabled || enteredPin !== this.config.adminPin) {
      Alert.alert('Access Denied', 'Invalid admin PIN.');
      return false;
    }

    // Successfully authenticated
    this.config.adminMode = true;
    this.config.lastAdminAccess = Date.now();
    await this.saveConfig();

    // Set session timeout
    this.startSessionTimer();

    this.addSystemMessage('Admin session started', 'info', 'security');
    this.notifyListeners();

    Alert.alert(
      '🛡️ Admin Mode Activated',
      `Welcome, Administrator. Session expires in ${this.config.sessionTimeout} minutes.`,
      [{ text: 'Continue', style: 'default' }]
    );

    return true;
  }

  async setupAdminAccess(adminPin: string, customSequence?: number[]): Promise<void> {
    if (adminPin.length < 6) {
      throw new Error('Admin PIN must be at least 6 characters');
    }

    this.config.enabled = true;
    this.config.adminPin = adminPin;
    
    if (customSequence && customSequence.length >= 3) {
      this.config.secretTapSequence = customSequence;
    }

    await this.saveConfig();
    this.addSystemMessage('Admin access configured', 'info', 'security');
  }

  async logoutAdmin(): Promise<void> {
    this.config.adminMode = false;
    await this.saveConfig();

    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }

    this.addSystemMessage('Admin session ended', 'info', 'security');
    this.notifyListeners();
  }

  private startSessionTimer(): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }

    this.sessionTimer = setTimeout(() => {
      this.logoutAdmin();
      Alert.alert('Session Expired', 'Admin session has timed out.');
    }, this.config.sessionTimeout * 60 * 1000);
  }

  // Admin message system
  addSystemMessage(
    message: string, 
    level: 'info' | 'warning' | 'critical', 
    type: 'system' | 'security' | 'debug' | 'emergency' = 'system',
    metadata?: Record<string, any>
  ): void {
    const adminMessage: AdminMessage = {
      id: `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp: Date.now(),
      level,
      metadata
    };

    this.adminMessages.unshift(adminMessage); // Add to beginning
    
    // Keep only last 100 admin messages
    if (this.adminMessages.length > 100) {
      this.adminMessages = this.adminMessages.slice(0, 100);
    }

    this.saveConfig();
    console.log(`🛡️ ADMIN: [${level.toUpperCase()}] ${message}`);
  }

  getAdminMessages(type?: 'system' | 'security' | 'debug' | 'emergency'): AdminMessage[] {
    if (type) {
      return this.adminMessages.filter(msg => msg.type === type);
    }
    return [...this.adminMessages];
  }

  clearAdminMessages(): void {
    this.adminMessages = [];
    this.saveConfig();
    this.addSystemMessage('Admin message log cleared', 'info', 'system');
  }

  isAdminMode(): boolean {
    return this.config.adminMode;
  }

  isAdminEnabled(): boolean {
    return this.config.enabled;
  }

  getSecretSequence(): string {
    return this.config.secretTapSequence.join('-');
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

  // Long-hold detection for admin access (alternative to tap sequence)
  createAdminLongHoldHandler() {
    let pressTimer: NodeJS.Timeout | null = null;
    let isLongHold = false;

    return {
      onPressIn: () => {
        isLongHold = false;
        pressTimer = setTimeout(() => {
          isLongHold = true;
          this.promptAdminLogin();
        }, 3000); // 3 second long hold
      },
      onPressOut: () => {
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
        return isLongHold;
      }
    };
  }
}

export const adminMessageArea = new AdminMessageManager();