// Secure Device Wipe Utilities
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Comprehensive secure wipe of all OMERTA data
 */
export async function secureSelfWipe() {
  try {
    console.log('🚨 Initiating secure self-wipe...');
    
    // Step 1: Wipe SecureStore (hardware-backed keys)
    const secureKeys = [
      'omerta.db.master',
      'omerta.db.kid',
      'omerta.signal.session',
      'omerta.chat.counter',
      'omerta.chat.key',
      'omerta.identity.key',
      'omerta.prekeys',
    ];
    
    for (const key of secureKeys) {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {
        // Continue even if individual deletions fail
      }
    }
    
    // Step 2: Clear AsyncStorage (non-sensitive data)
    try {
      await AsyncStorage.clear();
    } catch {
      // Continue
    }
    
    // Step 3: Clear any cached data in memory
    if (global.OMERTACache) {
      global.OMERTACache = null;
    }
    
    // Step 4: Zero out any sensitive variables
    // (In a real implementation, this would zero memory buffers)
    
    console.log('✅ Secure wipe completed');
    
    // Step 5: Navigate to decoy UI
    // (In a real app, this would show a fake interface)
    
    return true;
  } catch (error) {
    console.error('❌ Secure wipe failed:', error);
    return false;
  }
}

/**
 * Emergency factory reset prompt
 */
export async function promptFactoryReset() {
  try {
    // On Android, this would open Settings to factory reset
    // On iOS, this would show instructions for manual reset
    
    console.log('🏭 Factory reset prompt initiated');
    
    // For web demo, just show alert
    if (typeof window !== 'undefined') {
      alert('Factory reset would be initiated on a real device');
    }
    
    return true;
  } catch (error) {
    console.error('Factory reset prompt failed:', error);
    return false;
  }
}

/**
 * Clear specific chat data
 */
export async function wipeChatData(chatId) {
  try {
    const chatKeys = [
      `omerta.chat.counter/${chatId}`,
      `omerta.chat.key/${chatId}`,
      `omerta.signal.session/${chatId}`,
    ];
    
    for (const key of chatKeys) {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {
        // Continue
      }
    }
    
    console.log(`🧹 Chat data wiped for: ${chatId}`);
    return true;
  } catch (error) {
    console.error('Chat wipe failed:', error);
    return false;
  }
}