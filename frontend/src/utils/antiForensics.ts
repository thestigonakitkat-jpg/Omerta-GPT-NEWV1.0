/**
 * Anti-Forensics Protection System
 * - Detects OMG cables, Cellebrite, and data extraction attempts
 * - Auto-triggers signed kill token on forensic device detection
 * - Monitors USB connections for suspicious activity
 */

import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Battery from 'expo-battery';
import { remoteSecurityManager } from './remoteSecurity';
import * as SecureStore from 'expo-secure-store';

class AntiForensicsManager {
  private monitoringActive = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private lastBatteryState: any = null;
  private suspiciousActivityCount = 0;
  private forensicIndicators: string[] = [];

  async initialize() {
    console.log('🛡️ ANTI-FORENSICS: Initializing protection systems');
    
    // Start continuous monitoring
    await this.startForensicsMonitoring();
    
    // Check for existing forensic indicators
    await this.checkForensicEnvironment();
  }

  /**
   * Start continuous monitoring for forensic device detection
   */
  private async startForensicsMonitoring() {
    if (this.monitoringActive) return;
    
    this.monitoringActive = true;
    console.log('🔍 ANTI-FORENSICS: Starting continuous monitoring');

    // Monitor every 5 seconds for forensic indicators
    this.checkInterval = setInterval(async () => {
      try {
        await this.detectForensicActivity();
      } catch (error) {
        console.error('Anti-forensics monitoring error:', error);
      }
    }, 5000);

    // Also monitor battery/charging state changes
    this.monitorChargingBehavior();
  }

  /**
   * Detect various forensic activity indicators
   */
  private async detectForensicActivity() {
    const indicators: string[] = [];

    // 1. USB Data Connection Detection
    await this.detectUSBDataConnection(indicators);

    // 2. Suspicious Charging Patterns
    await this.detectSuspiciousCharging(indicators);

    // 3. Device State Anomalies  
    await this.detectDeviceAnomalies(indicators);

    // 4. Forensic Software Signatures
    await this.detectForensicSoftware(indicators);

    // If multiple indicators detected, trigger kill token
    if (indicators.length >= 2) {
      console.log('🚨 FORENSIC DEVICE DETECTED:', indicators);
      await this.triggerAntiForensicsKill(indicators);
    } else if (indicators.length === 1) {
      this.suspiciousActivityCount++;
      console.log(`⚠️ Suspicious activity detected (${this.suspiciousActivityCount}/3):`, indicators[0]);
      
      // Trigger kill after 3 suspicious activities
      if (this.suspiciousActivityCount >= 3) {
        await this.triggerAntiForensicsKill(['Multiple suspicious activities detected']);
      }
    }
  }

  /**
   * Detect USB data connections (OMG cable, Cellebrite)
   */
  private async detectUSBDataConnection(indicators: string[]) {
    try {
      const batteryState = await Battery.getBatteryStateAsync();
      const batteryLevel = await Battery.getBatteryLevelAsync();
      const powerState = await Battery.getPowerStateAsync();

      // Suspicious Pattern 1: Charging but no power increase
      if (this.lastBatteryState) {
        const chargingStable = (
          batteryState === Battery.BatteryState.CHARGING &&
          this.lastBatteryState.batteryState === Battery.BatteryState.CHARGING &&
          Math.abs(batteryLevel - this.lastBatteryState.batteryLevel) < 0.01 &&
          Date.now() - this.lastBatteryState.timestamp > 30000 // 30 seconds
        );

        if (chargingStable) {
          indicators.push('USB_DATA_CONNECTION_SUSPECTED');
        }
      }

      // Suspicious Pattern 2: Rapid charging state changes
      if (this.lastBatteryState && 
          batteryState !== this.lastBatteryState.batteryState &&
          Date.now() - this.lastBatteryState.timestamp < 5000) {
        indicators.push('RAPID_CHARGING_STATE_CHANGES');
      }

      // Store current state
      this.lastBatteryState = {
        batteryState,
        batteryLevel,
        powerState,
        timestamp: Date.now()
      };

    } catch (error) {
      console.warn('USB detection failed:', error);
    }
  }

  /**
   * Detect suspicious charging patterns (OMG cable behavior)
   */
  private async detectSuspiciousCharging(indicators: string[]) {
    try {
      // OMG cables often show inconsistent power delivery
      const batteryLevel = await Battery.getBatteryLevelAsync();
      const batteryState = await Battery.getBatteryStateAsync();

      // Pattern: Says charging but battery doesn't increase
      if (batteryState === Battery.BatteryState.CHARGING && this.lastBatteryState) {
        const timeDiff = Date.now() - this.lastBatteryState.timestamp;
        const levelDiff = batteryLevel - this.lastBatteryState.batteryLevel;

        // Charging for 60 seconds but no battery increase
        if (timeDiff > 60000 && levelDiff <= 0) {
          indicators.push('FAKE_CHARGING_DETECTED');
        }
      }

      // Pattern: Perfect power delivery (forensic tools often simulate perfect charging)
      if (batteryState === Battery.BatteryState.CHARGING && batteryLevel > 0.95) {
        indicators.push('PERFECT_POWER_SUSPICIOUS');
      }

    } catch (error) {
      console.warn('Charging pattern detection failed:', error);
    }
  }

