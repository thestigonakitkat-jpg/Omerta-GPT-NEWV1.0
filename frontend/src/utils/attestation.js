// Device Attestation Utilities
import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get platform-specific attestation token
 * Currently returns dev token in development, throws in production
 */
async function getPlatformToken(nonceB64: string): Promise<string> {
  if (__DEV__) {
    return `dev.${nonceB64}`;
  }
  
  // In production, this would integrate with:
  // - Android: Play Integrity API
  // - iOS: DeviceCheck/AppAttest
  throw new Error('Platform attestation not implemented - requires native bridge');
}

/**
 * Perform device attestation with backend
 */
export async function performAttestation(): Promise<{ ok: boolean }> {
  try {
    const nonce = uuidv4();
    const token = await getPlatformToken(btoa(nonce));
    
    const response = await fetch('/api/attest/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ 
        nonce, 
        token, 
        os: Platform.OS 
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Attestation failed: ${response.status}`);
    }
    
    const result = await response.json();
    if (!result?.ok) {
      throw new Error('Attestation rejected by server');
    }
    
    console.log('✅ Device attestation successful');
    return { ok: true };
  } catch (error: any) {
    console.error('❌ Device attestation failed:', error.message);
    throw error;
  }
}