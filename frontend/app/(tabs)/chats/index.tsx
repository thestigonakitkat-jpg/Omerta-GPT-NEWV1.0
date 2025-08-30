import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, FlatList, ActivityIndicator, Switch, Modal } from "react-native";
import { createNote, readNote, SecureNoteMeta, SecureNoteRead } from "../../../src/utils/api";
import { safeCopyToClipboard } from "../../../src/utils/clipboard";
import { aesGcmEncrypt, aesGcmDecrypt } from "../../../src/utils/crypto";
import { saveNoteKey, getNoteKey, purgeNoteKey } from "../../../src/state/notesKeys";
import { verifyTotpCode } from "../../../src/utils/totp";
import { useRouter, useFocusEffect } from "expo-router";
import ChatsPinGate from "./_pinGate";
import { useSecurity } from "../../../src/state/security";

interface LocalNoteItem {
  id: string;
  expires_at: string;
  views_left: number;
  meta?: SecureNoteMeta | null;
}

export default function ChatsScreen() {
  const router = useRouter();
  const sec = useSecurity();
  const [needPin, setNeedPin] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [ttl, setTtl] = useState(300); // 5 minutes default
  const [readLimit, setReadLimit] = useState(1);
  const [creating, setCreating] = useState(false);
  const [items, setItems] = useState<LocalNoteItem[]>([]);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [opened, setOpened] = useState<SecureNoteRead | null>(null);
  const [loadingOpen, setLoadingOpen] = useState(false);
  const [require2FA, setRequire2FA] = useState(true);
  const [totpVisible, setTotpVisible] = useState(false);
  const [totpCode, setTotpCode] = useState("");

  useFocusEffect(React.useCallback(() => {
    if (!sec.isChatsSessionActive()) setNeedPin(true);
    return () => {};
  }, [sec.isChatsSessionActive()]));

  const canCreate = useMemo(() => noteText.trim().length > 0 && readLimit >= 1 && readLimit <= 3 && ttl > 0 && ttl <= 604800, [noteText, readLimit, ttl]);

  const onCreate = async () => {
    if (!canCreate) return;
    try {
      setCreating(true);
      const enc = await aesGcmEncrypt(noteText);
      const res = await createNote({ ciphertext: enc.ciphertextB64, ttl_seconds: ttl, read_limit: readLimit, meta: { t: "chat", require2fa: require2FA } });
      saveNoteKey(res.id, enc.key, enc.nonce);
      setItems((prev) => [{ id: res.id, expires_at: res.expires_at, views_left: res.views_left, meta: { t: "chat", require2fa: require2FA } }, ...prev]);
      setNoteText("");
      Alert.alert("Secure Note", "Created. Tap the card to open when delivered.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to create note");
    } finally {
      setCreating(false);
    }
  };

  const doOpen = async (id: string) => {
    try {
      const res = await readNote(id);
      const keyEntry = getNoteKey(id);
      if (!keyEntry) throw new Error("Missing local key (in real app delivered via chat)");
      const plaintext = aesGcmDecrypt(res.ciphertext, keyEntry.key, keyEntry.nonce);
      setOpened({ ...res, ciphertext: plaintext });
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, views_left: res.views_left } : it)));
      if (res.views_left === 0) purgeNoteKey(id);
    } catch (e: any) {
      Alert.alert("Open failed", e?.message || "Note may have expired or hit view limit");
    }
  };

  const onOpen = async (id: string) => {
    try {
      setOpeningId(id);
      setLoadingOpen(true);
      const it = items.find((x) => x.id === id);
      const needs2FA = Boolean(it?.meta && (it.meta as any).require2fa);
      if (needs2FA) {
        setTotpVisible(true);
        (onOpen as any)._pendingId = id;
      } else {
        await doOpen(id);
      }
    } finally {
      setLoadingOpen(false);
      setOpeningId(null);
    }
  };

  const onVerifyTotp = async () => {
    const id = (onOpen as any)._pendingId as string | undefined;
    if (!id) { setTotpVisible(false); return; }
    const ok = await verifyTotpCode(totpCode.trim());
    if (!ok) { Alert.alert("2FA failed", "Incorrect code"); return; }
    setTotpVisible(false); setTotpCode("");
    await doOpen(id);
    (onOpen as any)._pendingId = undefined;
  };

  const renderItem = ({ item }: { item: LocalNoteItem }) => (
    <TouchableOpacity style={styles.card} onPress={() => onOpen(item.id)}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Secure Note</Text>
        <Text style={styles.badge}>🔒</Text>
      </View>
      <Text style={styles.meta}>Views left: {item.views_left}</Text>
      <Text style={styles.meta}>Expires: {new Date(item.expires_at).toLocaleString()}</Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <ChatsPinGate visible={needPin} onAuthed={() => { setNeedPin(false); }} />
      <View style={styles.container}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#334155' }]} onPress={() => router.push('/chat/demo')}>
          <Text style={styles.btnText}>Open Sample Chat (Preview)</Text>
        </TouchableOpacity>

        <Text style={styles.h1}>Create Secure Note</Text>
        <TextInput
          style={styles.textarea}
          placeholder="Enter text (encrypted client-side with AES-256-GCM)"
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
        <View style={[styles.row, { marginTop: 8 }]}> 
          <Text style={styles.label}>Require 2FA</Text>
          <Switch value={require2FA} onValueChange={setRequire2FA} />
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

        <Modal visible={totpVisible} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.h1}>2FA Required</Text>
              <Text style={styles.meta}>Enter your 6-digit code</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                maxLength={6}
                value={totpCode}
                onChangeText={setTotpCode}
              />
              <View style={styles.row}>
                <TouchableOpacity style={[styles.btn, { flex: 1 }]} onPress={onVerifyTotp}>
                  <Text style={styles.btnText}>Verify</Text>
                </TouchableOpacity>
                <View style={{ width: 12 }} />
                <TouchableOpacity style={[styles.btn, { flex: 1, backgroundColor: "#374151" }]} onPress={() => { setTotpVisible(false); setTotpCode(""); }}>
                  <Text style={styles.btnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#0b0b0b" },
  h1: { color: "#fff", fontSize: 18, fontWeight: "600", marginBottom: 8, marginTop: 12 },
  textarea: { minHeight: 100, borderColor: "#1f2937", borderWidth: 1, borderRadius: 8, padding: 12, color: "#fff" },
  row: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  label: { color: "#9ca3af", marginRight: 8 },
  input: { height: 44, borderColor: "#1f2937", borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, color: "#fff" },
  btn: { marginTop: 16, backgroundColor: "#22c55e", paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "#000", fontWeight: "700" },
  card: { backgroundColor: "#111827", borderRadius: 10, padding: 12, marginVertical: 8, borderColor: "#1f2937", borderWidth: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { color: "#fff", fontWeight: "700" },
  badge: { color: "#22c55e", fontSize: 16, marginTop: 2 },
  meta: { color: "#9ca3af", marginTop: 4 },
  empty: { color: "#6b7280", textAlign: "center", marginTop: 16 },
  viewer: { position: "absolute", left: 16, right: 16, bottom: 16, backgroundColor: "#0f172a", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#1f2937" },
  viewerTitle: { color: "#fff", fontWeight: "700", marginBottom: 8 },
  viewerBody: { color: "#e5e7eb" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
  modalCard: { width: "86%", backgroundColor: "#111827", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#1f2937" },
});