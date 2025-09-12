// Hardware-Backed Keystore Utilities
import * as SecureStore from 'expo-secure-store';

const DBK = 'omerta.db.master';
const KVER = 'omerta.db.kid';
const CURV = 'v2';

// Helper functions
function base64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Get or create hardware-backed database key with rotation support
 */
export async function getOrCreateDbKey(): Promise<Uint8Array> {
  try {
    const ver = await SecureStore.getItemAsync(KVER);
    if (ver === CURV) {
      const k = await SecureStore.getItemAsync(DBK);
      if (k) {
        return base64ToBytes(k);
      }
    }
    
    // Generate new v2 key
    const raw = crypto.getRandomValues(new Uint8Array(32));
    await SecureStore.setItemAsync(DBK, bytesToBase64(raw));
    await SecureStore.setItemAsync(KVER, CURV);
    
    // Clean up legacy keys (best effort)
    try {
      await SecureStore.deleteItemAsync('omerta.db.master.v1');
    } catch {
      // Ignore cleanup errors
    }
    
    console.log('🔑 Generated new hardware-backed key v2');
    return raw;
  } catch (error) {
    console.error('Failed to get/create DB key:', error);
    throw error;
  }
}

/**
 * Rotate database key to new version
 */
export async function rotateDbKey(): Promise<Uint8Array> {
  try {
    // Generate new key
    const raw = crypto.getRandomValues(new Uint8Array(32));
    await SecureStore.setItemAsync(DBK, bytesToBase64(raw));
    await SecureStore.setItemAsync(KVER, CURV);
    
    console.log('🔄 Database key rotated');
    return raw;
  } catch (error) {
    console.error('Failed to rotate DB key:', error);
    throw error;
  }
}

/**
 * Wipe all stored keys (for secure cleanup)
 */
export async function wipeAllKeys(): Promise<void> {
  try {
    const keys = [DBK, KVER, 'omerta.db.master.v1'];
    
    await Promise.all(keys.map(async (key) => {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {
        // Ignore individual deletion errors
      }
    }));
    
    console.log('🧹 All keys wiped');
  } catch (error) {
    console.error('Failed to wipe keys:', error);
    throw error;
  }
}