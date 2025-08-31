import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity, FlatList, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useContacts } from "../../src/state/contacts";
import HandshakeBadge from "../../src/components/HandshakeBadge";
import { useTheme } from "../../src/state/theme";
import { getOrCreateOID } from "../../src/state/identity";
import { pollEnvelopes, sendEnvelope } from "../../src/utils/api";
import { useChatKeys } from "../../src/state/chatKeys";
import { BlurView } from "expo-blur";

 type Msg = { id: string; text: string; me: boolean; ts: number; status: "sent"|"delivered"|"read" };

export default function ChatRoom() {
  const { id } = useLocalSearchParams();
  const peerOid = Array.isArray(id) ? id[0] : (id || "");
  const router = useRouter();
  const contacts = useContacts();
  const isVerified = contacts.isVerified(peerOid);
  const { colors } = useTheme();
  const keys = useChatKeys();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [privacyTyping, setPrivacyTyping] = useState(false); // blur composer
  const [settingsOpen, setSettingsOpen] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);
  const myOidRef = useRef<string>("");

  useEffect(() => { contacts.init?.(); }, []);
  useEffect(() => { scrollToEnd(); }, [messages.length]);
  useEffect(() => {
    (async () => { myOidRef.current = await getOrCreateOID(); })();
  }, []);

  useEffect(() => {
    let mounted = true;
    const iv = setInterval(async () => {
      try {
        if (!myOidRef.current) return;
        const res = await pollEnvelopes(myOidRef.current);
        if (!mounted) return;
        if (res.messages?.length) {
          setMessages((prev) => {
            const next = [...prev];
            res.messages.forEach((m) => {
              if (peerOid && m.from_oid !== peerOid) return;
              next.push({ id: m.id, text: m.ciphertext, me: false, ts: Date.parse(m.ts) || Date.now(), status: "delivered" });
            });
            return next;
          });
        }
      } catch {}
    }, 2000);
    return () => { mounted = false; clearInterval(iv); };
  }, [peerOid]);

  const scrollToEnd = () => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);

  const onSend = async () => {
    const txt = input.trim();
    if (!txt) return;
    // Require a chat key before sending (security-first)
    const info = await keys.ensureKey(peerOid);
    setInput("");
    const newMsg: Msg = { id: Math.random().toString(36).slice(2), text: txt, me: true, ts: Date.now(), status: "sent" };
    setMessages((prev) => [...prev, newMsg]);
    scrollToEnd();

    try {
      const from = myOidRef.current || (await getOrCreateOID());
      // Interim: send plaintext placeholder; encryption wiring next
      await sendEnvelope({ to_oid: peerOid, from_oid: from, ciphertext: txt });
      keys.bumpCounter(peerOid);
      setTimeout(() => { setMessages((prev) => prev.map(m => m.id === newMsg.id ? { ...m, status: "delivered" } : m)); }, 200);
      setTimeout(() => { setMessages((prev) => prev.map(m => m.id === newMsg.id ? { ...m, status: "read" } : m)); }, 600);
    } catch {}
  };

  const HeaderSettings = () => (
    <View style={styles.settingsCard}> 
      <Text style={[styles.settingsTitle, { color: colors.text }]}>Chat Settings</Text>
      <TouchableOpacity style={styles.rowBtn} onPress={async () => { await keys.forceRekey(peerOid); setSettingsOpen(false); }}>
        <Ionicons name="key" size={16} color={colors.accent} />
        <Text style={[styles.rowText, { color: colors.text }]}>Get new key</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.rowBtn} onPress={() => { /* mark compromised flow placeholder */ setSettingsOpen(false); }}>
        <Ionicons name="alert-circle" size={16} color="#f59e0b" />
        <Text style={[styles.rowText, { color: colors.text }]}>Mark previous key as compromised</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.rowBtn} onPress={() => setSettingsOpen(false)}>
        <Ionicons name="close" size={16} color={colors.sub} />
        <Text style={[styles.rowText, { color: colors.sub }]}>Close</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: Msg }) => (
    <View style={[styles.row, item.me ? styles.rowMe : styles.rowOther]}>
      {!item.me && (
        <View style={[styles.avatar, { backgroundColor: colors.border }]}>
          <Text style={styles.avatarText}>{peerOid?.charAt(0) || 'A'}</Text>
        </View>
      )}
      <View style={[styles.bubble, item.me ? { backgroundColor: colors.accent, borderBottomRightRadius: 4 } : { backgroundColor: colors.card, borderBottomLeftRadius: 4 }]}>
        <Text style={[styles.text, item.me ? { color: '#000' } : { color: colors.text }]}>{item.text}</Text>
        <View style={styles.metaRow}>
          <Text style={[styles.time, { color: '#374151' }]}>{new Date(item.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          {item.me && (
            <View style={styles.ticks}>
              {item.status === "sent" && <Ionicons name="checkmark" size={14} color="#9ca3af" />}
              {item.status === "delivered" && (
                <View style={{ flexDirection: 'row' }}>
                  <Ionicons name="checkmark" size={14} color="#9ca3af" />
                  <Ionicons name="checkmark" size={14} color="#9ca3af" style={{ marginLeft: -6 }} />
                </View>
              )}
              {item.status === "read" && (
                <View style={{ flexDirection: 'row' }}>
                  <Ionicons name="checkmark" size={14} color={colors.accent} />
                  <Ionicons name="checkmark" size={14} color={colors.accent} style={{ marginLeft: -6 }} />
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}> 
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <View style={[styles.headerAvatar, { backgroundColor: colors.card }]}><Text style={[styles.headerAvatarText, { color: colors.text }]}>{peerOid?.charAt(0) || 'A'}</Text></View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>{peerOid || 'Alias'}</Text>
              <Text style={[styles.headerSub, { color: colors.sub }]}>{typing ? "typing…" : "online"}</Text>
            </View>
          </View>
          {isVerified && <HandshakeBadge small={false} />}
          <TouchableOpacity style={{ padding: 8, marginLeft: 8 }} onPress={() => setSettingsOpen(!settingsOpen)}>
            <Ionicons name="settings-outline" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
        {settingsOpen && <HeaderSettings />}

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 90 }}
          onContentSizeChange={scrollToEnd}
        />

        <View style={[styles.composer, { borderTopColor: colors.border, backgroundColor: colors.bg }]}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setPrivacyTyping(!privacyTyping)}>
            <Ionicons name={privacyTyping ? "eye-off" : "eye"} size={18} color={colors.sub} />
          </TouchableOpacity>
          <View style={{ flex: 1, position: 'relative' }}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
              placeholder="Message"
              placeholderTextColor={colors.muted}
              value={input}
              onChangeText={setInput}
              multiline
            />
            {privacyTyping && (
              <Pressable style={styles.blurWrap} onPressIn={() => { /* tap-hold to peek */ }}>
                <BlurView intensity={60} tint="dark" style={styles.blur} />
              </Pressable>
            )}
          </View>
          <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.accent }]} onPress={onSend}>
            <Ionicons name="send" size={18} color="#000" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  back: { padding: 6, marginRight: 6 },
  headerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  headerAvatarText: { fontWeight: '700' },
  headerTitle: { fontWeight: '700' },
  headerSub: { fontSize: 12 },

  row: { flexDirection: 'row', marginVertical: 4, paddingHorizontal: 8 },
  rowMe: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  avatarText: { fontSize: 12, fontWeight: '700' },
  bubble: { maxWidth: '78%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  text: { fontSize: 16, lineHeight: 22 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  time: { fontSize: 10, marginRight: 6 },
  ticks: { flexDirection: 'row', alignItems: 'center' },

  composer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', padding: 8, borderTopWidth: 1 },
  iconBtn: { padding: 8 },
  input: { flex: 1, minHeight: 40, maxHeight: 120, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18 },
  sendBtn: { marginLeft: 8, padding: 10, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  blurWrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 18, overflow: 'hidden' },
  blur: { flex: 1 },
  settingsCard: { backgroundColor: '#111827', borderColor: '#1f2937', borderWidth: 1, borderRadius: 12, margin: 8, padding: 12 },
  settingsTitle: { fontWeight: '700', marginBottom: 8 },
  rowBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  rowText: { marginLeft: 8 },
});