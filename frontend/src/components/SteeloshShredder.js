import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';

export default function SteeloshShredder({ visible, triggerType, onClose }) {
  const [countdown, setCountdown] = useState(10);
  const [isShredding, setIsShredding] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (visible && !isShredding) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            startShredding();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [visible, isShredding]);

  const startShredding = () => {
    setIsShredding(true);
    setProgress(0);
    
    const shredTimer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(shredTimer);
          setTimeout(() => {
            Alert.alert(
              '🔥 STEELOS-SHREDDER COMPLETE',
              'All sensitive data has been securely obliterated. Device will now initiate factory reset.',
              [{ text: 'Understood', onPress: onClose }]
            );
          }, 1000);
          return 100;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 300);
  };

  const handleCancel = () => {
    if (triggerType === 'panic_pin') {
      Alert.alert('Cannot Cancel', 'Panic PIN activation cannot be cancelled');
      return;
    }
    onClose();
  };

  const getTriggerMessage = () => {
    switch (triggerType) {
      case 'panic_pin': return '🚨 PANIC PIN ACTIVATED';
      case 'threat_detected': return '🚨 CRITICAL THREAT DETECTED';
      case 'emergency_nuke': return '🚨 EMERGENCY NUKE INITIATED';
      default: return '🚨 MANUAL ACTIVATION';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <Text style={styles.title}>🔥 STEELOS-SHREDDER</Text>
          <Text style={styles.subtitle}>EMERGENCY DATA OBLITERATION</Text>
          
          <Text style={styles.trigger}>{getTriggerMessage()}</Text>

          {!isShredding ? (
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownText}>{countdown}</Text>
              <Text style={styles.countdownLabel}>seconds until activation</Text>
              
              {triggerType !== 'panic_pin' && (
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                  <Text style={styles.cancelButtonText}>CANCEL</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.shredContainer}>
              <Text style={styles.shredTitle}>🔥 SHREDDING IN PROGRESS</Text>
              
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              
              <Text style={styles.progressText}>{Math.floor(progress)}% Complete</Text>
              
              <View style={styles.shredItems}>
                <Text style={styles.shredItem}>
                  {progress > 10 ? '✅' : '🔄'} Clearing message cache
                </Text>
                <Text style={styles.shredItem}>
                  {progress > 25 ? '✅' : '🔄'} Wiping encryption keys
                </Text>
                <Text style={styles.shredItem}>
                  {progress > 40 ? '✅' : '🔄'} Destroying contact vault
                </Text>
                <Text style={styles.shredItem}>
                  {progress > 60 ? '✅' : '🔄'} Obliterating secure storage
                </Text>
                <Text style={styles.shredItem}>
                  {progress > 80 ? '✅' : '🔄'} Clearing system traces
                </Text>
                <Text style={styles.shredItem}>
                  {progress > 95 ? '✅' : '🔄'} Preparing OS reset
                </Text>
              </View>
            </View>
          )}

          <Text style={styles.warning}>
            ⚠️ THIS ACTION CANNOT BE UNDONE
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  panel: {
    backgroundColor: '#2d0a0a',
    borderRadius: 15,
    padding: 25,
    width: '90%',
    maxWidth: 400,
    borderWidth: 3,
    borderColor: '#dc3545',
  },
  title: {
    color: '#dc3545',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    color: '#fd7e14',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
  trigger: {
    color: '#ffc107',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  countdownContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  countdownText: {
    color: '#dc3545',
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  countdownLabel: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 30,
  },
  cancelButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  shredContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  shredTitle: {
    color: '#dc3545',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  progressBar: {
    width: '100%',
    height: 20,
    backgroundColor: '#333',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#dc3545',
  },
  progressText: {
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 20,
  },
  shredItems: {
    width: '100%',
  },
  shredItem: {
    color: '#bfbfbf',
    fontSize: 12,
    marginBottom: 5,
  },
  warning: {
    color: '#fd7e14',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 15,
    fontWeight: 'bold',
  },
});