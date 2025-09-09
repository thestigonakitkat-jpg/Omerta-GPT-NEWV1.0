import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

// OMERTÁ Security State Management
export const useSecurityStore = create((set, get) => ({
  // Authentication State
  isAuthenticated: false,
  deviceId: null,
  lastActivity: Date.now(),
  
  // Threat Detection State
  threatLevel: 'normal', // normal, suspicious, critical
  detectedThreats: [],
  isMonitoring: false,
  
  // Vanish Protocol State
  activeMessages: new Map(),
  messageTimers: new Map(),
  
  // DEFCON-1 State
  defconLevel: 5,
  adminAuthenticated: false,
  
  // Actions
  authenticate: async (pin) => {
    try {
      // Basic authentication logic
      if (pin === '123456') {
        set({ 
          isAuthenticated: true, 
          lastActivity: Date.now(),
          deviceId: Math.random().toString(36).substring(7)
        });
        return true;
      }
      // Panic PIN detection
      if (pin === '000000') {
        get().triggerPanicMode();
        return false;
      }
      return false;
    } catch (error) {
      console.error('Authentication error:', error);
      return false;
    }
  },
  
  updateActivity: () => {
    set({ lastActivity: Date.now() });
  },
  
  setThreatLevel: (level) => {
    set({ threatLevel: level });
    if (level === 'critical') {
      get().triggerEmergencyProtocol();
    }
  },
  
  addThreat: (threat) => {
    const threats = get().detectedThreats;
    set({ detectedThreats: [...threats, { ...threat, timestamp: Date.now() }] });
  },
  
  startMonitoring: () => {
    set({ isMonitoring: true });
    console.log('🛡️ OMERTÁ threat monitoring activated');
  },
  
  stopMonitoring: () => {
    set({ isMonitoring: false });
    console.log('🛡️ OMERTÁ threat monitoring deactivated');
  },
  
  // Vanish Protocol
  addMessage: (messageId, content, ttl = 30000) => {
    const messages = get().activeMessages;
    const timers = get().messageTimers;
    
    messages.set(messageId, content);
    
    // Auto-destruct timer
    const timer = setTimeout(() => {
      messages.delete(messageId);
      timers.delete(messageId);
      set({ activeMessages: new Map(messages), messageTimers: new Map(timers) });
      console.log(`💥 Message ${messageId} vanished via Vanish Protocol`);
    }, ttl);
    
    timers.set(messageId, timer);
    set({ activeMessages: new Map(messages), messageTimers: new Map(timers) });
  },
  
  getMessage: (messageId) => {
    const messages = get().activeMessages;
    const message = messages.get(messageId);
    
    // One-time read - message self-destructs after reading
    if (message) {
      messages.delete(messageId);
      const timers = get().messageTimers;
      if (timers.has(messageId)) {
        clearTimeout(timers.get(messageId));
        timers.delete(messageId);
      }
      set({ activeMessages: new Map(messages), messageTimers: new Map(timers) });
      console.log(`🔥 Message ${messageId} read and destroyed (Vanish Protocol)`);
    }
    
    return message;
  },
  
  // Emergency Protocols
  triggerPanicMode: () => {
    console.log('🚨 PANIC MODE ACTIVATED - STEELOS-SHREDDER DEPLOYED');
    set({ 
      threatLevel: 'critical',
      defconLevel: 1,
      isAuthenticated: false 
    });
    get().destroyAllData();
  },
  
  triggerEmergencyProtocol: () => {
    console.log('⚠️ EMERGENCY PROTOCOL ACTIVATED');
    set({ defconLevel: 2 });
    get().destroyAllMessages();
  },
  
  destroyAllMessages: () => {
    const messages = get().activeMessages;
    const timers = get().messageTimers;
    
    // Clear all timers
    timers.forEach(timer => clearTimeout(timer));
    
    // Destroy all messages
    messages.clear();
    timers.clear();
    
    set({ 
      activeMessages: new Map(), 
      messageTimers: new Map(),
      defconLevel: 1 
    });
    
    console.log('💀 ALL MESSAGES DESTROYED - STEELOS-SHREDDER COMPLETE');
  },
  
  destroyAllData: () => {
    get().destroyAllMessages();
    
    // Clear all authentication
    set({
      isAuthenticated: false,
      deviceId: null,
      adminAuthenticated: false,
      detectedThreats: [],
      defconLevel: 1
    });
    
    // Clear secure storage
    SecureStore.deleteItemAsync('@omerta_session').catch(() => {});
    SecureStore.deleteItemAsync('@omerta_keys').catch(() => {});
    
    console.log('☢️ NUCLEAR OPTION EXECUTED - ALL DATA OBLITERATED');
  },
  
  // DEFCON-1 Protocol
  setDefconLevel: (level) => {
    set({ defconLevel: level });
    console.log(`🚨 DEFCON-${level} ACTIVATED`);
  },
  
  authenticateAdmin: (passphrase) => {
    if (passphrase === 'Omertaisthecode#01') {
      set({ adminAuthenticated: true });
      console.log('🔐 ADMIN AUTHENTICATED - DEFCON-1 ACCESS GRANTED');
      return true;
    }
    return false;
  }
}));