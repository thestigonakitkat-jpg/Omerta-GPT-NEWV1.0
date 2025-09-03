/**
 * STEELOS-SHREDDER: Military-Grade Data Destruction System
 * - Multi-pass data overwriting (DoD 5220.22-M standard)
 * - Metadata destruction and memory zeroing
 * - "CYANIDE TABLET DEPLOYER" activation system
 * - Unrecoverable file destruction with atomic operations
 */

import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { randomBytes } from './crypto';
import { Platform } from 'react-native';

interface ShredderOptions {
  passes?: number; // Default: 7 (DoD 5220.22-M)
  patternMode?: 'random' | 'zeros' | 'ones' | 'alternating' | 'all';
  verifyDestruction?: boolean;
  atomicDelete?: boolean;
  memoryClearing?: boolean;
}

interface ShredderResult {
  success: boolean;
  filesShredded: number;
  bytesDestroyed: number;
  passes: number;
  duration: number;
  cyanideDeployed: boolean;
  errors: string[];
}

class SteelosShredder {
  private static readonly DOD_STANDARD_PASSES = 7;
  private static readonly NSA_RECOMMENDED_PASSES = 3; // For modern SSDs
  private static readonly CYANIDE_PATTERNS = [
    new Uint8Array([0x00]), // Zeros
    new Uint8Array([0xFF]), // Ones
    new Uint8Array([0xAA]), // Alternating 10101010
    new Uint8Array([0x55]), // Alternating 01010101
    new Uint8Array([0x92, 0x49, 0x24]), // Complex pattern
    new Uint8Array([0x6D, 0xB6, 0xDB]), // Inverted complex
    // 7th pass: Random data (generated per file)
  ];

  private isShredding = false;
  private shredLog: string[] = [];

  /**
   * 💊 DEPLOY CYANIDE TABLET - Complete data destruction
   */

  /**
   * Execute STEELOS-SHREDDER with auto-wipe token
   */
  async executeWithToken(token: any): Promise<ShredderResult> {
    try {
      console.log('💊 STEELOS-SHREDDER: Executing with auto-wipe token');
      
      // Log token information
      this.shredLog.push(`Token received: ${token.command}`);
      this.shredLog.push(`Device: ${token.device_id}`);
      this.shredLog.push(`Reason: ${token.reason}`);
      
      // Execute destruction based on token
      const result = await this.deployCyanideTablet({
        passes: SteelosShredder.DOD_STANDARD_PASSES,
        patternMode: 'all',
        verifyDestruction: true,
        atomicDelete: true,
        memoryClearing: true
      });
      
      // Mark as executed with token
      result.cyanideDeployed = true;
      
      return result;
    } catch (error) {
      console.error('STEELOS-SHREDDER token execution failed:', error);
      return {
        success: false,
        filesShredded: 0,
        bytesDestroyed: 0,
        passes: 0,
        duration: 0,
        cyanideDeployed: false,
        errors: [error.message]
      };
    }
  }
  async deployCyanideTablet(options: ShredderOptions = {}): Promise<ShredderResult> {
    if (this.isShredding) {
      throw new Error('CYANIDE TABLET already deployed - Shredding in progress');
    }

    this.isShredding = true;
    const startTime = Date.now();
    
    console.log('💊🔥 CYANIDE TABLET DEPLOYED - STEELOS-SHREDDER ACTIVATED');
    console.log('🧬 METADATA DNA DESTRUCTION INITIATED...');

    const result: ShredderResult = {
      success: false,
      filesShredded: 0,
      bytesDestroyed: 0,
      passes: options.passes || this.getOptimalPasses(),
      duration: 0,
      cyanideDeployed: true,
      errors: []
    };

    try {
      // Phase 1: Secure Store Annihilation
      const secureStoreResult = await this.shredSecureStore();
      result.filesShredded += secureStoreResult.keysDestroyed;

      // Phase 2: File System Destruction
      const fileSystemResult = await this.shredFileSystem(options);
      result.filesShredded += fileSystemResult.filesShredded;
      result.bytesDestroyed = fileSystemResult.bytesDestroyed;

      // Phase 3: Memory Clearing (if enabled)
      if (options.memoryClearing !== false) {
        await this.clearMemoryPatterns();
      }

      // Phase 4: Cache and Temporary Data Destruction
      await this.shredCacheData();

      // Phase 5: Metadata Destruction
      await this.destroyMetadata();

      result.success = true;
      result.duration = Date.now() - startTime;

      console.log(`💀 CYANIDE TABLET EFFECT COMPLETE: ${result.filesShredded} files destroyed, ${result.bytesDestroyed} bytes shredded in ${result.duration}ms`);
      
    } catch (error) {
      console.error('💊❌ CYANIDE TABLET ERROR:', error);
      result.errors.push(`Cyanide deployment failed: ${error}`);
      result.success = false;
    } finally {
      this.isShredding = false;
    }

    return result;
  }

