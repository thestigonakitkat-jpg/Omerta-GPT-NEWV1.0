import { getRandomBytesAsync } from "expo-crypto";
import { AES_GCM, PBKDF2_HMAC_SHA256 } from "asmcrypto.js";
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

export function pbkdf2Sha256(passwordUtf8: string, salt: Uint8Array, iterations: number, dkLen: number = 32): Uint8Array {
  const pwd = new TextEncoder().encode(passwordUtf8);
  return PBKDF2_HMAC_SHA256.bytes(pwd, salt, iterations, dkLen);
}

export async function encryptBackupBlob(jsonPayload: any, passphrase: string, pin: string) {
  const salt = await randomBytes(16);
  const nonce = await randomBytes(12);
  // Combine passphrase + ':' + pin for key derivation
  const key = pbkdf2Sha256(`${passphrase}:${pin}`, salt, 250_000, 32);
  // Random padding inside the plaintext to avoid size fingerprinting
  const padding = await randomBytes(32 + Math.floor(Math.random() * 64));
  const pt = new TextEncoder().encode(JSON.stringify({ v: 1, payload: jsonPayload, pad: fromByteArray(padding) }));
  const ct = AES_GCM.encrypt(pt, key, nonce);
  return {
    saltHex: Array.from(salt).map(b => b.toString(16).padStart(2, "0")).join(""),
    nonceB64: fromByteArray(nonce),
    ctB64: fromByteArray(ct),
  };
}

export function decryptBackupBlob(blob: { saltHex: string; nonceB64: string; ctB64: string }, passphrase: string, pin: string) {
  const salt = new Uint8Array(blob.saltHex.match(/.{1,2}/g)!.map((h) => parseInt(h, 16)));
  const nonce = toByteArray(blob.nonceB64);
  const key = pbkdf2Sha256(`${passphrase}:${pin}`, salt, 250_000, 32);
  const pt = AES_GCM.decrypt(toByteArray(blob.ctB64), key, nonce);
  const obj = JSON.parse(new TextDecoder().decode(pt));
  return obj.payload;
}