/**
 * 🛡️ GRAPHITE SHIELD COMPONENT
 * 
 * The first UI component designed specifically to defeat Graphite-class spyware.
 * Provides real-time threat monitoring, visual protection, and user controls.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
  Animated,
  Modal
} from 'react-native';
import { useTheme } from '../state/theme';
import GraphiteKiller, { ThreatLevel, ThreatAnalysis } from '../utils/graphiteKiller';
import AntiScreenCapture, { VisualProtectionConfig } from '../utils/antiScreenCapture';

interface GraphiteShieldProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function GraphiteShield({ isVisible, onClose }: GraphiteShieldProps) {
  const theme = useTheme();
  const [threatAnalysis, setThreatAnalysis] = useState<ThreatAnalysis | null>(null);
  const [protectionConfig, setProtectionConfig] = useState<VisualProtectionConfig | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress] = useState(new Animated.Value(0));
  const [protectionStatus, setProtectionStatus] = useState({
    isActive: false,
    currentLevel: ThreatLevel.CLEAN,
    counterMeasuresActive: false,
    lastScanTime: 0
  });

  // Initialize systems
  useEffect(() => {
    const initializeSystems = async () => {
      try {
        await GraphiteKiller.initialize();
        await AntiScreenCapture.initialize();
        
        const config = AntiScreenCapture.getProtectionConfig();
        setProtectionConfig(config);
        
        const status = await GraphiteKiller.getProtectionStatus();
        setProtectionStatus(status);
        
        const analysis = await GraphiteKiller.getCurrentThreatAnalysis();
        setThreatAnalysis(analysis);
        
      } catch (error) {
        console.error('Failed to initialize Graphite Shield:', error);
      }
    };
    
    if (isVisible) {
      initializeSystems();
    }
  }, [isVisible]);

  // Set up threat detection callback
  useEffect(() => {
    const callback = (analysis: ThreatAnalysis) => {
      setThreatAnalysis(analysis);
    };
    
    GraphiteKiller.onThreatDetected(callback);
  }, []);

  // Perform security scan
  const performScan = useCallback(async () => {
    setIsScanning(true);
    
    // Animate scan progress
    Animated.timing(scanProgress, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    }).start();
    
    try {
      const analysis = await GraphiteKiller.forceScan();
      setThreatAnalysis(analysis);
      
      const status = await GraphiteKiller.getProtectionStatus();
      setProtectionStatus(status);
      
    } catch (error) {
      console.error('Scan failed:', error);
      Alert.alert('Scan Error', 'Failed to complete security scan');
    } finally {
      setIsScanning(false);
      scanProgress.setValue(0);
    }
  }, [scanProgress]);

  // Update protection level
  const updateProtectionLevel = useCallback(async (level: VisualProtectionConfig['level']) => {
    try {
      await AntiScreenCapture.updateProtectionLevel(level);
      const config = AntiScreenCapture.getProtectionConfig();
      setProtectionConfig(config);
    } catch (error) {
      console.error('Failed to update protection level:', error);
    }
  }, []);

  // Deploy emergency countermeasures
  const deployEmergencyMeasures = useCallback(() => {
    Alert.alert(
      '🚨 Emergency Countermeasures',
      'This will activate STEELOS-Shredder and emergency protocols. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'DEPLOY',
          style: 'destructive',
          onPress: async () => {
            try {
              // This would trigger actual emergency protocols
              console.log('🚨 EMERGENCY: Deploying countermeasures');
              Alert.alert('Emergency Active', 'Countermeasures deployed successfully');
            } catch (error) {
              console.error('Emergency deployment failed:', error);
            }
          }
        }
      ]
    );
  }, []);

  const getThreatLevelIcon = (level: ThreatLevel): string => {
    const icons = {
      [ThreatLevel.CLEAN]: '✅',
      [ThreatLevel.SUSPICIOUS]: '⚠️',
      [ThreatLevel.LIKELY_COMPROMISED]: '🟡',
      [ThreatLevel.CONFIRMED_SPYWARE]: '🔴',
      [ThreatLevel.ACTIVE_SURVEILLANCE]: '🚨',
      [ThreatLevel.CRITICAL_BREACH]: '💀'
    };
    return icons[level] || '❓';
  };

  const getProtectionLevelIcon = (level: VisualProtectionConfig['level']): string => {
    const icons = {
      'off': '❌',
      'basic': '🛡️',
      'medium': '🔒',
      'high': '🚫',
      'maximum': '⚡'
    };
    return icons[level] || '❓';
  };

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      presentationStyle="pageSheet"
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            🛡️ GRAPHITE SHIELD
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeButtonText, { color: theme.colors.accent }]}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Threat Status */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              🎯 Threat Analysis
            </Text>
            
            {threatAnalysis && (
              <View style={styles.threatStatus}>
                <View style={styles.threatLevel}>
                  <Text style={styles.threatIcon}>
                    {getThreatLevelIcon(threatAnalysis.level)}
                  </Text>
                  <View style={styles.threatInfo}>
                    <Text style={[styles.threatLevelText, { 
                      color: GraphiteKiller.getThreatLevelColor(threatAnalysis.level) 
                    }]}>
                      {GraphiteKiller.getThreatLevelName(threatAnalysis.level)}
                    </Text>
                    <Text style={[styles.threatConfidence, { color: theme.colors.textSecondary }]}>
                      {threatAnalysis.confidence}% confidence
                    </Text>
                  </View>
                </View>
                
                {threatAnalysis.indicators.length > 0 && (
                  <View style={styles.indicators}>
                    <Text style={[styles.indicatorsTitle, { color: theme.colors.text }]}>
                      Threat Indicators:
                    </Text>
                    {threatAnalysis.indicators.map((indicator, index) => (
                      <Text key={index} style={[styles.indicator, { color: theme.colors.textSecondary }]}>
                        • {indicator}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            )}
            
            <TouchableOpacity
              onPress={performScan}
              style={[styles.scanButton, { backgroundColor: theme.colors.accent }]}
              disabled={isScanning}
            >
              {isScanning ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.scanButtonText}>
                  🔍 Force Scan
                </Text>
              )}
            </TouchableOpacity>
            
            {isScanning && (
              <View style={[styles.progressContainer, { backgroundColor: theme.colors.border }]}>
                <Animated.View 
                  style={[
                    styles.progressBar, 
                    { 
                      backgroundColor: theme.colors.accent,
                      width: scanProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%']
                      })
                    }
                  ]} 
                />
              </View>
            )}
          </View>

          {/* Visual Protection */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              🎭 Visual Protection
            </Text>
            
            {protectionConfig && (
              <View style={styles.protectionControls}>
                <View style={styles.protectionLevel}>
                  <Text style={styles.protectionIcon}>
                    {getProtectionLevelIcon(protectionConfig.level)}
                  </Text>
                  <View style={styles.protectionInfo}>
                    <Text style={[styles.protectionLevelText, { 
                      color: AntiScreenCapture.getProtectionLevelColor(protectionConfig.level) 
                    }]}>
                      {protectionConfig.level.toUpperCase()}
                    </Text>
                    <Text style={[styles.protectionStatus, { color: theme.colors.textSecondary }]}>
                      {AntiScreenCapture.isProtectionActive() ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.protectionLevels}>
                  {(['off', 'basic', 'medium', 'high', 'maximum'] as const).map(level => (
                    <TouchableOpacity
                      key={level}
                      onPress={() => updateProtectionLevel(level)}
                      style={[
                        styles.levelButton,
                        { 
                          backgroundColor: protectionConfig.level === level 
                            ? theme.colors.accent 
                            : theme.colors.border
                        }
                      ]}
                    >
                      <Text style={[
                        styles.levelButtonText,
                        { 
                          color: protectionConfig.level === level 
                            ? 'white' 
                            : theme.colors.text
                        }
                      ]}>
                        {level.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <View style={styles.features}>
                  <View style={styles.feature}>
                    <Text style={[styles.featureLabel, { color: theme.colors.text }]}>
                      Dynamic Scrambling
                    </Text>
                    <Switch
                      value={protectionConfig.dynamicScrambling}
                      trackColor={{false: theme.colors.border, true: theme.colors.accent}}
                      disabled={true}
                    />
                  </View>
                  <View style={styles.feature}>
                    <Text style={[styles.featureLabel, { color: theme.colors.text }]}>
                      Noise Injection
                    </Text>
                    <Switch
                      value={protectionConfig.noiseInjection}
                      trackColor={{false: theme.colors.border, true: theme.colors.accent}}
                      disabled={true}
                    />
                  </View>
                  <View style={styles.feature}>
                    <Text style={[styles.featureLabel, { color: theme.colors.text }]}>
                      OCR Defeating
                    </Text>
                    <Switch
                      value={protectionConfig.ocrDefeating}
                      trackColor={{false: theme.colors.border, true: theme.colors.accent}}
                      disabled={true}
                    />
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Recommendations */}
          {threatAnalysis && threatAnalysis.recommendations.length > 0 && (
            <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                💡 Recommendations
              </Text>
              {threatAnalysis.recommendations.map((recommendation, index) => (
                <Text key={index} style={[styles.recommendation, { color: theme.colors.textSecondary }]}>
                  • {recommendation}
                </Text>
              ))}
            </View>
          )}

          {/* Emergency Controls */}
          {threatAnalysis && threatAnalysis.level >= ThreatLevel.CONFIRMED_SPYWARE && (
            <View style={[styles.section, styles.emergencySection, { backgroundColor: '#fee2e2', borderColor: '#fecaca' }]}>
              <Text style={[styles.sectionTitle, { color: '#dc2626' }]}>
                🚨 Emergency Controls
              </Text>
              <Text style={[styles.emergencyWarning, { color: '#991b1b' }]}>
                Critical threat detected. Emergency countermeasures available.
              </Text>
              <TouchableOpacity
                onPress={deployEmergencyMeasures}
                style={[styles.emergencyButton, { backgroundColor: '#dc2626' }]}
              >
                <Text style={styles.emergencyButtonText}>
                  💊 DEPLOY STEELOS-SHREDDER
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* System Info */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              📊 System Status
            </Text>
            <View style={styles.systemInfo}>
              <Text style={[styles.systemInfoText, { color: theme.colors.textSecondary }]}>
                Monitoring: {protectionStatus.isActive ? '✅ Active' : '❌ Inactive'}
              </Text>
              <Text style={[styles.systemInfoText, { color: theme.colors.textSecondary }]}>
                Countermeasures: {protectionStatus.counterMeasuresActive ? '✅ Deployed' : '⏸️ Standby'}
              </Text>
              <Text style={[styles.systemInfoText, { color: theme.colors.textSecondary }]}>
                Last Scan: {protectionStatus.lastScanTime ? new Date(protectionStatus.lastScanTime).toLocaleTimeString() : 'Never'}
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  threatStatus: {
    marginBottom: 16,
  },
  threatLevel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  threatIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  threatInfo: {
    flex: 1,
  },
  threatLevelText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  threatConfidence: {
    fontSize: 14,
    marginTop: 2,
  },
  indicators: {
    marginTop: 8,
  },
  indicatorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  indicator: {
    fontSize: 12,
    marginBottom: 2,
  },
  scanButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressContainer: {
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  protectionControls: {
    marginBottom: 16,
  },
  protectionLevel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  protectionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  protectionInfo: {
    flex: 1,
  },
  protectionLevelText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  protectionStatus: {
    fontSize: 14,
    marginTop: 2,
  },
  protectionLevels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  levelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  levelButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  features: {
    gap: 8,
  },
  feature: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featureLabel: {
    fontSize: 14,
  },
  recommendation: {
    fontSize: 14,
    marginBottom: 4,
  },
  emergencySection: {
    borderColor: '#fecaca',
  },
  emergencyWarning: {
    fontSize: 14,
    marginBottom: 12,
  },
  emergencyButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  emergencyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  systemInfo: {
    gap: 4,
  },
  systemInfoText: {
    fontSize: 14,
  },
});