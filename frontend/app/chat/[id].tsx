import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity, FlatList } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useContacts } from "../../src/state/contacts";
import HandshakeBadge from "../../src/components/HandshakeBadge";
import { useTheme } from "../../src/state/theme";

 type Msg = { id: string; text: string; me: boolean; ts: number; status: "sent"|"delivered"|"read" };

export default function ChatRoom() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const contacts = useContacts();
  const isVerified = contacts.isVerified(id);
  const { colors } = useTheme();
  const [messages, setMessages] = useState<Msg[]>([{
    id: "m1", text: "Welcome to OMERTA. This is a preview of the chat UI.", me: false, ts: Date.now()-60000, status: "read"
  }, {
    id: "m2", text: "Messages are end-to-end encrypted. Screenshots are blocked.", me: false, ts: Date.now()-45000, status: "read"
  }, {
    id: "m3", text: "Type a message below and press send to see bubbles like WhatsApp/Signal.", me: false, ts: Date.now()-30000, status: "read"
  }]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);

  useEffect(() => { scrollToEnd(); }, []);

  const scrollToEnd = () => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);

  const onSend = () => {
    const txt = input.trim();
    if (!txt) return;
    const newMsg: Msg = { id: Math.random().toString(36).slice(2), text: txt, me: true, ts: Date.now(), status: "sent" };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    scrollToEnd();
    setTimeout(() => { setMessages((prev) => prev.map(m => m.id === newMsg.id ? { ...m, status: "delivered" } : m)); }, 400);
    setTimeout(() => { setMessages((prev) => prev.map(m => m.id === newMsg.id ? { ...m, status: "read" } : m)); }, 900);
    setTimeout(() => {
      setTyping(true);
      const reply: Msg = { id: Math.random().toString(36).slice(2), text: "Got it.", me: false, ts: Date.now()+500, status: "delivered" };
      setTimeout(() => { setMessages((prev) => [...prev, reply]); setTyping(false); scrollToEnd(); }, 1200);
    }, 1200);
  };

  const renderItem = ({ item }: { item: Msg }) => (
    <View style={[styles.row, item.me ? styles.rowMe : styles.rowOther]}>
      {!item.me && (
        <View style={[styles.avatar, { backgroundColor: colors.border }]}>
          <Text style={styles.avatarText}>A</Text>
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
            <View style={[styles.headerAvatar, { backgroundColor: colors.card }]}><Text style={[styles.headerAvatarText, { color: colors.text }]}>A</Text></View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Alias</Text>
              <Text style={[styles.headerSub, { color: colors.sub }]}>{typing ? "typing…" : "online"}</Text>
            </View>
          </View>
          {isVerified && <HandshakeBadge small={false} />}
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 90 }}
          onContentSizeChange={scrollToEnd}
        />

        <View style={[styles.composer, { borderTopColor: colors.border, backgroundColor: colors.bg }]}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="happy" size={22} color={colors.sub} />
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            placeholder="Message"
            placeholderTextColor={colors.muted}
            value={input}
            onChangeText={setInput}
            multiline
          />
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
});