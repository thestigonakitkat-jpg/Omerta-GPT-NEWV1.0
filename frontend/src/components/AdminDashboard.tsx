/**
 * 🔐 ADMIN DASHBOARD - Multi-Signature Remote Operations
 * 
 * Provides admin interface for remote kill, OID revocation, system updates,
 * and multi-signature operations with handshake validation.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../state/theme';
import { adminSystem, AdminSession, MultiSigOperation, SeedInfo } from '../utils/adminSystem';

interface AdminDashboardProps {
  visible: boolean;
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeOperation, setActiveOperation] = useState<MultiSigOperation | null>(null);
  const [seedInfo, setSeedInfo] = useState<SeedInfo | null>(null);
  const [showSeedInfo, setShowSeedInfo] = useState(false);
  const [showChangePassphrase, setShowChangePassphrase] = useState(false);
  const [currentPassphrase, setCurrentPassphrase] = useState('');
  const [newPassphrase, setNewPassphrase] = useState('');
  const [targetDeviceId, setTargetDeviceId] = useState('');
  const [targetOid, setTargetOid] = useState('');

  useEffect(() => {
    if (visible) {
      checkAdminSession();
      loadSeedInfo();
    }
  }, [visible]);

  const checkAdminSession = async () => {
    try {
      const restored = await adminSystem.restoreSession();
      if (restored) {
        setAdminSession(adminSystem.getAdminSession());
      }
    } catch (error) {
      console.error('Session check failed:', error);
    }
  };

  const loadSeedInfo = async () => {
    try {
      const info = await adminSystem.getSeedInfo();
      setSeedInfo(info);
    } catch (error) {
      console.error('Seed info load failed:', error);
    }
  };

  const handleAuthenticate = () => {
    adminSystem.showAdminAuthPrompt((session) => {
      setAdminSession(session);
      Alert.alert(
        '✅ Admin Authenticated',
        `Welcome, ${session.adminId}!\n\n🚢 Multi-signature operations are now available.`,
        [{ text: 'OK' }]
      );
    });
  };

  const handleRemoteKill = () => {
    if (!targetDeviceId.trim()) {
      Alert.alert('Error', 'Please enter a target device ID');
      return;
    }

    Alert.alert(
      '💀 REMOTE KILL CONFIRMATION',
      `Are you sure you want to execute a remote kill on device:\n\n${targetDeviceId}\n\nThis will:\n• Disable location spoofing\n• Reveal real device location\n• Initiate FPV missile view\n• Deploy STEELOS-Shredder\n• Execute complete data obliteration`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '💀 EXECUTE KILL',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const operation = await adminSystem.executeRemoteKill(targetDeviceId);
              setActiveOperation(operation);
              
              Alert.alert(
                '🚢 Multi-Sig Operation Initiated',
                `Remote Kill operation ${operation.operationId} has been created.\n\nOperation expires in 5 minutes.\nSecond admin must sign to execute.`,
                [
                  { text: 'OK' },
                  {
                    text: 'Sign Now',
                    onPress: () => handleSignOperation(operation)
                  }
                ]
              );
            } catch (error) {
              Alert.alert('Operation Failed', error.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleRevokeOID = () => {
    if (!targetOid.trim()) {
      Alert.alert('Error', 'Please enter a target OID');
      return;
    }

    Alert.alert(
      '🚫 OID REVOCATION CONFIRMATION',
      `Are you sure you want to revoke OID:\n\n${targetOid}\n\nThis will permanently invalidate the OID across the OMERTÀ network.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '🚫 REVOKE OID',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const operation = await adminSystem.revokeOID(targetOid);
              setActiveOperation(operation);
              
              Alert.alert(
                '🚢 Multi-Sig Operation Initiated',
                `OID Revocation operation ${operation.operationId} has been created.\n\nSecond admin must sign to execute.`,
                [
                  { text: 'OK' },
                  {
                    text: 'Sign Now',
                    onPress: () => handleSignOperation(operation)
                  }
                ]
              );
            } catch (error) {
              Alert.alert('Operation Failed', error.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleSignOperation = (operation: MultiSigOperation) => {
    adminSystem.showMultiSigPrompt(
      operation.operationType,
      operation.operationId,
      (result) => {
        if (result.operation_completed) {
          Alert.alert(
            '🎯 OPERATION EXECUTED',
            `Multi-signature operation ${operation.operationType} has been successfully executed!\n\nExecution Token: ${result.execution_token?.substring(0, 20)}...`,
            [{ text: 'OK' }]
          );
          setActiveOperation(null);
        } else {
          Alert.alert(
            '📝 Signature Recorded',
            `Your signature has been recorded.\n\nSignatures: ${result.signatures_received}/${result.signatures_required}\n\nWaiting for second admin signature.`,
            [{ text: 'OK' }]
          );
        }
      }
    );
  };

  const handleChangePassphrase = async () => {
    if (!currentPassphrase || !newPassphrase) {
      Alert.alert('Error', 'Please fill in both passphrase fields');
      return;
    }

    if (newPassphrase.length < 12) {
      Alert.alert('Error', 'New passphrase must be at least 12 characters');
      return;
    }

    try {
      setLoading(true);
      const success = await adminSystem.changeAdminPassphrase(currentPassphrase, newPassphrase);
      
      if (success) {
        Alert.alert(
          '✅ Passphrase Changed',
          'Admin passphrase has been updated successfully.\n\nAll admin sessions have been invalidated. Please authenticate again.',
          [
            {
              text: 'OK',
              onPress: () => {
                setAdminSession(null);
                setCurrentPassphrase('');
                setNewPassphrase('');
                setShowChangePassphrase(false);
              }
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Change Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await adminSystem.logout();
    setAdminSession(null);
    Alert.alert('Logged Out', 'Admin session terminated.');
  };

  const renderAuthenticationScreen = () => (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onClose} style={styles.headerButton}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>🔐 Admin Access</Text>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.content}>
        <View style={[styles.authCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="shield-checkmark" size={48} color="#ef4444" />
          <Text style={[styles.authTitle, { color: colors.text }]}>Admin Authentication Required</Text>
          <Text style={[styles.authSubtitle, { color: colors.sub }]}>
            Enter admin passphrase to access multi-signature operations
          </Text>
          
          <TouchableOpacity
            style={[styles.authButton, { backgroundColor: '#ef4444' }]}
            onPress={handleAuthenticate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="key" size={20} color="#fff" />
                <Text style={styles.authButtonText}>Authenticate</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderDashboard = () => (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleLogout} style={styles.headerButton}>
          <Ionicons name="log-out" size={24} color="#ef4444" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>🚢 Admin Dashboard</Text>
        <TouchableOpacity onPress={onClose} style={styles.headerButton}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Session Info */}
        <View style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sessionInfo}>
            <Text style={[styles.sessionLabel, { color: colors.sub }]}>Admin ID:</Text>
            <Text style={[styles.sessionValue, { color: '#10b981' }]}>{adminSession?.adminId}</Text>
          </View>
          <View style={styles.sessionInfo}>
            <Text style={[styles.sessionLabel, { color: colors.sub }]}>Session Expires:</Text>
            <Text style={[styles.sessionValue, { color: colors.text }]}>
              {new Date(adminSession?.expiresAt || 0).toLocaleTimeString()}
            </Text>
          </View>
        </View>

        {/* Remote Kill Operations */}
        <View style={[styles.operationCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.operationHeader}>
            <Ionicons name="nuclear" size={24} color="#ef4444" />
            <Text style={[styles.operationTitle, { color: colors.text }]}>💀 Remote Kill Operations</Text>
          </View>
          
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="Target Device ID"
            placeholderTextColor={colors.sub}
            value={targetDeviceId}
            onChangeText={setTargetDeviceId}
          />
          
          <TouchableOpacity
            style={[styles.operationButton, { backgroundColor: '#ef4444' }]}
            onPress={handleRemoteKill}
            disabled={loading}
          >
            <Text style={styles.operationButtonText}>💀 EXECUTE REMOTE KILL</Text>
          </TouchableOpacity>
        </View>

        {/* OID Revocation */}
        <View style={[styles.operationCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.operationHeader}>
            <Ionicons name="ban" size={24} color="#f59e0b" />
            <Text style={[styles.operationTitle, { color: colors.text }]}>🚫 OID Revocation</Text>
          </View>
          
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="Target OID"
            placeholderTextColor={colors.sub}
            value={targetOid}
            onChangeText={setTargetOid}
          />
          
          <TouchableOpacity
            style={[styles.operationButton, { backgroundColor: '#f59e0b' }]}
            onPress={handleRevokeOID}
            disabled={loading}
          >
            <Text style={styles.operationButtonText}>🚫 REVOKE OID</Text>
          </TouchableOpacity>
        </View>

        {/* Multi-Sig Info */}
        <View style={[styles.operationCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.operationHeader}>
            <Ionicons name="people" size={24} color="#6366f1" />
            <Text style={[styles.operationTitle, { color: colors.text }]}>🚢 Multi-Signature Protocol</Text>
          </View>
          
          <TouchableOpacity
            style={[styles.infoButton, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => setShowSeedInfo(true)}
          >
            <Text style={[styles.infoButtonText, { color: colors.text }]}>View Seed Words</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.infoButton, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => setShowChangePassphrase(true)}
          >
            <Text style={[styles.infoButtonText, { color: colors.text }]}>Change Passphrase</Text>
          </TouchableOpacity>
        </View>

        {/* Active Operation Status */}
        {activeOperation && (
          <View style={[styles.operationCard, { backgroundColor: '#fef2f2', borderColor: '#ef4444' }]}>
            <View style={styles.operationHeader}>
              <Ionicons name="hourglass" size={24} color="#ef4444" />
              <Text style={[styles.operationTitle, { color: '#ef4444' }]}>🚢 Active Operation</Text>
            </View>
            
            <Text style={[styles.operationText, { color: '#dc2626' }]}>
              Operation: {activeOperation.operationType}
            </Text>
            <Text style={[styles.operationText, { color: '#dc2626' }]}>
              ID: {activeOperation.operationId}
            </Text>
            <Text style={[styles.operationText, { color: '#dc2626' }]}>
              Expires: {new Date(activeOperation.expiresAt).toLocaleString()}
            </Text>
            
            <TouchableOpacity
              style={[styles.operationButton, { backgroundColor: '#ef4444', marginTop: 12 }]}
              onPress={() => handleSignOperation(activeOperation)}
            >
              <Text style={styles.operationButtonText}>✍️ SIGN OPERATION</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Seed Info Modal */}
      <Modal visible={showSeedInfo} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>🌱 Admin Seed Words</Text>
            
            {seedInfo && (
              <>
                <View style={styles.seedSection}>
                  <Text style={[styles.seedLabel, { color: colors.sub }]}>Admin 1 Words:</Text>
                  <Text style={[styles.seedWords, { color: '#10b981' }]}>
                    {seedInfo.admin1Words.join(' ')}
                  </Text>
                </View>
                
                <View style={styles.seedSection}>
                  <Text style={[styles.seedLabel, { color: colors.sub }]}>Admin 2 Words:</Text>
                  <Text style={[styles.seedWords, { color: '#3b82f6' }]}>
                    {seedInfo.admin2Words.join(' ')}
                  </Text>
                </View>
              </>
            )}
            
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.accent }]}
              onPress={() => setShowSeedInfo(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Change Passphrase Modal */}
      <Modal visible={showChangePassphrase} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>🔄 Change Admin Passphrase</Text>
            
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder="Current Passphrase"
              placeholderTextColor={colors.sub}
              value={currentPassphrase}
              onChangeText={setCurrentPassphrase}
              secureTextEntry
            />
            
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder="New Passphrase (min 12 characters)"
              placeholderTextColor={colors.sub}
              value={newPassphrase}
              onChangeText={setNewPassphrase}
              secureTextEntry
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#6b7280', flex: 1, marginRight: 8 }]}
                onPress={() => setShowChangePassphrase(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#ef4444', flex: 1, marginLeft: 8 }]}
                onPress={handleChangePassphrase}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Change</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      {adminSession && adminSystem.isSessionValid() ? renderDashboard() : renderAuthenticationScreen()}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  authCard: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 64,
  },
  authTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  authSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sessionCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  sessionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  sessionValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  operationCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  operationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  operationTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  operationButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  operationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  infoButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 8,
  },
  infoButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  operationText: {
    fontSize: 14,
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
    borderRadius: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  seedSection: {
    marginBottom: 16,
  },
  seedLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  seedWords: {
    fontSize: 16,
    fontWeight: '600',
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 8,
  },
  modalInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});