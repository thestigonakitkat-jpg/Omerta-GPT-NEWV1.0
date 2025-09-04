/**
 * 🔍 QUARANTINE VAULT REVIEW COMPONENT
 * 
 * Allows users to review imported contacts from quarantine before transferring
 * to main system with clean copying and fresh DNA generation.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  Switch,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../state/theme';
import { dualZoneVault, QuarantineContact } from '../utils/dualZoneVault';
import { photoMirror } from '../utils/photoMirror';

interface QuarantineVaultReviewProps {
  visible: boolean;
  onClose: () => void;
  onTransferComplete: (transferredContacts: any[]) => void;
}

export const QuarantineVaultReview: React.FC<QuarantineVaultReviewProps> = ({
  visible,
  onClose,
  onTransferComplete
}) => {
  const { colors } = useTheme();
  const [quarantineContacts, setQuarantineContacts] = useState<QuarantineContact[]>([]);
  const [selectedOIDs, setSelectedOIDs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [transferPin, setTransferPin] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);
  const [stats, setStats] = useState({
    total_contacts: 0,
    ready_for_transfer: 0,
    visual_processed: 0,
    sources: {} as Record<string, number>
  });

  useEffect(() => {
    if (visible) {
      loadQuarantineData();
    }
  }, [visible]);

  const loadQuarantineData = async () => {
    try {
      setLoading(true);
      const contacts = await dualZoneVault.getQuarantineContacts();
      const quarantineStats = await dualZoneVault.getQuarantineStats();
      
      setQuarantineContacts(contacts);
      setStats(quarantineStats);
    } catch (error) {
      console.error('Failed to load quarantine data:', error);
      Alert.alert('Load Error', 'Failed to load quarantine data');
    } finally {
      setLoading(false);
    }
  };

  const toggleContactSelection = (oid: string) => {
    setSelectedOIDs(prev => 
      prev.includes(oid) 
        ? prev.filter(id => id !== oid)
        : [...prev, oid]
    );
  };

  const selectAll = () => {
    const readyContacts = quarantineContacts
      .filter(contact => contact.clean_copy_ready)
      .map(contact => contact.oid);
    setSelectedOIDs(readyContacts);
  };

  const deselectAll = () => {
    setSelectedOIDs([]);
  };

  const handleTransferRequest = () => {
    if (selectedOIDs.length === 0) {
      Alert.alert('No Selection', 'Please select contacts to transfer');
      return;
    }

    setShowPinInput(true);
  };

  const executeTransfer = async () => {
    if (!transferPin || transferPin.length !== 6) {
      Alert.alert('Invalid PIN', 'Please enter your 6-digit chat PIN');
      return;
    }

    try {
      setLoading(true);
      setShowPinInput(false);
      
      const result = await dualZoneVault.transferToMainSystem(selectedOIDs, transferPin);
      
      if (result.success) {
        onTransferComplete(result.clean_copies);
        setSelectedOIDs([]);
        setTransferPin('');
        await loadQuarantineData(); // Refresh list
      } else {
        Alert.alert('Transfer Failed', result.message);
      }
      
    } catch (error) {
      console.error('Transfer failed:', error);
      Alert.alert('Transfer Error', `Failed to transfer contacts: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearQuarantine = async () => {
    Alert.alert(
      'Clear Quarantine',
      'Are you sure you want to clear all quarantine data? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: async () => {
            await dualZoneVault.clearQuarantine();
            await loadQuarantineData();
          }
        }
      ]
    );
  };

  const renderContact = ({ item }: { item: QuarantineContact }) => {
    const isSelected = selectedOIDs.includes(item.oid);
    const canSelect = item.clean_copy_ready;
    
    return (
      <TouchableOpacity 
        style={[
          styles.contactItem,
          { 
            backgroundColor: colors.card,
            borderColor: isSelected ? colors.accent : colors.border,
            borderWidth: isSelected ? 2 : 1,
            opacity: canSelect ? 1 : 0.6
          }
        ]}
        onPress={() => canSelect && toggleContactSelection(item.oid)}
        disabled={!canSelect}
      >
        <View style={styles.contactHeader}>
          <View style={styles.contactInfo}>
            <Text style={[styles.oidText, { color: colors.text }]}>
              {item.oid}
            </Text>
            <Text style={[styles.sourceText, { color: colors.sub }]}>
              Source: {item.source}
            </Text>
            <Text style={[styles.timestampText, { color: colors.sub }]}>
              Quarantined: {new Date(item.quarantine_timestamp).toLocaleString()}
            </Text>
          </View>
          
          <View style={styles.statusIndicators}>
            {item.visual_processed && (
              <View style={[styles.statusBadge, { backgroundColor: '#10b981' }]}>
                <Ionicons name="camera" size={12} color="#fff" />
                <Text style={styles.badgeText}>📸</Text>
              </View>
            )}
            
            {item.clean_copy_ready && (
              <View style={[styles.statusBadge, { backgroundColor: '#3b82f6' }]}>
                <Ionicons name="checkmark-circle" size={12} color="#fff" />
                <Text style={styles.badgeText}>✅</Text>
              </View>
            )}
            
            {isSelected && (
              <View style={[styles.statusBadge, { backgroundColor: colors.accent }]}>
                <Ionicons name="checkmark" size={12} color="#000" />
              </View>
            )}
          </View>
        </View>
        
        {!canSelect && (
          <Text style={[styles.warningText, { color: '#ef4444' }]}>
            ⚠️ Failed security validation - cannot transfer
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderStats = () => (
    <View style={[styles.statsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.statsTitle, { color: colors.text }]}>
        📊 Quarantine Statistics
      </Text>
      
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.accent }]}>{stats.total_contacts}</Text>
          <Text style={[styles.statLabel, { color: colors.sub }]}>Total</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#10b981' }]}>{stats.ready_for_transfer}</Text>
          <Text style={[styles.statLabel, { color: colors.sub }]}>Ready</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#3b82f6' }]}>{stats.visual_processed}</Text>
          <Text style={[styles.statLabel, { color: colors.sub }]}>Processed</Text>
        </View>
      </View>
      
      {Object.keys(stats.sources).length > 0 && (
        <View style={styles.sourcesContainer}>
          <Text style={[styles.sourcesTitle, { color: colors.text }]}>Sources:</Text>
          {Object.entries(stats.sources).map(([source, count]) => (
            <Text key={source} style={[styles.sourceItem, { color: colors.sub }]}>
              • {source}: {count}
            </Text>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            🔍 Quarantine Vault Review
          </Text>
          
          <TouchableOpacity onPress={loadQuarantineData} style={styles.refreshButton}>
            <Ionicons name="refresh" size={20} color={colors.accent} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              Loading quarantine data...
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.content}>
            {/* Statistics */}
            {renderStats()}
            
            {/* Selection Controls */}
            {quarantineContacts.length > 0 && (
              <View style={[styles.selectionControls, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.selectionTitle, { color: colors.text }]}>
                  Selection: {selectedOIDs.length} contacts
                </Text>
                
                <View style={styles.selectionButtons}>
                  <TouchableOpacity 
                    style={[styles.selectionButton, { backgroundColor: colors.accent }]}
                    onPress={selectAll}
                  >
                    <Text style={styles.selectionButtonText}>Select All Ready</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.selectionButton, { backgroundColor: colors.border }]}
                    onPress={deselectAll}
                  >
                    <Text style={[styles.selectionButtonText, { color: colors.text }]}>Deselect All</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Contacts List */}
            {quarantineContacts.length > 0 ? (
              <FlatList
                data={quarantineContacts}
                renderItem={renderContact}
                keyExtractor={(item) => item.oid}
                style={styles.contactsList}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="folder-open-outline" size={64} color={colors.sub} />
                <Text style={[styles.emptyText, { color: colors.sub }]}>
                  No contacts in quarantine
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.sub }]}>
                  Import contacts from SD card to review them here
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            {quarantineContacts.length > 0 && (
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[
                    styles.transferButton, 
                    { 
                      backgroundColor: selectedOIDs.length > 0 ? colors.accent : colors.border,
                      opacity: selectedOIDs.length > 0 ? 1 : 0.5
                    }
                  ]}
                  onPress={handleTransferRequest}
                  disabled={selectedOIDs.length === 0}
                >
                  <Ionicons name="arrow-forward" size={20} color="#000" />
                  <Text style={styles.transferButtonText}>
                    Transfer {selectedOIDs.length} to Main System
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.clearButton, { backgroundColor: '#ef4444' }]}
                  onPress={clearQuarantine}
                >
                  <Ionicons name="trash" size={20} color="#fff" />
                  <Text style={styles.clearButtonText}>Clear All Quarantine</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}

        {/* PIN Input Modal */}
        <Modal visible={showPinInput} transparent animationType="fade">
          <View style={styles.pinModalOverlay}>
            <View style={[styles.pinModalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.pinModalTitle, { color: colors.text }]}>
                🔐 Confirm Transfer
              </Text>
              
              <Text style={[styles.pinModalSubtitle, { color: colors.sub }]}>
                Enter your chat PIN to transfer {selectedOIDs.length} contacts to main system
              </Text>
              
              <TextInput
                style={[styles.pinInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                placeholder="6-digit PIN"
                placeholderTextColor={colors.sub}
                value={transferPin}
                onChangeText={setTransferPin}
                keyboardType="number-pad"
                maxLength={6}
                secureTextEntry
              />
              
              <View style={styles.pinModalButtons}>
                <TouchableOpacity 
                  style={[styles.pinModalButton, { backgroundColor: colors.border }]}
                  onPress={() => {
                    setShowPinInput(false);
                    setTransferPin('');
                  }}
                >
                  <Text style={[styles.pinModalButtonText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.pinModalButton, { backgroundColor: colors.accent }]}
                  onPress={executeTransfer}
                >
                  <Text style={styles.pinModalButtonText}>Transfer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  statsContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  sourcesContainer: {
    marginTop: 8,
  },
  sourcesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  sourceItem: {
    fontSize: 12,
    marginLeft: 8,
  },
  selectionControls: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  selectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  selectionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  selectionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  contactsList: {
    marginBottom: 16,
  },
  contactItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  contactInfo: {
    flex: 1,
  },
  oidText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sourceText: {
    fontSize: 12,
    marginBottom: 2,
  },
  timestampText: {
    fontSize: 11,
  },
  statusIndicators: {
    flexDirection: 'row',
    gap: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  badgeText: {
    fontSize: 10,
    color: '#fff',
  },
  warningText: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  actionButtons: {
    gap: 12,
    marginBottom: 32,
  },
  transferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  transferButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  pinModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinModalContent: {
    width: '90%',
    maxWidth: 400,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
  },
  pinModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  pinModalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  pinInput: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  pinModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  pinModalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  pinModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});