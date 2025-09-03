import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, TextInput, Modal, FlatList, Image, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import { encryptBackupBlob, decryptBackupBlob } from "../../../src/utils/crypto";
import VaultPinGate from "./_pinGate";
import { useVault, VaultItem, VaultFolder } from "../../../src/state/vault";
import { useTheme } from "../../../src/state/theme";
import { imageProcessor } from "../../../src/utils/imageProcessor";
import { DisguisedAppIcon } from "../../../src/components/DisguisedAppIcon";
import { contactsVault } from "../../../src/utils/contactsVault";
import { useContacts } from "../../../src/state/contacts";

export default function VaultScreen() {
  const [needPin, setNeedPin] = useState(true);
  const [busy, setBusy] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [pin, setPin] = useState("");
  const [showCreds, setShowCreds] = useState(false);
  const [activeFolder, setActiveFolder] = useState<VaultFolder | null>(null);
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [contactsPassphrase, setContactsPassphrase] = useState("");
  const [contactsPin, setContactsPin] = useState("");
  const vault = useVault();
  const contacts = useContacts();
  const { colors } = useTheme();

  const openCreds = () => setShowCreds(true);
  const closeCreds = () => setShowCreds(false);

  const snapshot = () => ({ created: Date.now(), items: vault.items });

  const onExport = async () => {
    try {
      setBusy(true);
      const blob = await encryptBackupBlob(snapshot(), passphrase, pin);
      const json = JSON.stringify(blob);

      if (Platform.OS === 'android' && FileSystem.StorageAccessFramework) {
        const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission', 'Directory permission required'); return; }
        try {
          const nm = await FileSystem.StorageAccessFramework.createFileAsync(perm.directoryUri, ".nomedia", 'application/octet-stream');
          await FileSystem.StorageAccessFramework.writeAsStringAsync(nm, "", { encoding: FileSystem.EncodingType.UTF8 });
        } catch {}
        const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(perm.directoryUri, `omerta_vault_${Date.now()}.bin`, 'application/octet-stream');
        await FileSystem.StorageAccessFramework.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
        Alert.alert('Exported', 'Encrypted vault backup saved');
      } else {
        const path = FileSystem.documentDirectory + `omerta_vault_${Date.now()}.bin`;
        await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
        Alert.alert('Exported', `Vault backup saved: ${path}`);
      }
    } catch (e: any) {
      Alert.alert('Export failed', e?.message || 'Error');
    } finally {
      setBusy(false);
      setPassphrase(""); setPin(""); setShowCreds(false);
    }
  };

  const onImport = async () => {
    try {
      setBusy(true);
      const pick = await DocumentPicker.getDocumentAsync({ multiple: false });
      if (pick.canceled || !pick.assets?.[0]) { setBusy(false); return; }
      const uri = pick.assets[0].uri;
      let json = "";
      if (Platform.OS === 'android' && FileSystem.StorageAccessFramework && uri.startsWith('content://')) {
        json = await FileSystem.StorageAccessFramework.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
      } else {
        json = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
      }
      const blob = JSON.parse(json);
      const data = await decryptBackupBlob(blob, passphrase, pin);
      vault.setItems(data.items || []);
      Alert.alert('Restored', `Vault restored with ${vault.items.length} items`);
    } catch (e: any) {
      Alert.alert('Import failed', e?.message || 'Error');
    } finally {
      setBusy(false);
    }
  };

  // Contacts Vault Functions
  const onExportContacts = async () => {
    try {
      if (!contactsPassphrase || contactsPassphrase.length < 16) {
        Alert.alert('Invalid Passphrase', 'Passphrase must be at least 16 characters');
        return;
      }
      if (!contactsPin || contactsPin.length !== 6) {
        Alert.alert('Invalid PIN', 'PIN must be exactly 6 digits');
        return;
      }

      setBusy(true);
      await contactsVault.exportContactsToVault(contacts.verified, contactsPassphrase, contactsPin);
      setContactsPassphrase("");
      setContactsPin("");
      setShowContactsModal(false);
    } catch (error) {
      console.error('Contacts export failed:', error);
    } finally {
      setBusy(false);
    }
  };

  const onImportContacts = async () => {
    try {
      if (!contactsPassphrase || contactsPassphrase.length < 16) {
        Alert.alert('Invalid Passphrase', 'Passphrase must be at least 16 characters');
        return;
      }
      if (!contactsPin || contactsPin.length !== 6) {
        Alert.alert('Invalid PIN', 'PIN must be exactly 6 digits');
        return;
      }

      setBusy(true);
      const importedContacts = await contactsVault.importContactsFromVault(contactsPassphrase, contactsPin);
      
      // Merge with existing contacts
      const mergedContacts = contactsVault.mergeContactsWithExisting(contacts.verified, importedContacts);
      
      // Update contacts store
      for (const [oid, verified] of Object.entries(mergedContacts)) {
        if (verified) {
          contacts.markVerified(oid);
        }
      }

      setContactsPassphrase("");
      setContactsPin("");
      setShowContactsModal(false);
    } catch (error) {
      console.error('Contacts import failed:', error);
    } finally {
      setBusy(false);
    }
  };

  const openFolder = (folder: VaultFolder) => {
    setActiveFolder(folder);
  };

  const viewItem = async (item: VaultItem) => {
    setSelectedItem(item);
  };

  const deleteItem = (item: VaultItem) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            vault.removeItem(item.id);
            setSelectedItem(null);
          }
        }
      ]
    );
  };

  const renderFolderCard = (folder: VaultFolder) => {
    const folderItems = vault.getItemsByFolder(folder);
    const folderInfo = {
      images: { icon: 'images' as const, name: 'Images', color: '#10b981' },
      text: { icon: 'document-text' as const, name: 'Text', color: '#3b82f6' },
      documents: { icon: 'folder' as const, name: 'Documents', color: '#f59e0b' }
    };
    
    const info = folderInfo[folder];
    
    return (
      <TouchableOpacity
        key={folder}
        style={[styles.folderCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => openFolder(folder)}
      >
        <View style={[styles.folderIcon, { backgroundColor: info.color }]}>
          <Ionicons name={info.icon} size={32} color="#ffffff" />
        </View>
        <View style={styles.folderInfo}>
          <Text style={[styles.folderName, { color: colors.text }]}>{info.name}</Text>
          <Text style={[styles.folderCount, { color: colors.sub }]}>
            {folderItems.length} item{folderItems.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.sub} />
      </TouchableOpacity>
    );
  };

  const renderVaultItem = ({ item }: { item: VaultItem }) => {
    return (
      <TouchableOpacity
        style={[styles.vaultItem, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => viewItem(item)}
      >
        <View style={styles.itemIcon}>
          {item.kind === 'image' && item.thumbnail ? (
            <Image 
              source={{ uri: `data:image/png;base64,${item.thumbnail}` }}
              style={styles.thumbnail}
            />
          ) : (
            <Ionicons 
              name={
                item.kind === 'image' ? 'image' :
                item.kind === 'text' ? 'document-text' :
                'document'
              } 
              size={24} 
              color={colors.accent} 
            />
          )}
        </View>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.itemDate, { color: colors.sub }]}>
            {new Date(item.created).toLocaleDateString()}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteItem(item)}
        >
          <Ionicons name="trash" size={16} color="#ef4444" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderItemViewer = () => {
    if (!selectedItem) return null;

    return (
      <Modal visible={!!selectedItem} animationType="slide" presentationStyle="fullScreen">
        <View style={[styles.viewerContainer, { backgroundColor: colors.bg }]}>
          {/* Header */}
          <View style={[styles.viewerHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setSelectedItem(null)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.viewerTitle, { color: colors.text }]} numberOfLines={1}>
              {selectedItem.title}
            </Text>
            <TouchableOpacity onPress={() => deleteItem(selectedItem)}>
              <Ionicons name="trash" size={24} color="#ef4444" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.viewerContent} contentContainerStyle={styles.viewerContentContainer}>
            {selectedItem.kind === 'image' && selectedItem.encryptedData && selectedItem.key && selectedItem.nonce ? (
              <ImageViewer item={selectedItem} />
            ) : selectedItem.kind === 'text' && selectedItem.dataB64 ? (
              <View style={[styles.textContent, { backgroundColor: colors.card }]}>
                <Text style={[styles.textBody, { color: colors.text }]}>
                  {Buffer.from(selectedItem.dataB64, 'base64').toString('utf-8')}
                </Text>
              </View>
            ) : (
              <View style={[styles.placeholderContent, { backgroundColor: colors.card }]}>
                <Ionicons name="document" size={48} color={colors.sub} />
                <Text style={[styles.placeholderText, { color: colors.sub }]}>
                  Content not available for preview
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const ImageViewer: React.FC<{ item: VaultItem }> = ({ item }) => {
    const [decryptedUri, setDecryptedUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
      if (item.encryptedData && item.key && item.nonce) {
        imageProcessor.decryptImage(item.encryptedData, item.key, item.nonce)
          .then(setDecryptedUri)
          .catch(console.error)
          .finally(() => setLoading(false));
      }
    }, [item]);

    if (loading) {
      return (
        <View style={[styles.loadingContainer, { backgroundColor: colors.card }]}>
          <Ionicons name="image" size={48} color={colors.sub} />
          <Text style={[styles.loadingText, { color: colors.sub }]}>Decrypting image...</Text>
        </View>
      );
    }

    return decryptedUri ? (
      <Image source={{ uri: decryptedUri }} style={styles.fullImage} resizeMode="contain" />
    ) : (
      <View style={[styles.placeholderContent, { backgroundColor: colors.card }]}>
        <Ionicons name="image" size={48} color={colors.sub} />
        <Text style={[styles.placeholderText, { color: colors.sub }]}>Failed to decrypt image</Text>
      </View>
    );
  };

  if (activeFolder) {
    // Folder view
    const folderItems = vault.getItemsByFolder(activeFolder);
    
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <VaultPinGate visible={needPin} onAuthed={() => setNeedPin(false)} />
        
        {/* Folder Header */}
        <View style={[styles.folderHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setActiveFolder(null)} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.folderHeaderTitle, { color: colors.text }]}>
            {activeFolder.charAt(0).toUpperCase() + activeFolder.slice(1)}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Items List */}
        <FlatList
          data={folderItems}
          keyExtractor={(item) => item.id}
          renderItem={renderVaultItem}
          contentContainerStyle={styles.itemsList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open" size={64} color={colors.sub} />
              <Text style={[styles.emptyText, { color: colors.sub }]}>
                No items in this folder
              </Text>
            </View>
          }
        />

        {renderItemViewer()}
      </View>
    );
  }

  // Main vault view
  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <VaultPinGate visible={needPin} onAuthed={() => setNeedPin(false)} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>🔐 Secure Vault</Text>
        <Text style={[styles.subtitle, { color: colors.sub }]}>
          Encrypted storage with AES-256-GCM • Argon2id KDF
        </Text>
      </View>

      {/* Folders */}
      <View style={styles.foldersContainer}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Folders</Text>
        <View style={styles.foldersGrid}>
          {renderFolderCard('images')}
          {renderFolderCard('text')}
          {renderFolderCard('documents')}
        </View>
      </View>

      {/* Settings */}
      <View style={styles.settingsContainer}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>
        
        {/* Disguised App Icon */}
        <DisguisedAppIcon />
        
        {/* Backup Controls */}
        <TouchableOpacity 
          disabled={busy} 
          style={[styles.settingButton, { backgroundColor: colors.accent }]} 
          onPress={openCreds}
        >
          <Ionicons name="download" size={20} color="#000" />
          <Text style={styles.settingButtonText}>
            {busy ? 'Working...' : 'Create Encrypted Backup'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          disabled={busy} 
          style={[styles.settingButton, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]} 
          onPress={onImport}
        >
          <Ionicons name="cloud-upload" size={20} color={colors.accent} />
          <Text style={[styles.settingButtonText, { color: colors.accent }]}>
            Restore from Backup
          </Text>
        </TouchableOpacity>

        {/* Contacts Vault Section */}
        <View style={styles.contactsVaultSection}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>
            📇 Contacts Vault
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.sub }]}>
            Secure backup & restore of OMERTA IDs with quarantine protection
          </Text>
          
          <TouchableOpacity 
            disabled={busy} 
            style={[styles.settingButton, { backgroundColor: '#10b981', marginTop: 8 }]} 
            onPress={() => setShowContactsModal(true)}
          >
            <Ionicons name="people" size={20} color="#000" />
            <Text style={styles.settingButtonText}>
              {busy ? 'Working...' : 'Manage Contacts Vault'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Export Modal */}
      <Modal visible={showCreds} transparent animationType='fade'>
        <View style={styles.backdrop}>
          <View style={[styles.credentialsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.credentialsTitle, { color: colors.text }]}>Enter Vault Credentials</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]} 
              secureTextEntry 
              placeholder='16+ character passphrase' 
              placeholderTextColor={colors.muted} 
              value={passphrase} 
              onChangeText={setPassphrase} 
            />
            <TextInput 
              style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]} 
              keyboardType='number-pad' 
              placeholder='6-digit PIN' 
              placeholderTextColor={colors.muted} 
              value={pin} 
              maxLength={6} 
              onChangeText={setPin} 
            />
            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: colors.accent }]} 
              onPress={onExport}
            >
              <Text style={styles.modalButtonText}>Encrypt & Export</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: colors.border }]} 
              onPress={() => setShowCreds(false)}
            >
              <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Contacts Vault Modal */}
      <Modal visible={showContactsModal} transparent animationType='fade'>
        <View style={styles.backdrop}>
          <View style={[styles.credentialsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.credentialsTitle, { color: colors.text }]}>📇 Contacts Vault</Text>
            <Text style={[styles.modalSubtitle, { color: colors.sub }]}>
              Secure backup/restore of OMERTA IDs with quarantine protection
            </Text>
            
            <TextInput 
              style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]} 
              secureTextEntry 
              placeholder='16+ character passphrase' 
              placeholderTextColor={colors.muted} 
              value={contactsPassphrase} 
              onChangeText={setContactsPassphrase} 
            />
            <TextInput 
              style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]} 
              keyboardType='number-pad' 
              placeholder='6-digit PIN' 
              placeholderTextColor={colors.muted} 
              value={contactsPin} 
              maxLength={6} 
              onChangeText={setContactsPin} 
            />

            <View style={styles.contactsStats}>
              <Text style={[styles.statsText, { color: colors.sub }]}>
                Current Contacts: {Object.keys(contacts.verified).length}
              </Text>
              <Text style={[styles.statsText, { color: colors.sub }]}>
                Verified: {Object.values(contacts.verified).filter(Boolean).length}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: '#10b981' }]} 
              onPress={onExportContacts}
              disabled={busy}
            >
              <Ionicons name="cloud-upload" size={16} color="#000" style={{ marginRight: 8 }} />
              <Text style={styles.modalButtonText}>Export to Vault</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: '#3b82f6' }]} 
              onPress={onImportContacts}
              disabled={busy}
            >
              <Ionicons name="cloud-download" size={16} color="#000" style={{ marginRight: 8 }} />
              <Text style={styles.modalButtonText}>Import from Vault</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: colors.border }]} 
              onPress={() => {
                setShowContactsModal(false);
                setContactsPassphrase("");
                setContactsPin("");
              }}
            >
              <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16 
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  foldersContainer: {
    marginBottom: 32,
  },
  foldersGrid: {
    gap: 12,
  },
  folderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  folderIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  folderInfo: {
    flex: 1,
  },
  folderName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  folderCount: {
    fontSize: 14,
  },
  settingsContainer: {
    flex: 1,
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  settingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  folderHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  itemsList: {
    paddingBottom: 16,
  },
  vaultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemDate: {
    fontSize: 12,
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  viewerContainer: {
    flex: 1,
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  viewerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  viewerContent: {
    flex: 1,
  },
  viewerContentContainer: {
    padding: 16,
  },
  textContent: {
    padding: 16,
    borderRadius: 12,
  },
  textBody: {
    fontSize: 16,
    lineHeight: 24,
  },
  placeholderContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    borderRadius: 12,
  },
  placeholderText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    borderRadius: 12,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  fullImage: {
    width: '100%',
    height: 400,
    borderRadius: 12,
  },
  backdrop: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  credentialsCard: { 
    width: '86%', 
    borderRadius: 12, 
    padding: 16, 
    borderWidth: 1 
  },
  credentialsTitle: { 
    fontWeight: '700', 
    marginBottom: 12, 
    textAlign: 'center',
    fontSize: 18,
  },
  input: { 
    height: 44, 
    borderWidth: 1, 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    marginBottom: 10 
  },
  modalButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});