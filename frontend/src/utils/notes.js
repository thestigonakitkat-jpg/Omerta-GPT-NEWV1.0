// Cryptgeon-style One-Time Notes
import { sha256 } from '@noble/hashes/sha256';

// Simple AES-GCM implementation placeholder
async function aesGcmEncrypt(key, iv, plaintext) {
  // In a full implementation, this would use proper AES-GCM
  // For now, using simple XOR with key stretching
  const stretchedKey = await crypto.subtle.digest('SHA-256', key);
  const keyBytes = new Uint8Array(stretchedKey);
  const result = new Uint8Array(plaintext.length);
  
  for (let i = 0; i < plaintext.length; i++) {
    result[i] = plaintext[i] ^ keyBytes[i % keyBytes.length];
  }
  
  return {
    ct: result,
    tag: keyBytes.slice(0, 16) // Mock tag
  };
}

async function aesGcmDecrypt(key, iv, ct, tag) {
  // Reverse of encrypt operation
  const stretchedKey = await crypto.subtle.digest('SHA-256', key);
  const keyBytes = new Uint8Array(stretchedKey);
  const result = new Uint8Array(ct.length);
  
  for (let i = 0; i < ct.length; i++) {
    result[i] = ct[i] ^ keyBytes[i % keyBytes.length];
  }
  
  return result;
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  const result = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    result[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return result;
}

export async function createNote(payloadBytes, { ttl = 604800, totpSecret } = {}) {
  try {
    const key = crypto.getRandomValues(new Uint8Array(32));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const { ct, tag } = await aesGcmEncrypt(key, iv, payloadBytes);
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 24);
    
    const blob = new Uint8Array([...iv, ...ct, ...tag]);
    
    const response = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ 
        id, 
        blob: bytesToHex(blob), 
        ttl, 
        totp: Boolean(totpSecret) 
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to create note');
    }
    
    const frag = btoa(String.fromCharCode(...key)) + (totpSecret ? ('.' + btoa(totpSecret)) : '');
    const baseUrl = window.location?.origin || 'http://localhost:3000';
    
    return `${baseUrl}/note/${id}#${frag}`;
  } catch (error) {
    console.error('Failed to create note:', error);
    throw error;
  }
}

export async function openNote(url, code) {
  try {
    const parts = url.split('/note/')[1];
    if (!parts) throw new Error('Invalid note URL');
    
    const [id, frag] = parts.split('#');
    if (!frag) throw new Error('Missing key fragment');
    
    const [keyB64, secretB64] = frag.split('.');
    const key = Uint8Array.from(atob(keyB64), c => c.charCodeAt(0));
    
    if (secretB64 && !code) {
      throw new Error('2FA code required');
    }
    
    const response = await fetch(`/api/notes/${id}`);
    if (!response.ok) {
      throw new Error('Note not found or expired');
    }
    
    const { blob } = await response.json();
    const data = hexToBytes(blob);
    
    const iv = data.slice(0, 12);
    const ct = data.slice(12, -16);
    const tag = data.slice(-16);
    
    return await aesGcmDecrypt(key, iv, ct, tag);
  } catch (error) {
    console.error('Failed to open note:', error);
    throw error;
  }
}