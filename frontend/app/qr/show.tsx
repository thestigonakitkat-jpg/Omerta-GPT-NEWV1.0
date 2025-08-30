import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { getOrCreateOID } from "../../src/state/identity";

export default function ShowQR() {
  const [oid, setOid] = useState<string>("");
  useEffect(() => { (async () => setOid(await getOrCreateOID()))(); }, []);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your OID (QR)</Text>
      {oid ? (
        <View style={styles.card}>
          <QRCode value={JSON.stringify({ v: 1, oid })} size={240} backgroundColor="#111827" color="#22c55e" />
          <Text style={styles.oid}>{oid}</Text>
          <Text style={styles.note}>Show in person to verify. Screenshots are blocked.</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0b", alignItems: 'center', justifyContent: 'center', padding: 16 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  card: { backgroundColor: '#111827', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#1f2937' },
  oid: { color: '#9ca3af', marginTop: 8 },
  note: { color: '#6b7280', marginTop: 4, textAlign: 'center' },
});