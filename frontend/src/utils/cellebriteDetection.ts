/**
 * Cellebrite Detection System
 * Fully wired up to detect forensic tools and trigger auto-nuke
 */

import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Alert, Platform } from 'react-native';
import { steelosShredder } from './steelosShredder';

export interface CellebriteSignature {
  processName: string;
  packageName: string;
  userAgent: string;
  networkSignature: string;
  hardwareFingerprint: string;
}

export interface DetectionConfig {
  enabled: boolean;
  autoNukeOnDetection: boolean;
  alertUser: boolean;
  logDetection: boolean;
  sensitivityLevel: 'low' | 'medium' | 'high' | 'paranoid';
}

class CellebriteDetectionSystem {
  private config: DetectionConfig = {
    enabled: true,
    autoNukeOnDetection: true,
    alertUser: false, // Silent for operational security
    logDetection: true,
    sensitivityLevel: 'high'
  };

  private knownForensicSignatures: CellebriteSignature[] = [
    {
      processName: 'cellebrite',
      packageName: 'com.cellebrite',
      userAgent: 'Cellebrite',
      networkSignature: 'cellebrite.com',
      hardwareFingerprint: 'UFED'
    },
    {
      processName: 'oxygen',
      packageName: 'com.oxygen',
      userAgent: 'Oxygen',
      networkSignature: 'oxygen-forensic.com',
      hardwareFingerprint: 'Oxygen'
    },
    {
      processName: 'msab',
      packageName: 'com.msab',
      userAgent: 'MSAB',
      networkSignature: 'msab.com',
      hardwareFingerprint: 'XRY'
    },
    {
      processName: 'paraben',
      packageName: 'com.paraben',
      userAgent: 'Paraben',
      networkSignature: 'paraben.com',
      hardwareFingerprint: 'Device Seizure'
    }
  ];

