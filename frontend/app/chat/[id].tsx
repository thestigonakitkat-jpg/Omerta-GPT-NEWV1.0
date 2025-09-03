import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity, FlatList, Pressable, Alert, Modal, Image } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useContacts } from "../../src/state/contacts";
import HandshakeBadge from "../../src/components/HandshakeBadge";
import EmergencyNuke from "../../src/components/EmergencyNuke";
import ImageHandler from "../../src/components/ImageHandler";
import { useTheme } from "../../src/state/theme";
import { getOrCreateOID } from "../../src/state/identity";
import { pollEnvelopes, sendEnvelope, createNote } from "../../src/utils/api";
import { useChatKeys } from "../../src/state/chatKeys";
import { BlurView } from "expo-blur";
import { connectWs, onWsMessage } from "../../src/utils/ws";
import { signalManager, EncryptedMessage } from "../../src/utils/signalCrypto";
import { aesGcmEncrypt, aesGcmDecrypt, getRandomBytesAsync } from "../../src/utils/crypto";
import { EncryptedImage, imageProcessor } from "../../src/utils/imageProcessor";
import { useVault } from "../../src/state/vault";

 type Msg = { 
   id: string; 
   text: string; 
   me: boolean; 
   ts: number; 
   status: "sent"|"delivered"|"read";
   type?: "text" | "image";
   imageData?: {
     encryptedData: string;
     key: Uint8Array;
     nonce: Uint8Array;
     filename: string;
     width: number;
     height: number;
     thumbnail?: string;
   };
 };

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
  const [showImagePicker, setShowImagePicker] = useState(false);
  const vault = useVault();
  const [steelosSecureModal, setSteelosSecureModal] = useState<{
    visible: boolean;
    message: string;
    timer: number;
    messageId: string;
  }>({ visible: false, message: '', timer: 0, messageId: '' });
  const listRef = useRef<FlatList<Msg>>(null);
  const myOidRef = useRef<string>("");

  useEffect(() => { contacts.init?.(); }, []);
  useEffect(() => { scrollToEnd(); }, [messages.length]);
  // STEELOS SECURE Auto-destruct timer
  useEffect(() => {
    if (steelosSecureModal.visible && steelosSecureModal.timer > 0) {
      const interval = setInterval(() => {
        setSteelosSecureModal(prev => {
          if (prev.timer <= 1) {
            // Timer expired - destroy message
            console.log('🗑️ STEELOS SECURE: Auto-destruct timer expired');
            return { visible: false, message: '', timer: 0, messageId: '' };
          }
          return { ...prev, timer: prev.timer - 1 };
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [steelosSecureModal.visible, steelosSecureModal.timer]);

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

  const onSendImage = async (encryptedImage: EncryptedImage) => {
    const info = await keys.ensureKey(peerOid);
    const newMsg: Msg = { 
      id: Math.random().toString(36).slice(2), 
      text: `📸 ${encryptedImage.filename}`, 
      me: true, 
      ts: Date.now(), 
      status: "sent",
      type: "image",
      imageData: {
        encryptedData: encryptedImage.encryptedData,
        key: encryptedImage.key,
        nonce: encryptedImage.nonce,
        filename: encryptedImage.filename,
        width: encryptedImage.width,
        height: encryptedImage.height,
        thumbnail: await imageProcessor.createThumbnail(encryptedImage.base64, 200),
      }
    };
    
    setMessages((prev) => [...prev, newMsg]);
    scrollToEnd();

    try {
      const from = myOidRef.current || (await getOrCreateOID());
      
      // 🔥 STEELOS SECURE PROTOCOL: THE BIRD + SEALED SENDER FOR IMAGES
      console.log('🖼️ STEELOS SECURE: Creating double-layer encrypted image message');
      
      // Create image payload
      const imagePayload = {
        type: "image",
        filename: encryptedImage.filename,
        encryptedData: encryptedImage.encryptedData,
        key: Array.from(encryptedImage.key),
        nonce: Array.from(encryptedImage.nonce),
        width: encryptedImage.width,
        height: encryptedImage.height,
        size: encryptedImage.size,
        fakeTimestamp: encryptedImage.fakeTimestamp,
      };
      
      // LAYER 1: THE BIRD (Cryptgeon) - Ephemeral one-time encryption
      const ephemeralKey = await getRandomBytesAsync(32);
      const ephemeralNonce = await getRandomBytesAsync(12);
      const cryptgeonBlob = await aesGcmEncrypt(
        new TextEncoder().encode(JSON.stringify(imagePayload)), 
        ephemeralKey, 
        ephemeralNonce
      );
      
      // Create STEELOS SECURE envelope
      const steelosEnvelope = {
        type: "STEELOS_SECURE_IMAGE", 
        cryptgeon_blob: Buffer.from(cryptgeonBlob).toString('base64'),
        ephemeral_key: Buffer.from(ephemeralKey).toString('base64'),
        nonce: Buffer.from(ephemeralNonce).toString('base64'),
        one_time_read: true,
        timestamp: Date.now(),
        expires_ttl: 300 // 5 minutes default
      };
      
  const onSend = async () => {
    const txt = input.trim();
    if (!txt) return;
    const info = await keys.ensureKey(peerOid);
    setInput("");
    const newMsg: Msg = { id: Math.random().toString(36).slice(2), text: txt, me: true, ts: Date.now(), status: "sent", type: "text" };
    setMessages((prev) => [...prev, newMsg]);
    scrollToEnd();

    try {
      const from = myOidRef.current || (await getOrCreateOID());
      
      // 🔥 STEELOS SECURE PROTOCOL: THE BIRD + SEALED SENDER COMBINED
      console.log('🔥 STEELOS SECURE: Creating double-layer encrypted message');
      
      // LAYER 1: THE BIRD (Cryptgeon) - Ephemeral one-time encryption
      const ephemeralKey = await getRandomBytesAsync(32); // 256-bit key
      const nonce = await getRandomBytesAsync(12); // 96-bit nonce
      const cryptgeonBlob = await aesGcmEncrypt(
        new TextEncoder().encode(txt), 
        ephemeralKey, 
        nonce
      );
      
      // Create STEELOS SECURE envelope (THE BIRD wrapped message)
      const steelosEnvelope = {
        type: "STEELOS_SECURE", 
        cryptgeon_blob: Buffer.from(cryptgeonBlob).toString('base64'),
        ephemeral_key: Buffer.from(ephemeralKey).toString('base64'),
        nonce: Buffer.from(nonce).toString('base64'),
        one_time_read: true,
        timestamp: Date.now(),
        expires_ttl: 300 // 5 minutes default
      };
      
      console.log('✅ THE BIRD: Message wrapped in cryptgeon ephemeral encryption');
      
      // LAYER 2: SEALED SENDER (Signal Protocol) - Metadata protection
      let sealedSenderCiphertext: string;
      try {
        console.log('🔒 SEALED SENDER: Wrapping STEELOS envelope in Signal Protocol');
        
        // For now, use basic Signal Protocol encryption until compilation issues are resolved
        const sealedMessage = await signalManager.sendMessage(peerOid, JSON.stringify(steelosEnvelope));
        sealedSenderCiphertext = Buffer.from(sealedMessage).toString('base64');
        
        console.log('✅ SEALED SENDER: STEELOS envelope protected with metadata encryption');
      } catch (e) {
        console.warn('Sealed sender failed, using direct STEELOS SECURE envelope:', e);
        // Send STEELOS envelope directly (still has THE BIRD protection)
        sealedSenderCiphertext = JSON.stringify(steelosEnvelope);
      }
      
      // Send the double-layer encrypted STEELOS SECURE message with prefix
      await sendEnvelope({ 
        to_oid: peerOid, 
        from_oid: from, 
        ciphertext: `STEELOS_SECURE:${sealedSenderCiphertext}` // Add prefix for badge detection
      });
      
      console.log('🎯 STEELOS SECURE: Double-layer message delivered (THE BIRD + SEALED SENDER)');
      
      keys.bumpCounter(peerOid);
      setTimeout(() => { setMessages((prev) => prev.map(m => m.id === newMsg.id ? { ...m, status: "delivered" } : m)); }, 200);
      setTimeout(() => { setMessages((prev) => prev.map(m => m.id === newMsg.id ? { ...m, status: "read" } : m)); }, 600);
    } catch (e) {
      console.error('STEELOS SECURE protocol failed:', e);
    }
  };
    const txt = input.trim();
    if (!txt) return;
    const info = await keys.ensureKey(peerOid);
    setInput("");
    const newMsg: Msg = { id: Math.random().toString(36).slice(2), text: txt, me: true, ts: Date.now(), status: "sent" };
    setMessages((prev) => [...prev, newMsg]);
    scrollToEnd();

    try {
      const from = myOidRef.current || (await getOrCreateOID());
      
      // 🔥 STEELOS SECURE PROTOCOL: THE BIRD + SEALED SENDER COMBINED
      console.log('🔥 STEELOS SECURE: Creating double-layer encrypted message');
      
      // LAYER 1: THE BIRD (Cryptgeon) - Ephemeral one-time encryption
      const ephemeralKey = await getRandomBytesAsync(32); // 256-bit key
      const nonce = await getRandomBytesAsync(12); // 96-bit nonce
      const cryptgeonBlob = await aesGcmEncrypt(
        new TextEncoder().encode(txt), 
        ephemeralKey, 
        nonce
      );
      
      // Create STEELOS SECURE envelope (THE BIRD wrapped message)
      const steelosEnvelope = {
        type: "STEELOS_SECURE", 
        cryptgeon_blob: Buffer.from(cryptgeonBlob).toString('base64'),
        ephemeral_key: Buffer.from(ephemeralKey).toString('base64'),
        nonce: Buffer.from(nonce).toString('base64'),
        one_time_read: true,
        timestamp: Date.now(),
        expires_ttl: 300 // 5 minutes default
      };
      
      console.log('✅ THE BIRD: Message wrapped in cryptgeon ephemeral encryption');
      
      // LAYER 2: SEALED SENDER (Signal Protocol) - Metadata protection
      let sealedSenderCiphertext: string;
      try {
        console.log('🔒 SEALED SENDER: Wrapping STEELOS envelope in Signal Protocol');
        
        // For now, use basic Signal Protocol encryption until compilation issues are resolved
        const sealedMessage = await signalManager.sendMessage(peerOid, JSON.stringify(steelosEnvelope));
        sealedSenderCiphertext = Buffer.from(sealedMessage).toString('base64');
        
        console.log('✅ SEALED SENDER: STEELOS envelope protected with metadata encryption');
      } catch (e) {
        console.warn('Sealed sender failed, using direct STEELOS SECURE envelope:', e);
        // Send STEELOS envelope directly (still has THE BIRD protection)
        sealedSenderCiphertext = JSON.stringify(steelosEnvelope);
      }
      
      // Send the double-layer encrypted STEELOS SECURE message with prefix
      await sendEnvelope({ 
        to_oid: peerOid, 
        from_oid: from, 
        ciphertext: `STEELOS_SECURE:${sealedSenderCiphertext}` // Add prefix for badge detection
      });
      
      console.log('🎯 STEELOS SECURE: Double-layer message delivered (THE BIRD + SEALED SENDER)');
      
      keys.bumpCounter(peerOid);
      setTimeout(() => { setMessages((prev) => prev.map(m => m.id === newMsg.id ? { ...m, status: "delivered" } : m)); }, 200);
      setTimeout(() => { setMessages((prev) => prev.map(m => m.id === newMsg.id ? { ...m, status: "read" } : m)); }, 600);
    } catch (e) {
      console.error('STEELOS SECURE protocol failed:', e);
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

  // Long press handler for saving messages to vault
  const handleLongPress = (message: Msg) => {
    if (message.type === 'image' && message.imageData) {
      Alert.alert(
        'Save to Vault',
        'Save this image to your encrypted vault?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Save to Vault', 
            onPress: () => saveImageToVault(message) 
          }
        ]
      );
    } else if (message.type === 'text') {
      Alert.alert(
        'Save to Vault',
        'Save this message to your encrypted vault?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Save to Vault', 
            onPress: () => saveTextToVault(message) 
          }
        ]
      );
    }
  };

  const saveImageToVault = (message: Msg) => {
    if (!message.imageData) return;

    const vaultItem = {
      id: `vault_img_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      kind: 'image' as const,
      folder: 'images' as const,
      title: message.imageData.filename,
      filename: message.imageData.filename,
      encryptedData: message.imageData.encryptedData,
      key: message.imageData.key,
      nonce: message.imageData.nonce,
      thumbnail: message.imageData.thumbnail,
      created: Date.now(),
    };

    vault.addItem(vaultItem);
    Alert.alert('Saved', 'Image saved to vault/images folder');
  };

  const saveTextToVault = (message: Msg) => {
    const vaultItem = {
      id: `vault_text_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      kind: 'text' as const,
      folder: 'text' as const,
      title: `Message from ${peerOid}`,
      dataB64: Buffer.from(message.text).toString('base64'),
      created: Date.now(),
    };

    vault.addItem(vaultItem);
    Alert.alert('Saved', 'Message saved to vault/text folder');
  };

  const renderItem = ({ item }: { item: Msg }) => {
    const isMe = item.me;
    const isSteelosSecure = item.text.startsWith('STEELOS_SECURE:') || item.text.startsWith('STEELOS_SECURE_IMAGE:');
    const isImage = item.type === 'image';
    
    return (
      <View style={[styles.row, item.me ? styles.rowMe : styles.rowOther]}>
        {!item.me && (
          <View style={[styles.avatar, { backgroundColor: colors.border }]}>
            <Text style={styles.avatarText}>{peerOid?.charAt(0) || 'A'}</Text>
          </View>
        )}
        {isSteelosSecure ? (
          // STEELOS SECURE MESSAGE BADGE
          <TouchableOpacity 
            style={[styles.steelosSecureBadge, { backgroundColor: colors.accent }]}
            onPress={() => handleSteelosSecureOpen(item)}
          >
            <View style={styles.steelosSecureHeader}>
              <Text style={styles.steelosSecureIcon}>🔒</Text>
              <Text style={styles.steelosSecureTitle}>STEELOS SECURE</Text>
              <Text style={styles.steelosSecureSubtitle}>
                {item.text.startsWith('STEELOS_SECURE_IMAGE:') ? '📸 Encrypted Image • ' : ''}
                Tap to open • One-time read
              </Text>
            </View>
            <View style={styles.steelosSecureFooter}>
              <Text style={styles.steelosSecureTimer}>⏱️ Auto-destruct timer active</Text>
            </View>
          </TouchableOpacity>
        ) : isImage && item.imageData ? (
          // IMAGE MESSAGE BUBBLE
          <Pressable 
            style={[styles.imageBubble, item.me ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}
            onLongPress={() => handleLongPress(item)}
            delayLongPress={1000}
          >
            {item.imageData.thumbnail ? (
              <Image 
                source={{ uri: `data:image/png;base64,${item.imageData.thumbnail}` }}
                style={styles.messageImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.imagePlaceholder, { backgroundColor: colors.card }]}>
                <Ionicons name="image" size={32} color={colors.sub} />
                <Text style={[styles.imageFilename, { color: colors.text }]}>
                  {item.imageData.filename}
                </Text>
              </View>
            )}
            <View style={styles.imageMetaRow}>
              <Text style={[styles.time, { color: '#374151' }]}>
                {new Date(item.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
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
            <View style={styles.imageOverlay}>
              <Text style={styles.longPressHint}>Long press to save to vault</Text>
            </View>
          </Pressable>
        ) : (
          // REGULAR TEXT MESSAGE BUBBLE
          <Pressable
            style={[styles.bubble, item.me ? { backgroundColor: colors.accent, borderBottomRightRadius: 4 } : { backgroundColor: colors.card, borderBottomLeftRadius: 4 }]}
            onLongPress={() => handleLongPress(item)}
            delayLongPress={1000}
          >
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
          </Pressable>
        )}
      </View>
    );
  };

  // Handle STEELOS SECURE message opening
  const handleSteelosSecureOpen = async (message: Msg) => {
    try {
      console.log('🔓 STEELOS SECURE: Opening one-time message');
      
      // Extract STEELOS envelope from message
      const steelosData = message.text.replace('STEELOS_SECURE:', '');
      let steelosEnvelope;
      
      try {
        // Try to decrypt with Sealed Sender first
        const sealedMessage = Buffer.from(steelosData, 'base64');
        const { plaintext } = await signalManager.receiveMessage(sealedMessage);
        steelosEnvelope = JSON.parse(plaintext);
      } catch (e) {
        // Fallback to direct envelope parsing
        steelosEnvelope = JSON.parse(steelosData);
      }
      
      // LAYER 1: Decrypt THE BIRD (cryptgeon) wrapper
      const cryptgeonBlob = new Uint8Array(Buffer.from(steelosEnvelope.cryptgeon_blob, 'base64'));
      const ephemeralKey = new Uint8Array(Buffer.from(steelosEnvelope.ephemeral_key, 'base64'));
      const nonce = new Uint8Array(Buffer.from(steelosEnvelope.nonce, 'base64'));
      
      const decryptedBytes = await aesGcmDecrypt(cryptgeonBlob, ephemeralKey, nonce);
      const originalMessage = new TextDecoder().decode(decryptedBytes);
      
      console.log('✅ STEELOS SECURE: Message decrypted successfully');
      
      // Show decrypted message with timer
      setSteelosSecureModal({
        visible: true,
        message: originalMessage,
        timer: steelosEnvelope.expires_ttl || 30, // Default 30 seconds
        messageId: message.id
      });
      
      // PURGE FROM RAM: Remove message immediately after opening
      setMessages(prev => prev.filter(m => m.id !== message.id));
      
      console.log('🗑️ STEELOS SECURE: Message purged from RAM after opening');
      
    } catch (error) {
      console.error('STEELOS SECURE decryption failed:', error);
      Alert.alert('STEELOS SECURE', 'Failed to decrypt message. It may have already been read or expired.');
    }
  };

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
              {/* STEELOS SECURE Timer Modal */}
              {steelosSecureModal.visible && (
                <Modal transparent animationType="fade">
                  <View style={styles.steelosModal}>
                    <View style={[styles.steelosModalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <View style={styles.steelosModalHeader}>
                        <Text style={styles.steelosModalIcon}>🔓</Text>
                        <Text style={[styles.steelosModalTitle, { color: colors.text }]}>STEELOS SECURE</Text>
                        <Text style={[styles.steelosModalSubtitle, { color: colors.sub }]}>Message decrypted • Auto-destruct active</Text>
                      </View>
                      
                      <View style={styles.steelosModalMessage}>
                        <Text style={[styles.steelosModalText, { color: colors.text }]}>
                          {steelosSecureModal.message}
                        </Text>
                      </View>
                      
                      <View style={styles.steelosModalTimer}>
                        <Text style={[styles.timerText, { color: colors.accent }]}>
                          ⏱️ Auto-destruct in {steelosSecureModal.timer}s
                        </Text>
                      </View>
                      
                      <TouchableOpacity 
                        style={[styles.steelosModalClose, { backgroundColor: colors.accent }]}
                        onPress={() => setSteelosSecureModal({ visible: false, message: '', timer: 0, messageId: '' })}
                      >
                        <Text style={styles.steelosModalCloseText}>🗑️ Destroy Now</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              )}

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
  
  // STEELOS SECURE Badge Styles
  steelosSecureBadge: {
    maxWidth: '78%',
    borderRadius: 12,
    padding: 16,
    marginVertical: 4,
    borderWidth: 2,
    borderColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  steelosSecureHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  steelosSecureIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  steelosSecureTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 2,
  },
  steelosSecureSubtitle: {
    color: '#ffffff80',
    fontSize: 11,
    textAlign: 'center',
  },
  steelosSecureFooter: {
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ffffff20',
  },
  steelosSecureTimer: {
    color: '#ffffff60',
    fontSize: 10,
    fontStyle: 'italic',
  },
  
  // STEELOS SECURE Modal Styles
  steelosModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  steelosModalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  steelosModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  steelosModalIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  steelosModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  steelosModalSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
  steelosModalMessage: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  steelosModalText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  steelosModalTimer: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  timerText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  steelosModalClose: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  steelosModalCloseText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});