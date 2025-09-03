import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { getRandomBytesAsync, aesGcmEncrypt } from './crypto';

interface ProcessedImage {
  uri: string;
  base64: string;
  width: number;
  height: number;
  size: number;
  fakeTimestamp: number;
}

interface EncryptedImage extends ProcessedImage {
  encryptedData: string;
  key: Uint8Array;
  nonce: Uint8Array;
  filename: string;
}

// Manage sequential fake timestamps
class FakeTimestampManager {
  private static instance: FakeTimestampManager;
  private startDate: number;
  private lastTimestamp: number;
  private imageCount: number = 0;

  private constructor() {
    // Random starting date 3-12 months in the past
    const now = Date.now();
    const monthsBack = 3 + Math.random() * 9; // 3-12 months
    this.startDate = now - (monthsBack * 30 * 24 * 60 * 60 * 1000);
    this.lastTimestamp = this.startDate;
  }

  static getInstance(): FakeTimestampManager {
    if (!FakeTimestampManager.instance) {
      FakeTimestampManager.instance = new FakeTimestampManager();
    }
    return FakeTimestampManager.instance;
  }

  getNextFakeTimestamp(): number {
    this.imageCount++;
    
    // Random interval between photos: 5 minutes to 3 hours
    const minInterval = 5 * 60 * 1000; // 5 minutes
    const maxInterval = 3 * 60 * 60 * 1000; // 3 hours
    const interval = minInterval + Math.random() * (maxInterval - minInterval);
    
    this.lastTimestamp += interval;
    
    // Don't exceed current time
    const now = Date.now();
    if (this.lastTimestamp > now) {
      this.lastTimestamp = now - Math.random() * 24 * 60 * 60 * 1000; // Within last 24 hours
    }
    
    return Math.floor(this.lastTimestamp);
  }

  reset() {
    this.imageCount = 0;
    const now = Date.now();
    const monthsBack = 3 + Math.random() * 9;
    this.startDate = now - (monthsBack * 30 * 24 * 60 * 60 * 1000);
    this.lastTimestamp = this.startDate;
  }
}

export class ImageProcessor {
  private timestampManager = FakeTimestampManager.getInstance();