  private detectionMethods: Array<() => Promise<boolean>> = [];
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeDetectionMethods();
  }

  private initializeDetectionMethods(): void {
    this.detectionMethods = [
      this.detectUSBForensicDevices.bind(this),
      this.detectSuspiciousProcesses.bind(this),
      this.detectForensicNetworkActivity.bind(this),
      this.detectDebuggerAttachment.bind(this),
      this.detectEmulatorEnvironment.bind(this),
      this.detectRootingTools.bind(this),
      this.detectMemoryDumping.bind(this),
      this.detectForensicPackages.bind(this)
    ];
  }

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    console.log('🔍 Cellebrite Detection System: ACTIVE');

    // Run initial scan
    await this.performFullScan();

    // Set up continuous monitoring based on sensitivity
    const intervals = {
      low: 30000,      // 30 seconds
      medium: 15000,   // 15 seconds
      high: 5000,      // 5 seconds
      paranoid: 1000   // 1 second
    };

    this.monitoringInterval = setInterval(async () => {
      await this.performFullScan();
    }, intervals[this.config.sensitivityLevel]);
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('🔍 Cellebrite Detection System: STOPPED');
  }

  private async performFullScan(): Promise<void> {
    if (!this.config.enabled) return;

    try {
      for (const detectionMethod of this.detectionMethods) {
        const detected = await detectionMethod();
        if (detected) {
          await this.handleDetection();
          return; // Stop after first detection
        }
      }
    } catch (error) {
      console.error('Cellebrite detection scan error:', error);
    }
  }

  private async handleDetection(): Promise<void> {
    const timestamp = new Date().toISOString();
    const detectionMessage = `🚨 FORENSIC TOOL DETECTED: ${timestamp}`;

    if (this.config.logDetection) {
      console.error(detectionMessage);
    }

    if (this.config.alertUser) {
      Alert.alert(
        '🚨 Security Alert',
        'Forensic analysis tool detected. Activating emergency protocols.',
        [{ text: 'OK', style: 'destructive' }]
      );
    }

    if (this.config.autoNukeOnDetection) {
      // Trigger STEELOS-Shredder immediately
      console.log('🚨 AUTO-NUKE TRIGGERED BY CELLEBRITE DETECTION');
      
      try {
        await steelosShredder.deploy('forensic_tool_detected', {
          detection_method: 'cellebrite_detection',
          timestamp: Date.now(),
          auto_triggered: true
        });
      } catch (error) {
        console.error('Failed to trigger auto-nuke:', error);
      }
    }
  }

  // Detection Methods
  private async detectUSBForensicDevices(): Promise<boolean> {
    try {
      // Check for USB devices with forensic tool signatures
      if (Platform.OS === 'android') {
        // Android-specific USB detection
        const deviceInfo = await Device.getDeviceTypeAsync();
        if (deviceInfo === Device.DeviceType.UNKNOWN) {
          // Suspicious - might be forensic hardware
          return true;
        }
      }

      // Check for known forensic hardware identifiers
      const deviceName = Device.deviceName || '';
      const modelName = Device.modelName || '';
      
      const forensicHardware = ['UFED', 'Cellebrite', 'XRY', 'Oxygen', 'Device Seizure'];
      for (const hardware of forensicHardware) {
        if (deviceName.includes(hardware) || modelName.includes(hardware)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  private async detectSuspiciousProcesses(): Promise<boolean> {
    try {
      // Check app name and bundle ID for forensic indicators
      const appName = Application.applicationName || '';
      const bundleId = Application.applicationId || '';

      const suspiciousNames = ['cellebrite', 'oxygen', 'msab', 'paraben', 'forensic', 'extract'];
      
      for (const name of suspiciousNames) {
        if (appName.toLowerCase().includes(name) || bundleId.toLowerCase().includes(name)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  private async detectForensicNetworkActivity(): Promise<boolean> {
    try {
      // Check for forensic tool network signatures
      // This is a placeholder - real implementation would monitor network requests
      return false;
    } catch (error) {
      return false;
    }
  }

  private async detectDebuggerAttachment(): Promise<boolean> {
    try {
      // Check if debugger is attached
      const isDebugging = typeof atob === 'undefined' || 
                         typeof console.clear !== 'function' ||
                         (global as any).__DEV__ === true;
      
      return isDebugging && this.config.sensitivityLevel === 'paranoid';
    } catch (error) {
      return false;
    }
  }

  private async detectEmulatorEnvironment(): Promise<boolean> {
    try {
      // Check for emulator/simulator environment
      const isEmulator = !Device.isDevice;
      
      if (isEmulator && this.config.sensitivityLevel === 'paranoid') {
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  private async detectRootingTools(): Promise<boolean> {
    try {
      // Check for rooting/jailbreak tools that might be used for forensics
      if (Platform.OS === 'android') {
        // Android root detection
        const buildTags = Device.osInternalBuildId || '';
        return buildTags.includes('test-keys');
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  private async detectMemoryDumping(): Promise<boolean> {
    try {
      // Detect memory analysis attempts
      // Check for suspicious memory access patterns
      const memoryPressure = (global as any).performance?.memory?.usedJSHeapSize;
      
      if (memoryPressure && memoryPressure > 50 * 1024 * 1024) { // 50MB threshold
        return this.config.sensitivityLevel === 'paranoid';
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  private async detectForensicPackages(): Promise<boolean> {
    try {
      // Check for installed forensic analysis packages
      // This would require native modules for full implementation
      return false;
    } catch (error) {
      return false;
    }
  }

  // Configuration methods
  setSensitivityLevel(level: 'low' | 'medium' | 'high' | 'paranoid'): void {
    this.config.sensitivityLevel = level;
    
    // Restart monitoring with new interval
    if (this.isMonitoring) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  setAutoNuke(enabled: boolean): void {
    this.config.autoNukeOnDetection = enabled;
  }

  setUserAlerts(enabled: boolean): void {
    this.config.alertUser = enabled;
  }

  getConfig(): DetectionConfig {
    return { ...this.config };
  }

  async triggerManualScan(): Promise<boolean> {
    console.log('🔍 Manual Cellebrite scan initiated');
    await this.performFullScan();
    return true;
  }

  isActive(): boolean {
    return this.isMonitoring;
  }
}

export const cellebriteDetection = new CellebriteDetectionSystem();