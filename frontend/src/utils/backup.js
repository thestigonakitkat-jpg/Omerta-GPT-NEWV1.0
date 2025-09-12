// Encrypted Backup System using Argon2id
import { sha256 } from '@noble/hashes/sha256';

// Simplified Argon2id implementation (for demo)
async function simpleArgon2id(password, salt, options = {}) {
  const { t = 3, m = 65536, p = 1, dkLen = 32 } = options;
  
  // Simple implementation using multiple SHA-256 rounds
  let key = new TextEncoder().encode(password);
  const saltBytes = typeof salt === 'string' ? new TextEncoder().encode(salt) : salt;
  
  for (let i = 0; i < t; i++) {
    const combined = new Uint8Array(key.length + saltBytes.length);
    combined.set(key);
    combined.set(saltBytes, key.length);
    key = new Uint8Array(await crypto.subtle.digest('SHA-256', combined));
  }
  
  return key.slice(0, dkLen);
}

// Simple AES-GCM placeholder
async function aesGcmEncrypt(key, iv, data) {
  const keyBytes = new Uint8Array(key);
  const result = new Uint8Array(data.length);
  
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] ^ keyBytes[i % keyBytes.length];
  }
  
  return {
    ct: result,
    tag: keyBytes.slice(0, 16)
  };
}

async function aesGcmDecrypt(key, iv, ct, tag) {
  const keyBytes = new Uint8Array(key);
  const result = new Uint8Array(ct.length);
  
  for (let i = 0; i < ct.length; i++) {
    result[i] = ct[i] ^ keyBytes[i % keyBytes.length];
  }
  
  return result;
}

export async function exportBackup(passphrase, data) {
  try {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await simpleArgon2id(passphrase, salt, { t: 3, m: 1 << 15, p: 1, dkLen: 32 });
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const { ct, tag } = await aesGcmEncrypt(key, iv, data);
    const blob = new Uint8Array([...salt, ...iv, ...ct, ...tag]);
    
    // In a real app, this would use expo-file-system
    const b64 = btoa(String.fromCharCode(...blob));
    
    // For demo, return the base64 string
    return {
      data: b64,
      filename: `omerta_backup_${Date.now()}.bak`
    };
  } catch (error) {
    console.error('Backup export failed:', error);
    throw error;
  }
}

export async function importBackup(passphrase, b64Data) {
  try {
    const blob = Uint8Array.from(atob(b64Data), c => c.charCodeAt(0));
    
    const salt = blob.slice(0, 16);
    const iv = blob.slice(16, 28);
    const ct = blob.slice(28, -16);
    const tag = blob.slice(-16);
    
    const key = await simpleArgon2id(passphrase, salt, { t: 3, m: 1 << 15, p: 1, dkLen: 32 });
    
    return await aesGcmDecrypt(key, iv, ct, tag);
  } catch (error) {
    console.error('Backup import failed:', error);
    throw error;
  }
}