import create from "zustand";
import { randomBytes } from "../utils/crypto";

export type ChatKeyInfo = {
  keyB64: string; // base64 of 32-byte key
  counter: number;
  lastRekey: number; // epoch ms
  msgsSinceRekey: number;
};

type ChatKeysState = {
  map: Record<string, ChatKeyInfo>; // oid -> info
  ensureKey: (oid: string) => Promise<ChatKeyInfo>;
  forceRekey: (oid: string) => Promise<ChatKeyInfo>;
  bumpCounter: (oid: string) => void;
  shouldAutoRekey: (oid: string) => boolean;
};

function toB64(u8: Uint8Array) { return Buffer.from(u8).toString("base64"); }

export const useChatKeys = create<ChatKeysState>((set, get) => ({
  map: {},
  ensureKey: async (oid) => {
    const ex = get().map[oid];
    if (ex) return ex;
    const key = toB64(await randomBytes(32));
    const info: ChatKeyInfo = { keyB64: key, counter: 0, lastRekey: Date.now(), msgsSinceRekey: 0 };
    set((s) => ({ map: { ...s.map, [oid]: info } }));
    return info;
  },
  forceRekey: async (oid) => {
    const key = toB64(await randomBytes(32));
    const info: ChatKeyInfo = { keyB64: key, counter: 0, lastRekey: Date.now(), msgsSinceRekey: 0 };
    set((s) => ({ map: { ...s.map, [oid]: info } }));
    return info;
  },
  bumpCounter: (oid) => {
    const m = get().map[oid];
    if (!m) return;
    const next = { ...m, counter: m.counter + 1, msgsSinceRekey: m.msgsSinceRekey + 1 };
    set((s) => ({ map: { ...s.map, [oid]: next } }));
  },
  shouldAutoRekey: (oid) => {
    const m = get().map[oid];
    if (!m) return false;
    const ageDays = (Date.now() - m.lastRekey) / (1000*60*60*24);
    return m.msgsSinceRekey >= 100 || ageDays >= 7;
  },
}));