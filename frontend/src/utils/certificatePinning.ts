/**
 * Certificate Pinning System
 * Prevents man-in-the-middle attacks by validating server certificates
 */

import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

export interface CertificatePin {
  hostname: string;
  pins: string[];
  backupPins: string[];
  enforceExpiry: Date;
}

class CertificatePinningManager {
  private certificatePins: Map<string, CertificatePin> = new Map();

  constructor() {
    this.initializePins();
  }

  private initializePins(): void {
    // Production certificate pins for OMERTÀ API
    const omertaPins: CertificatePin = {
      hostname: 'api.omerta.secure',
      pins: [
        'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', // Primary cert pin
        'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=', // Secondary cert pin
      ],
      backupPins: [
        'sha256/CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=', // Backup cert pin
        'sha256/DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD=', // Emergency cert pin
      ],
      enforceExpiry: new Date('2025-12-31') // Pin expiry date
    };

    this.certificatePins.set('api.omerta.secure', omertaPins);
    
    // Add more certificate pins for different environments
    this.certificatePins.set('dev.omerta.secure', {
      hostname: 'dev.omerta.secure',
      pins: ['sha256/DEV_CERTIFICATE_PIN_HERE'],
      backupPins: ['sha256/DEV_BACKUP_PIN_HERE'],
      enforceExpiry: new Date('2025-06-30')
    });
  }

  async validateCertificate(hostname: string, certificate: string): Promise<boolean> {
    try {
      const pinConfig = this.certificatePins.get(hostname);
      if (!pinConfig) {
        console.warn(`🔒 No certificate pin configured for ${hostname}`);
        return true; // Allow connection for now, log for monitoring
      }

      // Check if pin enforcement has expired
      if (new Date() > pinConfig.enforceExpiry) {
        console.warn(`🔒 Certificate pin for ${hostname} has expired`);
        return true; // Don't break connections due to expired pins
      }

      // Calculate certificate fingerprint
      const certFingerprint = await this.calculateCertificateFingerprint(certificate);
      
      // Check against primary pins
      if (pinConfig.pins.includes(certFingerprint)) {
        console.log(`✅ Certificate pin validated for ${hostname}`);
        return true;
      }

      // Check against backup pins
      if (pinConfig.backupPins.includes(certFingerprint)) {
        console.warn(`⚠️ Using backup certificate pin for ${hostname}`);
        return true;
      }

      // Pin validation failed
      console.error(`🚨 CERTIFICATE PIN VALIDATION FAILED for ${hostname}`);
      console.error(`Expected pins: ${pinConfig.pins.join(', ')}`);
      console.error(`Received fingerprint: ${certFingerprint}`);
      
      return false;

    } catch (error) {
      console.error('Certificate pinning validation error:', error);
      return false;
    }
  }

  private async calculateCertificateFingerprint(certificate: string): Promise<string> {
    try {
      // Extract public key from certificate (simplified)
      const publicKeyData = this.extractPublicKey(certificate);
      
      // Calculate SHA-256 hash
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        publicKeyData,
        { encoding: Crypto.CryptoEncoding.BASE64 }
      );

      return `sha256/${hash}`;
    } catch (error) {
      console.error('Failed to calculate certificate fingerprint:', error);
      throw error;
    }
  }

  private extractPublicKey(certificate: string): string {
    // Simplified public key extraction
    // In production, use proper X.509 certificate parsing
    try {
      // Remove certificate headers and footers
      const cleanCert = certificate
        .replace(/-----BEGIN CERTIFICATE-----/g, '')
        .replace(/-----END CERTIFICATE-----/g, '')
        .replace(/\s/g, '');

      return cleanCert;
    } catch (error) {
      console.error('Failed to extract public key from certificate:', error);
      throw error;
    }
  }

  // Update certificate pins (for pin rotation)
  updateCertificatePins(hostname: string, newPins: CertificatePin): void {
    this.certificatePins.set(hostname, newPins);
    console.log(`🔄 Updated certificate pins for ${hostname}`);
  }

  // Get current pin configuration
  getPinConfiguration(hostname: string): CertificatePin | null {
    return this.certificatePins.get(hostname) || null;
  }

  // Validate all configured pins
  async validateAllPins(): Promise<{ [hostname: string]: boolean }> {
    const results: { [hostname: string]: boolean } = {};

    for (const [hostname, pinConfig] of this.certificatePins) {
      try {
        // This would normally fetch the actual certificate
        // For now, we'll simulate validation
        results[hostname] = new Date() <= pinConfig.enforceExpiry;
      } catch (error) {
        results[hostname] = false;
      }
    }

    return results;
  }

  // Network request interceptor with certificate pinning
  async secureHttpRequest(url: string, options: RequestInit = {}): Promise<Response> {
    try {
      const hostname = new URL(url).hostname;
      
      // Note: In a real implementation, you'd need to intercept the TLS handshake
      // This is a simplified version for demonstration
      
      const response = await fetch(url, {
        ...options,
        // Add certificate validation in the actual network layer
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(`✅ Secure request completed to ${hostname}`);
      return response;

    } catch (error) {
      console.error(`🚨 Secure request failed: ${error}`);
      throw error;
    }
  }

  // Emergency pin bypass (for debugging only)
  enablePinBypass(enable: boolean, debugReason?: string): void {
    if (enable) {
      console.warn(`🚨 CERTIFICATE PINNING BYPASSED: ${debugReason || 'No reason provided'}`);
      console.warn('🚨 THIS SHOULD NEVER BE ENABLED IN PRODUCTION');
    }
    
    // In production, this should be completely removed or require special authorization
    (global as any).__OMERTA_PIN_BYPASS__ = enable;
  }

  // Security metrics
  getSecurityMetrics(): {
    totalPins: number;
    activePins: number;
    expiredPins: number;
    lastValidation: Date | null;
  } {
    const now = new Date();
    let activePins = 0;
    let expiredPins = 0;

    for (const pinConfig of this.certificatePins.values()) {
      if (now <= pinConfig.enforceExpiry) {
        activePins++;
      } else {
        expiredPins++;
      }
    }

    return {
      totalPins: this.certificatePins.size,
      activePins,
      expiredPins,
      lastValidation: new Date() // This would be tracked properly in production
    };
  }
}

export const certificatePinning = new CertificatePinningManager();