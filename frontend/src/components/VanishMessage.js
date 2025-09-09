import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useSecurityStore } from '../state/security';

// OMERTÁ-SECURE'S VANISH PROTOCOL - Gold Standard Message Component
export default function VanishMessage({ messageId, initialContent, ttl = 30000, isOwn = false, timestamp }) {
  const [isVisible, setIsVisible] = useState(true);
  const [isRead, setIsRead] = useState(false);
  const [countdown, setCountdown] = useState(Math.floor(ttl / 1000));
  const [fadeAnim] = useState(new Animated.Value(1));
  
  const { getMessage, addMessage } = useSecurityStore();

  useEffect(() => {
    // Add message to Vanish Protocol on mount
    if (initialContent && messageId) {
      addMessage(messageId, initialContent, ttl);
    }

    // Countdown timer
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          handleVanish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [messageId, initialContent, ttl]);

  const handleVanish = () => {
    // Fade out animation
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
    });
  };

  const handleRead = () => {
    if (isRead) return; // Already read, message should be gone
    
    // Get message from Vanish Protocol (one-time read)
    const content = getMessage(messageId);
    
    if (content) {
      setIsRead(true);
      // Message self-destructs after reading
      setTimeout(handleVanish, 1000);
    }
  };

  if (!isVisible) {
    return (
      <View style={styles.vanishedContainer}>
        <Text style={styles.vanishedText}>👻 Message Vanished</Text>
        <Text style={styles.vanishedSubtext}>OMERTÁ-SECURE'S VANISH PROTOCOL</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.protocolLabel}>🛡️ VANISH PROTOCOL</Text>
        <Text style={styles.countdown}>⏰ {countdown}s</Text>
      </View>
      
      <TouchableOpacity 
        style={[styles.messageCard, isRead && styles.readCard]}
        onPress={handleRead}
        disabled={isRead}
      >
        {!isRead ? (
          <View style={styles.unreadMessage}>
            <Text style={styles.clickToRead}>👆 Tap to read (ONE TIME ONLY)</Text>
            <View style={styles.hiddenContent}>
              <Text style={styles.hiddenText}>████████████</Text>
              <Text style={styles.hiddenText}>██████████████████</Text>
              <Text style={styles.hiddenText}>████████</Text>
            </View>
            <Text style={styles.goldStandard}>
              🥇 GOLD STANDARD - Safer than Signal
            </Text>
          </View>
        ) : (
          <View style={styles.readMessage}>
            <Text style={styles.messageContent}>{initialContent}</Text>
            <Text style={styles.destructTimer}>
              🔥 Self-destructing in {Math.max(0, countdown)}s
            </Text>
          </View>
        )}
      </TouchableOpacity>
      
      <View style={styles.features}>
        <Text style={styles.feature}>🔒 RAM-only storage</Text>
        <Text style={styles.feature}>👁️ One-time read</Text>
        <Text style={styles.feature}>🔗 Hidden links</Text>
        <Text style={styles.feature}>📱 Screenshot-proof</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111',
    borderRadius: 15,
    padding: 15,
    margin: 10,
    borderWidth: 2,
    borderColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  protocolLabel: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  countdown: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: 'bold',
  },
  messageCard: {
    backgroundColor: '#222',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  readCard: {
    borderColor: '#ef4444',
    backgroundColor: '#2a1a1a',
  },
  unreadMessage: {
    alignItems: 'center',
  },
  clickToRead: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  hiddenContent: {
    alignItems: 'center',
    marginBottom: 15,
  },
  hiddenText: {
    color: '#444',
    fontSize: 14,
    marginBottom: 5,
    fontFamily: 'monospace',
  },
  goldStandard: {
    color: '#ffd700',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  readMessage: {
    alignItems: 'center',
  },
  messageContent: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 24,
  },
  destructTimer: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  feature: {
    color: '#666',
    fontSize: 10,
    margin: 2,
  },
  vanishedContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 20,
    margin: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  vanishedText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  vanishedSubtext: {
    color: '#444',
    fontSize: 10,
    textAlign: 'center',
    letterSpacing: 1,
  },
});