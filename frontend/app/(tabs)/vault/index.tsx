import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, TextInput, Modal } from "react-native";
import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import { encryptBackupBlob, decryptBackupBlob } from "../../../src/utils/crypto";
import VaultPinGate from "./_pinGate";
import { useVault } from "../../../src/state/vault";

export default function VaultScreen() {
  const [needPin, setNeedPin] = useState(true);
  const [busy, setBusy] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [pin, setPin] = useState("");
  const [showCreds, setShowCreds] = useState(false);
  const vault = useVault();

  const openCreds = () => setShowCreds(true);
  const closeCreds = () => setShowCreds(false);

  const snapshot = () => ({ created: Date.now(), items: vault.items });

  const onExport = async () => {
    try {
      setBusy(true);
      const blob = await encryptBackupBlob(snapshot(), passphrase, pin);
      const json = JSON.stringify(blob);

      if (Platform.OS === 'android' && FileSystem.StorageAccessFramework) {
        const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission', 'Directory permission required'); return; }
        try {
          const nm = await FileSystem.StorageAccessFramework.createFileAsync(perm.directoryUri, ".nomedia", 'application/octet-stream');
          await FileSystem.StorageAccessFramework.writeAsStringAsync(nm, "", { encoding: FileSystem.EncodingType.UTF8 });
        } catch {}
        const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(perm.directoryUri, `${Math.random().toString(36).slice(2)}.bin`, 'application/octet-stream');
        await FileSystem.StorageAccessFramework.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
        Alert.alert('Exported', 'Encrypted backup saved (opaque file).');
      } else {
        const path = FileSystem.documentDirectory + `${Math.random().toString(36).slice(2)}.bin`;
        await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
        Alert.alert('Exported', `Saved to app storage: ${path}`);
      }
    } catch (e: any) {
      Alert.alert('Export failed', e?.message || 'Error');
    } finally {
      setBusy(false);
      setPassphrase(""); setPin(""); setShowCreds(false);
    }
  };

  const onImport = async () => {
    try {
      setBusy(true);
      const pick = await DocumentPicker.getDocumentAsync({ multiple: false });
      if (pick.canceled || !pick.assets?.[0]) { setBusy(false); return; }
      const uri = pick.assets[0].uri;
      let json = "";
      if (Platform.OS === 'android' && FileSystem.StorageAccessFramework && uri.startsWith('content://')) {
        json = await FileSystem.StorageAccessFramework.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
      } else {
        json = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
      }
      const blob = JSON.parse(json);
      const data = await decryptBackupBlob(blob, passphrase, pin);
      vault.setItems(data.items || []);
      Alert.alert('Restore', `Decrypted backup with ${vault.items.length} items.`);
    } catch (e: any) {
      Alert.alert('Import failed', e?.message || 'Error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <VaultPinGate visible={needPin} onAuthed={() => setNeedPin(false)} />
      <Text style={styles.text}>Vault</Text>
      <Text style={styles.sub}>Encrypted SD backup uses Argon2id (adaptive when available) + AES-256-GCM. If Argon2id isn't supported on this platform, it falls back to strong PBKDF2.</Text>

      <TouchableOpacity disabled={busy} style={styles.btn} onPress={openCreds}>
        <Text style={styles.btnText}>{busy ? 'Working...' : 'Create Encrypted Backup (SD)'}</Text>
      </TouchableOpacity>
      <TouchableOpacity disabled={busy} style={[styles.btn, { backgroundColor: '#334155' }]} onPress={onImport}>
        <Text style={styles.btnText}>Restore from Encrypted Backup</Text>
      </TouchableOpacity>

      <Modal visible={showCreds} transparent animationType='fade'>
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.h1}>Enter Passphrase + PIN</Text>
            <TextInput style={styles.input} secureTextEntry placeholder='16+ char passphrase' placeholderTextColor='#6b7280' value={passphrase} onChangeText={setPassphrase} />
            <TextInput style={styles.input} keyboardType='number-pad' placeholder='6-digit PIN' placeholderTextColor='#6b7280' value={pin} maxLength={6} onChangeText={setPin} />
            <TouchableOpacity style={styles.btn} onPress={onExport}><Text style={styles.btnText}>Encrypt & Save</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#374151' }]} onPress={() => setShowCreds(false)}><Text style={styles.btnText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0b", padding: 16 },
  text: { color: "#fff", fontSize: 18, fontWeight: "700" },
  sub: { color: "#9ca3af", marginTop: 8, marginBottom: 16 },
  btn: { marginTop: 12, backgroundColor: "#22c55e", paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#000", fontWeight: "800" },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '86%', backgroundColor: '#111827', borderRadius: 12, padding: 16, borderColor: '#1f2937', borderWidth: 1 },
  h1: { color: '#fff', fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  input: { height: 44, borderColor: '#1f2937', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, color: '#fff', marginBottom: 10 },
});