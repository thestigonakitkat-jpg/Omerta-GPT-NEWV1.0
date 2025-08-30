/*
  In Stage 2 we simulate in-app delivery of the note key by storing id -&gt; key/nonce
  for notes created locally. In real chat flows, the key rides inside the E2EE chat payload.
*/
const store: Record<string, { key: Uint8Array; nonce: Uint8Array }> = {};

export function saveNoteKey(id: string, key: Uint8Array, nonce: Uint8Array) {
  store[id] = { key, nonce };
}
export function getNoteKey(id: string) {
  return store[id] || null;
}
export function purgeNoteKey(id: string) {
  delete store[id];
}