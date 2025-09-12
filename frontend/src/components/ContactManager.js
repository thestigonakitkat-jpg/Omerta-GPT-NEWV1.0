import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet, Alert } from 'react-native';

export default function ContactManager({ visible, onClose }) {
  const [contacts, setContacts] = useState([
    { id: '1', name: 'Alpha Agent', oid: 'OID-ALPHA-001', verified: true, lastSeen: '2 min ago' },
    { id: '2', name: 'Beta Operative', oid: 'OID-BETA-002', verified: true, lastSeen: '5 min ago' },
    { id: '3', name: 'Charlie Contact', oid: 'OID-CHARLIE-003', verified: false, lastSeen: '1 hour ago' },
  ]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactOid, setNewContactOid] = useState('');

  const handleAddContact = () => {
    if (!newContactName.trim() || !newContactOid.trim()) {
      Alert.alert('Invalid Input', 'Please enter both name and OID');
      return;
    }

    const newContact = {
      id: Date.now().toString(),
      name: newContactName.trim(),
      oid: newContactOid.trim(),
      verified: false,
      lastSeen: 'Just added',
    };

    setContacts(prev => [...prev, newContact]);
    setNewContactName('');
    setNewContactOid('');
    Alert.alert('Contact Added', 'Contact added successfully. Verify through QR scan for security.');
  };

  const handleVerifyContact = (contactId) => {
    setContacts(prev => prev.map(contact => 
      contact.id === contactId 
        ? { ...contact, verified: true }
        : contact
    ));
    Alert.alert('Contact Verified', 'Handshake verification completed successfully');
  };

  const handleDeleteContact = (contactId) => {
    Alert.alert(
      'Delete Contact',
      'Are you sure you want to remove this contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            setContacts(prev => prev.filter(contact => contact.id !== contactId));
          }
        }
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <Text style={styles.title}>📇 SECURE CONTACTS</Text>
          <Text style={styles.subtitle}>End-to-End Encrypted Directory</Text>

          <ScrollView style={styles.contactsList}>
            {contacts.map(contact => (
              <View key={contact.id} style={styles.contactItem}>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactOid}>{contact.oid}</Text>
                  <Text style={styles.contactLastSeen}>Last seen: {contact.lastSeen}</Text>
                </View>
                
                <View style={styles.contactActions}>
                  {contact.verified ? (
                    <Text style={styles.verifiedBadge}>✅ VERIFIED</Text>
                  ) : (
                    <TouchableOpacity 
                      style={styles.verifyButton}
                      onPress={() => handleVerifyContact(contact.id)}
                    >
                      <Text style={styles.verifyButtonText}>Verify</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDeleteContact(contact.id)}
                  >
                    <Text style={styles.deleteButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.addContactSection}>
            <Text style={styles.addContactTitle}>Add New Contact</Text>
            
            <TextInput
              style={styles.input}
              value={newContactName}
              onChangeText={setNewContactName}
              placeholder="Contact name"
              placeholderTextColor="#666"
            />
            
            <TextInput
              style={styles.input}
              value={newContactOid}
              onChangeText={setNewContactOid}
              placeholder="OMERTA ID (OID)"
              placeholderTextColor="#666"
              autoCapitalize="characters"
            />
            
            <TouchableOpacity style={styles.addButton} onPress={handleAddContact}>
              <Text style={styles.addButtonText}>➕ Add Contact</Text>
            </TouchableOpacity>
          </View>

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
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  panel: {
    backgroundColor: '#141414',
    borderRadius: 15,
    padding: 20,
    width: '95%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#333',
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    color: '#bfbfbf',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
  contactsList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  contactItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  contactOid: {
    color: '#bfbfbf',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  contactLastSeen: {
    color: '#888',
    fontSize: 10,
  },
  contactActions: {
    alignItems: 'center',
  },
  verifiedBadge: {
    color: '#28a745',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  verifyButton: {
    backgroundColor: '#007bff',
    borderRadius: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 5,
  },
  verifyButtonText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    borderRadius: 5,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 12,
  },
  addContactSection: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 15,
  },
  addContactTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#2a2a2a',
    color: '#ffffff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#555',
  },
  addButton: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#6c757d',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});