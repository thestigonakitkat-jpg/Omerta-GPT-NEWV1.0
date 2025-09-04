import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTheme } from '../state/theme';
import dualKeyNuclearProtocol, { DualKeyAuthRequest, SplitMasterKeyRequest } from '../utils/dualKeyNuclear';

interface DualKeyNuclearPanelProps {
  visible: boolean;
  onClose: () => void;
  operationType?: 'dual_key' | 'split_master_key';
}

export const DualKeyNuclearPanel: React.FC<DualKeyNuclearPanelProps> = ({
  visible,
  onClose,
  operationType = 'dual_key'
}) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<any>(null);
  const [mode, setMode] = useState<'initiate' | 'authenticate' | 'status'>('initiate');

  // Dual Key fields
  const [operatorAId, setOperatorAId] = useState('dev_primary');
  const [operatorBId, setOperatorBId] = useState('sec_officer');
  const [operatorId, setOperatorId] = useState('');
  const [keyFragment, setKeyFragment] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');

  // Split Master Key fields
  const [keyHolderId, setKeyHolderId] = useState('dev_alpha');
  const [pin, setPin] = useState('');
  const [splitOperationType, setSplitOperationType] = useState('system_reset');

  // Status monitoring
  const [operationStatus, setOperationStatus] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    if (currentOperation && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentOperation, timeRemaining]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const initiateDualKeyOperation = async () => {
    if (!operatorAId || !operatorBId) {
      Alert.alert('Error', 'Both operators must be specified');
      return;
    }

    setLoading(true);
    try {
      const response = await dualKeyNuclearProtocol.initiateDualKeyOperation(
        'system_reset',
        { scenario: 'nuclear_submarine_protocol', severity: 'critical' },
        operatorAId,
        operatorBId
      );

      if (response.success) {
        setCurrentOperation(response);
        setTimeRemaining(response.time_remaining || 300);
        setMode('authenticate');
        Alert.alert(
          '🔐 Dual-Key Operation Initiated',
          `Operation ID: ${response.operation_id}\n\nBoth operators must authenticate within ${formatTime(response.time_remaining || 300)}`
        );
      } else {
        Alert.alert('Operation Failed', response.message);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to initiate operation: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const authenticateOperator = async () => {
    if (!currentOperation || !operatorId || !password || !totpCode) {
      Alert.alert('Error', 'All authentication fields are required');
      return;
    }

    setLoading(true);
    try {
      const authRequest: DualKeyAuthRequest = {
        operation_id: currentOperation.operation_id,
        operator_id: operatorId,
        key_fragment: keyFragment || '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        password: password,
        totp_code: totpCode,
        cryptographic_signature: dualKeyNuclearProtocol.generateOperationSignature(
          currentOperation.operation_id,
          operatorId,
          Math.floor(Date.now() / 1000)
        )
      };

      const response = await dualKeyNuclearProtocol.authenticateOperator(authRequest);

      if (response.success) {
        setOperationStatus(response);
        Alert.alert(
          '✅ Authentication Successful',
          response.message
        );

        if (response.status === 'executed') {
          Alert.alert(
            '🚀 OPERATION EXECUTED',
            'Nuclear Submarine Protocol operation completed successfully!',
            [{ text: 'OK', onPress: onClose }]
          );
        }
      } else {
        Alert.alert('Authentication Failed', response.message);
      }
    } catch (error) {
      Alert.alert('Error', `Authentication failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const initiateSplitMasterKeyOperation = async () => {
    setLoading(true);
    try {
      const response = await dualKeyNuclearProtocol.initiateSplitMasterKeyOperation(
        splitOperationType,
        { scenario: 'split_master_key_protocol', severity: 'critical' }
      );

      if (response.success) {
        setCurrentOperation(response);
        setTimeRemaining(600); // 10 minutes for split key operations
        setMode('authenticate');
        Alert.alert(
          '🔑 Split Master Key Operation Initiated',
          `Operation ID: ${response.operation_id}\n\n${response.fragments_required} key fragments required within 10 minutes`
        );
      } else {
        Alert.alert('Operation Failed', response.message);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to initiate operation: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const provideKeyFragment = async () => {
    if (!currentOperation || !keyHolderId || !pin || !totpCode) {
      Alert.alert('Error', 'All fragment fields are required');
      return;
    }

    setLoading(true);
    try {
      const fragmentRequest: SplitMasterKeyRequest = {
        key_holder_id: keyHolderId,
        key_fragment: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
        pin: pin,
        totp_code: totpCode,
        operation_type: splitOperationType as any
      };

      const response = await dualKeyNuclearProtocol.provideKeyFragment(fragmentRequest);

      if (response.success) {
        setOperationStatus(response);
        Alert.alert(
          '✅ Key Fragment Accepted',
          response.message
        );

        if (response.master_key_status === 'master_key_reconstructed_and_executed') {
          Alert.alert(
            '🚀 MASTER KEY RECONSTRUCTED',
            'Split Master Key Protocol operation completed successfully!',
            [{ text: 'OK', onPress: onClose }]
          );
        }
      } else {
        Alert.alert('Fragment Rejected', response.message);
      }
    } catch (error) {
      Alert.alert('Error', `Fragment provision failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.9)' }]}>
      <View style={[styles.panel, { backgroundColor: theme.colors.surface }]}>
        <ScrollView style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              🚢⚛️ NUCLEAR SUBMARINE PROTOCOL
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {operationType === 'dual_key' ? 'DUAL-COMMAND BRIDGE SYSTEM' : 'SPLIT MASTER KEY SYSTEM'}
            </Text>
          </View>

          {/* Time Remaining */}
          {currentOperation && timeRemaining > 0 && (
            <View style={[styles.timeRemaining, { backgroundColor: theme.colors.error + '20' }]}>
              <Text style={[styles.timeText, { color: theme.colors.error }]}>
                ⏰ TIME REMAINING: {formatTime(timeRemaining)}
              </Text>
            </View>
          )}

          {/* Operation Type Selector */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Protocol Type</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  { backgroundColor: operationType === 'dual_key' ? theme.colors.primary : theme.colors.surface },
                  { borderColor: theme.colors.border }
                ]}
                onPress={() => setMode('initiate')}
              >
                <Text style={[styles.typeButtonText, { color: operationType === 'dual_key' ? '#fff' : theme.colors.text }]}>
                  Design A: Dual-Key
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  { backgroundColor: operationType === 'split_master_key' ? theme.colors.primary : theme.colors.surface },
                  { borderColor: theme.colors.border }
                ]}
                onPress={() => setMode('initiate')}
              >
                <Text style={[styles.typeButtonText, { color: operationType === 'split_master_key' ? '#fff' : theme.colors.text }]}>
                  Design B: Split Master Key
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Dual Key System */}
          {operationType === 'dual_key' && (
            <>
              {mode === 'initiate' && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Dual-Command Bridge</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>Operator A ID</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                      value={operatorAId}
                      onChangeText={setOperatorAId}
                      placeholder="dev_primary"
                      placeholderTextColor={theme.colors.textSecondary}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>Operator B ID</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                      value={operatorBId}
                      onChangeText={setOperatorBId}
                      placeholder="sec_officer"
                      placeholderTextColor={theme.colors.textSecondary}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                    onPress={initiateDualKeyOperation}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.actionButtonText}>🔐 INITIATE DUAL-KEY OPERATION</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {mode === 'authenticate' && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Operator Authentication</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>Operator ID</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                      value={operatorId}
                      onChangeText={setOperatorId}
                      placeholder="dev_primary or sec_officer"
                      placeholderTextColor={theme.colors.textSecondary}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>Password</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Enter operator password"
                      placeholderTextColor={theme.colors.textSecondary}
                      secureTextEntry
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>TOTP Code</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                      value={totpCode}
                      onChangeText={setTotpCode}
                      placeholder="6-digit TOTP code"
                      placeholderTextColor={theme.colors.textSecondary}
                      keyboardType="numeric"
                      maxLength={6}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.colors.success }]}
                    onPress={authenticateOperator}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.actionButtonText}>🔓 AUTHENTICATE OPERATOR</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {/* Split Master Key System */}
          {operationType === 'split_master_key' && (
            <>
              {mode === 'initiate' && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Split Master Key</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>Operation Type</Text>
                    <View style={styles.pickerContainer}>
                      {['system_reset', 'critical_update', 'emergency_override', 'master_unlock'].map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.pickerOption,
                            { backgroundColor: splitOperationType === type ? theme.colors.primary : theme.colors.surface },
                            { borderColor: theme.colors.border }
                          ]}
                          onPress={() => setSplitOperationType(type)}
                        >
                          <Text style={[styles.pickerText, { color: splitOperationType === type ? '#fff' : theme.colors.text }]}>
                            {type.replace('_', ' ').toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.colors.warning }]}
                    onPress={initiateSplitMasterKeyOperation}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.actionButtonText}>🔑 INITIATE SPLIT KEY OPERATION</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {mode === 'authenticate' && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Key Fragment Provision</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>Key Holder ID</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                      value={keyHolderId}
                      onChangeText={setKeyHolderId}
                      placeholder="dev_alpha, sec_bravo, emergency_charlie"
                      placeholderTextColor={theme.colors.textSecondary}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>PIN</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                      value={pin}
                      onChangeText={setPin}
                      placeholder="Enter PIN"
                      placeholderTextColor={theme.colors.textSecondary}
                      secureTextEntry
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>TOTP Code</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                      value={totpCode}
                      onChangeText={setTotpCode}
                      placeholder="6-digit TOTP code"
                      placeholderTextColor={theme.colors.textSecondary}
                      keyboardType="numeric"
                      maxLength={6}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.colors.success }]}
                    onPress={provideKeyFragment}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.actionButtonText}>🔑 PROVIDE KEY FRAGMENT</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {/* Status Display */}
          {operationStatus && (
            <View style={[styles.section, styles.statusSection]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.success }]}>Operation Status</Text>
              <Text style={[styles.statusText, { color: theme.colors.text }]}>
                {operationStatus.message}
              </Text>
              {operationStatus.next_step && (
                <Text style={[styles.nextStep, { color: theme.colors.textSecondary }]}>
                  Next: {operationStatus.next_step}
                </Text>
              )}
            </View>
          )}
        </ScrollView>

        {/* Close Button */}
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: theme.colors.error }]}
          onPress={onClose}
        >
          <Text style={styles.closeButtonText}>✕ CLOSE PROTOCOL</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  panel: {
    width: '95%',
    maxHeight: '90%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  content: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  timeRemaining: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  pickerContainer: {
    gap: 8,
  },
  pickerOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusSection: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 16,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 16,
    lineHeight: 24,
  },
  nextStep: {
    fontSize: 14,
    marginTop: 8,
    fontStyle: 'italic',
  },
  closeButton: {
    padding: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});