import create from "zustand";

export type VaultItemType = "image" | "text" | "document" | "doc" | "photo" | "note";
export type VaultFolder = "images" | "text" | "documents";

export interface VaultItem {
  id: string;
  kind: VaultItemType;
  folder: VaultFolder;
  title: string;
  filename?: string;
  dataB64?: string;
  encryptedData?: string;
  key?: Uint8Array;
  nonce?: Uint8Array;
  thumbnail?: string;
  size?: number;
  fakeTimestamp?: number;
  created: number;
}

type VaultState = {
  items: VaultItem[];
  setItems: (items: VaultItem[]) => void;
  addItem: (item: VaultItem) => void;
  removeItem: (id: string) => void;
  getItemsByFolder: (folder: VaultFolder) => VaultItem[];
  clear: () => void;
};

// Helper function to determine folder from item type
export function getVaultFolder(kind: VaultItemType): VaultFolder {
  switch (kind) {
    case "image":
    case "photo":
      return "images";
    case "text":
    case "note":
      return "text";
    case "document":
    case "doc":
      return "documents";
    default:
      return "documents";
  }
}

export const useVault = create<VaultState>((set, get) => ({
  items: [],
  setItems: (items) => set({ items }),
  addItem: (item) => {
    // Ensure the item has the correct folder
    const itemWithFolder = {
      ...item,
      folder: getVaultFolder(item.kind),
    };
    set((state) => ({ items: [itemWithFolder, ...state.items] }));
  },
  removeItem: (id) => set((state) => ({ items: state.items.filter(item => item.id !== id) })),
  getItemsByFolder: (folder) => {
    const state = get();
    return state.items.filter(item => item.folder === folder);
  },
  clear: () => set({ items: [] }),
}));