// Device Security Utilities
import DeviceInfo from 'react-native-device-info';
import RNRootCheck from 'react-native-root-check';

/**
 * Security gate to prevent running on compromised devices
 * Blocks rooted, jailbroken, or emulated devices in production
 */
export async function secureGate(): Promise<void> {
  // Allow in development mode
  if (__DEV__) {
    console.log('🛡️ Security gate: Development mode - allowing all devices');
    return;
  }

  try {
    const [isEmu, isRooted] = await Promise.all([
      DeviceInfo.isEmulator(),
      RNRootCheck.isRooted(),
    ]);

    if (isEmu || isRooted) {
      throw new Error('Device does not meet security requirements');
    }

    console.log('🛡️ Security gate: Device passed security checks');
  } catch (error: any) {
    console.error('🚨 Security gate failed:', error.message);
    throw error;
  }
}

/**
 * Get device security info for diagnostics
 */
export async function getDeviceSecurityInfo(): Promise<{
  isEmulator: boolean;
  isRooted: boolean;
  deviceId: string;
  systemName: string;
  systemVersion: string;
}> {
  try {
    const [isEmu, isRooted, deviceId, systemName, systemVersion] = await Promise.all([
      DeviceInfo.isEmulator(),
      RNRootCheck.isRooted(),
      DeviceInfo.getUniqueId(),
      DeviceInfo.getSystemName(),
      DeviceInfo.getSystemVersion(),
    ]);

    return {
      isEmulator: isEmu,
      isRooted,
      deviceId,
      systemName,
      systemVersion,
    };
  } catch (error) {
    console.error('Failed to get device security info:', error);
    throw error;
  }
}