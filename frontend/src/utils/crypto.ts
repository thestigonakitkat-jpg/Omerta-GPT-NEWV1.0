// OMERTA Cryptographic Utilities - Signal Protocol Integration
import 'react-native-get-random-values';
import { randomBytes } from 'crypto';
import * as SecureStore from 'expo-secure-store';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { v4 as uuidv4 } from 'uuid';

const KEY_NS = 'omerta.chat.key/';
const CTR_NS = 'omerta.chat.counter/';
const SESS_NS = 'omerta.signal.session/';

// Utility functions
export function base64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

export function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

export function concat(...bufs: ArrayBuffer[]): ArrayBuffer {
  const total = bufs.reduce((n, b) => n + b.byteLength, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const b of bufs) {
    out.set(new Uint8Array(b), off);
    off += b.byteLength;
  }
  return out.buffer;
}

// AES-GCM Encryption
export async function aesGcmEncrypt(key: Uint8Array, plaintext: Uint8Array): Promise<{ct: Uint8Array, iv: Uint8Array, tag: Uint8Array}> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cryptoKey = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt']);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, plaintext);
  
  const fullCiphertext = new Uint8Array(encrypted);
  const ct = fullCiphertext.slice(0, -16);
  const tag = fullCiphertext.slice(-16);
  
  return { ct, iv, tag };
}

export async function aesGcmDecrypt(key: Uint8Array, iv: Uint8Array, ct: Uint8Array, tag: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['decrypt']);
  const ciphertext = new Uint8Array(ct.length + tag.length);
  ciphertext.set(ct);
  ciphertext.set(tag, ct.length);
  
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ciphertext);
  return new Uint8Array(decrypted);
}

// Counter management
export async function getCounter(chatId: string): Promise<number> {
  try {
    const s = await SecureStore.getItemAsync(CTR_NS + chatId);
    return s ? Number(s) : 0;
  } catch {
    return 0;
  }
}

export async function bumpCounter(chatId: string): Promise<number> {
  try {
    const n = (await getCounter(chatId)) + 1;
    await SecureStore.setItemAsync(CTR_NS + chatId, String(n));
    return n;
  } catch {
    return 1;
  }
}

export async function setCtr(chatId: string, n: number): Promise<void> {
  try {
    await SecureStore.setItemAsync(CTR_NS + chatId, String(n));
  } catch {
    // Silent fail for compatibility
  }
}

// Session management
export async function ensureSession(chatId: string, peerOid: string): Promise<void> {
  // Placeholder for Signal Protocol integration
  const sessionKey = SESS_NS + chatId;
  try {
    const existing = await SecureStore.getItemAsync(sessionKey);
    if (existing) return;
    
    // For now, create a simple session marker
    await SecureStore.setItemAsync(sessionKey, JSON.stringify({
      chatId,
      peerOid,
      created: Date.now()
    }));
  } catch {
    // Silent fail for compatibility
  }
}

// Message encryption/decryption placeholders
export async function encrypt(peerOid: string, plaintext: Uint8Array, aad?: Uint8Array): Promise<Uint8Array> {
  // Placeholder: Generate simple encrypted envelope
  const key = crypto.getRandomValues(new Uint8Array(32));
  const { ct, iv, tag } = await aesGcmEncrypt(key, plaintext);
  
  // Simple envelope format
  const envelope = {
    v: 1,
    peerOid,
    ct: bytesToBase64(ct),
    iv: bytesToBase64(iv),
    tag: bytesToBase64(tag),
    aad: aad ? bytesToBase64(aad) : undefined
  };
  
  return new TextEncoder().encode(JSON.stringify(envelope));
}

export async function decrypt(peerOid: string, body: Uint8Array, aad?: Uint8Array): Promise<Uint8Array> {
  try {
    const envelope = JSON.parse(new TextDecoder().decode(body));
    
    if (envelope.v !== 1 || envelope.peerOid !== peerOid) {
      throw new Error('Invalid envelope');
    }
    
    // For now, this is a placeholder - would need the actual key
    // In real implementation, this would use Signal Protocol session
    throw new Error('Decryption requires Signal Protocol session');
  } catch {
    throw new Error('Decryption failed');
  }
}

// Send message function
export async function sendMsg(chatId: string, peerOid: string, bytes: Uint8Array): Promise<void> {
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
    
    // Send via API
    const response = await fetch('/api/envelopes/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(env)
    });
    
    if (!response.ok) {
      throw new Error('Send failed');
    }
  } catch (error) {
    console.error('sendMsg failed:', error);
    throw error;
  }
}

// Rekey functions
export async function forceRekey(chatId: string, peerOid: string): Promise<void> {
  try {
    // Delete existing session
    await SecureStore.deleteItemAsync(SESS_NS + chatId);
    
    // Reset counter
    await setCtr(chatId, 0);
    
    // Re-establish session
    await ensureSession(chatId, peerOid);
    
    // Send rekey envelope
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
  } catch (error) {
    console.error('forceRekey failed:', error);
    throw error;
  }
}

// Clear chat state
export async function clearChatState(chatId: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CTR_NS + chatId);
    await SecureStore.deleteItemAsync(SESS_NS + chatId);
    await SecureStore.deleteItemAsync(KEY_NS + chatId);
  } catch {
    // Silent fail for compatibility
  }
}

// Wipe key for chat
export function wipeKeyForChat(chatId: string): Promise<void> {
  return clearChatState(chatId);
}