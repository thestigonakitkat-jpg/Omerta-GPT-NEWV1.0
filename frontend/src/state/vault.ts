import create from "zustand";

export type VaultItem = { id: string; kind: "doc"|"photo"|"note"; title: string; dataB64?: string; created: number };

type VaultState = {
  items: VaultItem[];
  setItems: (items: VaultItem[]) => void;
  addItem: (it: VaultItem) => void;
  clear: () => void;
};

export const useVault = create<VaultState>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
  addItem: (it) => set((s) => ({ items: [it, ...s.items] })),
  clear: () => set({ items: [] }),
}));