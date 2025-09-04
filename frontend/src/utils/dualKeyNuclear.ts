import { api } from './api';

// Types for Dual-Key Nuclear Submarine Protocol
export interface DualKeyOperator {
  operator_id: string;
  operator_type: 'developer' | 'security_officer' | 'admin' | 'emergency_admin';
  key_fragment: string;
  password_hash: string;
  totp_secret: string;
  public_key: string;
}

export interface DualKeyOperation {
  operation_id: string;
  operation_type: 'system_reset' | 'update_install' | 'emergency_access' | 'master_override' | 'developer_recovery';
  operator_a_id: string;
  operator_b_id: string;
  initiated_at: number;
  expires_at: number;
  status: 'initiated' | 'waiting_second_key' | 'authenticated' | 'executed' | 'expired' | 'cancelled';
  operation_data: any;
}

export interface DualKeyAuthRequest {
  operation_id: string;
  operator_id: string;
  key_fragment: string;
  password: string;
  totp_code: string;
  cryptographic_signature: string;
}

export interface SplitMasterKeyRequest {
  key_holder_id: string;
  key_fragment: string;
  pin: string;
  totp_code: string;
  operation_type: 'system_reset' | 'critical_update' | 'emergency_override' | 'master_unlock';
}

export interface DualKeyResponse {
  success: boolean;
  message: string;
  operation_id?: string;
  status?: string;
  next_step?: string;
  time_remaining?: number;
}

export interface SplitMasterKeyResponse {
  success: boolean;
  message: string;
  operation_id?: string;
  master_key_status?: string;
  next_step?: string;
  fragments_received?: number;
  fragments_required?: number;
}

