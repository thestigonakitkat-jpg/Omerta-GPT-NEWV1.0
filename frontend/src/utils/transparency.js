// Transparency Log Verification
import nacl from 'tweetnacl';

// Organization public key for STH verification (replace with real key)
const ORG_STH_PUB_HEX = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

function hexToBytes(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g);
  if (!matches) throw new Error('Invalid hex string');
  return new Uint8Array(matches.map(byte => parseInt(byte, 16)));
}

export interface STH {
  treeSize: number;
  rootHashHex: string;
  ts: number;
}

export interface Proof {
  leafHashHex: string;
  audit: string[];
}

/**
 * Verify Merkle inclusion proof
 */
export async function verifyProof(sth: STH, proof: Proof): Promise<boolean> {
  try {
    let node = hexToBytes(proof.leafHashHex);
    
    for (const sib of proof.audit) {
      const sibBytes = hexToBytes(sib);
      
      // Lexicographic order concatenation
      const a = Buffer.compare(Buffer.from(node), Buffer.from(sibBytes)) <= 0 
        ? Buffer.concat([node, sibBytes]) 
        : Buffer.concat([sibBytes, node]);
      
      const hash = await crypto.subtle.digest('SHA-256', a);
      node = new Uint8Array(hash);
    }
    
    const rootHash = Buffer.from(node).toString('hex').toLowerCase();
    return rootHash === sth.rootHashHex.toLowerCase();
  } catch (error) {
    console.error('Proof verification failed:', error);
    return false;
  }
}

/**
 * Verify signed tree head (STH)
 */
export async function verifySignedSTH(sth: STH, signatureHex: string): Promise<boolean> {
  try {
    const message = new TextEncoder().encode(`${sth.treeSize}|${sth.rootHashHex}|${sth.ts}`);
    const signature = hexToBytes(signatureHex);
    const publicKey = hexToBytes(ORG_STH_PUB_HEX);
    
    return nacl.sign.detached.verify(message, signature, publicKey);
  } catch (error) {
    console.error('STH verification failed:', error);
    return false;
  }
}

/**
 * Fetch and verify transparency log data
 */
export async function verifyTransparencyLog(): Promise<boolean> {
  try {
    const response = await fetch('/api/sth');
    if (!response.ok) {
      throw new Error(`STH fetch failed: ${response.status}`);
    }
    
    const { sth, sig } = await response.json();
    
    if (!sth || !sig) {
      throw new Error('Invalid STH response format');
    }
    
    const isValid = await verifySignedSTH(sth, sig);
    
    if (isValid) {
      console.log('✅ Transparency log verification successful');
    } else {
      console.error('❌ Transparency log verification failed');
    }
    
    return isValid;
  } catch (error: any) {
    console.error('Transparency log verification error:', error.message);
    return false;
  }
}