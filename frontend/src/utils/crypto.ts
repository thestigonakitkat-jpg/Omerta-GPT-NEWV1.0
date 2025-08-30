import { getRandomBytesAsync } from "expo-crypto";
import { AES_GCM } from "asmcrypto.js";
import { fromByteArray, toByteArray } from "base64-js";

export async function randomBytes(len: number): Promise<Uint8Array> {
  const b = await getRandomBytesAsync(len);
  return Uint8Array.from(b);
}

export async function aesGcmEncrypt(plaintextUtf8: string): Promise<{ key: Uint8Array; nonce: Uint8Array; ciphertextB64: string }>{
  const key = await randomBytes(32); // 256-bit
  const nonce = await randomBytes(12); // 96-bit
  const pt = new TextEncoder().encode(plaintextUtf8);
  const ct = AES_GCM.encrypt(pt, key, nonce);
  const b64 = fromByteArray(ct);
  return { key, nonce, ciphertextB64: b64 };
}

export function aesGcmDecrypt(ciphertextB64: string, key: Uint8Array, nonce: Uint8Array): string {
  const ct = toByteArray(ciphertextB64);
  const pt = AES_GCM.decrypt(ct, key, nonce);
  return new TextDecoder().decode(pt);
}