import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';

export default function RemoteKillSystem({ visible, onClose }) {
  const [isActivated, setIsActivated] = useState(false);
  const [countdown, setCountdown] = useState(30);

  React.useEffect(() => {
    if (isActivated && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isActivated, countdown]);

  const handleActivate = () => {
    Alert.alert(
      '🚨 REMOTE KILL ACTIVATION',
      'This will trigger immediate device wipe and factory reset. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'ACTIVATE', 
          style: 'destructive',
          onPress: () => {
            setIsActivated(true);
            // In real implementation, this would trigger actual remote wipe
          }
        }
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <Text style={styles.title}>🚀 REMOTE KILL SYSTEM</Text>
          <Text style={styles.subtitle}>Emergency Device Termination</Text>

          {!isActivated ? (
            <View style={styles.controlPanel}>
              <Text style={styles.description}>
                Activate remote kill to immediately wipe all data on this device and initiate factory reset.
              </Text>
              
              <View style={styles.features}>
                <Text style={styles.feature}>🔥 Secure data obliteration</Text>
                <Text style={styles.feature}>📱 Factory reset trigger</Text>
                <Text style={styles.feature}>🚨 Emergency beacon</Text>
                <Text style={styles.feature}>📍 Location spoofing</Text>
              </View>

              <TouchableOpacity style={styles.activateButton} onPress={handleActivate}>
                <Text style={styles.activateButtonText}>🚀 ACTIVATE REMOTE KILL</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.activatedPanel}>
              <Text style={styles.activatedTitle}>🚨 REMOTE KILL ACTIVATED</Text>
              
              <View style={styles.countdownContainer}>
                <Text style={styles.countdownText}>{countdown}</Text>
                <Text style={styles.countdownLabel}>seconds until termination</Text>
              </View>

              <View style={styles.killActions}>
                <Text style={styles.killAction}>
                  {countdown < 25 ? '✅' : '🔄'} Location spoofing active
                </Text>
                <Text style={styles.killAction}>
                  {countdown < 20 ? '✅' : '🔄'} Emergency beacon sent
                </Text>
                <Text style={styles.killAction}>
                  {countdown < 15 ? '✅' : '🔄'} Data obliteration initiated
                </Text>
                <Text style={styles.killAction}>
                  {countdown < 10 ? '✅' : '🔄'} Factory reset preparation
                </Text>
                <Text style={styles.killAction}>
                  {countdown < 5 ? '✅' : '🔄'} Final termination sequence
                </Text>
              </View>

              <Text style={styles.missile}>
                {countdown < 10 ? '🚀💥 MISSILE STRIKE VISUAL' : '🚀 Preparing strike...'}
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
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
    backgroundColor: '#1a0a0a',
    borderRadius: 15,
    padding: 25,
    width: '90%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#dc3545',
  },
  title: {
    color: '#dc3545',
    fontSize: 20,
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
  controlPanel: {
    alignItems: 'center',
  },
  description: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  features: {
    marginBottom: 20,
  },
  feature: {
    color: '#bfbfbf',
    fontSize: 12,
    marginBottom: 5,
  },
  activateButton: {
    backgroundColor: '#dc3545',
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 25,
    marginBottom: 20,
  },
  activateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  activatedPanel: {
    alignItems: 'center',
  },
  activatedTitle: {
    color: '#dc3545',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  countdownText: {
    color: '#dc3545',
    fontSize: 36,
    fontWeight: 'bold',
  },
  countdownLabel: {
    color: '#ffffff',
    fontSize: 12,
  },
  killActions: {
    marginBottom: 20,
  },
  killAction: {
    color: '#bfbfbf',
    fontSize: 12,
    marginBottom: 3,
  },
  missile: {
    color: '#ffc107',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: '#6c757d',
    borderRadius: 8,
    paddingVertical: 12,
  },
  closeButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});