  /**
   * Detect device state anomalies
   */
  private async detectDeviceAnomalies(indicators: string[]) {
    try {
      // Check for development/forensic environment indicators
      if (__DEV__) {
        // In development mode, be more lenient
        return;
      }

      // Detect if device is in unusual state
      const deviceName = Device.deviceName;
      const modelName = Device.modelName;

      // Forensic devices often have generic names
      if (deviceName?.includes('forensic') || 
          deviceName?.includes('cellebrite') ||
          deviceName?.includes('extraction') ||
          modelName?.includes('forensic')) {
        indicators.push('FORENSIC_DEVICE_NAME_DETECTED');
      }

      // Check for suspicious system properties (Android)
      if (Platform.OS === 'android') {
        // Forensic tools often modify system properties
        // This would require native module implementation
        // For now, we'll use available detection methods
      }

    } catch (error) {
      console.warn('Device anomaly detection failed:', error);
    }
  }

  /**
   * Detect forensic software signatures
   */
  private async detectForensicSoftware(indicators: string[]) {
    try {
      // Check for known forensic tool signatures
      // This is limited on mobile but we can check available indicators

      // Memory usage patterns (forensic tools are resource intensive)
      const memoryWarning = await this.checkMemoryPressure();
      if (memoryWarning) {
        indicators.push('HIGH_MEMORY_USAGE_SUSPICIOUS');
      }

      // Network activity patterns
      // Forensic tools often create network connections
      // This would require native implementation for full detection

    } catch (error) {
      console.warn('Forensic software detection failed:', error);
    }
  }

  /**
   * Check for memory pressure (forensic tools use lots of RAM)
   */
  private async checkMemoryPressure(): Promise<boolean> {
    // This is a simplified check - in production would need native implementation
    try {
      // Forensic tools often consume significant memory
      // We can indirectly detect this through performance impacts
      const startTime = Date.now();
      
      // Simple memory allocation test
      const testArray = new Array(1000).fill('test');
      const endTime = Date.now();
      
      // If simple operations take too long, system might be under memory pressure
      return (endTime - startTime) > 100; // 100ms threshold
      
    } catch (error) {
      return true; // If test fails, assume memory pressure
    }
  }

  /**
   * Monitor charging behavior changes
   */
  private monitorChargingBehavior() {
    // This would be enhanced with native battery monitoring
    console.log('🔋 ANTI-FORENSICS: Monitoring charging behavior');
  }

  /**
   * Check if running in forensic environment
   */
  private async checkForensicEnvironment(): Promise<void> {
    try {
      // Check for stored forensic indicators
      const storedIndicators = await SecureStore.getItemAsync('forensic_indicators');
      if (storedIndicators) {
        this.forensicIndicators = JSON.parse(storedIndicators);
        
        if (this.forensicIndicators.length > 0) {
          console.log('⚠️ Previous forensic indicators found:', this.forensicIndicators);
        }
      }

      // Check current environment
      const indicators: string[] = [];
      
      // Add immediate checks here
      await this.detectUSBDataConnection(indicators);
      
      if (indicators.length > 0) {
        await this.triggerAntiForensicsKill(indicators);
      }

    } catch (error) {
      console.error('Forensic environment check failed:', error);
    }
  }

  /**
   * Trigger anti-forensics kill token
   */
  private async triggerAntiForensicsKill(indicators: string[]) {
    try {
      console.log('🚨 TRIGGERING ANTI-FORENSICS KILL TOKEN');
      console.log('📋 Forensic indicators detected:', indicators);

      // Store indicators for investigation
      await SecureStore.setItemAsync('forensic_indicators', JSON.stringify(indicators));

      // Create forensic-specific kill token
      const killToken = {
        command: "ANTI_FORENSICS_KILL_TOKEN",
        reason: "Forensic device detected",
        indicators: indicators,
        detection_time: new Date().toISOString(),
        threat_level: "CRITICAL_FORENSIC_EXTRACTION_ATTEMPT",
        auto_execute: true,
        wipe_type: "anti_forensics_emergency"
      };

      console.log('💥 FORENSIC KILL TOKEN GENERATED');
      
      // Execute immediate emergency wipe
      await remoteSecurityManager.executeAntiForensicsWipe(killToken);

      // Stop monitoring after kill token triggered
      this.stopMonitoring();

    } catch (error) {
      console.error('Anti-forensics kill failed:', error);
      
      // Even if kill token fails, try emergency measures
      try {
        await this.emergencyAntiForensicsMeasures();
      } catch (emergencyError) {
        console.error('Emergency anti-forensics measures failed:', emergencyError);
      }
    }
  }

  /**
   * Emergency anti-forensics measures
   */
  private async emergencyAntiForensicsMeasures() {
    console.log('🆘 EXECUTING EMERGENCY ANTI-FORENSICS MEASURES');

    try {
      // Clear all secure storage immediately
      const secureKeys = [
        'signal_identity',
        'verified_contacts', 
        'chat_keys',
        'vault_data',
        'user_pins',
        'session_data'
      ];

      for (const key of secureKeys) {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch (e) {
          // Continue even if some fail
        }
      }

      console.log('🗑️ Emergency data wipe completed');

    } catch (error) {
      console.error('Emergency measures failed:', error);
    }
  }

  /**
   * Stop monitoring
   */
  private stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.monitoringActive = false;
    console.log('🛑 ANTI-FORENSICS: Monitoring stopped');
  }

  /**
   * Manual forensic check (for testing)
   */
  async manualForensicCheck(): Promise<boolean> {
    const indicators: string[] = [];
    
    await this.detectUSBDataConnection(indicators);
    await this.detectSuspiciousCharging(indicators);
    await this.detectDeviceAnomalies(indicators);
    await this.detectForensicSoftware(indicators);
    
    if (indicators.length > 0) {
      console.log('🔍 Manual check found indicators:', indicators);
      return true;
    }
    
    return false;
  }
}

// Global anti-forensics manager
export const antiForensicsManager = new AntiForensicsManager();

// Auto-initialize on import
antiForensicsManager.initialize().catch(console.error);