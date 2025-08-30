import Constants from "expo-constants";

// Use backend URL from environment variables
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.backendUrl || "https://app-builder-check.preview.emergentagent.com";
const API = `${BACKEND_URL}/api`;

export type SecureNoteMeta = { [k: string]: any };

export async function createNote(payload: { ciphertext: string; ttl_seconds: number; read_limit: number; meta?: SecureNoteMeta }) {
  const res = await fetch(`${API}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Create failed (${res.status}): ${txt}`);
  }
  return (await res.json()) as { id: string; expires_at: string; views_left: number };
}

export type SecureNoteRead = { id: string; ciphertext: string; meta?: SecureNoteMeta | null; views_left: number; expires_at: string };

export async function readNote(id: string) {
  const res = await fetch(`${API}/notes/${id}`);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Open failed (${res.status}): ${txt}`);
  }
  return (await res.json()) as SecureNoteRead;
}