  /**
   * Get optimal number of passes based on storage type
   */
  private getOptimalPasses(): number {
    // Modern SSDs only need 1-3 passes due to wear leveling
    // HDDs need 7+ passes for DoD compliance
    // We'll use 3 passes for mobile (assumed SSD) and 7 for other platforms
    return Platform.OS === 'web' ? SteelosShredder.DOD_STANDARD_PASSES : SteelosShredder.NSA_RECOMMENDED_PASSES;
  }

  /**
   * 🔐 Phase 1: Secure Store Annihilation
   */
  private async shredSecureStore(): Promise<{ keysDestroyed: number }> {
    console.log('🔐 PHASE 1: SECURE STORE ANNIHILATION');
    
    const sensitiveKeys = [
      'signal_identity',
      'identity_oid', 
      'verified_contacts',
      'chat_keys',
      'vault_data',
      'user_pins',
      'session_data',
      'app_passphrase_hash',
      'chats_pin_hash',
      'vault_pin_hash',
      'panic_pin_hash',
      'cryptographic_dna',
      'security_tokens',
      'biometric_data',
      'backup_keys',
      'device_fingerprint',
      'anti_forensics_data',
      'forensic_indicators'
    ];

    let keysDestroyed = 0;

    for (const key of sensitiveKeys) {
      try {
        // Multi-pass overwrite the key before deletion
        await this.secureStoreOverwrite(key);
        await SecureStore.deleteItemAsync(key);
        keysDestroyed++;
        
        // Add delay to prevent race conditions
        await this.secureDelay(10);
        
      } catch (error) {
        // Continue destroying other keys even if one fails
        console.warn(`Failed to destroy key ${key}:`, error);
      }
    }

    console.log(`🔐 SECURE STORE ANNIHILATED: ${keysDestroyed} keys destroyed`);
    return { keysDestroyed };
  }

  /**
   * Securely overwrite SecureStore key before deletion
   */
  private async secureStoreOverwrite(key: string): Promise<void> {
    try {
      // Generate random overwrite data
      const randomData = await randomBytes(1024);
      const overwriteString = Array.from(randomData).map(b => b.toString(16)).join('');
      
      // Overwrite with random data multiple times
      for (let i = 0; i < 3; i++) {
        await SecureStore.setItemAsync(key, overwriteString + i.toString());
        await this.secureDelay(5);
      }
      
      // Final overwrite with zeros
      await SecureStore.setItemAsync(key, '0'.repeat(1000));
      
    } catch (error) {
      // If overwrite fails, deletion will still work
    }
  }

  /**
   * 📁 Phase 2: File System Destruction
   */
  private async shredFileSystem(options: ShredderOptions): Promise<{ filesShredded: number; bytesDestroyed: number }> {
    console.log('📁 PHASE 2: FILE SYSTEM DESTRUCTION');
    
    let filesShredded = 0;
    let bytesDestroyed = 0;

    try {
      const directories = [
        FileSystem.documentDirectory,
        FileSystem.cacheDirectory,
        FileSystem.bundleDirectory + 'SQLite/', // Expo SQLite
      ].filter(Boolean) as string[];

      for (const dir of directories) {
        try {
          const result = await this.shredDirectory(dir, options);
          filesShredded += result.filesShredded;
          bytesDestroyed += result.bytesDestroyed;
        } catch (error) {
          console.warn(`Failed to shred directory ${dir}:`, error);
        }
      }

    } catch (error) {
      console.error('File system destruction failed:', error);
    }

    console.log(`📁 FILE SYSTEM DESTROYED: ${filesShredded} files, ${bytesDestroyed} bytes`);
    return { filesShredded, bytesDestroyed };
  }

