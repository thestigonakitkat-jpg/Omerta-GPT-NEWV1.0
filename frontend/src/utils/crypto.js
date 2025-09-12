// OMERTA Cryptographic Utilities - Simplified Version
import 'react-native-get-random-values';
import * as SecureStore from 'expo-secure-store';
import { sha256 } from '@noble/hashes/sha256';
import { v4 as uuidv4 } from 'uuid';

const KEY_NS = 'omerta.chat.key/';
const CTR_NS = 'omerta.chat.counter/';
const SESS_NS = 'omerta.signal.session/';

// Utility functions
export function base64ToBytes(b64) {
  try {
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  } catch {
    return new Uint8Array(0);
  }
}

export function bytesToBase64(bytes) {
  try {
    return btoa(String.fromCharCode(...bytes));
  } catch {
    return '';
  }
}

// Simple XOR encryption (placeholder for real crypto)
function simpleEncrypt(data, key) {
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] ^ key[i % key.length];
  }
  return result;
}

// Counter management
export async function getCounter(chatId) {
  try {
    const s = await SecureStore.getItemAsync(CTR_NS + chatId);
    return s ? Number(s) : 0;
  } catch {
    return 0;
  }
}

export async function bumpCounter(chatId) {
  try {
    const n = (await getCounter(chatId)) + 1;
    await SecureStore.setItemAsync(CTR_NS + chatId, String(n));
    return n;
  } catch {
    return 1;
  }
}

export async function setCtr(chatId, n) {
  try {
    await SecureStore.setItemAsync(CTR_NS + chatId, String(n));
  } catch {
    console.warn('Failed to set counter for chat:', chatId);
  }
}

// Session management (simplified)
export async function ensureSession(chatId, peerOid) {
  const sessionKey = SESS_NS + chatId;
  try {
    const existing = await SecureStore.getItemAsync(sessionKey);
    if (existing) return;
    
    await SecureStore.setItemAsync(sessionKey, JSON.stringify({
      chatId,
      peerOid,
      created: Date.now()
    }));
  } catch {
    console.warn('Failed to ensure session for chat:', chatId);
  }
}

// Simple message encryption (placeholder)
export async function encrypt(peerOid, plaintext, aad) {
  try {
    // Generate a simple key from peer OID
    const keyData = new TextEncoder().encode(peerOid + 'secret');
    const hash = sha256(keyData);
    const key = hash.slice(0, 32);
    
    const encrypted = simpleEncrypt(plaintext, key);
    
    const envelope = {
      v: 1,
      peerOid,
      data: bytesToBase64(encrypted),
      aad: aad ? bytesToBase64(aad) : undefined
    };
    
    return new TextEncoder().encode(JSON.stringify(envelope));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw error;
  }
}

export async function decrypt(peerOid, body, aad) {
  try {
    const envelope = JSON.parse(new TextDecoder().decode(body));
    
    if (envelope.v !== 1 || envelope.peerOid !== peerOid) {
      throw new Error('Invalid envelope');
    }
    
    // Generate the same key
    const keyData = new TextEncoder().encode(peerOid + 'secret');
    const hash = sha256(keyData);
    const key = hash.slice(0, 32);
    
    const encryptedData = base64ToBytes(envelope.data);
    const decrypted = simpleEncrypt(encryptedData, key);
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw error;
  }
}

// Send message function
export async function sendMsg(chatId, peerOid, bytes) {
  try {
    await ensureSession(chatId, peerOid);
    const ctr = await bumpCounter(chatId);
    const aad = new TextEncoder().encode(`${chatId}|${peerOid}|${ctr}`);
    const body = await encrypt(peerOid, bytes, aad);
    
    const env = {
      v: 1,
      t: 'msg',
      chatId,
      msgId: uuidv4(),
      ctr,
      aad: bytesToBase64(aad),
      ts: Date.now(),
      body: Array.from(body)
    };
    
    const response = await fetch('/api/envelopes/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(env)
    });
    
    if (!response.ok) {
      throw new Error('Send failed');
    }
    
    console.log('Message sent successfully');
  } catch (error) {
    console.error('sendMsg failed:', error);
    throw error;
  }
}

// Rekey functions
export async function forceRekey(chatId, peerOid) {
  try {
    await SecureStore.deleteItemAsync(SESS_NS + chatId);
    await setCtr(chatId, 0);
    await ensureSession(chatId, peerOid);
    
    const env = {
      v: 1,
      t: 'rekey',
      chatId,
      msgId: uuidv4(),
      ts: Date.now()
    };
    
    const response = await fetch('/api/envelopes/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(env)
    });
    
    if (!response.ok) {
      throw new Error('Rekey failed');
    }
    
    console.log('Rekey completed successfully');
  } catch (error) {
    console.error('forceRekey failed:', error);
    throw error;
  }
}

// Clear chat state
export async function clearChatState(chatId) {
  try {
    await SecureStore.deleteItemAsync(CTR_NS + chatId);
    await SecureStore.deleteItemAsync(SESS_NS + chatId);
    await SecureStore.deleteItemAsync(KEY_NS + chatId);
  } catch {
    console.warn('Failed to clear chat state for:', chatId);
  }
}

export function wipeKeyForChat(chatId) {
  return clearChatState(chatId);
}