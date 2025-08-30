import * as SecureStore from "expo-secure-store";

const OID_KEY = "oid_v1";

function randOID(len: number = 12) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function getOrCreateOID() {
  const ex = await SecureStore.getItemAsync(OID_KEY);
  if (ex) return ex;
  const oid = randOID(12);
  await SecureStore.setItemAsync(OID_KEY, oid, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  return oid;
}

export async function reRollOID() {
  const oid = randOID(12);
  await SecureStore.setItemAsync(OID_KEY, oid, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  return oid;
}