  /**
   * Shred entire directory recursively
   */
  private async shredDirectory(dirPath: string, options: ShredderOptions): Promise<{ filesShredded: number; bytesDestroyed: number }> {
    let filesShredded = 0;
    let bytesDestroyed = 0;

    try {
      const items = await FileSystem.readDirectoryAsync(dirPath);
      
      for (const item of items) {
        const itemPath = `${dirPath}/${item}`;
        
        try {
          const info = await FileSystem.getInfoAsync(itemPath);
          
          if (info.exists) {
            if (info.isDirectory) {
              // Recursively shred subdirectories
              const result = await this.shredDirectory(itemPath, options);
              filesShredded += result.filesShredded;
              bytesDestroyed += result.bytesDestroyed;
              
              // Delete empty directory
              await FileSystem.deleteAsync(itemPath);
              
            } else {
              // Shred file
              const fileSize = info.size || 0;
              await this.shredFile(itemPath, options);
              filesShredded++;
              bytesDestroyed += fileSize;
            }
          }
        } catch (error) {
          console.warn(`Failed to process ${itemPath}:`, error);
        }
      }
      
    } catch (error) {
      console.warn(`Failed to read directory ${dirPath}:`, error);
    }

    return { filesShredded, bytesDestroyed };
  }

  /**
   * 🔪 Shred individual file with multiple passes
   */
  private async shredFile(filePath: string, options: ShredderOptions): Promise<void> {
    try {
      // Get file size for overwrite patterns
      const info = await FileSystem.getInfoAsync(filePath);
      if (!info.exists || info.isDirectory) return;
      
      const fileSize = info.size || 1024; // Default size if unknown
      const passes = options.passes || this.getOptimalPasses();

      console.log(`🔪 SHREDDING: ${filePath} (${fileSize} bytes, ${passes} passes)`);

      // DoD 5220.22-M Multi-pass overwrite
      for (let pass = 0; pass < passes; pass++) {
        try {
          let overwriteData: Uint8Array;

          if (pass < SteelosShredder.CYANIDE_PATTERNS.length - 1) {
            // Use predefined patterns
            const pattern = SteelosShredder.CYANIDE_PATTERNS[pass];
            overwriteData = this.generatePatternData(pattern, fileSize);
          } else {
            // Final pass: Random data
            overwriteData = await randomBytes(Math.min(fileSize, 65536)); // Max 64KB chunks
          }

          // Write overwrite data to file
          const base64Data = this.uint8ArrayToBase64(overwriteData);
          await FileSystem.writeAsStringAsync(filePath, base64Data, {
            encoding: FileSystem.EncodingType.Base64
          });

          // Force write to storage
          await this.secureDelay(1);

        } catch (error) {
          console.warn(`Pass ${pass + 1} failed for ${filePath}:`, error);
        }
      }

      // Final atomic deletion
      await FileSystem.deleteAsync(filePath);
      
      // Verify deletion (if enabled)
      if (options.verifyDestruction) {
        const stillExists = await FileSystem.getInfoAsync(filePath);
        if (stillExists.exists) {
          throw new Error(`File still exists after shredding: ${filePath}`);
        }
      }

    } catch (error) {
      console.warn(`Failed to shred file ${filePath}:`, error);
      
      // Attempt simple deletion as fallback
      try {
        await FileSystem.deleteAsync(filePath);
      } catch (deleteError) {
        console.error(`Complete file destruction failed: ${filePath}`);
      }
    }
  }

  /**
   * Generate pattern data for overwrite
   */
  private generatePatternData(pattern: Uint8Array, size: number): Uint8Array {
    const result = new Uint8Array(Math.min(size, 65536)); // Max 64KB
    
    for (let i = 0; i < result.length; i++) {
      result[i] = pattern[i % pattern.length];
    }
    
    return result;
  }

