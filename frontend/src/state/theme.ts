import create from "zustand";
import { accents, dark, AccentKey } from "../theme/colors";

type ThemeState = {
  accentKey: AccentKey;
  setAccent: (k: AccentKey) => void;
  colors: ReturnType<typeof dark>;
};

export const useTheme = create<ThemeState>((set, get) => ({
  accentKey: "green",
  setAccent: (k) => set({ accentKey: k, colors: dark(accents[k]) }),
  colors: dark(accents.green),
}));