class DualKeyNuclearProtocol {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL || '';
  }

  // =============================================================================
  // DESIGN A: DUAL-COMMAND BRIDGE SYSTEM
  // =============================================================================

  /**
   * Initiate dual-key operation requiring two operators
   */
  async initiateDualKeyOperation(
    operationType: string,
    operationData: any,
    operatorAId: string,
    operatorBId: string
  ): Promise<DualKeyResponse> {
    try {
      const formData = new FormData();
      formData.append('operation_type', operationType);
      formData.append('operation_data', JSON.stringify(operationData));
      formData.append('operator_a_id', operatorAId);
      formData.append('operator_b_id', operatorBId);

      const response = await fetch(`${this.baseUrl}/api/dual-key/initiate`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Dual-key initiation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('🚨 Dual-key operation initiation failed:', error);
      throw error;
    }
  }

  /**
   * Authenticate operator for dual-key operation
   */
  async authenticateOperator(authRequest: DualKeyAuthRequest): Promise<DualKeyResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/dual-key/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(authRequest),
      });

      if (!response.ok) {
        throw new Error(`Dual-key authentication failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('🚨 Dual-key operator authentication failed:', error);
      throw error;
    }
  }

  /**
   * Get dual-key operation status
   */
  async getDualKeyOperationStatus(operationId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/dual-key/status/${operationId}`);

      if (!response.ok) {
        throw new Error(`Failed to get dual-key status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('🚨 Failed to get dual-key operation status:', error);
      throw error;
    }
  }

  // =============================================================================
  // DESIGN B: SPLIT MASTER KEY SYSTEM
  // =============================================================================

  /**
   * Initiate split master key operation
   */
  async initiateSplitMasterKeyOperation(
    operationType: string,
    operationData: any
  ): Promise<SplitMasterKeyResponse> {
    try {
      const formData = new FormData();
      formData.append('operation_type', operationType);
      formData.append('operation_data', JSON.stringify(operationData));

      const response = await fetch(`${this.baseUrl}/api/split-master-key/initiate`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Split master key initiation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('🚨 Split master key operation initiation failed:', error);
      throw error;
    }
  }

  /**
   * Provide key fragment for split master key operation
   */
  async provideKeyFragment(fragmentRequest: SplitMasterKeyRequest): Promise<SplitMasterKeyResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/split-master-key/fragment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fragmentRequest),
      });

      if (!response.ok) {
        throw new Error(`Key fragment provision failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('🚨 Key fragment provision failed:', error);
      throw error;
    }
  }

  /**
   * Get split master key operation status
   */
  async getSplitMasterKeyStatus(operationId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/split-master-key/status/${operationId}`);

      if (!response.ok) {
        throw new Error(`Failed to get split master key status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('🚨 Failed to get split master key status:', error);
      throw error;
    }
  }

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  /**
   * Generate HMAC signature for dual-key operations
   */
  generateOperationSignature(operationId: string, operatorId: string, timestamp: number): string {
    // This is a simplified version - in production would use proper cryptographic libraries
    const data = `DUAL_KEY_OPERATION:${operationId}:${operatorId}:${timestamp}`;
    // Use crypto libraries for proper HMAC-SHA256 signature
    return `mock_signature_${data.length}_${timestamp}`;
  }

  /**
   * Generate TOTP code (mock implementation)
   */
  async generateTOTPCode(secret: string): Promise<string> {
    // This is a mock implementation - in production would use proper TOTP library
    const timeStep = Math.floor(Date.now() / 1000 / 30);
    return `${timeStep.toString().slice(-6).padStart(6, '0')}`;
  }

  /**
   * Validate operation timeout
   */
  isOperationExpired(expiresAt: number): boolean {
    return Date.now() / 1000 >= expiresAt;
  }

  /**
   * Calculate time remaining for operation
   */
  getTimeRemaining(expiresAt: number): number {
    return Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
  }

  /**
   * Format time remaining for display
   */
  formatTimeRemaining(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // =============================================================================
  // NUCLEAR SUBMARINE PROTOCOL SCENARIOS
  // =============================================================================

  /**
   * Developer Device Lost Scenario
   */
  async handleDeveloperDeviceLost(): Promise<void> {
    console.log('🚨 NUCLEAR SUBMARINE PROTOCOL: Developer device lost scenario initiated');
    
    // Initiate emergency access with dual-key requirement
    const response = await this.initiateDualKeyOperation(
      'emergency_access',
      { scenario: 'developer_device_lost', severity: 'critical' },
      'emergency_admin',
      'sec_officer'
    );

    console.log('🔐 Emergency dual-key operation initiated:', response.operation_id);
  }

  /**
   * Critical System Update Scenario
   */
  async handleCriticalSystemUpdate(): Promise<void> {
    console.log('🚨 NUCLEAR SUBMARINE PROTOCOL: Critical system update scenario initiated');
    
    // Use split master key for critical updates
    const response = await this.initiateSplitMasterKeyOperation(
      'critical_update',
      { update_type: 'security_patch', severity: 'critical' }
    );

    console.log('🔑 Split master key operation initiated:', response.operation_id);
  }

  /**
   * System Reset Scenario
   */
  async handleSystemReset(): Promise<void> {
    console.log('🚨 NUCLEAR SUBMARINE PROTOCOL: System reset scenario initiated');
    
    // Require both dual-key AND split master key for complete reset
    const dualKeyResponse = await this.initiateDualKeyOperation(
      'system_reset',
      { reset_type: 'complete', data_preservation: false },
      'dev_primary',
      'sec_officer'
    );

    const splitKeyResponse = await this.initiateSplitMasterKeyOperation(
      'system_reset',
      { reset_type: 'complete', confirmation: dualKeyResponse.operation_id }
    );

    console.log('🔐🔑 Dual protocol system reset initiated:');
    console.log('  Dual-Key OpID:', dualKeyResponse.operation_id);
    console.log('  Split-Key OpID:', splitKeyResponse.operation_id);
  }
}

export const dualKeyNuclearProtocol = new DualKeyNuclearProtocol();
export default dualKeyNuclearProtocol;