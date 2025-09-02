export const accents = {
  green: "#22c55e",
  blue: "#60a5fa",
  purple: "#a78bfa",
  orange: "#f59e0b",
  red: "#ef4444",
  silver: "#9ca3af",
} as const;

export type AccentKey = keyof typeof accents;

export const dark = (accent: string) => ({
  bg: "#0b0b0b",
  card: "#111827",
  border: "#1f2937",
  text: "#ffffff",
  sub: "#9ca3af",
  muted: "#6b7280",
  accent,
});

export const light = (accent: string) => ({
  bg: "#ffffff",
  card: "#f8fafc",
  border: "#e2e8f0",
  text: "#1e293b",
  sub: "#64748b",
  muted: "#94a3b8",
  accent,
});