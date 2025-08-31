import create from "zustand";
import { accents, dark, AccentKey } from "../theme/colors";
import { Appearance } from "react-native";

type Mode = "dark" | "light" | "system";

type ThemeState = {
  mode: Mode;
  accentKey: AccentKey;
  setAccent: (k: AccentKey) => void;
  setMode: (m: Mode) => void;
  colors: ReturnType<typeof dark>;
};

function computeColors(mode: Mode, accentKey: AccentKey) {
  const accent = accents[accentKey];
  if (mode === "system") {
    const sys = Appearance.getColorScheme();
    return dark(accent); // default to dark if unknown; we'll extend to light later
  }
  // For now, dark theme palette; light palette to be added later
  return dark(accent);
}

export const useTheme = create<ThemeState>((set, get) => ({
  mode: "dark",
  accentKey: "green",
  setAccent: (k) => set({ accentKey: k, colors: computeColors(get().mode, k) }),
  setMode: (m) => set({ mode: m, colors: computeColors(m, get().accentKey) }),
  colors: computeColors("dark", "green"),
}));