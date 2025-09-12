// API Utilities for OMERTA

/**
 * Send envelope with security headers
 */
export async function sendEnvelope(toOid, blob) {
  try {
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const nonceB64 = btoa(String.fromCharCode(...nonce));
    
    const response = await fetch('/api/envelopes/send', {
      method: 'POST',
      headers: {
        'x-omerta-ss': '1',
        'x-omerta-to': toOid,
        'x-ss-nonce': nonceB64,
        'content-type': 'application/octet-stream',
      },
      body: blob,
      keepalive: true,
    });
    
    if (!response.ok) {
      throw new Error(`Send failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('sendEnvelope failed:', error);
    throw error;
  }
}

/**
 * Generic API call with error handling
 */
export async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`/api${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API call to ${endpoint} failed:`, error);
    throw error;
  }
}