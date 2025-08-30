import React, { useEffect, useState } from "react";
import { Modal, View, Text, StyleSheet } from "react-native";
import ScrambledPinPad from "../../../src/components/ScrambledPinPad";
import { useSecurity } from "../../../src/state/security";

export default function ChatsPinGate({ visible, onAuthed }: { visible: boolean; onAuthed: () => void }) {
  const sec = useSecurity();
  const [pin, setPin] = useState("");

  useEffect(() => { setPin(""); }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Enter Chats PIN</Text>
          <ScrambledPinPad onChange={setPin} onComplete={async (code) => {
            const ok = await sec.verifyChatsPin(code);
            if (ok) onAuthed();
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