import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function VaultScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Vault (Phase 1 scaffolding)</Text>
      <Text style={styles.sub}>SD-card backup/restore and PIN flows will be implemented in Phase 1/2.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0b", alignItems: "center", justifyContent: "center", padding: 16 },
  text: { color: "#fff", fontSize: 18, fontWeight: "700" },
  sub: { color: "#9ca3af", marginTop: 8, textAlign: "center" },
});