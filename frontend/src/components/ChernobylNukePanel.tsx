/**
 * Chernobyl-Style NUKE Control Panel
 * - Nuclear power plant aesthetic with Cyrillic text
 * - Big red NUKE button center screen
 * - Fake buttons and switches that don't work
 * - Flashing warning lights and alarms
 * - Authentic Soviet-era industrial design
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  TouchableOpacity,
  Modal,
  Vibration,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

interface ChernobylNukePanelProps {
  visible: boolean;
  onNukePress: () => void;
  onCancel: () => void;
}

export default function ChernobylNukePanel({ 
  visible, 
  onNukePress, 
  onCancel 
}: ChernobylNukePanelProps) {
  const [alarmActive, setAlarmActive] = useState(false);
  const [warningLights, setWarningLights] = useState(false);
  
  // Animation values
  const alarmFlash = useRef(new Animated.Value(0)).current;
  const warningFlash = useRef(new Animated.Value(0)).current;
  const nukeButtonPulse = useRef(new Animated.Value(1)).current;
  const panelGlow = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (visible) {
      startControlPanelAnimations();
    } else {
      stopControlPanelAnimations();
    }
  }, [visible]);

  const startControlPanelAnimations = () => {
    console.log('🏭☢️ CHERNOBYL CONTROL PANEL ACTIVATED');
    
    setAlarmActive(true);
    setWarningLights(true);
    
    // Panel startup glow
    Animated.timing(panelGlow, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Alarm flash animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(alarmFlash, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(alarmFlash, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        })
      ])
    ).start();

    // Warning lights flash
    Animated.loop(
      Animated.sequence([
        Animated.timing(warningFlash, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(warningFlash, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      ])
    ).start();

    // NUKE button pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(nukeButtonPulse, {
          toValue: 1.1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(nukeButtonPulse, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        })
      ])
    ).start();
  };

  const stopControlPanelAnimations = () => {
    setAlarmActive(false);
    setWarningLights(false);
    
    alarmFlash.stopAnimation();
    warningFlash.stopAnimation();
    nukeButtonPulse.stopAnimation();
    panelGlow.stopAnimation();
    
    // Reset values
    alarmFlash.setValue(0);
    warningFlash.setValue(0);
    nukeButtonPulse.setValue(1);
    panelGlow.setValue(0);
  };

  const handleFakeButtonPress = (buttonName: string) => {
    // Fake buttons that don't work - just show error
    Vibration.vibrate(100);
    console.log(`❌ FAKE BUTTON PRESSED: ${buttonName} - NON-FUNCTIONAL`);
    
    // Sometimes show fake error messages
    if (Math.random() > 0.7) {
      Alert.alert(
        'СИСТЕМА ОШИБКА', // "SYSTEM ERROR" in Russian
        `Модуль ${buttonName} недоступен`, // "Module unavailable"
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  const handleNukeButtonPress = () => {
    console.log('🔴☢️ REAL NUKE BUTTON PRESSED - CYANIDE TABLET DEPLOYING');
    
    // Intense vibration for real button
    Vibration.vibrate([200, 100, 200, 100, 400]);
    
    // Brief delay for dramatic effect
    setTimeout(() => {
      onNukePress();
    }, 500);
  };

  const renderWarningLights = () => (
    <View style={styles.warningLightsContainer}>
      {[0, 1, 2, 3].map(i => (
        <Animated.View
          key={i}
          style={[
            styles.warningLight,
            {
              opacity: warningFlash.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 1]
              })
            }
          ]}
        >
          <LinearGradient
            colors={['#ff0000', '#ff4444', '#ff0000']}
            style={styles.warningLightGradient}
          />
        </Animated.View>
      ))}
    </View>
  );

  const renderFakeControlSwitches = () => (
    <View style={styles.controlSwitchesContainer}>
      {/* Top row switches */}
      <View style={styles.switchRow}>
        {['РЕАКТОР-1', 'РЕАКТОР-2', 'ОХЛАЖДЕНИЕ', 'ТУРБИНА'].map((label, i) => (
          <TouchableOpacity
            key={i}
            style={styles.fakeSwitch}
            onPress={() => handleFakeButtonPress(label)}
          >
            <LinearGradient
              colors={['#333333', '#555555', '#333333']}
              style={styles.switchBody}
            >
              <View style={[styles.switchHandle, { left: i % 2 === 0 ? 5 : 25 }]} />
            </LinearGradient>
            <Text style={styles.switchLabel}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bottom row switches */}
      <View style={styles.switchRow}>
        {['СИСТЕМА', 'ДАВЛЕНИЕ', 'ВЕНТИЛЯЦИЯ', 'БЕЗОПАСНОСТЬ'].map((label, i) => (
          <TouchableOpacity
            key={i}
            style={styles.fakeSwitch}
            onPress={() => handleFakeButtonPress(label)}
          >
            <LinearGradient
              colors={['#333333', '#555555', '#333333']}
              style={styles.switchBody}
            >
              <View style={[styles.switchHandle, { left: i % 2 === 1 ? 5 : 25 }]} />
            </LinearGradient>
            <Text style={styles.switchLabel}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderFakeButtons = () => (
    <View style={styles.fakeButtonsContainer}>
      {[
        { label: 'ТЕСТ', color: '#00ff00' },
        { label: 'СБРОС', color: '#ffff00' },
        { label: 'СТАТУС', color: '#0088ff' },
        { label: 'АВАРИЯ', color: '#ff8800' }
      ].map((button, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.fakeButton, { borderColor: button.color }]}
          onPress={() => handleFakeButtonPress(button.label)}
        >
          <LinearGradient
            colors={['#222222', '#444444', '#222222']}
            style={styles.fakeButtonGradient}
          >
            <Text style={[styles.fakeButtonText, { color: button.color }]}>
              {button.label}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderNukeButton = () => (
    <Animated.View
      style={[
        styles.nukeButtonContainer,
        {
          transform: [{ scale: nukeButtonPulse }],
          opacity: panelGlow
        }
      ]}
    >
      <TouchableOpacity
        style={styles.nukeButtonOuter}
        onPress={handleNukeButtonPress}
      >
        <LinearGradient
          colors={['#ff0000', '#cc0000', '#880000']}
          style={styles.nukeButtonInner}
        >
          <Animated.View
            style={[
              styles.nukeButtonGlow,
              {
                opacity: alarmFlash.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 1]
                })
              }
            ]}
          />
          
          <Text style={styles.nukeButtonText}>☢️</Text>
          <Text style={styles.nukeButtonLabel}>NUKE</Text>
          <Text style={styles.nukeButtonSubtext}>ЭКСТРЕННЫЙ СБРОС</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderAlarmDisplay = () => (
    <Animated.View
      style={[
        styles.alarmDisplay,
        {
          opacity: alarmFlash.interpolate({
            inputRange: [0, 1],
            outputRange: [0.5, 1]
          })
        }
      ]}
    >
      <LinearGradient
        colors={['#ff0000', '#ffff00', '#ff0000']}
        style={styles.alarmDisplayGradient}
      >
        <Text style={styles.alarmText}>⚠️ АВАРИЯ ⚠️</Text>
        <Text style={styles.alarmSubtext}>КРИТИЧЕСКОЕ СОСТОЯНИЕ</Text>
        <Text style={styles.alarmDetails}>РЕАКТОР ЧЕРНОБЫЛЬ-4</Text>
      </LinearGradient>
    </Animated.View>
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.container}>
        <LinearGradient
          colors={['#1a1a1a', '#2d2d2d', '#1a1a1a']}
          style={styles.backgroundPanel}
        >
          <BlurView intensity={20} style={styles.blurOverlay}>
            
            {/* Warning Lights */}
            {renderWarningLights()}

            {/* Alarm Display */}
            {renderAlarmDisplay()}

            {/* Control Panel Header */}
            <View style={styles.headerContainer}>
              <Text style={styles.headerText}>☢️ ЧЕРНОБЫЛЬСКАЯ АЭС ☢️</Text>
              <Text style={styles.headerSubtext}>СИСТЕМА АВАРИЙНОГО УПРАВЛЕНИЯ</Text>
            </View>

            {/* Fake Control Switches */}
            {renderFakeControlSwitches()}

            {/* Central NUKE Button */}
            {renderNukeButton()}

            {/* Fake Buttons */}
            {renderFakeButtons()}

            {/* Cancel Button (disguised as system button) */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
            >
              <LinearGradient
                colors={['#333333', '#555555', '#333333']}
                style={styles.cancelButtonGradient}
              >
                <Text style={styles.cancelButtonText}>ОТМЕНА</Text>
              </LinearGradient>
            </TouchableOpacity>

          </BlurView>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundPanel: {
    flex: 1,
  },
  blurOverlay: {
    flex: 1,
    padding: 20,
  },
  warningLightsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  warningLight: {
    width: 30,
    height: 30,
    borderRadius: 15,
    elevation: 8,
  },
  warningLightGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
  },
  alarmDisplay: {
    alignSelf: 'center',
    borderRadius: 8,
    marginBottom: 20,
    elevation: 10,
  },
  alarmDisplayGradient: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  alarmText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '900',
  },
  alarmSubtext: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  alarmDetails: {
    color: '#000000',
    fontSize: 10,
    marginTop: 2,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerText: {
    color: '#ffff00',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  headerSubtext: {
    color: '#ffffff',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  controlSwitchesContainer: {
    marginBottom: 30,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  fakeSwitch: {
    alignItems: 'center',
  },
  switchBody: {
    width: 50,
    height: 25,
    borderRadius: 12,
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#666666',
  },
  switchHandle: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#888888',
    position: 'absolute',
  },
  switchLabel: {
    color: '#cccccc',
    fontSize: 8,
    marginTop: 4,
    textAlign: 'center',
  },
  nukeButtonContainer: {
    alignSelf: 'center',
    marginVertical: 20,
  },
  nukeButtonOuter: {
    width: 150,
    height: 150,
    borderRadius: 75,
    elevation: 15,
    shadowColor: '#ff0000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  nukeButtonInner: {
    width: '100%',
    height: '100%',
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
    position: 'relative',
  },
  nukeButtonGlow: {
    position: 'absolute',
    width: '120%',
    height: '120%',
    borderRadius: 90,
    backgroundColor: '#ff0000',
    opacity: 0.3,
  },
  nukeButtonText: {
    fontSize: 40,
    marginBottom: 4,
  },
  nukeButtonLabel: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },
  nukeButtonSubtext: {
    color: '#ffcccc',
    fontSize: 10,
    marginTop: 2,
  },
  fakeButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  fakeButton: {
    borderRadius: 6,
    borderWidth: 2,
  },
  fakeButtonGradient: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  fakeButtonText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cancelButton: {
    alignSelf: 'center',
    borderRadius: 8,
    marginTop: 20,
  },
  cancelButtonGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#cccccc',
    fontSize: 14,
    fontWeight: '600',
  },
});