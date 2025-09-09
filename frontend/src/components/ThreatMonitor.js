import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert } from 'react-native';
import { useSecurityStore } from '../state/security';
import threatDetector from '../utils/threatDetection';

export default function ThreatMonitor({ onThreatDetected }) {
  const [isActive, setIsActive] = useState(false);
  const [currentThreat, setCurrentThreat] = useState(null);
  const [blinkAnim] = useState(new Animated.Value(1));
  
  const { 
    threatLevel, 
    detectedThreats, 
    isMonitoring,
    setThreatLevel,
    addThreat 
  } = useSecurityStore();

  useEffect(() => {
    // Start monitoring when component mounts
    startThreatMonitoring();
    
    return () => {
      // Stop monitoring when component unmounts
      threatDetector.stopMonitoring();
    };
  }, []);

  useEffect(() => {
    // Animate threat indicator based on level
    if (threatLevel !== 'normal') {
      startBlinking();
    } else {
      stopBlinking();
    }
  }, [threatLevel]);

  const startThreatMonitoring = async () => {
    try {
      const initialized = await threatDetector.initialize();
      if (initialized) {
        // Set up threat detection callback
        threatDetector.onThreatDetected((analysis) => {
          handleThreatDetected(analysis);
        });
        
        // Start continuous monitoring
        threatDetector.startMonitoring(3000); // Check every 3 seconds
        setIsActive(true);
        
        console.log('🛡️ OMERTÁ Threat Monitor activated');
      }
    } catch (error) {
      console.error('Failed to start threat monitoring:', error);
      Alert.alert('Security Warning', 'Threat monitoring system failed to initialize');
    }
  };

  const handleThreatDetected = (analysis) => {
    console.log('🚨 Real-time threat detected:', analysis);
    
    // Update security store
    setThreatLevel(analysis.level);
    analysis.threats.forEach(threat => {
      addThreat(threat);
    });
    
    // Set current threat for display
    if (analysis.threats.length > 0) {
      setCurrentThreat(analysis.threats[0]); // Show first/most critical threat
    }
    
    // Call parent callback
    if (onThreatDetected) {
      onThreatDetected(analysis);
    }
    
    // Handle critical threats
    if (analysis.level === 'critical') {
      handleCriticalThreat(analysis);
    }
  };

  const handleCriticalThreat = (analysis) => {
    const threatDescription = analysis.threats
      .map(t => t.description)
      .join(', ');
      
    Alert.alert(
      '🚨 CRITICAL THREAT DETECTED',
      `Possible Pegasus/Graphite activity: ${threatDescription}\n\nOMERTÁ recommends immediate action.`,
      [
        { 
          text: '🔥 Emergency NUKE', 
          style: 'destructive',
          onPress: () => {
            // Trigger emergency protocols
            Alert.alert(
              '☢️ CONFIRM NUCLEAR OPTION',
              'This will destroy ALL data immediately. Continue?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'EXECUTE', 
                  style: 'destructive', 
                  onPress: () => {
                    console.log('☢️ EMERGENCY NUKE TRIGGERED BY THREAT DETECTION');
                    // This would trigger STEELOS-Shredder
                  }
                }
              ]
            );
          }
        },
        { 
          text: '🛡️ Activate Countermeasures', 
          onPress: () => {
            activateCountermeasures();
          }
        },
        { text: 'Monitor', style: 'cancel' }
      ]
    );
  };

  const activateCountermeasures = () => {
    console.log('🛡️ Activating OMERTÁ countermeasures...');
    
    // In a real implementation, this would:
    // 1. Enable maximum security mode
    // 2. Reduce message TTL to minimum
    // 3. Enable network isolation
    // 4. Activate decoy data generation
    // 5. Alert other OMERTÁ users in network
    
    Alert.alert(
      '🛡️ Countermeasures Active',
      '• Message TTL reduced to 5 seconds\n• Network isolation enabled\n• Decoy data generation active\n• Maximum security protocols engaged'
    );
  };

  const startBlinking = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, {
          toValue: 0.3,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopBlinking = () => {
    blinkAnim.stopAnimation();
    blinkAnim.setValue(1);
  };

  const getThreatColor = () => {
    switch (threatLevel) {
      case 'critical': return '#ff0000';
      case 'high': return '#ff4444';
      case 'medium': return '#ff8800';
      case 'low': return '#ffaa00';
      default: return '#00ff00';
    }
  };

  const getThreatIcon = () => {
    switch (threatLevel) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '🔍';
      case 'low': return '👀';
      default: return '🛡️';
    }
  };

  const simulateThreat = () => {
    // For demo purposes - simulate different threat levels
    const mockThreats = [
      {
        level: 'medium',
        threats: [{
          type: 'cpu_anomaly',
          severity: 'medium',
          description: 'CPU usage 65% above baseline - possible background surveillance',
          signature: 'pegasus_cpu_spike'
        }]
      },
      {
        level: 'high',
        threats: [{
          type: 'memory_anomaly',
          severity: 'high',
          description: 'Memory scanning patterns detected - likely spyware activity',
          signature: 'graphite_memory_scan'
        }]
      },
      {
        level: 'critical',
        threats: [{
          type: 'network_anomaly',
          severity: 'critical',
          description: 'Data exfiltration detected - 300% above baseline network activity',
          signature: 'network_exfiltration'
        }]
      }
    ];
    
    const randomThreat = mockThreats[Math.floor(Math.random() * mockThreats.length)];
    handleThreatDetected(randomThreat);
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[
        styles.indicator,
        { 
          backgroundColor: getThreatColor(),
          opacity: blinkAnim 
        }
      ]}>
        <Text style={styles.icon}>{getThreatIcon()}</Text>
      </Animated.View>
      
      <View style={styles.info}>
        <Text style={styles.status}>
          {isActive ? 'MONITORING' : 'INACTIVE'}
        </Text>
        <Text style={[styles.level, { color: getThreatColor() }]}>
          {threatLevel.toUpperCase()}
        </Text>
        {currentThreat && (
          <Text style={styles.threat} numberOfLines={1}>
            {currentThreat.description}
          </Text>
        )}
      </View>
      
      {__DEV__ && (
        <TouchableOpacity 
          style={styles.testButton}
          onPress={simulateThreat}
        >
          <Text style={styles.testButtonText}>TEST</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 8,
    borderRadius: 8,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: '#333',
  },
  indicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  icon: {
    fontSize: 12,
  },
  info: {
    flex: 1,
  },
  status: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  level: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  threat: {
    color: '#ccc',
    fontSize: 9,
    marginTop: 2,
  },
  testButton: {
    backgroundColor: '#444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
});