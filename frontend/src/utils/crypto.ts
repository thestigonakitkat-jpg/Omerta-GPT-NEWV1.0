import { getRandomBytesAsync } from "expo-crypto";
import { AES_GCM, PBKDF2_HMAC_SHA256 } from "asmcrypto.js";
import { fromByteArray, toByteArray } from "base64-js";
import { Platform } from "react-native";

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

// Try Argon2id via dynamic import (wasm). Fallback to PBKDF2 on environments where wasm is restricted.
export async function deriveKeyArgon2id(passphrase: string, pin: string, salt: Uint8Array): Promise<Uint8Array> {
  try {
    // Lazy import to keep bundle light; argon2-browser provides wasm runtime in browsers. On RN, WASM support varies.
    const argon2: any = await import("argon2-browser");
    const memKB = Platform.OS === 'web' ? 64 * 1024 : 256 * 1024; // 64MB web, 256MB native target
    const res = await argon2.hash({
      pass: `${passphrase}:${pin}`,
      salt,
      type: argon2.ArgonType.Argon2id,
      time: 3,
      mem: memKB,
      hashLen: 32,
      parallelism: 4,
      raw: true,
    });
    return new Uint8Array(res.hash);
  } catch (e) {
    // Fallback to PBKDF2 strong iteration count
    return pbkdf2Sha256(`${passphrase}:${pin}`, salt, 250_000, 32);
  }
}

export async function encryptBackupBlob(jsonPayload: any, passphrase: string, pin: string) {
  const salt = await randomBytes(16);
  const nonce = await randomBytes(12);
  const key = await deriveKeyArgon2id(passphrase, pin, salt);
  const padding = await randomBytes(32 + Math.floor(Math.random() * 64));
  const pt = new TextEncoder().encode(JSON.stringify({ v: 2, payload: jsonPayload, pad: fromByteArray(padding) }));
  const ct = AES_GCM.encrypt(pt, key, nonce);
  return {
    saltHex: Array.from(salt).map(b => b.toString(16).padStart(2, "0")).join(""),
    nonceB64: fromByteArray(nonce),
    ctB64: fromByteArray(ct),
    kdf: "argon2id",
  };
}

export async function decryptBackupBlob(blob: { saltHex: string; nonceB64: string; ctB64: string; kdf?: string }, passphrase: string, pin: string) {
  const salt = new Uint8Array(blob.saltHex.match(/.{1,2}/g)!.map((h) => parseInt(h, 16)));
  const nonce = toByteArray(blob.nonceB64);
  const key = await deriveKeyArgon2id(passphrase, pin, salt);
  const pt = AES_GCM.decrypt(toByteArray(blob.ctB64), key, nonce);
  const obj = JSON.parse(new TextDecoder().decode(pt));
  return obj.payload;
}