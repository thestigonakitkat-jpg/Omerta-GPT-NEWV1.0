import React from "react";
import { View, Text, StyleSheet } from "react-native";
import OmertaLogo from "../src/components/OmertaLogo";
import { useTheme } from "../src/state/theme";

export default function LogoDemo() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>OMERTA Logo Variations</Text>
      
      {/* Large logo with text */}
      <View style={styles.logoSection}>
        <Text style={[styles.subtitle, { color: colors.sub }]}>Large with Text</Text>
        <OmertaLogo size={64} showText={true} />
      </View>

      {/* Medium logo with text */}
      <View style={styles.logoSection}>
        <Text style={[styles.subtitle, { color: colors.sub }]}>Medium with Text</Text>
        <OmertaLogo size={48} showText={true} />
      </View>

      {/* Small logo with text */}
      <View style={styles.logoSection}>
        <Text style={[styles.subtitle, { color: colors.sub }]}>Small with Text</Text>
        <OmertaLogo size={32} showText={true} />
      </View>

      {/* Logo only variations */}
      <View style={styles.logoSection}>
        <Text style={[styles.subtitle, { color: colors.sub }]}>Logo Only Variations</Text>
        <View style={styles.logoRow}>
          <OmertaLogo size={48} showText={false} />
          <OmertaLogo size={36} showText={false} />
          <OmertaLogo size={24} showText={false} />
        </View>
      </View>

      <Text style={[styles.description, { color: colors.sub }]}>
        Features: Red accents, security symbolism (encryption patterns, lock elements), 
        stealth OMERTA mark, "STEELOS SECURE" branding
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 30,
    textAlign: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginVertical: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    minWidth: '80%',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
  },
  description: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
});