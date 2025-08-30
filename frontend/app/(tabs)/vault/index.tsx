import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
// import { useSecurity } from "../../../src/state/security";
import { aesGcmEncrypt, aesGcmDecrypt } from "../../../src/utils/crypto";

export default function VaultScreen() {
  const sec = useSecurity();
  const [busy, setBusy] = useState(false);

  const onExport = async () => {
    try {
      setBusy(true);
      // Placeholder: encrypt a small header; real Vault data to be integrated later
      const plaintext = JSON.stringify({ v: 1, created: Date.now() });
      const enc = await aesGcmEncrypt(plaintext);
      const blob = enc.ciphertextB64; // opaque content
      const name = `${Math.random().toString(36).slice(2)}.bin`;
      const path = FileSystem.documentDirectory + name;
      await FileSystem.writeAsStringAsync(path, blob, { encoding: FileSystem.EncodingType.UTF8 });
      Alert.alert("Exported", `Saved encrypted blob as ${name} (testing mode).`);
    } catch (e: any) {
      Alert.alert("Export failed", e?.message || "Error");
    } finally {
      setBusy(false);
    }
  };

  const onImport = async () => {
    try {
      setBusy(true);
      const pick = await DocumentPicker.getDocumentAsync({ multiple: false });
      if (pick.canceled || !pick.assets?.[0]) return;
      const uri = pick.assets[0].uri;
      const data = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
      // In real flow, derive key from passphrase + PIN using Argon2id (pending). For now we assume data contains AES-GCM blob we can decrypt if we had key.
      Alert.alert("Imported", `Blob length ${data.length}`);
    } catch (e: any) {
      Alert.alert("Import failed", e?.message || "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Vault (Phase 2 scaffolding)</Text>
      <Text style={styles.sub}>SD-card backup will use Argon2id + AES-256-GCM. This build exports to app storage for testing only.</Text>
      <TouchableOpacity disabled={busy} style={styles.btn} onPress={onExport}>
        <Text style={styles.btnText}>{busy ? "Working..." : "Export Encrypted Backup (Test)"}</Text>
      </TouchableOpacity>
      <TouchableOpacity disabled={busy} style={[styles.btn, { backgroundColor: "#334155" }]} onPress={onImport}>
        <Text style={styles.btnText}>Restore from File (Test)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0b", padding: 16 },
  text: { color: "#fff", fontSize: 18, fontWeight: "700" },
  sub: { color: "#9ca3af", marginTop: 8, marginBottom: 16 },
  btn: { marginTop: 12, backgroundColor: "#22c55e", paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#000", fontWeight: "800" },
});