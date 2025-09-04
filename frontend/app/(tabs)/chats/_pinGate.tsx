import React, { useEffect, useState } from "react";
import { Modal, View, Text, StyleSheet } from "react-native";
import ScrambledPinPad from "../../../src/components/ScrambledPinPad";
import { useSecurity } from "../../../src/state/security";
import { autoWipe } from "../../../src/utils/autoWipe";
import { activeAuthWipe } from "../../../src/utils/activeAuthWipe";
import * as SecureStore from "expo-secure-store";

const CHATS_PIN = "chats_pin_hash";

export default function ChatsPinGate({ visible, onAuthed }: { visible: boolean; onAuthed: () => void }) {
  const sec = useSecurity();
  const [pin, setPin] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const has = await SecureStore.getItemAsync(CHATS_PIN);
      if (mounted && !has && visible) {
        // No PIN set yet; allow entry
        onAuthed();
      }
    })();
    return () => { mounted = false; };
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Enter Chats PIN</Text>
          <ScrambledPinPad onChange={setPin} onComplete={async (code) => {
            const ok = await sec.verifyChatsPin(code);
            if (ok) {
              // Track user login activity for auto-wipe
              autoWipe.onUserLogin();
              onAuthed();
            }
          }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '86%', backgroundColor: '#111827', borderRadius: 12, padding: 16, borderColor: '#1f2937', borderWidth: 1 },
  title: { color: '#fff', fontWeight: '700', marginBottom: 12, textAlign: 'center' },
});