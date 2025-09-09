import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  Modal,
  ActivityIndicator,
  Animated 
} from 'react-native';
import { useSecurityStore } from '../state/security';
import omertaAPI from '../utils/api';

export default function SteeloshShredder({ visible, onClose, triggerType = 'manual' }) {
  const [isArmed, setIsArmed] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStage, setDeploymentStage] = useState('');
  const [scaleAnim] = useState(new Animated.Value(1));
  const [pulseAnim] = useState(new Animated.Value(1));

  const { destroyAllData, setThreatLevel, setDefconLevel } = useSecurityStore();

  useEffect(() => {
    if (isArmed && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            executeSteeloshShredder();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isArmed, countdown]);

  useEffect(() => {
    if (isArmed) {
      // Start pulsing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isArmed]);

  const armShredder = () => {
    Alert.alert(
      '⚠️ FINAL WARNING',
      `This will permanently destroy ALL data on this device and connected accounts. This action CANNOT be undone.\n\nTrigger: ${triggerType.toUpperCase()}\n\nAre you absolutely certain?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'ARM STEELOS-SHREDDER', 
          style: 'destructive',
          onPress: () => {
            setIsArmed(true);
            setThreatLevel('critical');
            setDefconLevel(1);
            console.log(`🔥 STEELOS-SHREDDER ARMED - Trigger: ${triggerType}`);
          }
        }
      ]
    );
  };

  const executeSteeloshShredder = async () => {
    setIsDeploying(true);
    setDeploymentStage('Initializing STEELOS-Shredder...');

    try {
      // Stage 1: Initialize
      await new Promise(resolve => setTimeout(resolve, 1000));
      setDeploymentStage('Deploying Cyanide Tablets...');

      // Stage 2: Deploy backend shredder
      await new Promise(resolve => setTimeout(resolve, 1500));
      const shredderResponse = await omertaAPI.makeRequest('/steelos-shredder/deploy', {
        method: 'POST',
        body: JSON.stringify({
          device_id: `device_${Date.now()}`,
          trigger_type: triggerType,
          confirmation_code: 'STEELOS_OMEGA',
          force_immediate: true
        })
      });

      setDeploymentStage('Obliterating message data...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Stage 3: Destroy local data
      destroyAllData();
      
      setDeploymentStage('Wiping cryptographic keys...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      setDeploymentStage('Shredding contact vault...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      setDeploymentStage('Purging authentication tokens...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      setDeploymentStage('Final obliteration...');
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Stage 4: Complete
      setDeploymentStage('✅ STEELOS-SHREDDER DEPLOYED SUCCESSFULLY');
      
      console.log('☢️ STEELOS-SHREDDER DEPLOYMENT COMPLETE');
      console.log(`Kill Token: ${shredderResponse?.kill_token || 'Generated'}`);
      
      // Animate completion
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.5,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Show final confirmation
        Alert.alert(
          '☢️ DEPLOYMENT COMPLETE',
          'STEELOS-Shredder has successfully obliterated all data. Device is now clean.',
          [
            {
              text: 'Acknowledged',
              onPress: () => {
                onClose();
                // In real app, this would restart to login screen
              }
            }
          ]
        );
      });

    } catch (error) {
      console.error('STEELOS-Shredder deployment failed:', error);
      setDeploymentStage('❌ DEPLOYMENT FAILED');
      Alert.alert('Deployment Failed', 'STEELOS-Shredder could not complete deployment');
    }
  };

  const cancelArming = () => {
    Alert.alert(
      '🛡️ Cancel Shredder',
      'Are you sure you want to cancel STEELOS-Shredder deployment?',
      [
        { text: 'Continue Countdown', style: 'cancel' },
        { 
          text: 'Cancel Deployment',
          onPress: () => {
            setIsArmed(false);
            setCountdown(10);
            setThreatLevel('normal');
            setDefconLevel(5);
            pulseAnim.stopAnimation();
            pulseAnim.setValue(1);
          }
        }
      ]
    );
  };

  if (!visible) return null;

  const getTriggerIcon = () => {
    switch (triggerType) {
      case 'panic_pin': return '🚨';
      case 'threat_detected': return '🛡️';
      case 'emergency_nuke': return '☢️';
      case 'admin_kill': return '💀';
      default: return '🔥';
    }
  };

  const getTriggerDescription = () => {
    switch (triggerType) {
      case 'panic_pin': return 'Panic PIN (000000) entered';
      case 'threat_detected': return 'Critical threat detected by monitoring';
      case 'emergency_nuke': return 'Emergency nuclear option activated';
      case 'admin_kill': return 'Admin remote kill command';
      default: return 'Manual activation';
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <Animated.View style={[
          styles.container,
          { 
            transform: [
              { scale: scaleAnim },
              { scale: pulseAnim }
            ]
          }
        ]}>
          {!isDeploying ? (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>🔥 STEELOS-SHREDDER</Text>
                <Text style={styles.subtitle}>Emergency Data Obliteration System</Text>
              </View>

              <View style={styles.content}>
                <View style={styles.triggerInfo}>
                  <Text style={styles.triggerLabel}>TRIGGER TYPE</Text>
                  <Text style={styles.triggerValue}>
                    {getTriggerIcon()} {getTriggerDescription()}
                  </Text>
                </View>

                {!isArmed ? (
                  <View style={styles.armingSection}>
                    <Text style={styles.warningText}>
                      ⚠️ WARNING: This will permanently destroy ALL data including:
                    </Text>
                    <View style={styles.destructionList}>
                      <Text style={styles.destructionItem}>• All encrypted messages</Text>
                      <Text style={styles.destructionItem}>• Contact vault and identities</Text>
                      <Text style={styles.destructionItem}>• Cryptographic keys and seeds</Text>
                      <Text style={styles.destructionItem}>• Authentication tokens</Text>
                      <Text style={styles.destructionItem}>• Device fingerprints</Text>
                      <Text style={styles.destructionItem}>• All session data</Text>
                    </View>
                    
                    <TouchableOpacity 
                      style={styles.armButton}
                      onPress={armShredder}
                    >
                      <Text style={styles.armButtonText}>⚡ ARM STEELOS-SHREDDER</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.countdownSection}>
                    <Text style={styles.countdownLabel}>DEPLOYMENT IN</Text>
                    <Text style={styles.countdownValue}>{countdown}</Text>
                    <Text style={styles.countdownSubtext}>
                      STEELOS-Shredder will deploy automatically
                    </Text>
                    
                    <TouchableOpacity 
                      style={styles.cancelButton}
                      onPress={cancelArming}
                    >
                      <Text style={styles.cancelButtonText}>🛑 CANCEL DEPLOYMENT</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.deploymentScreen}>
              <Text style={styles.deploymentTitle}>🔥 STEELOS-SHREDDER DEPLOYING</Text>
              <ActivityIndicator size="large" color="#ff0000" style={styles.spinner} />
              <Text style={styles.deploymentStage}>{deploymentStage}</Text>
              <View style={styles.deploymentProgress}>
                <Text style={styles.progressText}>
                  {deploymentStage.includes('✅') ? '100%' : 
                   deploymentStage.includes('Final') ? '90%' :
                   deploymentStage.includes('Purging') ? '75%' :
                   deploymentStage.includes('Shredding') ? '60%' :
                   deploymentStage.includes('Wiping') ? '45%' :
                   deploymentStage.includes('Obliterating') ? '30%' :
                   deploymentStage.includes('Deploying') ? '15%' : '5%'}
                </Text>
              </View>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#111',
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#ff0000',
    width: '100%',
    maxWidth: 400,
    position: 'relative',
  },
  header: {
    backgroundColor: '#ff0000',
    padding: 20,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    color: '#fff',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  triggerInfo: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  triggerLabel: {
    color: '#ff4444',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  triggerValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  armingSection: {
    alignItems: 'center',
  },
  warningText: {
    color: '#ff8800',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
    fontWeight: 'bold',
  },
  destructionList: {
    backgroundColor: '#2a0a0a',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
  },
  destructionItem: {
    color: '#ff6666',
    fontSize: 12,
    marginBottom: 5,
  },
  armButton: {
    backgroundColor: '#ff0000',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#fff',
  },
  armButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  countdownSection: {
    alignItems: 'center',
  },
  countdownLabel: {
    color: '#ff4444',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  countdownValue: {
    color: '#ff0000',
    fontSize: 72,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  countdownSubtext: {
    color: '#ccc',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
  cancelButton: {
    backgroundColor: '#666',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 20,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    right: 15,
    top: 15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  deploymentScreen: {
    padding: 30,
    alignItems: 'center',
  },
  deploymentTitle: {
    color: '#ff0000',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  spinner: {
    marginBottom: 20,
  },
  deploymentStage: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
    minHeight: 20,
  },
  deploymentProgress: {
    backgroundColor: '#2a2a2a',
    padding: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  progressText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
});