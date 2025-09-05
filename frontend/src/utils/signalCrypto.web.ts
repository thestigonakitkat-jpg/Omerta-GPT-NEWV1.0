// Web-specific Signal Protocol implementation to avoid bundling issues
// This is a minimal shim for web environments

export class SignalProtocolManager {
  async initialize(): Promise<void> {
    console.warn('SignalProtocolManager: Web environment detected - Signal Protocol disabled');
  }

  async createMessage(recipientId: string, message: string): Promise<{ ciphertext: string; type: number }> {
    console.warn('SignalProtocolManager: createMessage not available on web');
    return { ciphertext: btoa(message), type: 1 };
  }

  async decryptMessage(senderId: string, ciphertext: string, type: number): Promise<string> {
    console.warn('SignalProtocolManager: decryptMessage not available on web');
    return atob(ciphertext);
  }

  async exportIdentity(): Promise<string> {
    return 'web-identity-placeholder';
  }

  async importIdentity(identity: string): Promise<void> {
    console.warn('SignalProtocolManager: importIdentity not available on web');
  }
}

export const signalProtocol = new SignalProtocolManager();