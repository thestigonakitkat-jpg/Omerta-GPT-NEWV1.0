// Theme State Management
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useTheme = create((set, get) => ({
  mode: 'dark', // 'dark', 'light', 'system'
  accent: 'chrome',
  
  setMode: async (mode) => {
    set({ mode });
    try {
      await AsyncStorage.setItem('omerta.theme.mode', mode);
    } catch (error) {
      console.error('Failed to save theme mode:', error);
    }
  },
  
  hydrate: async () => {
    try {
      const savedMode = await AsyncStorage.getItem('omerta.theme.mode');
      if (savedMode) {
        set({ mode: savedMode });
      }
    } catch (error) {
      console.error('Failed to load theme mode:', error);
    }
  },
}));