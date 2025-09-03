import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { imageProcessor, EncryptedImage } from '../utils/imageProcessor';
import { useVault, VaultItem } from '../state/vault';
import { useTheme } from '../state/theme';

interface ImageHandlerProps {
  onImageSelected?: (encryptedImage: EncryptedImage) => void;
  onImageSharedToVault?: (vaultItem: VaultItem) => void;
}

interface ImagePreviewModalProps {
  visible: boolean;
  encryptedImage: EncryptedImage | null;
  onClose: () => void;
  onSend: () => void;
  onSaveToVault: () => void;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  visible,
  encryptedImage,
  onClose,
  onSend,
  onSaveToVault,
}) => {
  const { colors } = useTheme();
  const [decryptedUri, setDecryptedUri] = useState<string | null>(null);

  React.useEffect(() => {
    if (encryptedImage && visible) {
      imageProcessor.decryptImage(
        encryptedImage.encryptedData,
        encryptedImage.key,
        encryptedImage.nonce
      ).then(setDecryptedUri).catch(console.error);
    }
  }, [encryptedImage, visible]);

  if (!encryptedImage) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={[styles.previewContainer, { backgroundColor: colors.bg }]}>
        {/* Header */}
        <View style={[styles.previewHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Image Preview</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Image */}
        <ScrollView contentContainerStyle={styles.imageContainer}>
          {decryptedUri ? (
            <Image 
              source={{ uri: decryptedUri }} 
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.loadingContainer, { backgroundColor: colors.card }]}>
              <Ionicons name="image" size={48} color={colors.sub} />
              <Text style={[styles.loadingText, { color: colors.sub }]}>Decrypting image...</Text>
            </View>
          )}
        </ScrollView>

        {/* Footer Actions */}
        <View style={[styles.previewFooter, { borderTopColor: colors.border }]}>
          <Text style={[styles.imageInfo, { color: colors.sub }]}>
            📸 {encryptedImage.filename} • {encryptedImage.width}×{encryptedImage.height}
          </Text>
          <Text style={[styles.securityInfo, { color: colors.accent }]}>
            🔒 EXIF stripped • Fake timestamp • AES-256-GCM encrypted
          </Text>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.accent }]}
              onPress={onSend}
            >
              <Ionicons name="send" size={20} color="#000" />
              <Text style={styles.actionButtonText}>Send in Chat</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.accent, borderWidth: 1 }]}
              onPress={onSaveToVault}
            >
              <Ionicons name="safe" size={20} color={colors.accent} />
              <Text style={[styles.actionButtonText, { color: colors.accent }]}>Save to Vault</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const ImageHandler: React.FC<ImageHandlerProps> = ({
  onImageSelected,
  onImageSharedToVault,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [currentImage, setCurrentImage] = useState<EncryptedImage | null>(null);
  const vault = useVault();
  const { colors } = useTheme();

  const handleImagePick = async (source: 'camera' | 'gallery') => {
    try {
      setIsProcessing(true);
      
      const encryptedImage = await imageProcessor.pickProcessAndEncrypt(source);
      if (encryptedImage) {
        setCurrentImage(encryptedImage);
        setShowPreview(true);
      }
    } catch (error) {
      console.error('Image processing failed:', error);
      Alert.alert('Error', 'Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendImage = () => {
    if (currentImage && onImageSelected) {
      onImageSelected(currentImage);
      setShowPreview(false);
      setCurrentImage(null);
    }
  };

  const handleSaveToVault = async () => {
    if (!currentImage) return;

    try {
      // Create thumbnail for vault display
      const thumbnail = await imageProcessor.createThumbnail(currentImage.base64, 200);

      const vaultItem: VaultItem = {
        id: `img_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        kind: 'image',
        folder: 'images',
        title: currentImage.filename,
        filename: currentImage.filename,
        encryptedData: currentImage.encryptedData,
        key: currentImage.key,
        nonce: currentImage.nonce,
        thumbnail,
        size: currentImage.size,
        fakeTimestamp: currentImage.fakeTimestamp,
        created: Date.now(),
      };

      vault.addItem(vaultItem);
      
      if (onImageSharedToVault) {
        onImageSharedToVault(vaultItem);
      }

      Alert.alert(
        'Saved to Vault',
        'Image encrypted and saved to vault/images folder',
        [{ text: 'OK' }]
      );

      setShowPreview(false);
      setCurrentImage(null);
    } catch (error) {
      console.error('Failed to save to vault:', error);
      Alert.alert('Error', 'Failed to save image to vault');
    }
  };

  return (
    <>
      {/* Image Selection Buttons */}
      <View style={styles.imageButtons}>
        <TouchableOpacity
          style={[styles.imageButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => handleImagePick('camera')}
          disabled={isProcessing}
        >
          <Ionicons 
            name="camera" 
            size={24} 
            color={isProcessing ? colors.sub : colors.accent} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.imageButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => handleImagePick('gallery')}
          disabled={isProcessing}
        >
          <Ionicons 
            name="images" 
            size={24} 
            color={isProcessing ? colors.sub : colors.accent} 
          />
        </TouchableOpacity>
      </View>

      {/* Processing Indicator */}
      {isProcessing && (
        <View style={[styles.processingIndicator, { backgroundColor: colors.card }]}>
          <Text style={[styles.processingText, { color: colors.text }]}>
            🔒 Processing image securely...
          </Text>
        </View>
      )}

      {/* Preview Modal */}
      <ImagePreviewModal
        visible={showPreview}
        encryptedImage={currentImage}
        onClose={() => {
          setShowPreview(false);
          setCurrentImage(null);
        }}
        onSend={handleSendImage}
        onSaveToVault={handleSaveToVault}
      />
    </>
  );
};

const styles = StyleSheet.create({
  imageButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  imageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  processingIndicator: {
    position: 'absolute',
    top: -50,
    left: 0,
    right: 0,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  processingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Preview Modal Styles
  previewContainer: {
    flex: 1,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 48, // Account for status bar
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 44,
  },
  imageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    maxWidth: 400,
    maxHeight: 600,
  },
  loadingContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
  },
  previewFooter: {
    padding: 16,
    borderTopWidth: 1,
  },
  imageInfo: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  securityInfo: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ImageHandler;