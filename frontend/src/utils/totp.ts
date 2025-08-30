import * as SecureStore from "expo-secure-store";
import { hmac } from "@noble/hashes/hmac";
import { sha1 } from "@noble/hashes/sha1";
import { getRandomBytesAsync } from "expo-crypto";

const SECRET_KEY = "totp_secret_v1";

function toHex(u8: Uint8Array): string {
  return Array.from(u8).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

export async function getOrCreateTotpSecret(): Promise<Uint8Array> {
  const ex = await SecureStore.getItemAsync(SECRET_KEY);
  if (ex) return fromHex(ex);
  const rand = new Uint8Array(await getRandomBytesAsync(20)); // 160-bit secret
  await SecureStore.setItemAsync(SECRET_KEY, toHex(rand), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  return rand;
}

function intToBytes(num: number) {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  const high = Math.floor(num / 0x100000000);
  const low = num & 0xffffffff;
  view.setUint32(0, high);
  view.setUint32(4, low);
  return new Uint8Array(buf);
}

export async function generateTotpCode(timeStep: number = 30, digits: number = 6): Promise<string> {
  const secret = await getOrCreateTotpSecret();
  const now = Math.floor(Date.now() / 1000);
  const counter = Math.floor(now / timeStep);
  const msg = intToBytes(counter);
  const mac = hmac(sha1, secret, msg);
  const offset = mac[mac.length - 1] & 0xf;
  const bin = ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  const otp = (bin % 10 ** digits).toString().padStart(digits, "0");
  return otp;
}

export async function verifyTotpCode(code: string, window: number = 1, timeStep: number = 30, digits: number = 6): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  for (let w = -window; w <= window; w++) {
    const t = now + w * timeStep;
    const counter = Math.floor(t / timeStep);
    const msg = intToBytes(counter);
    const secret = await getOrCreateTotpSecret();
    const mac = hmac(sha1, secret, msg);
    const offset = mac[mac.length - 1] & 0xf;
    const bin = ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
    const otp = (bin % 10 ** digits).toString().padStart(digits, "0");
    if (otp === code) return true;
  }
  return false;
}