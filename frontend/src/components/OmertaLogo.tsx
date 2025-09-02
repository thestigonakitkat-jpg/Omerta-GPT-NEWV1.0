import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Circle, Rect } from "react-native-svg";
import { useTheme } from "../state/theme";

export default function OmertaLogo({ size = 48, showText = true }: { size?: number; showText?: boolean }) {
  const { colors } = useTheme();
  const redAccent = "#ef4444";
  
  return (
    <View style={[styles.container, { width: showText ? size * 2.5 : size }]}>
      <View style={[styles.logoContainer, { width: size, height: size }]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          {/* Outer circle - red accent */}
          <Circle 
            cx="50" 
            cy="50" 
            r="45" 
            stroke={redAccent} 
            strokeWidth="4" 
            fill="none"
          />
          
          {/* Inner geometric pattern representing security/encryption */}
          <Path
            d="M25 50 L40 35 L60 35 L75 50 L60 65 L40 65 Z"
            stroke={colors.text}
            strokeWidth="2"
            fill="none"
          />
          
          {/* Central 'O' for OMERTA */}
          <Circle 
            cx="50" 
            cy="50" 
            r="12" 
            stroke={redAccent} 
            strokeWidth="3" 
            fill="none"
          />
          
          {/* Security lock elements */}
          <Rect
            x="45"
            y="46"
            width="10"
            height="8"
            rx="1"
            stroke={colors.text}
            strokeWidth="1.5"
            fill="none"
          />
          
          <Path
            d="M47 46 L47 43 Q50 40 53 43 L53 46"
            stroke={colors.text}
            strokeWidth="1.5"
            fill="none"
          />
        </Svg>
        
        {/* Minimal stealth OMERTA mark overlay */}
        <View style={[styles.overlay, { backgroundColor: colors.bg + '88' }]}>
          <Text style={[styles.overlayText, { color: redAccent }]}>O</Text>
        </View>
      </View>
      
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.titleText, { color: colors.text }]}>OMERTA</Text>
          <Text style={[styles.subtitleText, { color: redAccent }]}>STEELOS SECURE</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayText: {
    fontSize: 10,
    fontWeight: '900',
  },
  textContainer: {
    marginLeft: 12,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subtitleText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});