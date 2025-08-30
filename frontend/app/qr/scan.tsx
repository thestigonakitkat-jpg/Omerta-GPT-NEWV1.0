import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { BarCodeScanner } from "expo-barcode-scanner";
import { useContacts } from "../../src/state/contacts";

export default function ScanQR() {
  const [hasPerm, setHasPerm] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const contacts = useContacts();

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPerm(status === 'granted');
    })();
  }, []);

  const onScan = ({ data }: { data: string }) => {
    setScanned(true);
    try {
      const obj = JSON.parse(data);
      if (obj && obj.oid) {
        contacts.markVerified(obj.oid);
        Alert.alert('Verified Contact', `OID ${obj.oid} verified.`);
      } else {
        Alert.alert('Invalid', 'QR did not contain an OID');
      }
    } catch {
      Alert.alert('Invalid', 'QR payload not recognized');
    }
  };

  if (hasPerm === null) return <View style={styles.container}><Text style={styles.text}>Requesting camera permission…</Text></View>;
  if (hasPerm === false) return <View style={styles.container}><Text style={styles.text}>No camera access</Text></View>;

  return (
    <View style={styles.container}>
      <View style={styles.frame}>
        <BarCodeScanner onBarCodeScanned={scanned ? undefined : onScan as any} style={StyleSheet.absoluteFillObject} />
      </View>
      {scanned && (
        <TouchableOpacity style={styles.btn} onPress={() => setScanned(false)}>
          <Text style={styles.btnText}>Scan Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0b", alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff' },
  frame: { width: 260, height: 260, borderColor: '#22c55e', borderWidth: 2, borderRadius: 12, overflow: 'hidden' },
  btn: { marginTop: 16, backgroundColor: '#22c55e', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  btnText: { color: '#000', fontWeight: '800' },
});