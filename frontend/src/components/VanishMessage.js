import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

export default function VanishMessage({ messageId, initialContent, ttl = 60000 }) {
  const [isViewed, setIsViewed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ttl / 1000);
  const [content, setContent] = useState(initialContent);

  useEffect(() => {
    if (isViewed) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setContent('*** MESSAGE VANISHED ***');
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [isViewed]);

  const handleView = () => {
    if (!isViewed) {
      setIsViewed(true);
      Alert.alert('Vanish Protocol', 'Message opened. It will self-destruct in ' + Math.floor(ttl/1000) + ' seconds.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🥇 VANISH PROTOCOL</Text>
      
      {!isViewed ? (
        <TouchableOpacity style={styles.hiddenMessage} onPress={handleView}>
          <Text style={styles.hiddenText}>📫 Tap to reveal message</Text>
          <Text style={styles.hiddenSubtext}>⚠️ One-time view only</Text>
        </TouchableOpacity>
      ) : timeLeft > 0 ? (
        <View style={styles.revealedMessage}>
          <Text style={styles.messageContent}>{content}</Text>
          <Text style={styles.countdown}>
            ⏰ Self-destructing in {Math.floor(timeLeft)}s
          </Text>
        </View>
      ) : (
        <View style={styles.vanishedMessage}>
          <Text style={styles.vanishedText}>👻 MESSAGE VANISHED</Text>
          <Text style={styles.vanishedSubtext}>Content permanently deleted</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a2332',
    borderRadius: 10,
    padding: 15,
    margin: 10,
    borderWidth: 1,
    borderColor: '#ffd700',
  },
  header: {
    color: '#ffd700',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  hiddenMessage: {
    backgroundColor: '#2a3441',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#666',
  },
  hiddenText: {
    color: '#bfbfbf',
    fontSize: 16,
    textAlign: 'center',
  },
  hiddenSubtext: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },
  revealedMessage: {
    backgroundColor: '#0f1419',
    borderRadius: 8,
    padding: 15,
  },
  messageContent: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  countdown: {
    color: '#ff6b35',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  vanishedMessage: {
    backgroundColor: '#2d1810',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
  },
  vanishedText: {
    color: '#dc3545',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  vanishedSubtext: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },
});