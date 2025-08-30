import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, FlatList, ActivityIndicator } from "react-native";
import { createNote, readNote, SecureNoteMeta, SecureNoteRead } from "../../../src/utils/api";
import { safeCopyToClipboard } from "../../../src/utils/clipboard";

interface LocalNoteItem {
  id: string;
  expires_at: string;
  views_left: number;
  meta?: SecureNoteMeta | null;
}

export default function ChatsScreen() {
  const [noteText, setNoteText] = useState("");
  const [ttl, setTtl] = useState(300); // 5 minutes default
  const [readLimit, setReadLimit] = useState(1);
  const [creating, setCreating] = useState(false);
  const [items, setItems] = useState<LocalNoteItem[]>([]);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [opened, setOpened] = useState<SecureNoteRead | null>(null);
  const [loadingOpen, setLoadingOpen] = useState(false);

  const canCreate = useMemo(() => noteText.trim().length > 0 && readLimit >= 1 && readLimit <= 3 && ttl > 0 && ttl <= 604800, [noteText, readLimit, ttl]);

  const onCreate = async () => {
    if (!canCreate) return;
    try {
      setCreating(true);
      // For Phase 1, treat entered text as opaque ciphertext placeholder. AES-GCM client encryption will be added in Phase 2.
      const res = await createNote({ ciphertext: noteText, ttl_seconds: ttl, read_limit: readLimit, meta: { t: "chat" } });
      setItems((prev) => [{ id: res.id, expires_at: res.expires_at, views_left: res.views_left, meta: { t: "chat" } }, ...prev]);
      setNoteText("");
      Alert.alert("Secure Note", "Created. Tap the card to open when delivered.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to create note");
    } finally {
      setCreating(false);
    }
  };

  const onOpen = async (id: string) => {
    try {
      setOpeningId(id);
      setLoadingOpen(true);
      const res = await readNote(id);
      setOpened(res);
      // update local views_left if present
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, views_left: res.views_left } : it)));
    } catch (e: any) {
      Alert.alert("Open failed", e?.message || "Note may have expired or hit view limit");
    } finally {
      setLoadingOpen(false);
      setOpeningId(null);
    }
  };

  const renderItem = ({ item }: { item: LocalNoteItem }) => (
    <TouchableOpacity style={styles.card} onPress={() => onOpen(item.id)}>
      <Text style={styles.cardTitle}>Secure Note</Text>
      <Text style={styles.badge}>🔒</Text>
      <View style={{ height: 6 }} />
      <Text style={styles.meta}>Views left: {item.views_left}</Text>
      <Text style={styles.meta}>Expires: {new Date(item.expires_at).toLocaleString()}</Text>
      {openingId === item.id && loadingOpen ? <ActivityIndicator color="#4ade80" style={{ marginTop: 8 }} /> : null}
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.h1}>Create Secure Note</Text>
        <TextInput
          style={styles.textarea}
          placeholder="Enter text (Phase 1 placeholder as ciphertext)"
          placeholderTextColor="#6b7280"
          value={noteText}
          onChangeText={setNoteText}
          multiline
        />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>TTL (seconds)</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={String(ttl)}
              onChangeText={(t) => setTtl(Math.max(1, Math.min(604800, parseInt(t || '0', 10) || 0)))}
            />
          </View>
          <View style={{ width: 16 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Read limit (1-3)</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={String(readLimit)}
              onChangeText={(t) => setReadLimit(Math.max(1, Math.min(3, parseInt(t || '0', 10) || 0)))}
            />
          </View>
        </View>
        <TouchableOpacity disabled={!canCreate || creating} onPress={onCreate} style={[styles.btn, (!canCreate || creating) && styles.btnDisabled]}>
          <Text style={styles.btnText}>{creating ? "Creating..." : "Create Secure Note"}</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
        <Text style={styles.h1}>Incoming Secure Notes</Text>
        <FlatList data={items} renderItem={renderItem} keyExtractor={(it) => it.id} ListEmptyComponent={<Text style={styles.empty}>No notes yet.</Text>} />

        {opened && (
          <View style={styles.viewer}>
            <Text style={styles.viewerTitle}>Secure Note (opened)</Text>
            <Text style={styles.viewerBody}>{opened.ciphertext}</Text>
            <View style={{ height: 12 }} />
            <View style={styles.row}>
              <TouchableOpacity style={[styles.btn, { flex: 1 }]} onPress={() => { safeCopyToClipboard(opened.ciphertext); Alert.alert("Copied", "Clipboard will clear in 10s"); }}>
                <Text style={styles.btnText}>Copy</Text>
              </TouchableOpacity>
              <View style={{ width: 12 }} />
              <TouchableOpacity style={[styles.btn, { flex: 1, backgroundColor: "#ef4444" }]} onPress={() => setOpened(null)}>
                <Text style={styles.btnText}>Close</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.meta}>Views left: {opened.views_left} | Expires: {new Date(opened.expires_at).toLocaleString()}</Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#0b0b0b" },
  h1: { color: "#fff", fontSize: 18, fontWeight: "600", marginBottom: 8 },
  textarea: { minHeight: 100, borderColor: "#1f2937", borderWidth: 1, borderRadius: 8, padding: 12, color: "#fff" },
  row: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  label: { color: "#9ca3af", marginBottom: 6 },
  input: { height: 44, borderColor: "#1f2937", borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, color: "#fff" },
  btn: { marginTop: 16, backgroundColor: "#22c55e", paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "#000", fontWeight: "700" },
  card: { backgroundColor: "#111827", borderRadius: 10, padding: 12, marginVertical: 8, borderColor: "#1f2937", borderWidth: 1 },
  cardTitle: { color: "#fff", fontWeight: "700" },
  badge: { color: "#22c55e", fontSize: 16, marginTop: 2 },
  meta: { color: "#9ca3af", marginTop: 4 },
  empty: { color: "#6b7280", textAlign: "center", marginTop: 16 },
  viewer: { position: "absolute", left: 16, right: 16, bottom: 16, backgroundColor: "#0f172a", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#1f2937" },
  viewerTitle: { color: "#fff", fontWeight: "700", marginBottom: 8 },
  viewerBody: { color: "#e5e7eb" },
});