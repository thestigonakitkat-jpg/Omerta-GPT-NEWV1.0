import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from "react-native";
import { useSecurity } from "../../../src/state/security";

export default function SettingsScreen() {
  const sec = useSecurity();
  const [chatsPin, setChatsPin] = useState("");
  const [vaultPin, setVaultPin] = useState("");
  const [panicPin, setPanicPin] = useState("");
  const [autoLock, setAutoLock] = useState("300000"); // 5 min default

  const savePins = async () => {
    if (chatsPin.length === 6) await sec.setChatsPin(chatsPin); else if (chatsPin) { Alert.alert("Chats PIN", "Use 6 digits"); return; }
    if (vaultPin.length === 6) await sec.setVaultPin(vaultPin); else if (vaultPin) { Alert.alert("Vault PIN", "Use 6 digits"); return; }
    if (panicPin.length === 6) await sec.setPanicPin(panicPin); else if (panicPin) { Alert.alert("Panic PIN", "Use 6 digits"); return; }
    Alert.alert("Saved", "PINs updated");
    setChatsPin(""); setVaultPin(""); setPanicPin("");
  };

  const onAutoLockSave = () => {
    const v = Math.max(30_000, Math.min(10 * 60_000, parseInt(autoLock || "0", 10)));
    sec.setAutoLockMs(v);
    Alert.alert("Saved", `Auto-lock set to ${Math.round(v/1000)}s`);
  };

  const triggerPanic = async () => {
    if (panicPin.length !== 6) { Alert.alert("Enter Panic PIN", "Provide the 6-digit panic PIN to simulate duress."); return; }
    const ok = await sec.isPanicPin(panicPin);
    if (ok) {
      await sec.secureSelfWipe();
      Alert.alert("Wipe", "Secure self-wipe complete. Showing decoy UI.");
    } else {
      Alert.alert("Wrong", "Panic PIN did not match.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Security Settings</Text>

      <Text style={styles.label}>Chats PIN (6 digits)</Text>
      <TextInput style={styles.input} keyboardType="number-pad" maxLength={6} value={chatsPin} onChangeText={setChatsPin} />

      <Text style={styles.label}>Vault PIN (6 digits)</Text>
      <TextInput style={styles.input} keyboardType="number-pad" maxLength={6} value={vaultPin} onChangeText={setVaultPin} />

      <Text style={styles.label}>Panic PIN (6 digits)</Text>
      <TextInput style={styles.input} keyboardType="number-pad" maxLength={6} value={panicPin} onChangeText={setPanicPin} />

      <TouchableOpacity style={styles.btn} onPress={savePins}><Text style={styles.btnText}>Save PINs</Text></TouchableOpacity>

      <Text style={[styles.h1, { marginTop: 16 }]}>Auto-lock Timeout (ms)</Text>
      <TextInput style={styles.input} keyboardType="number-pad" value={autoLock} onChangeText={setAutoLock} />
      <TouchableOpacity style={styles.btn} onPress={onAutoLockSave}><Text style={styles.btnText}>Save Auto-lock</Text></TouchableOpacity>

      <TouchableOpacity style={[styles.btn, { backgroundColor: '#ef4444', marginTop: 16 }]} onPress={triggerPanic}>
        <Text style={styles.btnText}>Test Panic (Decoy/Wipe)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0b", padding: 16 },
  h1: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 8 },
  label: { color: "#9ca3af", marginTop: 12 },
  input: { height: 44, borderColor: "#1f2937", borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, color: "#fff" },
  btn: { marginTop: 12, backgroundColor: "#22c55e", paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#000", fontWeight: "800" },
});