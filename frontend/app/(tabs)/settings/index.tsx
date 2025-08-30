import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Settings (Phase 1)</Text>
      <Text style={styles.line}>- Global anti-screenshot enabled</Text>
      <Text style={styles.line}>- Clipboard auto-clear (10s) when copying secure text</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0b", padding: 16 },
  h1: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 12 },
  line: { color: "#9ca3af", marginBottom: 8 },
});