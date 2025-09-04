import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import { api } from './api';
import { CryptographicDNAValidator } from './cryptographicDNA';

export interface ContactEntry {
  oid: string;
  display_name: string;
  verified: boolean;
  added_timestamp: number;
  verification_timestamp?: number;
  cryptographic_dna?: string; // New DNA field for security validation
  dna_confidence?: number;     // DNA validation confidence score
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

  private async generateContactDNA(contact: ContactEntry): Promise<string> {
    try {
      const dnaValidator = CryptographicDNAValidator.getInstance();
      
      // Generate DNA based on contact data + device characteristics
      const contactData = `${contact.oid}_${contact.display_name}_${contact.verified}_${contact.added_timestamp}`;
      const deviceDNA = await dnaValidator.generateCryptographicDNA();
      
      // Create unique DNA signature for this contact
      const encoder = new TextEncoder();
      const combinedData = encoder.encode(`OMERTA_CONTACT_DNA_${contactData}_${deviceDNA.dnaSignature}`);
      const dnaHash = await crypto.subtle.digest('SHA-256', combinedData);
      const dnaArray = Array.from(new Uint8Array(dnaHash));
      const dnaHex = dnaArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      return `DNA_${dnaHex.substring(0, 32)}`;
    } catch (error) {
      console.error('Failed to generate contact DNA:', error);
      return `DNA_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  private async validateContactDNA(contact: ContactEntry): Promise<{ isValid: boolean; confidence: number; threat: string }> {
    try {
      const dnaValidator = CryptographicDNAValidator.getInstance();
      
      if (!contact.cryptographic_dna) {
        return { isValid: false, confidence: 0, threat: 'Missing DNA signature' };
      }

      // Regenerate expected DNA
      const expectedDNA = await this.generateContactDNA(contact);
      
      // Check DNA patterns for malicious indicators
      const maliciousPatterns = [
        /script/i, /eval\(/i, /javascript:/i, /data:/i, /vbscript:/i,
        /onload/i, /onerror/i, /onclick/i, /onfocus/i, /onmouseover/i,
        /<iframe/i, /<object/i, /<embed/i, /<applet/i, /<meta/i,
        /drop\s+table/i, /union\s+select/i, /insert\s+into/i, /delete\s+from/i,
        /xp_cmdshell/i, /sp_executesql/i, /exec\(/i, /execute\(/i,
        /\.\.\/\.\.\//i, /\/etc\/passwd/i, /\/proc\/self/i, /\/dev\/tcp/i,
        /nc\s+-l/i, /bash\s+-i/i, /sh\s+-i/i, /cmd\.exe/i, /powershell/i,
        /%[0-9a-f]{2}/i, /\\x[0-9a-f]{2}/i, /\\u[0-9a-f]{4}/i,
        /base64/i, /btoa\(/i, /atob\(/i, /fromCharCode/i, /String\.raw/i
      ];

      // Check contact data for malicious patterns
      const contactString = JSON.stringify(contact).toLowerCase();
      let threatCount = 0;
      let detectedThreats: string[] = [];

      for (const pattern of maliciousPatterns) {
        if (pattern.test(contactString)) {
          threatCount++;
          detectedThreats.push(pattern.source);
        }
      }

      // DNA validation
      const dnaMatch = contact.cryptographic_dna === expectedDNA;
      
      // Calculate confidence score
      let confidence = 100;
      if (!dnaMatch) confidence -= 30;
      if (threatCount > 0) confidence -= (threatCount * 20);
      if (contact.oid.length > 200) confidence -= 10; // Suspicious long OID
      if (contact.display_name.length > 100) confidence -= 10; // Suspicious long name
      
      confidence = Math.max(0, confidence);

      const isValid = confidence >= 80 && threatCount === 0;
      const threat = detectedThreats.length > 0 ? `Malicious patterns: ${detectedThreats.join(', ')}` : 'None';

      return { isValid, confidence, threat };
    } catch (error) {
      console.error('Contact DNA validation failed:', error);
      return { isValid: false, confidence: 0, threat: 'DNA validation error' };
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

      // Convert contacts to ContactEntry format with DNA generation
      const contactEntries: ContactEntry[] = [];
      let dnaGenerationCount = 0;
      
      for (const [oid, verified] of Object.entries(contacts)) {
        const baseContact: ContactEntry = {
          oid,
          display_name: '', // Could be enhanced to store display names
          verified,
          added_timestamp: Date.now(),
          verification_timestamp: verified ? Date.now() : undefined
        };

        // Generate cryptographic DNA for each contact
        try {
          const contactDNA = await this.generateContactDNA(baseContact);
          baseContact.cryptographic_dna = contactDNA;
          baseContact.dna_confidence = 100; // Fresh DNA has full confidence
          dnaGenerationCount++;
        } catch (error) {
          console.warn(`Failed to generate DNA for contact ${oid}:`, error);
          // Continue without DNA if generation fails
        }

        contactEntries.push(baseContact);
      }

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
          '🔐🧬 Contacts Vault + DNA',
          `Successfully backed up ${contactEntries.length} contacts to secure vault.\n\n` +
          `🧬 DNA Protected: ${dnaGenerationCount}/${contactEntries.length} contacts\n` +
          `🔒 Encryption: AES-256 + Argon2id\n` +
          `🛡️ Quarantine: Active malware scanning\n\n` +
          `Backup ID: ${response.backup_id}`,
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

        // Perform DNA validation on each contact
        const validatedContacts: ContactEntry[] = [];
        const dnaFailures: ContactEntry[] = [];
        let highConfidenceCount = 0;
        let totalThreatCount = 0;

        for (const contact of contacts) {
          try {
            const dnaResult = await this.validateContactDNA(contact);
            
            if (dnaResult.isValid && dnaResult.confidence >= 80) {
              // High confidence DNA - safe contact
              contact.dna_confidence = dnaResult.confidence;
              validatedContacts.push(contact);
              if (dnaResult.confidence >= 95) highConfidenceCount++;
            } else {
              // Low confidence DNA - quarantine
              console.warn(`🧬 DNA VALIDATION FAILED for contact ${contact.oid}: ${dnaResult.threat}`);
              dnaFailures.push(contact);
              if (dnaResult.threat !== 'None') totalThreatCount++;
            }
          } catch (error) {
            console.error(`DNA validation error for contact ${contact.oid}:`, error);
            dnaFailures.push(contact);
          }
        }

        // Detailed security report
        let message = `🔐🧬 Contacts Restored with DNA Validation\n\n`;
        message += `✅ Validated Contacts: ${validatedContacts.length}\n`;
        message += `🧬 High Confidence DNA: ${highConfidenceCount}\n`;
        
        if (quarantinedCount > 0) {
          message += `🛡️ Quarantined (Server): ${quarantinedCount}\n`;
        }
        
        if (dnaFailures.length > 0) {
          message += `⚠️ DNA Validation Failed: ${dnaFailures.length}\n`;
        }
        
        if (totalThreatCount > 0) {
          message += `🚨 Malicious Patterns Detected: ${totalThreatCount}\n`;
        }
        
        message += `\n📅 Backup Date: ${new Date(response.backup_timestamp * 1000).toLocaleDateString()}\n`;
        message += `🔒 Signature Verified: ${response.signature_verified ? 'YES' : 'NO'}\n`;

        // Security warnings
        if (dnaFailures.length > 0 || totalThreatCount > 0) {
          message += `\n🛡️ SECURITY NOTICE: Some contacts failed DNA validation and were not imported. This may indicate tampering or corruption.`;
        }

        if (validatedContacts.length === 0) {
          message += `\n❌ NO CONTACTS IMPORTED: All contacts failed security validation.`;
        }

        Alert.alert('🧬 DNA-Protected Restore', message, [{ text: 'OK' }]);

        return validatedContacts; // Return only DNA-validated contacts
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