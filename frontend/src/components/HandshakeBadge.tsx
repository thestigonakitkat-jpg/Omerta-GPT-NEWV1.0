import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Rect, Circle } from "react-native-svg";
import { useTheme } from "../state/theme";

export default function HandshakeBadge({ small = false }: { small?: boolean }) {
  const { colors } = useTheme();
  const sz = small ? 16 : 18;
  return (
    <View style={[styles.wrap, { borderColor: colors.accent, backgroundColor: '#052e2b' }]}> 
      <Svg width={sz} height={sz} viewBox="0 0 24 24">
        <Path d="M8 12l2 2 6-6" stroke={colors.accent} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        <Path d="M3 12c0-5 4-9 9-9s9 4 9 9-4 9-9 9-9-4-9-9z" stroke={colors.accent} strokeWidth={1} fill="none"/>
      </Svg>
      {!small && <Text style={[styles.text, { color: colors.accent }]}>VERIFIED CONTACT</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  text: { marginLeft: 6, fontSize: 10, fontWeight: '800' },
});