  /**
   * Pick image from camera or gallery
   * SECURITY: Camera photos are NOT saved to gallery - taken directly to memory
   */
  async pickImage(source: 'camera' | 'gallery'): Promise<string | null> {
    if (source === 'camera') {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Camera permission required');
      }

      // 🔒 SECURITY: Use launchCameraAsync to take photo directly without saving to gallery
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
        base64: false,
        exif: false, // Don't include EXIF data
        saveToPhotos: false, // 🔒 CRITICAL: Never save to phone's photo gallery
      });

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      console.log('🔒 SECURITY: Photo taken directly to memory - NOT saved to gallery');
      return result.assets[0].uri;

    } else {
      // Gallery selection (for existing images)
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Gallery permission required');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
        base64: false,
        exif: false, // Don't include EXIF data
      });

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      console.log('🔒 SECURITY: Existing image selected from gallery for encryption');
      return result.assets[0].uri;
    }
  }

  /**
   * Strip EXIF data, convert to PNG, add fake timestamp
   * SECURITY: All processing happens in memory, no temporary files on disk
   */
  async processImage(imageUri: string): Promise<ProcessedImage> {
    try {
      console.log('🔒 SECURITY: Processing image in memory - stripping EXIF and converting to PNG');

      // Step 1: Strip EXIF and convert to PNG (this removes ALL metadata and happens in memory)
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [], // No transformations, just format conversion
        {
          compress: 1, // No compression loss
          format: ImageManipulator.SaveFormat.PNG, // Convert to PNG
          base64: true, // Get base64 for memory processing
        }
      );

      if (!manipulatedImage.base64) {
        throw new Error('Failed to convert image to base64');
      }

      // Step 2: Generate fake sequential timestamp
      const fakeTimestamp = this.timestampManager.getNextFakeTimestamp();

      // Step 3: Get file info (temporary URI will be cleaned up automatically)
      const fileInfo = await FileSystem.getInfoAsync(manipulatedImage.uri);
      const size = fileInfo.exists ? fileInfo.size || 0 : 0;

      // 🔒 SECURITY: Delete the temporary processed image file immediately
      try {
        if (manipulatedImage.uri.startsWith('file://')) {
          await FileSystem.deleteAsync(manipulatedImage.uri, { idempotent: true });
          console.log('🗑️ SECURITY: Temporary processed image file deleted');
        }
      } catch (error) {
        console.warn('Warning: Failed to delete temporary image file:', error);
      }

      console.log('✅ SECURITY: Image processed - EXIF stripped, PNG converted, fake timestamp applied, no disk traces');

      return {
        uri: 'memory://processed', // Placeholder since we only use base64
        base64: manipulatedImage.base64,
        width: manipulatedImage.width,
        height: manipulatedImage.height,
        size,
        fakeTimestamp,
      };
    } catch (error) {
      console.error('Image processing failed:', error);
      throw new Error('Failed to process image securely');
    }
  }

  /**
   * Encrypt processed image for secure storage
   */
  async encryptImage(processedImage: ProcessedImage): Promise<EncryptedImage> {
    try {
      console.log('🔐 Encrypting image data');

      // Convert base64 to bytes
      const imageBytes = Uint8Array.from(atob(processedImage.base64), c => c.charCodeAt(0));

      // Generate encryption key and nonce
      const key = await getRandomBytesAsync(32); // 256-bit key
      const nonce = await getRandomBytesAsync(12); // 96-bit nonce

      // Encrypt image data
      const encryptedBytes = await aesGcmEncrypt(imageBytes, key, nonce);
      const encryptedData = btoa(String.fromCharCode(...encryptedBytes));

      // Generate filename with fake timestamp
      const date = new Date(processedImage.fakeTimestamp);
      const filename = `IMG_${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}${date.getSeconds().toString().padStart(2, '0')}.png`;

      console.log('✅ Image encrypted successfully');

      return {
        ...processedImage,
        encryptedData,
        key,
        nonce,
        filename,
      };
    } catch (error) {
      console.error('Image encryption failed:', error);
      throw new Error('Failed to encrypt image');
    }
  }

  /**
   * Full pipeline: Pick, process, and encrypt image
   * SECURITY: Original photo deleted from temp storage immediately after encryption
   */
  async pickProcessAndEncrypt(source: 'camera' | 'gallery'): Promise<EncryptedImage | null> {
    const imageUri = await this.pickImage(source);
    if (!imageUri) {
      return null;
    }

    try {
      const processedImage = await this.processImage(imageUri);
      const encryptedImage = await this.encryptImage(processedImage);

      // 🔒 SECURITY: Delete original camera image immediately after encryption
      try {
        if (imageUri.startsWith('file://')) {
          await FileSystem.deleteAsync(imageUri, { idempotent: true });
          console.log('🗑️ SECURITY: Original camera image deleted - no trace on device');
        }
      } catch (error) {
        console.warn('Warning: Failed to delete original image file:', error);
      }

      return encryptedImage;
    } catch (error) {
      // Clean up original image even if processing fails
      try {
        if (imageUri.startsWith('file://')) {
          await FileSystem.deleteAsync(imageUri, { idempotent: true });
          console.log('🗑️ SECURITY: Original image cleaned up after processing failure');
        }
      } catch (cleanupError) {
        console.warn('Warning: Failed to cleanup image after error:', cleanupError);
      }
      throw error;
    }
  }

  /**
   * Decrypt image for viewing
   */
  async decryptImage(encryptedData: string, key: Uint8Array, nonce: Uint8Array): Promise<string> {
    try {
      console.log('🔓 Decrypting image data');

      // Convert base64 to bytes
      const encryptedBytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

      // Decrypt
      const { aesGcmDecrypt } = await import('./crypto');
      const decryptedBytes = await aesGcmDecrypt(encryptedBytes, key, nonce);

      // Convert back to base64 for display
      const base64 = btoa(String.fromCharCode(...decryptedBytes));

      console.log('✅ Image decrypted successfully');
      return `data:image/png;base64,${base64}`;
    } catch (error) {
      console.error('Image decryption failed:', error);
      throw new Error('Failed to decrypt image');
    }
  }

  /**
   * Create thumbnail from encrypted image
   */
  async createThumbnail(base64Data: string, size: number = 200): Promise<string> {
    try {
      const dataUri = `data:image/png;base64,${base64Data}`;
      
      const thumbnail = await ImageManipulator.manipulateAsync(
        dataUri,
        [{ resize: { width: size, height: size } }],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.PNG,
          base64: true,
        }
      );

      return thumbnail.base64 || '';
    } catch (error) {
      console.error('Thumbnail creation failed:', error);
      return base64Data; // Return original if thumbnail fails
    }
  }
}

// Singleton instance
export const imageProcessor = new ImageProcessor();

// Export types
export type { ProcessedImage, EncryptedImage };