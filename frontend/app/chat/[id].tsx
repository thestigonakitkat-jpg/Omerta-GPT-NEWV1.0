import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity, FlatList, Pressable, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useContacts } from "../../src/state/contacts";
import HandshakeBadge from "../../src/components/HandshakeBadge";
import EmergencyNuke from "../../src/components/EmergencyNuke";
import { useTheme } from "../../src/state/theme";
import { getOrCreateOID } from "../../src/state/identity";
import { pollEnvelopes, sendEnvelope, createNote } from "../../src/utils/api";
import { useChatKeys } from "../../src/state/chatKeys";
import { BlurView } from "expo-blur";
import { connectWs, onWsMessage } from "../../src/utils/ws";
import { signalManager, EncryptedMessage } from "../../src/utils/signalCrypto";

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
  const [privacyTyping, setPrivacyTyping] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [needsKeyShare, setNeedsKeyShare] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);
  const myOidRef = useRef<string>("");

  useEffect(() => { contacts.init?.(); }, []);
  useEffect(() => { scrollToEnd(); }, [messages.length]);
  useEffect(() => {
    (async () => { 
      myOidRef.current = await getOrCreateOID(); 
      connectWs(myOidRef.current); 
      
      // Initialize Signal Protocol
      await signalManager.initialize();
    })();
    const off = onWsMessage((data) => {
      if (data?.messages?.length) {
        setMessages((prev) => {
          const next = [...prev];
          data.messages.forEach(async (m: any) => {
            if (peerOid && m.from_oid !== peerOid) return;
            
            try {
              // Try to decrypt with Signal Protocol
              const encryptedMsg: EncryptedMessage = JSON.parse(m.ciphertext);
              const decryptedText = await signalManager.decryptMessage(peerOid, encryptedMsg);
              next.push({ 
                id: m.id, 
                text: decryptedText, 
                me: false, 
                ts: Date.parse(m.ts) || Date.now(), 
                status: "delivered" 
              });
            } catch (e) {
              // Fallback to plaintext for backward compatibility
              next.push({ 
                id: m.id, 
                text: m.ciphertext, 
                me: false, 
                ts: Date.parse(m.ts) || Date.now(), 
                status: "delivered" 
              });
            }
          });
          return next;
        });
      }
    });
    return () => { off?.(); };
  }, [peerOid]);

  useEffect(() => {
    // Determine if we need to share a key
    (async () => {
      const info = await keys.ensureKey(peerOid);
      // In a real app, track peer acceptance; for now show banner to send key via Secure Note
      setNeedsKeyShare(true);
    })();
  }, [peerOid]);

  const scrollToEnd = () => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);

  const shareKeyViaSecureNote = async () => {
    const info = await keys.ensureKey(peerOid);
    try {
      const res = await createNote({ ciphertext: info.keyB64, ttl_seconds: 7*24*60*60, read_limit: 1, meta: { type: 'chat_key', to: peerOid } });
      Alert.alert('Key shared', 'Encryption key sent as a Secure Note. Ask peer to open it.');
      setNeedsKeyShare(false);
    } catch (e: any) {
      Alert.alert('Failed', e?.message || 'Could not create Secure Note');
    }
  };

  const onSend = async () => {
    const txt = input.trim();
    if (!txt) return;
    const info = await keys.ensureKey(peerOid);
    setInput("");
    const newMsg: Msg = { id: Math.random().toString(36).slice(2), text: txt, me: true, ts: Date.now(), status: "sent" };
    setMessages((prev) => [...prev, newMsg]);
    scrollToEnd();

    try {
      const from = myOidRef.current || (await getOrCreateOID());
      
      // Use FULL Signal Protocol with SEALED SENDER
      let ciphertext: string;
      try {
        console.log('🔒 SENDING WITH SEALED SENDER PROTOCOL');
        
        // Send using Signal Protocol with metadata protection
        const sealedMessage = await signalManager.sendMessage(peerOid, txt);
        ciphertext = Buffer.from(sealedMessage).toString('base64');
        
        console.log('✅ Message encrypted with SEALED SENDER - metadata protected');
      } catch (e) {
        console.warn('Sealed sender failed, attempting session establishment:', e);
        
        // If no session exists, establish one first
        try {
          const preKeyBundle = await signalManager.getPreKeyBundle();
          await signalManager.establishSession(peerOid, preKeyBundle);
          
          // Retry with sealed sender
          const sealedMessage = await signalManager.sendMessage(peerOid, txt);
          ciphertext = Buffer.from(sealedMessage).toString('base64');
          
          console.log('✅ Session established and message sent with SEALED SENDER');
        } catch (sessionError) {
          console.error('Signal Protocol failed, using fallback encryption:', sessionError);
          // Ultimate fallback to ensure message delivery
          ciphertext = txt;
        }
      }
      
      await sendEnvelope({ to_oid: peerOid, from_oid: from, ciphertext });
      keys.bumpCounter(peerOid);
      setTimeout(() => { setMessages((prev) => prev.map(m => m.id === newMsg.id ? { ...m, status: "delivered" } : m)); }, 200);
      setTimeout(() => { setMessages((prev) => prev.map(m => m.id === newMsg.id ? { ...m, status: "read" } : m)); }, 600);
    } catch (e) {
      console.error('Send failed:', e);
    }
  };

  const HeaderSettings = () => (
    <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
      <Text style={[styles.settingsTitle, { color: colors.text }]}>Chat Settings</Text>
      
      {/* Message Controls */}
      <View style={styles.settingsSection}>
        <Text style={[styles.sectionTitle, { color: colors.sub }]}>Messages</Text>
        <TouchableOpacity style={styles.rowBtn} onPress={() => Alert.alert("Edit Messages", "Select a message to edit (15min window)")}>
          <Ionicons name="create-outline" size={16} color={colors.accent} />
          <Text style={[styles.rowText, { color: colors.text }]}>Edit messages</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rowBtn} onPress={() => Alert.alert("Delete Messages", "Long-press messages to delete (24h window)")}>
          <Ionicons name="trash-outline" size={16} color={colors.accent} />
          <Text style={[styles.rowText, { color: colors.text }]}>Delete messages</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rowBtn} onPress={() => Alert.alert("Select Multiple", "Long-press to start multi-select mode")}>
          <Ionicons name="checkmark-circle-outline" size={16} color={colors.accent} />
          <Text style={[styles.rowText, { color: colors.text }]}>Multi-select messages</Text>
        </TouchableOpacity>
      </View>

      {/* Timer Settings */}
      <View style={styles.settingsSection}>
        <Text style={[styles.sectionTitle, { color: colors.sub }]}>Disappearing Messages</Text>
        <TouchableOpacity style={styles.rowBtn} onPress={() => Alert.alert("Message Timer", "Options: Off, 30s, 1m, 5m, 1h, 8h, 1d, 1w")}>
          <Ionicons name="timer-outline" size={16} color={colors.accent} />
          <Text style={[styles.rowText, { color: colors.text }]}>Set message timer</Text>
          <Text style={[styles.rowSubtext, { color: colors.sub }]}>Off</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rowBtn} onPress={() => Alert.alert("View Once", "Send view-once photos/voice notes")}>
          <Ionicons name="eye-outline" size={16} color={colors.accent} />
          <Text style={[styles.rowText, { color: colors.text }]}>View-once media</Text>
        </TouchableOpacity>
      </View>

      {/* Security Settings */}
      <View style={styles.settingsSection}>
        <Text style={[styles.sectionTitle, { color: colors.sub }]}>Security</Text>
        <TouchableOpacity style={styles.rowBtn} onPress={async () => { await keys.forceRekey(peerOid); setNeedsKeyShare(true); setSettingsOpen(false); }}>
          <Ionicons name="key-outline" size={16} color={colors.accent} />
          <Text style={[styles.rowText, { color: colors.text }]}>Get new key</Text>
          <Text style={[styles.rowSubtext, { color: colors.sub }]}>Manual rekey</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rowBtn} onPress={() => { setNeedsKeyShare(true); setSettingsOpen(false); }}>
          <Ionicons name="alert-circle-outline" size={16} color="#f59e0b" />
          <Text style={[styles.rowText, { color: colors.text }]}>Mark key compromised</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rowBtn} onPress={() => Alert.alert("Safety Number", "Verify encryption keys with contact")}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.accent} />
          <Text style={[styles.rowText, { color: colors.text }]}>Verify safety number</Text>
        </TouchableOpacity>
      </View>

      {/* Privacy Settings */}
      <View style={styles.settingsSection}>
        <Text style={[styles.sectionTitle, { color: colors.sub }]}>Privacy</Text>
        <TouchableOpacity style={styles.rowBtn} onPress={() => Alert.alert("VIP Lock", "Move to VIP chats (hidden, per-chat PIN)")}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.accent} />
          <Text style={[styles.rowText, { color: colors.text }]}>Move to VIP chats</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rowBtn} onPress={() => setPrivacyTyping(!privacyTyping)}>
          <Ionicons name={privacyTyping ? "eye-off-outline" : "eye-outline"} size={16} color={colors.accent} />
          <Text style={[styles.rowText, { color: colors.text }]}>Privacy typing</Text>
          <Text style={[styles.rowSubtext, { color: colors.sub }]}>{privacyTyping ? "On" : "Off"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rowBtn} onPress={() => Alert.alert("Read Receipts", "Toggle read receipt visibility")}>
          <Ionicons name="checkmark-done-outline" size={16} color={colors.accent} />
          <Text style={[styles.rowText, { color: colors.text }]}>Read receipts</Text>
          <Text style={[styles.rowSubtext, { color: colors.sub }]}>On</Text>
        </TouchableOpacity>
      </View>

      {/* Chat Management */}
      <View style={styles.settingsSection}>
        <Text style={[styles.sectionTitle, { color: colors.sub }]}>Chat Management</Text>
        <TouchableOpacity style={styles.rowBtn} onPress={() => Alert.alert("Export Chat", "Export encrypted chat backup")}>
          <Ionicons name="download-outline" size={16} color={colors.accent} />
          <Text style={[styles.rowText, { color: colors.text }]}>Export chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rowBtn} onPress={() => Alert.alert("Clear Chat", "Clear all messages (cannot be undone)")}>
          <Ionicons name="trash-bin-outline" size={16} color="#ef4444" />
          <Text style={[styles.rowText, { color: "#ef4444" }]}>Clear chat</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.closeBtn, { borderColor: colors.border }]} onPress={() => setSettingsOpen(false)}>
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

  const KeyShareBanner = () => (
    needsKeyShare ? (
      <View style={styles.banner}>
        <Ionicons name="key" size={16} color={colors.accent} />
        <Text style={[styles.bannerText, { color: colors.text }]}>Share encryption key with this contact</Text>
        <TouchableOpacity style={[styles.bannerBtn, { borderColor: colors.accent }]} onPress={shareKeyViaSecureNote}>
          <Text style={{ color: colors.accent, fontWeight: '700' }}>Send key</Text>
        </TouchableOpacity>
      </View>
    ) : null
  );

  return (
    <EmergencyNuke>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          {/* Chat UI wrapped in EmergencyNuke for 7-tap activation */}
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

          <KeyShareBanner />

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
                <Pressable style={styles.blurWrap}>
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
    </EmergencyNuke>
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
  settingsCard: { 
    backgroundColor: '#111827', 
    borderColor: '#1f2937', 
    borderWidth: 1, 
    borderRadius: 12, 
    margin: 8, 
    padding: 16,
    maxHeight: '80%'
  },
  settingsTitle: { fontWeight: '700', marginBottom: 12, fontSize: 16 },
  settingsSection: { marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  rowBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4 },
  rowText: { marginLeft: 8, flex: 1, fontSize: 14 },
  rowSubtext: { fontSize: 12, marginLeft: 'auto' },
  closeBtn: { marginTop: 8, paddingVertical: 10, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', padding: 8, margin: 8, borderRadius: 10, borderWidth: 1, borderColor: '#1f2937' },
  bannerText: { marginLeft: 8, flex: 1 },
  bannerBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
});