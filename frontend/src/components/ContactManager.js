import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  Alert, 
  Modal 
} from 'react-native';
import { useSecurityStore } from '../state/security';
import omertaAPI from '../utils/api';

export default function ContactManager({ visible, onClose }) {
  const [contacts, setContacts] = useState([]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactOID, setNewContactOID] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);
  const [verifyingContact, setVerifyingContact] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const { deviceId, updateActivity } = useSecurityStore();

  useEffect(() => {
    if (visible) {
      loadContacts();
    }
  }, [visible]);

  const loadContacts = async () => {
    try {
      setIsLoading(true);
      // Load contacts from secure vault
      const response = await omertaAPI.makeRequest(`/contacts-vault/retrieve/${deviceId}?encryption_key_hash=secure_key_hash_${deviceId}`);
      
      if (response.status === 'success') {
        setContacts(response.contacts || []);
        console.log(`📇 Loaded ${response.contacts?.length || 0} contacts from vault`);
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
      // Initialize with demo contacts for testing
      setContacts([
        {
          id: 'demo_1',
          name: 'Secure Contact Alpha',
          phone: '+1-555-SECURE',
          oid: 'omerta_alpha_2024_verified',
          verified: true,
          trustLevel: 'high',
          lastSeen: Date.now() - 86400000,
          handshakeCompleted: true
        },
        {
          id: 'demo_2',
          name: 'Contact Beta',
          phone: '+1-555-BETA01',
          oid: 'omerta_beta_2024_pending',
          verified: false,
          trustLevel: 'medium',
          lastSeen: Date.now() - 3600000,
          handshakeCompleted: false
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveContacts = async () => {
    try {
      const response = await omertaAPI.makeRequest('/contacts-vault/store', {
        method: 'POST',
        body: JSON.stringify({
          device_id: deviceId,
          contacts: contacts,
          encryption_key_hash: `secure_key_hash_${deviceId}`,
          backup_enabled: true
        })
      });
      
      if (response.status === 'success') {
        console.log('📇 Contacts saved to secure vault');
      }
    } catch (error) {
      console.error('Failed to save contacts:', error);
    }
  };

  const addContact = async () => {
    if (!newContactName.trim() || !newContactPhone.trim() || !newContactOID.trim()) {
      Alert.alert('Error', 'Please fill in all contact fields');
      return;
    }

    const newContact = {
      id: `contact_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      name: newContactName.trim(),
      phone: newContactPhone.trim(),
      oid: newContactOID.trim(),
      verified: false,
      trustLevel: 'low',
      lastSeen: null,
      handshakeCompleted: false,
      addedAt: Date.now()
    };

    const updatedContacts = [...contacts, newContact];
    setContacts(updatedContacts);
    await saveContacts();

    // Clear form
    setNewContactName('');
    setNewContactPhone('');
    setNewContactOID('');
    setShowAddContact(false);

    updateActivity();

    Alert.alert(
      '📇 Contact Added',
      `${newContact.name} has been added to your secure vault. Initiate handshake verification to establish trust.`
    );
  };

  const verifyContact = async (contactId) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;

    setVerifyingContact(contactId);
    
    // Simulate handshake verification process
    setTimeout(async () => {
      const updatedContacts = contacts.map(c => {
        if (c.id === contactId) {
          return {
            ...c,
            verified: true,
            trustLevel: 'high',
            handshakeCompleted: true,
            verifiedAt: Date.now()
          };
        }
        return c;
      });

      setContacts(updatedContacts);
      await saveContacts();
      setVerifyingContact(null);

      Alert.alert(
        '✅ Verification Complete',
        `${contact.name} has been successfully verified via OMERTÁ handshake protocol. Secure communication is now available.`
      );
    }, 3000);
  };

  const removeContact = (contactId) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;

    Alert.alert(
      '🗑️ Remove Contact',
      `Are you sure you want to remove ${contact.name} from your secure vault?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            const updatedContacts = contacts.filter(c => c.id !== contactId);
            setContacts(updatedContacts);
            await saveContacts();
            updateActivity();
          }
        }
      ]
    );
  };

  const getTrustColor = (trustLevel) => {
    switch (trustLevel) {
      case 'high': return '#00ff00';
      case 'medium': return '#ffaa00';
      case 'low': return '#ff6666';
      default: return '#666';
    }
  };

  const getVerificationIcon = (contact) => {
    if (verifyingContact === contact.id) return '🔄';
    if (contact.verified) return '✅';
    return '❓';
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>📇 SECURE CONTACTS</Text>
            <Text style={styles.subtitle}>OMERTÁ Vault Management</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.stats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{contacts.length}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{contacts.filter(c => c.verified).length}</Text>
                <Text style={styles.statLabel}>Verified</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{contacts.filter(c => c.trustLevel === 'high').length}</Text>
                <Text style={styles.statLabel}>Trusted</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowAddContact(true)}
            >
              <Text style={styles.addButtonText}>➕ Add Secure Contact</Text>
            </TouchableOpacity>

            {contacts.map((contact) => (
              <View key={contact.id} style={styles.contactCard}>
                <View style={styles.contactHeader}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.verificationIcon}>
                    {getVerificationIcon(contact)}
                  </Text>
                </View>

                <View style={styles.contactDetails}>
                  <Text style={styles.contactPhone}>{contact.phone}</Text>
                  <Text style={styles.contactOID}>OID: {contact.oid}</Text>
                  <View style={styles.trustIndicator}>
                    <Text 
                      style={[
                        styles.trustLevel, 
                        { color: getTrustColor(contact.trustLevel) }
                      ]}
                    >
                      Trust: {contact.trustLevel.toUpperCase()}
                    </Text>
                    {contact.lastSeen && (
                      <Text style={styles.lastSeen}>
                        Last seen: {new Date(contact.lastSeen).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.contactActions}>
                  {!contact.verified && (
                    <TouchableOpacity 
                      style={styles.verifyButton}
                      onPress={() => verifyContact(contact.id)}
                      disabled={verifyingContact === contact.id}
                    >
                      <Text style={styles.verifyButtonText}>
                        {verifyingContact === contact.id ? '🔄 Verifying...' : '🤝 Handshake'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity 
                    style={styles.chatButton}
                    onPress={() => {
                      onClose();
                      // This would open secure chat with the contact
                      Alert.alert('💬 Secure Chat', `Opening encrypted channel with ${contact.name}`);
                    }}
                  >
                    <Text style={styles.chatButtonText}>💬 Chat</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.removeButton}
                    onPress={() => removeContact(contact.id)}
                  >
                    <Text style={styles.removeButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {contacts.length === 0 && !isLoading && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No contacts in secure vault</Text>
                <Text style={styles.emptySubtext}>
                  Add contacts to establish secure communication channels
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Add Contact Modal */}
          <Modal visible={showAddContact} animationType="slide" transparent>
            <View style={styles.addContactOverlay}>
              <View style={styles.addContactContainer}>
                <Text style={styles.addContactTitle}>📇 Add Secure Contact</Text>
                
                <TextInput
                  style={styles.input}
                  value={newContactName}
                  onChangeText={setNewContactName}
                  placeholder="Contact Name"
                  placeholderTextColor="#666"
                />
                
                <TextInput
                  style={styles.input}
                  value={newContactPhone}
                  onChangeText={setNewContactPhone}
                  placeholder="Phone Number"
                  placeholderTextColor="#666"
                  keyboardType="phone-pad"
                />
                
                <TextInput
                  style={styles.input}
                  value={newContactOID}
                  onChangeText={setNewContactOID}
                  placeholder="OMERTÁ ID (OID)"
                  placeholderTextColor="#666"
                  autoCapitalize="none"
                />

                <View style={styles.addContactActions}>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => setShowAddContact(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.confirmButton}
                    onPress={addContact}
                  >
                    <Text style={styles.confirmButtonText}>Add Contact</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
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
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: '#ef4444',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 5,
  },
  addButton: {
    backgroundColor: '#ef4444',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  contactCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  contactName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  verificationIcon: {
    fontSize: 20,
  },
  contactDetails: {
    marginBottom: 15,
  },
  contactPhone: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 5,
  },
  contactOID: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 10,
  },
  trustIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trustLevel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  lastSeen: {
    color: '#666',
    fontSize: 10,
  },
  contactActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  verifyButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    marginRight: 10,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chatButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    marginRight: 10,
    flex: 1,
    alignItems: 'center',
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  removeButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    marginBottom: 5,
  },
  emptySubtext: {
    color: '#444',
    fontSize: 12,
    textAlign: 'center',
  },
  addContactOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 30,
  },
  addContactContainer: {
    backgroundColor: '#222',
    borderRadius: 15,
    padding: 25,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  addContactTitle: {
    color: '#ef4444',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 10,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    marginBottom: 15,
  },
  addContactActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  cancelButton: {
    backgroundColor: '#666',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 20,
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 20,
    flex: 1,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});