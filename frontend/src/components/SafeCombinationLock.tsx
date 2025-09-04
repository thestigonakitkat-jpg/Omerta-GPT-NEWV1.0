/**
 * 🔒 SAFE COMBINATION LOCK - NSA SECURITY INTERFACE
 * 
 * Real safe-style combination dial interface for ultimate vault security.
 * Multi-layer authentication: 16-char passphrase + 6-digit PIN + 2-digit combination
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PanGestureHandler, State, Animated, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../state/theme';
import VaultSecurityPuzzle from './VaultSecurityPuzzle';

interface SafeCombinationLockProps {
  visible: boolean;
  onUnlock: () => void;
  onFail?: () => void;
}

interface CombinationState {
  passphrase: string;
  pin: string;
  combination: number[];
  currentStage: 'passphrase' | 'pin' | 'combination' | 'puzzle' | 'unlocking';
  dialPosition: number;
  attempts: number;
}

export const SafeCombinationLock: React.FC<SafeCombinationLockProps> = ({
  visible,
  onUnlock,
  onFail
}) => {
  const { colors } = useTheme();
  
  const [state, setState] = useState<CombinationState>({
    passphrase: '',
    pin: '',
    combination: [],
    currentStage: 'passphrase',
    dialPosition: 0,
    attempts: 0
  });

  const [showPuzzle, setShowPuzzle] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  
  // Animations
  const dialRotation = useRef(new Animated.Value(0)).current;
  const lockShake = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  // Safe combination (in production: would be stored securely)
  const CORRECT_COMBINATION = [73, 25]; // Right 73, Left 25
  const CORRECT_PASSPHRASE = "OmertaSecureVault25"; // 16+ chars
  const CORRECT_PIN = "123456";

  useEffect(() => {
    if (visible) {
      resetLock();
    }
  }, [visible]);

  const resetLock = () => {
    setState({
      passphrase: '',
      pin: '',
      combination: [],
      currentStage: 'passphrase',
      dialPosition: 0,
      attempts: 0
    });
    
    Animated.setValue(progressAnim, 0);
  };

  const handlePassphraseSubmit = () => {
    console.log('🔒 SAFE: Validating passphrase...');
    
    if (state.passphrase === CORRECT_PASSPHRASE) {
      setState(prev => ({ ...prev, currentStage: 'pin' }));
      updateProgress(1/4);
      console.log('✅ SAFE: Passphrase accepted');
    } else {
      handleFailedAttempt('Invalid passphrase');
    }
  };

  const handlePinSubmit = () => {
    console.log('🔒 SAFE: Validating PIN...');
    
    if (state.pin === CORRECT_PIN) {
      setState(prev => ({ ...prev, currentStage: 'combination' }));
      updateProgress(2/4);
      console.log('✅ SAFE: PIN accepted - Safe combination dial activated');
    } else {
      handleFailedAttempt('Invalid PIN');
    }
  };

  const handleDialTurn = (direction: 'left' | 'right', targetNumber: number) => {
    console.log(`🔒 SAFE: Turning dial ${direction} to ${targetNumber}`);
    
    // Animate dial rotation
    const rotationValue = direction === 'right' ? targetNumber * 10 : -targetNumber * 10;
    
    Animated.spring(dialRotation, {
      toValue: rotationValue,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
    
    setState(prev => ({
      ...prev,
      dialPosition: targetNumber,
      combination: [...prev.combination, targetNumber]
    }));
    
    // Check if combination is complete
    if (state.combination.length === 1) {
       // Second number entered, check combination
       const userCombination = [...state.combination, targetNumber];
       
       if (userCombination[0] === CORRECT_COMBINATION[0] && userCombination[1] === CORRECT_COMBINATION[1]) {
         console.log('✅ SAFE: Combination correct - Initiating security puzzle');
         updateProgress(3/4);
         setState(prev => ({ ...prev, currentStage: 'puzzle' }));
         setShowPuzzle(true);
       } else {
         handleFailedAttempt('Invalid combination');
       }
    }
  };

  const handlePuzzleComplete = () => {
    console.log('🔒 SAFE: Security puzzle completed - Final unlock sequence');
    setShowPuzzle(false);
    setState(prev => ({ ...prev, currentStage: 'unlocking' }));
    setIsUnlocking(true);
    updateProgress(4/4);
    
    // Final unlock animation
    setTimeout(() => {
      console.log('✅ SAFE: Vault unlocked successfully');
      onUnlock();
    }, 2000);
  };

  const handleFailedAttempt = (reason: string) => {
    const newAttempts = state.attempts + 1;
    
    console.warn(`⚠️ SAFE: Failed attempt ${newAttempts} - ${reason}`);
    
    // Shake animation
    Animated.sequence([
      Animated.timing(lockShake, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(lockShake, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(lockShake, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(lockShake, { toValue: 0, duration: 100, useNativeDriver: true })
    ]).start();
    
    setState(prev => ({ ...prev, attempts: newAttempts }));
    
    if (newAttempts >= 3) {
      Alert.alert(
        'Security Lockout',
        'Too many failed attempts. Vault locked for security.',
        [{ text: 'OK', onPress: () => onFail?.() }]
      );
    } else {
      Alert.alert(
        'Access Denied',
        `${reason}. ${3 - newAttempts} attempts remaining.`,
        [{ text: 'Try Again' }]
      );
      // Reset to passphrase stage
      setState(prev => ({ 
        ...prev, 
        passphrase: '', 
        pin: '', 
        combination: [], 
        currentStage: 'passphrase',
        dialPosition: 0
      }));
      Animated.setValue(progressAnim, 0);
    }
  };

  const updateProgress = (progress: number) => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  };

  const renderDialNumbers = () => {
    return Array.from({ length: 100 }, (_, i) => i).map(num => {
      const angle = (num * 3.6) - 90; // 360 degrees / 100 numbers
      const radian = (angle * Math.PI) / 180;
      const radius = 80;
      const x = radius * Math.cos(radian);
      const y = radius * Math.sin(radian);
      
      const isSelected = state.dialPosition === num;
      
      return (
        <TouchableOpacity
          key={num}
          style={[
            styles.dialNumber,
            {
              left: 100 + x - 12,
              top: 100 + y - 12,
              backgroundColor: isSelected ? colors.accent : 'transparent',
            }
          ]}
          onPress={() => {
            if (state.combination.length === 0) {
              handleDialTurn('right', num);
            } else if (state.combination.length === 1) {
              handleDialTurn('left', num);
            }
          }}
        >
          <Text style={[
            styles.dialNumberText,
            { color: isSelected ? '#000' : colors.text }
          ]}>
            {num}
          </Text>
        </TouchableOpacity>
      );
    });
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Animated.View style={[
        styles.safeContainer,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          transform: [{ translateX: lockShake }]
        }
      ]}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="safe" size={32} color={colors.accent} />
          <Text style={[styles.title, { color: colors.text }]}>🔒 OMERTÀ Security Vault</Text>
          <Text style={[styles.subtitle, { color: colors.sub }]}>
            Multi-Layer Authentication Required
          </Text>
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <Text style={[styles.progressLabel, { color: colors.text }]}>Security Layers</Text>
          <View style={[styles.progressBarContainer, { backgroundColor: colors.bg }]}>
            <Animated.View 
              style={[
                styles.progressBar,
                {
                  backgroundColor: colors.accent,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%']
                  })
                }
              ]}
            />
          </View>
          <View style={styles.progressSteps}>
            <Text style={[styles.progressStep, { color: colors.sub }]}>Passphrase</Text>
            <Text style={[styles.progressStep, { color: colors.sub }]}>PIN</Text>
            <Text style={[styles.progressStep, { color: colors.sub }]}>Combination</Text>
            <Text style={[styles.progressStep, { color: colors.sub }]}>Verification</Text>
          </View>
        </View>

        {/* Stage 1: Passphrase */}
        {state.currentStage === 'passphrase' && (
          <View style={styles.stageContainer}>
            <Text style={[styles.stageTitle, { color: colors.text }]}>
              🔑 Enter Vault Passphrase
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
              secureTextEntry
              placeholder="16+ character passphrase"
              placeholderTextColor={colors.muted}
              value={state.passphrase}
              onChangeText={(text) => setState(prev => ({ ...prev, passphrase: text }))}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.accent }]}
              onPress={handlePassphraseSubmit}
              disabled={state.passphrase.length < 16}
            >
              <Text style={styles.buttonText}>Verify Passphrase</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stage 2: PIN */}
        {state.currentStage === 'pin' && (
          <View style={styles.stageContainer}>
            <Text style={[styles.stageTitle, { color: colors.text }]}>
              🔢 Enter Security PIN
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
              secureTextEntry
              placeholder="6-digit PIN"
              placeholderTextColor={colors.muted}
              value={state.pin}
              onChangeText={(text) => setState(prev => ({ ...prev, pin: text.replace(/[^0-9]/g, '') }))}
              keyboardType="number-pad"
              maxLength={6}
            />
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.accent }]}
              onPress={handlePinSubmit}
              disabled={state.pin.length !== 6}
            >
              <Text style={styles.buttonText}>Verify PIN</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stage 3: Safe Combination Dial */}
        {state.currentStage === 'combination' && (
          <View style={styles.stageContainer}>
            <Text style={[styles.stageTitle, { color: colors.text }]}>
              🎯 Turn Safe Combination
            </Text>
            <Text style={[styles.combinationInstructions, { color: colors.sub }]}>
              Step {state.combination.length + 1} of 2: Turn {state.combination.length === 0 ? 'RIGHT' : 'LEFT'} to correct number
            </Text>
            
            {/* Safe Dial */}
            <View style={styles.dialContainer}>
              <Animated.View 
                style={[
                  styles.dial,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.accent,
                    transform: [{ rotate: dialRotation.interpolate({
                      inputRange: [-360, 360],
                      outputRange: ['-360deg', '360deg']
                    })}]
                  }
                ]}
              >
                {/* Dial Center */}
                <View style={[styles.dialCenter, { backgroundColor: colors.accent }]}>
                  <Text style={styles.dialCenterText}>{state.dialPosition}</Text>
                </View>
                
                {/* Dial Numbers */}
                {renderDialNumbers()}
              </Animated.View>
              
              {/* Combination Display */}
              <View style={styles.combinationDisplay}>
                <Text style={[styles.combinationLabel, { color: colors.text }]}>
                  Combination: {state.combination.join(' - ')}
                  {state.combination.length < 2 && ' - ?'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Stage 4: Unlocking */}
        {state.currentStage === 'unlocking' && (
          <View style={styles.stageContainer}>
            <View style={styles.unlockingContainer}>
              <Ionicons name="checkmark-circle" size={64} color={colors.accent} />
              <Text style={[styles.unlockingText, { color: colors.text }]}>
                All Security Layers Verified
              </Text>
              <Text style={[styles.unlockingSubtext, { color: colors.sub }]}>
                Opening secure vault...
              </Text>
            </View>
          </View>
        )}

        {/* Attempts Counter */}
        <View style={styles.attemptsContainer}>
          <Text style={[styles.attemptsText, { color: colors.sub }]}>
            Failed Attempts: {state.attempts}/3
          </Text>
        </View>
      </Animated.View>

      {/* Security Puzzle Overlay */}
      <VaultSecurityPuzzle 
        visible={showPuzzle}
        onComplete={handlePuzzleComplete}
        onFail={() => handleFailedAttempt('Security puzzle failed')}
        minimumTime={5000}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  safeContainer: {
    width: '95%',
    maxWidth: 500,
    borderRadius: 20,
    padding: 24,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 32,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStep: {
    fontSize: 10,
  },
  stageContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  stageTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 200,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  combinationInstructions: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  dialContainer: {
    alignItems: 'center',
  },
  dial: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    position: 'relative',
    marginBottom: 16,
  },
  dialCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 40,
    height: 40,
    borderRadius: 20,
    marginTop: -20,
    marginLeft: -20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  dialCenterText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  dialNumber: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialNumberText: {
    fontSize: 10,
    fontWeight: '600',
  },
  combinationDisplay: {
    alignItems: 'center',
  },
  combinationLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  unlockingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  unlockingText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  unlockingSubtext: {
    fontSize: 14,
  },
  attemptsContainer: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  attemptsText: {
    fontSize: 12,
  },
});

export default SafeCombinationLock;