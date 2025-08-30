import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform } from "react-native";
import { useSecurity } from "../../../src/state/security";
import { useRouter } from "expo-router";
import { openFactoryResetSettings } from "../../../src/utils/android";
import { useTheme } from "../../../src/state/theme";
import { accents, AccentKey } from "../../../src/theme/colors";

export default function SettingsScreen() {
  const router = useRouter();
  const sec = useSecurity();
  const { colors, setAccent, accentKey } = useTheme();
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
      router.replace('/decoy');
      if (Platform.OS === 'android') {
        await openFactoryResetSettings();
      }
    } else {
      Alert.alert("Wrong", "Panic PIN did not match.");
    }
  };

  const AccentSwatches = () => (
    <View style={{ flexDirection: 'row', marginTop: 8 }}>
      {Object.keys(accents).map((k) => {
        const key = k as AccentKey;
        const c = accents[key];
        const sel = key === accentKey;
        return (
          <TouchableOpacity key={key} onPress={() => setAccent(key)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c, marginRight: 10, borderWidth: sel ? 3 : 1, borderColor: sel ? '#fff' : '#1f2937' }} />
        );
      })}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}> 
      <Text style={[styles.h1, { color: colors.text }]}>Security Settings</Text>

      <Text style={[styles.label, { color: colors.sub }]}>Chats PIN (6 digits)</Text>
      <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} keyboardType="number-pad" maxLength={6} value={chatsPin} onChangeText={setChatsPin} />

      <Text style={[styles.label, { color: colors.sub }]}>Vault PIN (6 digits)</Text>
      <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} keyboardType="number-pad" maxLength={6} value={vaultPin} onChangeText={setVaultPin} />

      <Text style={[styles.label, { color: colors.sub }]}>Panic PIN (6 digits)</Text>
      <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} keyboardType="number-pad" maxLength={6} value={panicPin} onChangeText={setPanicPin} />

      <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={savePins}><Text style={styles.btnText}>Save PINs</Text></TouchableOpacity>

      <Text style={[styles.h1, { color: colors.text, marginTop: 16 }]}>Auto-lock Timeout (ms)</Text>
      <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} keyboardType="number-pad" value={autoLock} onChangeText={setAutoLock} />
      <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={onAutoLockSave}><Text style={styles.btnText}>Save Auto-lock</Text></TouchableOpacity>

      <Text style={[styles.h1, { color: colors.text, marginTop: 16 }]}>Theme Accent</Text>
      <AccentSwatches />

      <View style={{ height: 16 }} />
      <Text style={[styles.h1, { color: colors.text }]}>Verification</Text>
      <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={() => router.push('/qr/show')}><Text style={styles.btnText}>Show my QR (OID)</Text></TouchableOpacity>
      <TouchableOpacity style={[styles.btn, { backgroundColor: '#334155' }]} onPress={() => router.push('/qr/scan')}><Text style={styles.btnText}>Scan a QR (Verify)</Text></TouchableOpacity>

      <TouchableOpacity style={[styles.btn, { backgroundColor: '#ef4444', marginTop: 16 }]} onPress={triggerPanic}>
        <Text style={styles.btnText}>Test Panic (Decoy/Wipe)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  h1: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  label: { marginTop: 12 },
  input: { height: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12 },
  btn: { marginTop: 12, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#000", fontWeight: "800" },
});