import React from "react";
import create from "zustand";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

async function hash(text: string): Promise<string> { 
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text);
}

export type LockState = {
  appLocked: boolean;
  chatsSessionUntil: number; // epoch ms when chats pin session ends
  vaultSessionUntil: number;
  autoLockMs: number; // 30s - 10m
  setAutoLockMs: (ms: number) => void;
  lockApp: () => void;
  unlockAppWithPassphrase: (pass: string) => Promise<boolean>;
  setPassphrase: (pass: string) => Promise<void>;
  verifyChatsPin: (pin: string) => Promise<boolean>;
  verifyVaultPin: (pin: string) => Promise<boolean>;
  setChatsPin: (pin: string) => Promise<void>;
  setVaultPin: (pin: string) => Promise<void>;
  startChatsSession: () => void;
  startVaultSession: () => void;
  isChatsSessionActive: () => boolean;
  isVaultSessionActive: () => boolean;
  isPanicPin: (pin: string) => Promise<boolean>;
  setPanicPin: (pin: string) => Promise<void>;
  secureSelfWipe: () => Promise<void>;
};

const PASS_KEY = "app_passphrase_hash";
const CHATS_PIN = "chats_pin_hash";
const VAULT_PIN = "vault_pin_hash";
const PANIC_PIN = "panic_pin_hash";

export const useSecurity = create<LockState>((set, get) => ({
  appLocked: true,
  chatsSessionUntil: 0,
  vaultSessionUntil: 0,
  autoLockMs: 5 * 60 * 1000,
  setAutoLockMs: (ms) => set({ autoLockMs: Math.max(30_000, Math.min(10 * 60_000, ms)) }),
  lockApp: () => set({ appLocked: true, chatsSessionUntil: 0, vaultSessionUntil: 0 }),
  unlockAppWithPassphrase: async (pass: string) => {
    const stored = await SecureStore.getItemAsync(PASS_KEY);
    if (!stored) return false;
    const passHash = await hash(pass);
    const ok = stored === passHash;
    if (ok) set({ appLocked: false });
    return ok;
  },
  setPassphrase: async (pass: string) => {
    const passHash = await hash(pass);
    await SecureStore.setItemAsync(PASS_KEY, passHash, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  },
  verifyChatsPin: async (pin: string) => {
    const ph = await SecureStore.getItemAsync(CHATS_PIN);
    if (!ph) return false;
    const pinHash = await hash(pin);
    const ok = ph === pinHash;
    if (ok) get().startChatsSession();
    return ok;
  },
  verifyVaultPin: async (pin: string) => {
    const ph = await SecureStore.getItemAsync(VAULT_PIN);
    if (!ph) return false;
    const pinHash = await hash(pin);
    const ok = ph === pinHash;
    if (ok) get().startVaultSession();
    return ok;
  },
  setChatsPin: async (pin: string) => {
    const pinHash = await hash(pin);
    await SecureStore.setItemAsync(CHATS_PIN, pinHash, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  },
  setVaultPin: async (pin: string) => {
    const pinHash = await hash(pin);
    await SecureStore.setItemAsync(VAULT_PIN, pinHash, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  },
  startChatsSession: () => set({ chatsSessionUntil: Date.now() + get().autoLockMs }),
  startVaultSession: () => set({ vaultSessionUntil: Date.now() + get().autoLockMs }),
  isChatsSessionActive: () => Date.now() < get().chatsSessionUntil,
  isVaultSessionActive: () => Date.now() < get().vaultSessionUntil,
  isPanicPin: async (pin: string) => {
    const pp = await SecureStore.getItemAsync(PANIC_PIN);
    return pp ? pp === hash(pin) : false;
  },
  setPanicPin: async (pin: string) => {
    await SecureStore.setItemAsync(PANIC_PIN, hash(pin), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  },
  secureSelfWipe: async () => {
    // Clear secure keys and sessions
    await SecureStore.deleteItemAsync(PASS_KEY);
    await SecureStore.deleteItemAsync(CHATS_PIN);
    await SecureStore.deleteItemAsync(VAULT_PIN);
    await SecureStore.deleteItemAsync(PANIC_PIN);
    set({ appLocked: true, chatsSessionUntil: 0, vaultSessionUntil: 0 });
  },
}));