import create from "zustand";
import { accents, dark, light, AccentKey } from "../theme/colors";
import { Appearance } from "react-native";

type Mode = "dark" | "light" | "system";

type ThemeState = {
  mode: Mode;
  accentKey: AccentKey;
  setAccent: (k: AccentKey) => void;
  setMode: (m: Mode) => void;
  colors: ReturnType<typeof dark> | ReturnType<typeof light>;
};

function computeColors(mode: Mode, accentKey: AccentKey) {
  const accent = accents[accentKey];
  if (mode === "system") {
    const sys = Appearance.getColorScheme();
    return sys === "light" ? light(accent) : dark(accent);
  }
  return mode === "light" ? light(accent) : dark(accent);
}

export const useTheme = create<ThemeState>((set, get) => ({
  mode: "dark",
  accentKey: "red", // Changed default to red for OMERTA branding
  setAccent: (k) => set({ accentKey: k, colors: computeColors(get().mode, k) }),
  setMode: (m) => set({ mode: m, colors: computeColors(m, get().accentKey) }),
  colors: computeColors("dark", "red"),
}));