import create from "zustand";
import * as SecureStore from "expo-secure-store";

const KEY = "verified_oids_v1";

async function loadMap(): Promise<Record<string, boolean>> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch { return {}; }
}
async function saveMap(map: Record<string, boolean>) {
  try { await SecureStore.setItemAsync(KEY, JSON.stringify(map), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }); } catch {}
}

type ContactsState = {
  verified: Record<string, boolean>;
  init: () => Promise<void>;
  markVerified: (oid: string) => void;
  isVerified: (oid?: string | string[]) => boolean;
};

export const useContacts = create<ContactsState>((set, get) => ({
  verified: {},
  init: async () => {
    const m = await loadMap();
    set({ verified: m });
  },
  markVerified: (oid: string) => {
    const id = oid;
    const next = { ...get().verified, [id]: true };
    set({ verified: next });
    saveMap(next);
  },
  isVerified: (oid?: string | string[]) => {
    if (!oid) return false;
    const id = Array.isArray(oid) ? oid[0] : oid;
    return Boolean(get().verified[id]);
  },
}));