/**
 * Advanced Rate Limiting with ML-based Anomaly Detection
 * Detects suspicious behavior patterns and adapts rate limits accordingly
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface UserBehavior {
  userId: string;
  actionType: string;
  timestamp: number;
  metadata: Record<string, any>;
}

export interface BehaviorBaseline {
  avgRequestsPerMinute: number;
  avgRequestsPerHour: number;
  commonActionPatterns: string[];
  typicalActiveHours: number[];
  deviceFingerprint: string;
}

class AdvancedRateLimitingManager {
  private behaviorBaselines: Map<string, BehaviorBaseline> = new Map();
  private userActions: Map<string, UserBehavior[]> = new Map();
  private anomalyThreshold = 0.75; // 75% confidence for anomaly detection
  private adaptiveRateLimits: Map<string, number> = new Map();

  constructor() {
    this.loadBehaviorBaselines();
  }

  async loadBehaviorBaselines(): Promise<void> {
    try {
      const stored = await SecureStore.getItemAsync('behavior_baselines');
      if (stored) {
        const baselines = JSON.parse(stored);
        this.behaviorBaselines = new Map(baselines);
      }
    } catch (error) {
      console.error('Failed to load behavior baselines:', error);
    }
  }

  async saveBehaviorBaselines(): Promise<void> {
    try {
      const baselines = Array.from(this.behaviorBaselines.entries());
      await SecureStore.setItemAsync('behavior_baselines', JSON.stringify(baselines));
    } catch (error) {
      console.error('Failed to save behavior baselines:', error);
    }
  }

  // Record user behavior for analysis
  recordUserAction(userId: string, actionType: string, metadata: Record<string, any> = {}): void {
    const behavior: UserBehavior = {
      userId,
      actionType,
      timestamp: Date.now(),
      metadata: {
        ...metadata,
        platform: Platform.OS,
        userAgent: metadata.userAgent || 'OMERTA-Mobile',
        screenSize: metadata.screenSize || 'unknown'
      }
    };

    if (!this.userActions.has(userId)) {
      this.userActions.set(userId, []);
    }

    const actions = this.userActions.get(userId)!;
    actions.push(behavior);

    // Keep only last 1000 actions per user
    if (actions.length > 1000) {
      actions.splice(0, actions.length - 1000);
    }

    // Update behavior baseline periodically
    if (actions.length % 50 === 0) {
      this.updateBehaviorBaseline(userId);
    }
  }

  // Update behavior baseline using simple statistical analysis
  private updateBehaviorBaseline(userId: string): void {
    const actions = this.userActions.get(userId);
    if (!actions || actions.length < 10) return;

    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneMinute = 60 * 1000;

    // Calculate recent activity
    const recentActions = actions.filter(a => now - a.timestamp < oneHour);
    const veryRecentActions = actions.filter(a => now - a.timestamp < oneMinute);

    // Calculate averages
    const avgRequestsPerHour = recentActions.length;
    const avgRequestsPerMinute = veryRecentActions.length;

    // Extract common patterns
    const actionTypes = actions.map(a => a.actionType);
    const commonPatterns = this.findCommonPatterns(actionTypes);

    // Extract typical active hours
    const activeHours = actions.map(a => new Date(a.timestamp).getHours());
    const typicalHours = this.findTypicalHours(activeHours);

    // Create device fingerprint
    const deviceFingerprint = this.createDeviceFingerprint(actions);

    const baseline: BehaviorBaseline = {
      avgRequestsPerMinute: Math.max(1, avgRequestsPerMinute),
      avgRequestsPerHour: Math.max(10, avgRequestsPerHour),
      commonActionPatterns: commonPatterns,
      typicalActiveHours: typicalHours,
      deviceFingerprint
    };

    this.behaviorBaselines.set(userId, baseline);
    this.saveBehaviorBaselines();

    console.log(`📊 Updated behavior baseline for user ${userId.substr(0, 8)}...`);
  }

  // Detect anomalous behavior using simple statistical analysis
  detectAnomalousActivity(userId: string, actionType: string, metadata: Record<string, any> = {}): {
    isAnomalous: boolean;
    anomalyScore: number;
    reasons: string[];
  } {
    const baseline = this.behaviorBaselines.get(userId);
    if (!baseline) {
      return { isAnomalous: false, anomalyScore: 0, reasons: ['No baseline available'] };
    }

    const actions = this.userActions.get(userId) || [];
    const now = Date.now();
    const oneMinute = 60 * 1000;
    const oneHour = 60 * 60 * 1000;

    const recentMinuteActions = actions.filter(a => now - a.timestamp < oneMinute);
    const recentHourActions = actions.filter(a => now - a.timestamp < oneHour);

    let anomalyScore = 0;
    const reasons: string[] = [];

    // Check request rate anomalies
    const currentMinuteRate = recentMinuteActions.length;
    const currentHourRate = recentHourActions.length;

    if (currentMinuteRate > baseline.avgRequestsPerMinute * 3) {
      anomalyScore += 0.4;
      reasons.push(`High minute rate: ${currentMinuteRate} vs avg ${baseline.avgRequestsPerMinute}`);
    }

    if (currentHourRate > baseline.avgRequestsPerHour * 2) {
      anomalyScore += 0.3;
      reasons.push(`High hour rate: ${currentHourRate} vs avg ${baseline.avgRequestsPerHour}`);
    }

    // Check time-based anomalies
    const currentHour = new Date().getHours();
    if (!baseline.typicalActiveHours.includes(currentHour)) {
      anomalyScore += 0.2;
      reasons.push(`Unusual active hour: ${currentHour}`);
    }

    // Check action pattern anomalies
    if (!baseline.commonActionPatterns.includes(actionType)) {
      anomalyScore += 0.1;
      reasons.push(`Unusual action type: ${actionType}`);
    }

    // Check device fingerprint anomalies
    const currentFingerprint = this.createDeviceFingerprint([{
      userId,
      actionType,
      timestamp: now,
      metadata
    }]);

    if (currentFingerprint !== baseline.deviceFingerprint) {
      anomalyScore += 0.3;
      reasons.push('Device fingerprint mismatch');
    }

    const isAnomalous = anomalyScore >= this.anomalyThreshold;

    if (isAnomalous) {
      console.warn(`🚨 Anomalous activity detected for user ${userId.substr(0, 8)}...: ${reasons.join(', ')}`);
    }

    return { isAnomalous, anomalyScore, reasons };
  }

  // Adaptive rate limiting based on behavior analysis
  getAdaptiveRateLimit(userId: string, actionType: string, metadata: Record<string, any> = {}): number {
    const anomalyDetection = this.detectAnomalousActivity(userId, actionType, metadata);
    
    // Base rate limits
    const baseRateLimits: Record<string, number> = {
      'send_message': 60, // 60 per minute
      'create_note': 30,  // 30 per minute
      'api_call': 100,    // 100 per minute
      'auth_attempt': 5,  // 5 per minute
      'default': 50       // 50 per minute
    };

    let rateLimit = baseRateLimits[actionType] || baseRateLimits.default;

    if (anomalyDetection.isAnomalous) {
      // Reduce rate limit for anomalous behavior
      const reduction = Math.min(0.9, anomalyDetection.anomalyScore);
      rateLimit = Math.floor(rateLimit * (1 - reduction));
      
      console.warn(`⚠️ Reduced rate limit for ${userId.substr(0, 8)}...: ${rateLimit} (was ${baseRateLimits[actionType] || baseRateLimits.default})`);
    }

    this.adaptiveRateLimits.set(`${userId}:${actionType}`, rateLimit);
    return rateLimit;
  }

  // Check if user is currently rate limited
  isRateLimited(userId: string, actionType: string): boolean {
    const actions = this.userActions.get(userId) || [];
    const now = Date.now();
    const oneMinute = 60 * 1000;

    const recentActions = actions.filter(
      a => a.actionType === actionType && now - a.timestamp < oneMinute
    );

    const rateLimit = this.getAdaptiveRateLimit(userId, actionType);
    return recentActions.length >= rateLimit;
  }

  // Utility functions
  private findCommonPatterns(actionTypes: string[]): string[] {
    const frequency: Record<string, number> = {};
    actionTypes.forEach(type => {
      frequency[type] = (frequency[type] || 0) + 1;
    });

    return Object.entries(frequency)
      .filter(([, count]) => count >= 5) // Must appear at least 5 times
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10) // Top 10 patterns
      .map(([type]) => type);
  }

  private findTypicalHours(hours: number[]): number[] {
    const frequency: Record<number, number> = {};
    hours.forEach(hour => {
      frequency[hour] = (frequency[hour] || 0) + 1;
    });

    const totalActions = hours.length;
    return Object.entries(frequency)
      .filter(([, count]) => count / totalActions >= 0.05) // At least 5% of activity
      .map(([hour]) => parseInt(hour, 10));
  }

  private createDeviceFingerprint(actions: UserBehavior[]): string {
    if (actions.length === 0) return 'unknown';

    const latestAction = actions[actions.length - 1];
    const fingerprint = {
      platform: latestAction.metadata.platform || 'unknown',
      userAgent: latestAction.metadata.userAgent || 'unknown',
      screenSize: latestAction.metadata.screenSize || 'unknown'
    };

    return btoa(JSON.stringify(fingerprint));
  }

  // Security metrics and monitoring
  getSecurityMetrics(): {
    totalUsers: number;
    anomalousUsers: number;
    avgAnomalyScore: number;
    activeRateLimits: number;
  } {
    let anomalousUsers = 0;
    let totalAnomalyScore = 0;
    let usersAnalyzed = 0;

    for (const [userId] of this.behaviorBaselines) {
      const anomaly = this.detectAnomalousActivity(userId, 'security_check');
      if (anomaly.isAnomalous) {
        anomalousUsers++;
      }
      totalAnomalyScore += anomaly.anomalyScore;
      usersAnalyzed++;
    }

    return {
      totalUsers: this.behaviorBaselines.size,
      anomalousUsers,
      avgAnomalyScore: usersAnalyzed > 0 ? totalAnomalyScore / usersAnalyzed : 0,
      activeRateLimits: this.adaptiveRateLimits.size
    };
  }

  // Reset behavior baseline (for testing or user request)
  resetUserBaseline(userId: string): void {
    this.behaviorBaselines.delete(userId);
    this.userActions.delete(userId);
    this.adaptiveRateLimits.delete(userId);
    console.log(`🔄 Reset behavior baseline for user ${userId.substr(0, 8)}...`);
  }
}

export const advancedRateLimiting = new AdvancedRateLimitingManager();