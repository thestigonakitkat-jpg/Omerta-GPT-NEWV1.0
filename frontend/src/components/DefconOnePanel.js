import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  Modal,
  ScrollView,
  ActivityIndicator 
} from 'react-native';
import { useSecurityStore } from '../state/security';
import omertaAPI from '../utils/api';

export default function DefconOnePanel({ visible, onClose }) {
  const [adminPassphrase, setAdminPassphrase] = useState('');
  const [isAdminAuth, setIsAdminAuth] = useState(false);  
  const [operationType, setOperationType] = useState('');
  const [seedWords, setSeedWords] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [currentOperation, setCurrentOperation] = useState(null);
  const [timer, setTimer] = useState(0);

  const { 
    adminAuthenticated, 
    authenticateAdmin, 
    setDefconLevel,
    defconLevel 
  } = useSecurityStore();

  useEffect(() => {
    // Countdown timer for operations
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            // Timer expired
            Alert.alert('⏰ Operation Expired', 'Multi-signature operation timed out');
            resetOperation();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleAdminAuth = async () => {
    if (!adminPassphrase.trim()) {
      Alert.alert('Error', 'Please enter admin passphrase');
      return;
    }

    setIsLoading(true);
    try {
      // Check if this is the correct passphrase
      if (adminPassphrase === 'Omertaisthecode#01') {
        const success = authenticateAdmin(adminPassphrase);
        if (success) {
          setIsAdminAuth(true);
          setDefconLevel(2); // Elevated alert
          Alert.alert('🔐 Admin Authenticated', 'DEFCON-1 Protocol access granted');
        }
      } else {
        Alert.alert('❌ Authentication Failed', 'Invalid admin passphrase');
        setAdminPassphrase('');
      }
    } catch (error) {
      console.error('Admin auth error:', error);
      Alert.alert('Error', 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const initiateOperation = (type) => {
    setOperationType(type);
    setCurrentOperation({
      id: `op_${Date.now()}`,
      type: type,
      initiated_at: Date.now(),
      signatures_required: 2,
      signatures_received: 0
    });
    setTimer(300); // 5 minutes = 300 seconds
    setDefconLevel(1); // Maximum alert

    Alert.alert(
      '🚨 DEFCON-1 OPERATION INITIATED',
      `Operation: ${type.toUpperCase()}\nRequires 2 admin signatures within 5 minutes`,
      [{ text: 'Proceed', onPress: () => {} }]
    );
  };

  const signOperation = () => {
    if (seedWords.some(word => !word.trim())) {
      Alert.alert('Error', 'Please enter all 6 seed words');
      return;
    }

    // Validate seed words (in real implementation, these would be cryptographically verified)
    const validSeedWords = ['unaware', 'junior', 'capable', 'shock', 'juice', 'skirt'];
    const enteredWords = seedWords.map(w => w.toLowerCase().trim());
    
    if (JSON.stringify(enteredWords) === JSON.stringify(validSeedWords)) {
      // Signature valid
      setCurrentOperation(prev => ({
        ...prev,
        signatures_received: prev.signatures_received + 1
      }));

      if (currentOperation.signatures_received + 1 >= 2) {
        executeOperation();
      } else {
        Alert.alert(
          '✅ Signature Accepted',
          `1/2 signatures received. Waiting for second admin signature.\n\nTime remaining: ${Math.floor(timer / 60)}:${(timer % 60).toString().padStart(2, '0')}`
        );
      }
    } else {
      Alert.alert('❌ Invalid Signature', 'Seed words verification failed');
      setSeedWords(['', '', '', '', '', '']);
    }
  };

  const executeOperation = () => {
    Alert.alert(
      '☢️ OPERATION AUTHORIZED',
      `DEFCON-1 Operation "${operationType.toUpperCase()}" has been executed with 2/2 signatures.`,
      [
        {
          text: 'Acknowledged',
          onPress: () => {
            console.log(`🚨 DEFCON-1 EXECUTED: ${operationType}`);
            resetOperation();
            if (operationType === 'nuclear_option') {
              // This would trigger complete data destruction
              Alert.alert('☢️ NUCLEAR OPTION EXECUTED', 'All data has been obliterated');
            }
          }
        }
      ]
    );
  };

  const resetOperation = () => {
    setCurrentOperation(null);
    setOperationType('');
    setSeedWords(['', '', '', '', '', '']);
    setTimer(0);
    setDefconLevel(5); // Back to normal
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>🚨 DEFCON-1 PROTOCOL</Text>
            <Text style={styles.subtitle}>Two-Person Integrity System</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {!isAdminAuth ? (
              // Admin Authentication Screen
              <View style={styles.authSection}>
                <Text style={styles.authTitle}>🔐 ADMIN AUTHENTICATION</Text>
                <Text style={styles.authDescription}>
                  Enter admin passphrase to access DEFCON-1 controls
                </Text>
                
                <TextInput
                  style={styles.passphraseInput}
                  value={adminPassphrase}
                  onChangeText={setAdminPassphrase}
                  placeholder="Admin Passphrase"
                  placeholderTextColor="#666"
                  secureTextEntry
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                
                <TouchableOpacity 
                  style={styles.authButton}
                  onPress={handleAdminAuth}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.authButtonText}>🔓 AUTHENTICATE</Text>
                  )}
                </TouchableOpacity>
                
                <Text style={styles.hint}>
                  Hint: "Omertaisthecode#01"
                </Text>
              </View>
            ) : !currentOperation ? (
              // Operation Selection Screen
              <View style={styles.operationsSection}>
                <Text style={styles.operationsTitle}>⚛️ AVAILABLE OPERATIONS</Text>
                <Text style={styles.operationsDescription}>
                  All operations require 2 admin signatures within 5 minutes
                </Text>
                
                <TouchableOpacity 
                  style={[styles.operationButton, styles.killButton]}
                  onPress={() => initiateOperation('remote_kill')}
                >
                  <Text style={styles.operationButtonText}>💀 REMOTE KILL</Text>
                  <Text style={styles.operationDescription}>
                    Instantly terminate target device operation
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.operationButton, styles.revokeButton]}
                  onPress={() => initiateOperation('revoke_oids')}
                >
                  <Text style={styles.operationButtonText}>🔑 REVOKE OIDs</Text>
                  <Text style={styles.operationDescription}>
                    Revoke all operational identity tokens
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.operationButton, styles.nukeButton]}
                  onPress={() => initiateOperation('nuclear_option')}
                >
                  <Text style={styles.operationButtonText}>☢️ NUCLEAR OPTION</Text>
                  <Text style={styles.operationDescription}>
                    Complete data obliteration - irreversible
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Operation Signing Screen
              <View style={styles.signingSection}>
                <Text style={styles.signingTitle}>
                  ✍️ SIGN OPERATION: {operationType.toUpperCase()}
                </Text>
                
                <View style={styles.timerContainer}>
                  <Text style={styles.timerLabel}>⏰ TIME REMAINING</Text>
                  <Text style={styles.timerValue}>{formatTime(timer)}</Text>
                </View>
                
                <View style={styles.operationStatus}>
                  <Text style={styles.statusLabel}>📋 OPERATION STATUS</Text>
                  <Text style={styles.statusValue}>
                    Signatures: {currentOperation.signatures_received}/2
                  </Text>
                </View>
                
                <Text style={styles.seedTitle}>🔑 ENTER ADMIN1 SEED WORDS</Text>
                <Text style={styles.seedDescription}>
                  Enter your 6-word BIP39 seed phrase to authorize operation
                </Text>
                
                <View style={styles.seedGrid}>
                  {seedWords.map((word, index) => (
                    <View key={index} style={styles.seedInputContainer}>
                      <Text style={styles.seedLabel}>{index + 1}</Text>
                      <TextInput
                        style={styles.seedInput}
                        value={word}
                        onChangeText={(text) => {
                          const newWords = [...seedWords];
                          newWords[index] = text;
                          setSeedWords(newWords);
                        }}
                        placeholder={`Word ${index + 1}`}
                        placeholderTextColor="#666"
                        autoCorrect={false}
                        autoCapitalize="none"
                      />
                    </View>
                  ))}
                </View>
                
                <TouchableOpacity 
                  style={styles.signButton}
                  onPress={signOperation}
                >
                  <Text style={styles.signButtonText}>✍️ SIGN OPERATION</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={resetOperation}
                >
                  <Text style={styles.cancelButtonText}>❌ CANCEL OPERATION</Text>
                </TouchableOpacity>
                
                <Text style={styles.seedHint}>
                  Hint: unaware, junior, capable, shock, juice, skirt
                </Text>
              </View>
            )}
          </ScrollView>
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
    padding: 20,
  },
  container: {
    backgroundColor: '#111',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#ef4444',
    maxHeight: '90%',
  },
  header: {
    backgroundColor: '#ef4444',
    padding: 20,
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
    alignItems: 'center',
    position: 'relative',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    color: '#fff',
    fontSize: 12,
    marginTop: 5,
  },
  closeButton: {
    position: 'absolute',
    right: 15,
    top: 15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  authSection: {
    alignItems: 'center',
  },
  authTitle: {
    color: '#ef4444',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  authDescription: {
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
  },
  passphraseInput: {
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 10,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    width: '100%',
    marginBottom: 20,
  },
  authButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    minWidth: 150,
    alignItems: 'center',
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  hint: {
    color: '#666',
    fontSize: 12,
    marginTop: 20,
    textAlign: 'center',
  },
  operationsSection: {
    alignItems: 'center',
  },
  operationsTitle: {
    color: '#ef4444',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  operationsDescription: {
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 30,
  },
  operationButton: {
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
  },
  killButton: {
    backgroundColor: '#2a0a0a',
    borderColor: '#ff4444',
  },
  revokeButton: {
    backgroundColor: '#2a1a0a',
    borderColor: '#ffaa00',
  },
  nukeButton: {
    backgroundColor: '#4a0a0a',
    borderColor: '#ff0000',
  },
  operationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  operationDescription: {
    color: '#ccc',
    fontSize: 12,
    textAlign: 'center',
  },
  signingSection: {
    alignItems: 'center',
  },
  signingTitle: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  timerContainer: {
    backgroundColor: '#222',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  timerLabel: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  timerValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 5,
  },
  operationStatus: {
    backgroundColor: '#1a1a1a',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
  },
  statusLabel: {
    color: '#ccc',
    fontSize: 12,
  },
  statusValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  seedTitle: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  seedDescription: {
    color: '#ccc',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
  seedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  seedInputContainer: {
    width: '48%',
    marginBottom: 10,
  },
  seedLabel: {
    color: '#666',
    fontSize: 10,
    marginBottom: 3,
  },
  seedInput: {
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    padding: 10,
    color: '#fff',
    fontSize: 14,
  },
  signButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginBottom: 10,
  },
  signButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#666',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  seedHint: {
    color: '#444',
    fontSize: 10,
    textAlign: 'center',
  },
});