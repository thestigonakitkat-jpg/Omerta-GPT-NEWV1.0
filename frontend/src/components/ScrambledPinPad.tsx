import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export default function ScrambledPinPad({ length = 6, onChange, onComplete }: { length?: number; onChange?: (s: string) => void; onComplete?: (s: string) => void; }) {
  const digits = useMemo(() => {
    const arr = Array.from({ length: 10 }, (_, i) => String(i));
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, []);

  const [val, setVal] = React.useState("");

  function press(d: string) {
    if (d === "back") {
      const nv = val.slice(0, -1);
      setVal(nv); onChange?.(nv);
      return;
    }
    const nv = (val + d).slice(0, length);
    setVal(nv); onChange?.(nv);
    if (nv.length === length) onComplete?.(nv);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.dots}>
        {Array.from({ length }).map((_, i) => (
          <View key={i} style={[styles.dot, i < val.length && styles.dotFilled]} />
        ))}
      </View>
      <View style={styles.grid}>
        {digits.map((d) => (
          <TouchableOpacity key={d} style={styles.key} onPress={() => press(d)}>
            <Text style={styles.keyText}>{d}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[styles.key, styles.keyWide]} onPress={() => press("back")}>
          <Text style={styles.keyText}>←</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { },
  dots: { flexDirection: "row", justifyContent: "center", marginBottom: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#374151", marginHorizontal: 4 },
  dotFilled: { backgroundColor: "#22c55e" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
  key: { width: "28%", margin: "2%", aspectRatio: 1.6, backgroundColor: "#1f2937", borderRadius: 8, alignItems: "center", justifyContent: "center" },
  keyText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  keyWide: { width: "60%" },
});