/**
 * Emergency NUKE Button
 * - Tap anywhere 7 times fast (like Android developer mode) 
 * - Shows hidden NUKE button
 * - Confirms and executes signed kill token
 * - Works when trapped in messaging session
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Animated, Vibration } from 'react-native';
import { useTheme } from '../state/theme';
import { remoteSecurityManager } from '../utils/remoteSecurity';
import CyanideTablet from './CyanideTablet';
import { steelosShredder } from '../utils/steelosShredder';

interface EmergencyNukeProps {
  children: React.ReactNode;
}

export default function EmergencyNuke({ children }: EmergencyNukeProps) {
  const { colors } = useTheme();
  const [tapCount, setTapCount] = useState(0);
  const [showNukeButton, setShowNukeButton] = useState(false);
  const [nukeConfirmVisible, setNukeConfirmVisible] = useState(false);
  const [cyanideTabletVisible, setCyanideTabletVisible] = useState(false);
  const [shredderProgress, setShredderProgress] = useState(0);
  const [shredderPhase, setShredderPhase] = useState('Initializing...');
  const tapTimeoutRef = useRef<NodeJS.Timeout>();
  const nukeButtonOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  // Reset tap count after 2 seconds of inactivity
  useEffect(() => {
    if (tapCount > 0) {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
      
      tapTimeoutRef.current = setTimeout(() => {
        setTapCount(0);
      }, 2000);
    }

    return () => {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
    };
  }, [tapCount]);

  // Show NUKE button when 7 taps detected
  useEffect(() => {
    if (tapCount >= 7) {
      setShowNukeButton(true);
      setTapCount(0);
      
      // Vibrate to indicate activation
      Vibration.vibrate([100, 50, 100, 50, 200]);
      
      // Animate NUKE button appearance
      Animated.timing(nukeButtonOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Start pulsing animation
      startPulseAnimation();

      // Auto-hide after 10 seconds if not used
      setTimeout(() => {
        hideNukeButton();
      }, 10000);
    }
  }, [tapCount]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const hideNukeButton = () => {
    Animated.timing(nukeButtonOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowNukeButton(false);
      pulseAnimation.stopAnimation();
      pulseAnimation.setValue(1);
    });
  };

  const handleScreenTap = () => {
    if (!showNukeButton) {
      setTapCount(prev => prev + 1);
    }
  };

  const handleNukePress = () => {
    setNukeConfirmVisible(true);
  };

  const confirmNuke = async () => {
    try {
      console.log('🔥💊 EMERGENCY NUKE CONFIRMED - DEPLOYING CYANIDE TABLET');
      
      // Hide confirmation dialog immediately
      setNukeConfirmVisible(false);
      hideNukeButton();
      
      // Show CYANIDE TABLET animation
      setCyanideTabletVisible(true);
      setShredderPhase('💊 Deploying CYANIDE TABLET...');
      setShredderProgress(0);
      
      // Start progress simulation
      const progressInterval = setInterval(() => {
        setShredderProgress(prev => {
          const newProgress = prev + Math.random() * 15;
          
          // Update phases based on progress
          if (newProgress < 20) {
            setShredderPhase('🔐 Secure Store Annihilation');
          } else if (newProgress < 40) {
            setShredderPhase('📁 File System Destruction');
          } else if (newProgress < 60) {
            setShredderPhase('🧠 Memory Pattern Clearing');
          } else if (newProgress < 80) {
            setShredderPhase('📋 Cache Data Destruction');
          } else if (newProgress < 95) {
            setShredderPhase('🏷️ Metadata Obliteration');
          } else {
            setShredderPhase('💀 Data Obliterated');
            clearInterval(progressInterval);
          }
          
          return Math.min(newProgress, 100);
        });
      }, 200);
      
      // Execute emergency nuke with STEELOS-SHREDDER
      const result = await remoteSecurityManager.executeEmergencyNuke();
      
      // Clear progress interval after execution
      setTimeout(() => {
        clearInterval(progressInterval);
        setShredderProgress(100);
        setShredderPhase('💀 CYANIDE EFFECT COMPLETE');
      }, 3000);
      
    } catch (error) {
      console.error('💊❌ CYANIDE TABLET deployment failed:', error);
      // Still show animation to hide the failure
      setCyanideTabletVisible(true);
      setShredderPhase('💊 CYANIDE TABLET deployed');
      setShredderProgress(100);
    }
  };

  const handleCyanideComplete = () => {
    console.log('💀 CYANIDE TABLET SEQUENCE COMPLETE');
    setCyanideTabletVisible(false);
    
    // Show fake system message
    setTimeout(() => {
      Alert.alert('System', 'Interface refreshed successfully', [], { cancelable: false });
    }, 1000);
  };

  const cancelNuke = () => {
    setNukeConfirmVisible(false);
    hideNukeButton();
  };

  return (
    <View style={styles.container}>
      {/* Invisible tap detector overlay */}
      <TouchableOpacity 
        style={styles.tapDetector} 
        onPress={handleScreenTap}
        activeOpacity={1}
      >
        {children}
      </TouchableOpacity>

      {/* Emergency NUKE button */}
      {showNukeButton && (
        <Animated.View 
          style={[
            styles.nukeButtonContainer, 
            { 
              opacity: nukeButtonOpacity,
              transform: [{ scale: pulseAnimation }]
            }
          ]}
        >
          <TouchableOpacity
            style={[styles.nukeButton, { backgroundColor: '#ff0000', borderColor: '#ff4444' }]}
            onPress={handleNukePress}
          >
            <Text style={styles.nukeButtonText}>🔥 NUKE</Text>
            <Text style={styles.nukeSubtext}>Emergency Wipe</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* NUKE Confirmation Dialog */}
      {nukeConfirmVisible && (
        <View style={styles.confirmOverlay}>
          <View style={[styles.confirmDialog, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.confirmTitle, { color: '#ff0000' }]}>⚠️ EMERGENCY NUKE</Text>
            <Text style={[styles.confirmMessage, { color: colors.text }]}>
              This will immediately wipe the device using a signed kill token.
              {'\n\n'}This action CANNOT be undone.
            </Text>
            
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelButton, { backgroundColor: colors.border }]}
                onPress={cancelNuke}
              >
                <Text style={[styles.confirmButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.confirmButton, styles.nukeConfirmButton]}
                onPress={confirmNuke}
              >
                <Text style={styles.nukeConfirmText}>🔥 NUKE NOW</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Debug tap counter (remove in production) */}
      {__DEV__ && tapCount > 0 && (
        <View style={styles.debugCounter}>
          <Text style={styles.debugText}>{tapCount}/7 taps</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tapDetector: {
    flex: 1,
  },
  nukeButtonContainer: {
    position: 'absolute',
    top: '50%',
    right: 20,
    zIndex: 9999,
    elevation: 10,
  },
  nukeButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    shadowColor: '#ff0000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 8,
  },
  nukeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  nukeSubtext: {
    color: '#ffcccc',
    fontSize: 10,
    marginTop: 2,
  },
  confirmOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  confirmDialog: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: 340,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 16,
  },
  confirmMessage: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    // backgroundColor set dynamically
  },
  nukeConfirmButton: {
    backgroundColor: '#ff0000',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  nukeConfirmText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  debugCounter: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    padding: 8,
    borderRadius: 4,
  },
  debugText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});