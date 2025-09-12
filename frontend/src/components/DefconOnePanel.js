import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';

export default function DefconOnePanel({ visible, onClose }) {
  const [passphrase, setPassphrase] = useState('');
  const [adminKey1, setAdminKey1] = useState('');
  const [adminKey2, setAdminKey2] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

  React.useEffect(() => {
    if (visible && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            Alert.alert('DEFCON-1 Timeout', 'Session expired for security');
            onClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [visible, timeLeft, onClose]);

  const handleExecute = () => {
    if (passphrase === 'Omertaisthecode#01' && adminKey1 && adminKey2) {
      Alert.alert(
        '🚨 DEFCON-1 ACTIVATED',
        'Multi-signature protocol confirmed. Nuclear-level security measures are now active.',
        [
          { text: 'Confirmed', onPress: onClose }
        ]
      );
    } else {
      Alert.alert('Access Denied', 'Invalid credentials or incomplete keys');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <Text style={styles.title}>🚨 DEFCON-1 PROTOCOL</Text>
          <Text style={styles.subtitle}>MULTI-SIGNATURE ADMIN ACCESS</Text>
          
          <Text style={styles.timer}>
            ⏰ Session expires in: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Master Passphrase:</Text>
            <TextInput
              style={styles.input}
              value={passphrase}
              onChangeText={setPassphrase}
              placeholder="Enter master passphrase"
              placeholderTextColor="#666"
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Admin Key 1:</Text>
            <TextInput
              style={styles.input}
              value={adminKey1}
              onChangeText={setAdminKey1}
              placeholder="First administrator key"
              placeholderTextColor="#666"
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Admin Key 2:</Text>
            <TextInput
              style={styles.input}
              value={adminKey2}
              onChangeText={setAdminKey2}
              placeholder="Second administrator key"
              placeholderTextColor="#666"
              secureTextEntry
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.executeButton, (!passphrase || !adminKey1 || !adminKey2) && styles.disabledButton]}
              onPress={handleExecute}
              disabled={!passphrase || !adminKey1 || !adminKey2}
            >
              <Text style={styles.executeButtonText}>🚨 EXECUTE</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.warning}>
            ⚠️ NUCLEAR-LEVEL SECURITY PROTOCOL
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
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
  timer: {
    color: '#ffc107',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    color: '#ffffff',
    fontSize: 12,
    marginBottom: 5,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#2a2a2a',
    color: '#ffffff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#555',
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flex: 0.45,
  },
  cancelButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  executeButton: {
    backgroundColor: '#dc3545',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flex: 0.45,
  },
  disabledButton: {
    backgroundColor: '#333',
  },
  executeButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  warning: {
    color: '#fd7e14',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 15,
  },
});