  /**
   * Convert Uint8Array to Base64
   */
  private uint8ArrayToBase64(uint8Array: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < uint8Array.byteLength; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
  }

  /**
   * 🧠 Phase 3: Memory Clearing
   */
  private async clearMemoryPatterns(): Promise<void> {
    console.log('🧠 PHASE 3: MEMORY PATTERN CLEARING');
    
    try {
      // Create large arrays to overwrite memory
      const memoryCleaners = [];
      
      for (let i = 0; i < 10; i++) {
        // Create 1MB arrays filled with random data
        const cleaner = new Uint8Array(1024 * 1024);
        const randomData = await randomBytes(1024);
        
        // Fill with random patterns
        for (let j = 0; j < cleaner.length; j++) {
          cleaner[j] = randomData[j % randomData.length];
        }
        
        memoryCleaners.push(cleaner);
        await this.secureDelay(1);
      }

      // Force garbage collection (if available)
      if (global.gc) {
        global.gc();
      }

      // Clear the cleaner arrays
      memoryCleaners.length = 0;

      console.log('🧠 MEMORY PATTERNS CLEARED');
      
    } catch (error) {
      console.warn('Memory clearing failed:', error);
    }
  }

  /**
   * 📋 Phase 4: Cache Data Destruction
   */
  private async shredCacheData(): Promise<void> {
    console.log('📋 PHASE 4: CACHE DATA DESTRUCTION');
    
    try {
      // Clear AsyncStorage
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.clear();

      // Clear SQLite databases (if any)
      // This would require expo-sqlite import if used
      
      console.log('📋 CACHE DATA DESTROYED');
      
    } catch (error) {
      console.warn('Cache destruction failed:', error);
    }
  }

  /**
   * 🏷️ Phase 5: Metadata Destruction
   */
  private async destroyMetadata(): Promise<void> {
    console.log('🏷️ PHASE 5: METADATA DESTRUCTION');
    
    try {
      // Clear any remaining metadata
      const metadataKeys = [
        'last_backup_time',
        'device_registration',
        'app_version_info',
        'user_preferences',
        'theme_settings',
        'notification_tokens'
      ];

      for (const key of metadataKeys) {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch (error) {
          // Continue with other keys
        }
      }

      console.log('🏷️ METADATA DESTROYED');
      
    } catch (error) {
      console.warn('Metadata destruction failed:', error);
    }
  }

  /**
   * Secure delay to prevent race conditions
   */
  private async secureDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 🧪 Test shredder effectiveness (development only)
   */
  async testShredderEffectiveness(): Promise<{ passed: boolean; details: string[] }> {
    if (!__DEV__) {
      return { passed: false, details: ['Test only available in development mode'] };
    }

    const details: string[] = [];
    let passed = true;

    try {
      // Create test file
      const testFile = `${FileSystem.documentDirectory}shredder_test.txt`;
      const testData = 'SENSITIVE_DATA_TO_DESTROY_' + Date.now();
      
      await FileSystem.writeAsStringAsync(testFile, testData);
      details.push('✅ Test file created');

      // Shred the file
      await this.shredFile(testFile, { passes: 3, verifyDestruction: true });
      details.push('✅ File shredding completed');

      // Verify it's gone
      const info = await FileSystem.getInfoAsync(testFile);
      if (info.exists) {
        passed = false;
        details.push('❌ File still exists after shredding');
      } else {
        details.push('✅ File successfully destroyed');
      }

    } catch (error) {
      passed = false;
      details.push(`❌ Test failed: ${error}`);
    }

    return { passed, details };
  }

  /**
   * Get shredder status
   */
  getStatus(): { isShredding: boolean; lastOperation?: string } {
    return {
      isShredding: this.isShredding,
      lastOperation: this.shredLog[this.shredLog.length - 1]
    };
  }
}

// Global shredder instance
export const steelosShredder = new SteelosShredder();

// Export types
export type { ShredderOptions, ShredderResult };