import create from "zustand";

type ContactsState = {
  verified: Record<string, boolean>;
  markVerified: (oid: string) => void;
  isVerified: (oid?: string | string[]) => boolean;
};

export const useContacts = create<ContactsState>((set, get) => ({
  verified: {},
  markVerified: (oid: string) => set((s) => ({ verified: { ...s.verified, [oid]: true } })),
  isVerified: (oid?: string | string[]) => {
    if (!oid) return false;
    const id = Array.isArray(oid) ? oid[0] : oid;
    return Boolean(get().verified[id]);
  },
}));