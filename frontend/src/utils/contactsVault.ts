import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import { api } from './api';

export interface ContactEntry {
  oid: string;
  display_name: string;
  verified: boolean;
  added_timestamp: number;
  verification_timestamp?: number;
}

export interface ContactsBackup {
  contacts: ContactEntry[];
  backup_timestamp: number;
  device_id: string;
}

export interface ContactsVaultResponse {
  success: boolean;
  message: string;
  backup_id?: string;
  contacts_count?: number;
}

class ContactsVaultManager {
  private deviceId: string = '';
  
  constructor() {
    this.initializeDeviceId();
  }

  private async initializeDeviceId(): Promise<void> {
    try {
      let deviceId = await SecureStore.getItemAsync('omerta_device_id');
      if (!deviceId) {
        // Generate unique device ID
        deviceId = `omerta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await SecureStore.setItemAsync('omerta_device_id', deviceId);
      }
      this.deviceId = deviceId;
    } catch (error) {
      console.error('Failed to initialize device ID:', error);
      // Fallback to temporary ID
      this.deviceId = `temp_${Date.now()}`;
    }
  }

  private async generateEncryptionKeyHash(passphrase: string, pin: string): Promise<string> {
    try {
      // Simple hash generation for demonstration
      // In production, use proper key derivation (Argon2id)
      const combined = `${passphrase}_${pin}_${this.deviceId}`;
      const encoder = new TextEncoder();
      const data = encoder.encode(combined);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } catch (error) {
      console.error('Failed to generate encryption key hash:', error);
      throw new Error('Failed to generate encryption key');
    }
  }

  async exportContactsToVault(contacts: Record<string, boolean>, passphrase: string, pin: string): Promise<ContactsVaultResponse> {
    try {
      if (!this.deviceId) {
        await this.initializeDeviceId();
      }

      if (!passphrase || passphrase.length < 16) {
        throw new Error('Passphrase must be at least 16 characters');
      }

      if (!pin || pin.length !== 6) {
        throw new Error('PIN must be exactly 6 digits');
      }

      // Convert contacts to ContactEntry format
      const contactEntries: ContactEntry[] = Object.entries(contacts).map(([oid, verified]) => ({
        oid,
        display_name: '', // Could be enhanced to store display names
        verified,
        added_timestamp: Date.now(),
        verification_timestamp: verified ? Date.now() : undefined
      }));

      // Generate encryption key hash for vault access
      const encryptionKeyHash = await this.generateEncryptionKeyHash(passphrase, pin);

      const payload = {
        device_id: this.deviceId,
        contacts: contactEntries,
        encryption_key_hash: encryptionKeyHash
      };

      const response = await api.post('/api/contacts-vault/store', payload);

      if (response.success) {
        Alert.alert(
          '🔐 Contacts Vault',
          `Successfully backed up ${contactEntries.length} contacts to secure vault.\n\nBackup ID: ${response.backup_id}`,
          [{ text: 'OK' }]
        );
        return response;
      } else {
        throw new Error(response.message || 'Failed to backup contacts');
      }
    } catch (error) {
      console.error('Contact vault export failed:', error);
      Alert.alert('Export Failed', `Failed to backup contacts to vault: ${error.message}`);
      throw error;
    }
  }

  async importContactsFromVault(passphrase: string, pin: string): Promise<ContactEntry[]> {
    try {
      if (!this.deviceId) {
        await this.initializeDeviceId();
      }

      if (!passphrase || passphrase.length < 16) {
        throw new Error('Passphrase must be at least 16 characters');
      }

      if (!pin || pin.length !== 6) {
        throw new Error('PIN must be exactly 6 digits');
      }

      // Generate encryption key hash
      const encryptionKeyHash = await this.generateEncryptionKeyHash(passphrase, pin);

      const response = await api.get(`/api/contacts-vault/retrieve/${this.deviceId}?encryption_key_hash=${encryptionKeyHash}`);

      if (response.success) {
        const contacts = response.contacts || [];
        const quarantinedCount = response.quarantined_count || 0;

        let message = `Successfully retrieved ${contacts.length} contacts from vault.`;
        if (quarantinedCount > 0) {
          message += `\n\n🛡️ Security Notice: ${quarantinedCount} contacts were quarantined due to suspicious patterns.`;
        }
        message += `\n\nBackup Date: ${new Date(response.backup_timestamp * 1000).toLocaleDateString()}`;

        Alert.alert('🔐 Contacts Restored', message, [{ text: 'OK' }]);

        return contacts;
      } else {
        throw new Error(response.message || 'Failed to retrieve contacts from vault');
      }
    } catch (error) {
      console.error('Contact vault import failed:', error);
      Alert.alert('Import Failed', `Failed to restore contacts from vault: ${error.message}`);
      throw error;
    }
  }

  async clearContactsVault(): Promise<boolean> {
    try {
      if (!this.deviceId) {
        await this.initializeDeviceId();
      }

      const response = await api.delete(`/api/contacts-vault/clear/${this.deviceId}`);

      if (response.success) {
        Alert.alert('Vault Cleared', 'Contacts vault has been cleared successfully.');
        return true;
      } else {
        throw new Error(response.message || 'Failed to clear contacts vault');
      }
    } catch (error) {
      console.error('Clear contacts vault failed:', error);
      Alert.alert('Clear Failed', `Failed to clear contacts vault: ${error.message}`);
      return false;
    }
  }

  // Utility method to merge imported contacts with existing ones
  mergeContactsWithExisting(existingContacts: Record<string, boolean>, importedContacts: ContactEntry[]): Record<string, boolean> {
    const merged = { ...existingContacts };
    
    importedContacts.forEach(contact => {
      merged[contact.oid] = contact.verified;
    });

    return merged;
  }
}

// Export singleton instance
export const contactsVault = new ContactsVaultManager();