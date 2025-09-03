/**
 * Disguised App Icons for OMERTA
 * - Makes OMERTA look like innocent apps (Bicycle, Health, Google)
 * - Stealth mode to avoid detection
 * - User can switch between disguises
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Rect, LinearGradient, Stop, Defs } from 'react-native-svg';

export type DisguiseType = 'omerta' | 'bicycle' | 'health' | 'google' | 'calculator' | 'weather';

interface DisguisedAppIconProps {
  disguise: DisguiseType;
  size?: number;
  showText?: boolean;
}

export default function DisguisedAppIcon({ disguise, size = 60, showText = true }: DisguisedAppIconProps) {
  
  const renderOmertaIcon = () => (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="omertaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#ef4444" />
          <Stop offset="100%" stopColor="#991b1b" />
        </LinearGradient>
      </Defs>
      <Circle cx="50" cy="50" r="45" fill="url(#omertaGrad)" />
      <Circle cx="50" cy="50" r="20" fill="none" stroke="#fff" strokeWidth="4" />
      <Text x="50" y="58" textAnchor="middle" fill="#fff" fontSize="24" fontWeight="bold">O</Text>
    </Svg>
  );

  const renderBicycleIcon = () => (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="bicycleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#22c55e" />
          <Stop offset="100%" stopColor="#16a34a" />
        </LinearGradient>
      </Defs>
      <Rect width="100" height="100" rx="20" fill="url(#bicycleGrad)" />
      
      {/* Bicycle wheels */}
      <Circle cx="25" cy="70" r="12" fill="none" stroke="#fff" strokeWidth="3" />
      <Circle cx="75" cy="70" r="12" fill="none" stroke="#fff" strokeWidth="3" />
      
      {/* Bicycle frame */}
      <Path d="M25 70 L50 30 L75 70 L50 50 L25 70" stroke="#fff" strokeWidth="2.5" fill="none" />
      <Path d="M40 50 L60 50" stroke="#fff" strokeWidth="2.5" />
      
      {/* Handlebar */}
      <Path d="M45 30 L55 30" stroke="#fff" strokeWidth="2.5" />
    </Svg>
  );

  const renderHealthIcon = () => (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="healthGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#ef4444" />
          <Stop offset="100%" stopColor="#dc2626" />
        </LinearGradient>
      </Defs>
      <Rect width="100" height="100" rx="20" fill="url(#healthGrad)" />
      
      {/* Heart shape */}
      <Path 
        d="M50 75 C40 65, 20 45, 20 35 C20 25, 30 20, 40 25 C45 27, 50 30, 50 30 C50 30, 55 27, 60 25 C70 20, 80 25, 80 35 C80 45, 60 65, 50 75 Z" 
        fill="#fff" 
      />
    </Svg>
  );

  const renderGoogleIcon = () => (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect width="100" height="100" rx="20" fill="#fff" />
      
      {/* Google "G" with rainbow colors */}
      <Path d="M50 20 C65 20, 77 32, 77 47 L65 47 C65 38, 58 32, 50 32 C38 32, 28 42, 28 54 C28 66, 38 76, 50 76 C58 76, 64 71, 66 64 L54 64 L54 54 L77 54 C78 58, 78 62, 77 66 C74 81, 63 88, 50 88 C32 88, 18 74, 18 56 C18 38, 32 24, 50 24" 
            fill="#4285f4" />
      
      {/* Rainbow accent */}
      <Circle cx="50" cy="50" r="3" fill="#ea4335" />
      <Circle cx="55" cy="45" r="2" fill="#fbbc05" />
      <Circle cx="45" cy="55" r="2" fill="#34a853" />
    </Svg>
  );

  const renderCalculatorIcon = () => (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="calcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#374151" />
          <Stop offset="100%" stopColor="#1f2937" />
        </LinearGradient>
      </Defs>
      <Rect width="100" height="100" rx="15" fill="url(#calcGrad)" />
      
      {/* Calculator display */}
      <Rect x="10" y="15" width="80" height="25" rx="5" fill="#000" />
      <Text x="85" y="32" textAnchor="end" fill="#0f0" fontSize="12" fontFamily="monospace">123.45</Text>
      
      {/* Calculator buttons */}
      <Rect x="12" y="50" width="15" height="12" rx="2" fill="#555" />
      <Rect x="32" y="50" width="15" height="12" rx="2" fill="#555" />
      <Rect x="52" y="50" width="15" height="12" rx="2" fill="#555" />
      <Rect x="72" y="50" width="15" height="12" rx="2" fill="#f59e0b" />
      
      <Rect x="12" y="68" width="15" height="12" rx="2" fill="#555" />
      <Rect x="32" y="68" width="15" height="12" rx="2" fill="#555" />
      <Rect x="52" y="68" width="15" height="12" rx="2" fill="#555" />
      <Rect x="72" y="68" width="15" height="12" rx="2" fill="#f59e0b" />
    </Svg>
  );

  const renderWeatherIcon = () => (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="weatherGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#60a5fa" />
          <Stop offset="100%" stopColor="#3b82f6" />
        </LinearGradient>
      </Defs>
      <Rect width="100" height="100" rx="20" fill="url(#weatherGrad)" />
      
      {/* Sun */}
      <Circle cx="35" cy="35" r="8" fill="#fbbf24" />
      <Path d="M35 20 L35 15 M50 35 L55 35 M46 21 L49 18 M46 49 L49 52 M20 35 L15 35 M24 21 L21 18 M24 49 L21 52 M35 50 L35 55" 
            stroke="#fbbf24" strokeWidth="2" />
      
      {/* Cloud */}
      <Path d="M25 60 C20 60, 15 65, 20 70 L75 70 C80 70, 85 65, 80 60 C80 55, 75 50, 70 55 C65 50, 60 55, 60 60 Z" 
            fill="#fff" opacity="0.9" />
      
      {/* Rain drops */}
      <Circle cx="30" cy="80" r="1.5" fill="#60a5fa" />
      <Circle cx="45" cy="85" r="1.5" fill="#60a5fa" />
      <Circle cx="60" cy="80" r="1.5" fill="#60a5fa" />
    </Svg>
  );

  const renderIcon = () => {
    switch (disguise) {
      case 'bicycle': return renderBicycleIcon();
      case 'health': return renderHealthIcon();
      case 'google': return renderGoogleIcon();
      case 'calculator': return renderCalculatorIcon();
      case 'weather': return renderWeatherIcon();
      default: return renderOmertaIcon();
    }
  };

  const getAppName = () => {
    switch (disguise) {
      case 'bicycle': return 'Bike Routes';
      case 'health': return 'Health';
      case 'google': return 'Google';
      case 'calculator': return 'Calculator';
      case 'weather': return 'Weather';
      default: return 'OMERTA';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        {renderIcon()}
      </View>
      {showText && (
        <Text style={styles.appName}>{getAppName()}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  appName: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
});