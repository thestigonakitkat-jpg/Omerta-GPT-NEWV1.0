import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, AppState } from "react-native";
import { useRouter } from "expo-router";
// import { useSecurity } from "../../src/state/security";

export default function UnlockScreen() {
  const router = useRouter();
  // const sec = useSecurity();
  const [pass, setPass] = useState("");
  const [mode, setMode] = useState<"unlock"|"setup">("unlock");

  useEffect(() => {
    // Check if passphrase exists; if not, go to setup
    (async () => {
      // crude check: try unlock with empty and see if storage exists
      // better: SecureStore.getItemAsync, but we keep it simple here
    })();
  }, []);

  const onUnlock = async () => {
    const ok = await sec.unlockAppWithPassphrase(pass);
    if (ok) {
      router.replace("/(tabs)/chats");
    } else {
      Alert.alert("Unlock failed", "Wrong passphrase or not set");
    }
  };

  const onSetup = async () => {
    if (pass.length < 16) { Alert.alert("Too short", "Minimum 16 characters"); return; }
    // must include 1 uppercase, 1 lowercase, 1 special, 2 numerals
    const reUpper = /[A-Z]/, reLower = /[a-z]/, reNum = /.*\d.*\d/ , reSpec = /[^A-Za-z0-9]/;
    if (!reUpper.test(pass) || !reLower.test(pass) || !reNum.test(pass) || !reSpec.test(pass)) {
      Alert.alert("Does not meet policy", "Needs uppercase, lowercase, 2 digits, and a special char");
      return;
    }
    await sec.setPassphrase(pass);
    Alert.alert("Passphrase set", "You can now unlock.");
    setMode("unlock");
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>{mode === "unlock" ? "Unlock OMERTA" : "Set Passphrase"}</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={pass}
          onChangeText={setPass}
          placeholder={mode === "unlock" ? "Enter passphrase" : "Create strong passphrase"}
          placeholderTextColor="#6b7280"
        />
        {mode === "unlock" ? (
          <TouchableOpacity style={styles.btn} onPress={onUnlock}>
            <Text style={styles.btnText}>Unlock</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.btn} onPress={onSetup}>
            <Text style={styles.btnText}>Save</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => setMode(mode === "unlock" ? "setup" : "unlock")}>
          <Text style={styles.link}>{mode === "unlock" ? "First time? Set passphrase" : "Back to unlock"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0b", padding: 16, justifyContent: "center" },
  title: { color: "#fff", fontSize: 22, fontWeight: "800", marginBottom: 12, textAlign: "center" },
  input: { height: 48, borderColor: "#1f2937", borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, color: "#fff" },
  btn: { marginTop: 16, backgroundColor: "#22c55e", paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#000", fontWeight: "800" },
  link: { color: "#93c5fd", marginTop: 12, textAlign: "center" },
});