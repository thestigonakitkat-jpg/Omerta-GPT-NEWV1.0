import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTextBlur } from '../utils/textBlur';
import { useTheme } from '../state/theme';

interface BlurredTextProps {
  children: React.ReactNode;
  elementId: string;
  style?: TextStyle | ViewStyle;
  textStyle?: TextStyle;
  blurIntensity?: number;
  showUnblurButton?: boolean;
  onBlur?: () => void;
  onUnblur?: () => void;
  disabled?: boolean;
}

export default function BlurredText({
  children,
  elementId,
  style,
  textStyle,
  blurIntensity = 80,
  showUnblurButton = true,
  onBlur,
  onUnblur,
  disabled = false
}: BlurredTextProps) {
  const [isBlurred, setIsBlurred] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const textBlur = useTextBlur();
  const { colors } = useTheme();
  const mountedRef = useRef(true);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (disabled) return;

    const config = textBlur.getConfig();
    if (!config.enabled) return;

    // Start countdown display
    setCountdownSeconds(config.blurDelay);
    setShowCountdown(true);

    // Start countdown timer
    countdownTimerRef.current = setInterval(() => {
      setCountdownSeconds(prev => {
        if (prev <= 1) {
          setShowCountdown(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Start blur timer
    textBlur.startBlurTimer(elementId, () => {
      if (mountedRef.current) {
        setIsBlurred(true);
        setShowCountdown(false);
        onBlur?.();
      }
    });

    return () => {
      textBlur.clearTimer(elementId);
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [elementId, disabled, onBlur]);

  // Listen for config changes
  useEffect(() => {
    const unsubscribe = textBlur.addListener((config) => {
      if (!config.enabled && isBlurred) {
        handleUnblur();
      }
    });

    return unsubscribe;
  }, [isBlurred]);

  const handleUnblur = () => {
    setIsBlurred(false);
    setShowCountdown(false);
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    
    // Restart timer
    const config = textBlur.getConfig();
    if (config.enabled && !disabled) {
      setCountdownSeconds(config.blurDelay);
      setShowCountdown(true);
      
      countdownTimerRef.current = setInterval(() => {
        setCountdownSeconds(prev => {
          if (prev <= 1) {
            setShowCountdown(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      textBlur.resetTimer(elementId, () => {
        if (mountedRef.current) {
          setIsBlurred(true);
          setShowCountdown(false);
          onBlur?.();
        }
      });
    }
    
    onUnblur?.();
  };

  const resetTimer = () => {
    if (disabled) return;
    
    const config = textBlur.getConfig();
    if (!config.enabled) return;

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }

    setCountdownSeconds(config.blurDelay);
    setShowCountdown(true);

    countdownTimerRef.current = setInterval(() => {
      setCountdownSeconds(prev => {
        if (prev <= 1) {
          setShowCountdown(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    textBlur.resetTimer(elementId, () => {
      if (mountedRef.current) {
        setIsBlurred(true);
        setShowCountdown(false);
        onBlur?.();
      }
    });
  };

  if (disabled || !textBlur.getConfig().enabled) {
    return (
      <View style={style}>
        <Text style={textStyle}>
          {children}
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity 
      style={[styles.container, style]} 
      onPress={resetTimer}
      activeOpacity={0.8}
    >
      <Text style={textStyle}>
        {children}
      </Text>
      
      {/* Countdown indicator */}
      {showCountdown && countdownSeconds > 0 && (
        <View style={[styles.countdownContainer, { backgroundColor: colors.accent + '20' }]}>
          <Ionicons name="timer-outline" size={12} color={colors.accent} />
          <Text style={[styles.countdownText, { color: colors.accent }]}>
            {countdownSeconds}s
          </Text>
        </View>
      )}

      {/* Blur overlay */}
      {isBlurred && (
        <View style={styles.blurOverlay}>
          <BlurView 
            intensity={blurIntensity} 
            style={styles.blurView}
            tint="light"
          >
            <View style={[styles.blurContent, { backgroundColor: colors.bg + '80' }]}>
              <Ionicons name="eye-off" size={24} color={colors.sub} />
              <Text style={[styles.blurText, { color: colors.sub }]}>
                Text Hidden
              </Text>
              {showUnblurButton && (
                <TouchableOpacity 
                  style={[styles.unblurButton, { backgroundColor: colors.accent }]}
                  onPress={handleUnblur}
                >
                  <Ionicons name="eye" size={16} color="white" />
                  <Text style={styles.unblurButtonText}>
                    Show
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </BlurView>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  countdownContainer: {
    position: 'absolute',
    top: -8,
    right: -8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
  },
  countdownText: {
    fontSize: 10,
    fontWeight: '600',
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
    overflow: 'hidden',
  },
  blurView: {
    flex: 1,
  },
  blurContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  blurText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  unblurButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  unblurButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});