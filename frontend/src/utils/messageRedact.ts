/**
 * Message REDACT System
 * Replace 15-minute edit with permanent message redaction
 */

import * as SecureStore from 'expo-secure-store';

export interface RedactedMessage {
  messageId: string;
  originalHash: string;
  redactedAt: number;
  reason: string;
  chatId: string;
}

export interface MessageRedactConfig {
  enabled: boolean;
  requireReason: boolean;
  showRedactedPlaceholder: boolean;
  allowUndoWindow: number; // seconds
}

class MessageRedactManager {
  private config: MessageRedactConfig = {
    enabled: true,
    requireReason: false,
    showRedactedPlaceholder: true,
    allowUndoWindow: 30 // 30 seconds to undo
  };

  private redactedMessages: Map<string, RedactedMessage> = new Map();
  private undoTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.loadConfig();
  }

  async loadConfig(): Promise<void> {
    try {
      const stored = await SecureStore.getItemAsync('message_redact_config');
      if (stored) {
        this.config = { ...this.config, ...JSON.parse(stored) };
      }

      const redacted = await SecureStore.getItemAsync('redacted_messages');
      if (redacted) {
        const messages = JSON.parse(redacted);
        this.redactedMessages = new Map(messages);
      }
    } catch (error) {
      console.error('Failed to load redact config:', error);
    }
  }

  async saveConfig(): Promise<void> {
    try {
      await SecureStore.setItemAsync('message_redact_config', JSON.stringify(this.config));
      
      const messages = Array.from(this.redactedMessages.entries());
      await SecureStore.setItemAsync('redacted_messages', JSON.stringify(messages));
    } catch (error) {
      console.error('Failed to save redact config:', error);
    }
  }

  async redactMessage(
    messageId: string, 
    chatId: string, 
    originalContent: string, 
    reason?: string
  ): Promise<boolean> {
    try {
      // Create hash of original content for verification
      const originalHash = await this.hashContent(originalContent);

      const redactedMessage: RedactedMessage = {
        messageId,
        originalHash,
        redactedAt: Date.now(),
        reason: reason || 'Message redacted by sender',
        chatId
      };

      this.redactedMessages.set(messageId, redactedMessage);
      await this.saveConfig();

      // Set undo timer if enabled
      if (this.config.allowUndoWindow > 0) {
        const undoTimer = setTimeout(() => {
          this.finalizeRedaction(messageId);
        }, this.config.allowUndoWindow * 1000);

        this.undoTimers.set(messageId, undoTimer);
      }

      console.log(`🔴 Message ${messageId} REDACTED: ${reason || 'No reason provided'}`);
      return true;
    } catch (error) {
      console.error('Failed to redact message:', error);
      return false;
    }
  }

  async undoRedaction(messageId: string): Promise<boolean> {
    try {
      const undoTimer = this.undoTimers.get(messageId);
      if (undoTimer) {
        clearTimeout(undoTimer);
        this.undoTimers.delete(messageId);
      }

      this.redactedMessages.delete(messageId);
      await this.saveConfig();

      console.log(`↩️ Message ${messageId} redaction UNDONE`);
      return true;
    } catch (error) {
      console.error('Failed to undo redaction:', error);
      return false;
    }
  }

  private finalizeRedaction(messageId: string): void {
    // Remove undo timer - redaction is now permanent
    this.undoTimers.delete(messageId);
    console.log(`🔒 Message ${messageId} redaction FINALIZED - no longer undoable`);
  }

  isMessageRedacted(messageId: string): boolean {
    return this.redactedMessages.has(messageId);
  }

  getRedactedInfo(messageId: string): RedactedMessage | null {
    return this.redactedMessages.get(messageId) || null;
  }

  canUndoRedaction(messageId: string): boolean {
    return this.undoTimers.has(messageId);
  }

  getRedactedPlaceholder(messageId: string): string {
    const redacted = this.redactedMessages.get(messageId);
    if (!redacted) return '';

    if (this.config.showRedactedPlaceholder) {
      const timeAgo = this.formatTimeAgo(Date.now() - redacted.redactedAt);
      return `🔴 Message redacted ${timeAgo}${redacted.reason ? ` • ${redacted.reason}` : ''}`;
    }

    return '🔴 Message redacted';
  }

  async getRedactStats(): Promise<{
    totalRedacted: number;
    redactedToday: number;
    undoableCount: number;
  }> {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    let redactedToday = 0;
    for (const redacted of this.redactedMessages.values()) {
      if (redacted.redactedAt > oneDayAgo) {
        redactedToday++;
      }
    }

    return {
      totalRedacted: this.redactedMessages.size,
      redactedToday,
      undoableCount: this.undoTimers.size
    };
  }

  // Utility methods
  private async hashContent(content: string): Promise<string> {
    // Simple hash for content verification
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private formatTimeAgo(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  // Configuration methods
  async setRequireReason(require: boolean): Promise<void> {
    this.config.requireReason = require;
    await this.saveConfig();
  }

  async setShowPlaceholder(show: boolean): Promise<void> {
    this.config.showRedactedPlaceholder = show;
    await this.saveConfig();
  }

  async setUndoWindow(seconds: number): Promise<void> {
    this.config.allowUndoWindow = Math.max(0, Math.min(300, seconds)); // Max 5 minutes
    await this.saveConfig();
  }

  getConfig(): MessageRedactConfig {
    return { ...this.config };
  }
}

export const messageRedact = new MessageRedactManager();