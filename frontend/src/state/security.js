// Security State Management using Zustand
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create security store
export const useSecurityStore = create((set, get) => ({
  // Security status
  isSecureGatePassed: false,
  lastSecurityCheck: null,
  
  // Counters and session info
  messageCounters: {},
  activeSessions: {},
  
  // Threat detection
  threatLevel: 'LOW', // LOW, MEDIUM, HIGH, CRITICAL
  suspiciousActivity: [],
  
  // Actions
  setSecureGatePassed: (passed) => set({ 
    isSecureGatePassed: passed,
    lastSecurityCheck: Date.now()
  }),
  
  updateThreatLevel: (level) => set({ threatLevel: level }),
  
  addSuspiciousActivity: (activity) => set((state) => ({
    suspiciousActivity: [...state.suspiciousActivity.slice(-9), {
      ...activity,
      timestamp: Date.now()
    }]
  })),
  
  updateMessageCounter: (chatId, count) => set((state) => ({
    messageCounters: {
      ...state.messageCounters,
      [chatId]: count
    }
  })),
  
  addActiveSession: (chatId, sessionInfo) => set((state) => ({
    activeSessions: {
      ...state.activeSessions,
      [chatId]: sessionInfo
    }
  })),
  
  removeActiveSession: (chatId) => set((state) => {
    const newSessions = { ...state.activeSessions };
    delete newSessions[chatId];
    return { activeSessions: newSessions };
  }),
  
  // Clear all security data
  clearSecurityData: () => set({
    messageCounters: {},
    activeSessions: {},
    suspiciousActivity: [],
    threatLevel: 'LOW'
  }),
  
  // Persistence
  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem('omerta-security-state');
      if (stored) {
        const data = JSON.parse(stored);
        set({
          messageCounters: data.messageCounters || {},
          threatLevel: data.threatLevel || 'LOW',
          // Don't restore sessions - they should be ephemeral
        });
      }
    } catch (error) {
      console.error('Failed to hydrate security state:', error);
    }
  },
  
  persist: async () => {
    try {
      const state = get();
      const dataToStore = {
        messageCounters: state.messageCounters,
        threatLevel: state.threatLevel,
        lastUpdate: Date.now()
      };
      await AsyncStorage.setItem('omerta-security-state', JSON.stringify(dataToStore));
    } catch (error) {
      console.error('Failed to persist security state:', error);
    }
  },
}));

// Auto-persist on state changes
let persistTimeout;
useSecurityStore.subscribe((state) => {
  clearTimeout(persistTimeout);
  persistTimeout = setTimeout(() => {
    state.persist();
  }, 1000);
});