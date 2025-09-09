import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  Modal,
  Animated,
  Dimensions 
} from 'react-native';
import { useSecurityStore } from '../state/security';
import omertaAPI from '../utils/api';

const { width, height } = Dimensions.get('window');

export default function RemoteKillSystem({ visible, onClose, targetDevice }) {
  const [killStage, setKillStage] = useState('targeting'); // targeting, spoofing, revealing, strike, complete
  const [locationData, setLocationData] = useState({
    spoofed: { lat: 40.7128, lng: -74.0060, location: 'New York City' },
    real: { lat: 51.5074, lng: -0.1278, location: 'London, UK' }
  });
  const [crosshairsAnim] = useState(new Animated.Value(0));
  const [strikeAnim] = useState(new Animated.Value(0));
  const [isExecuting, setIsExecuting] = useState(false);

  const { deviceId, adminAuthenticated } = useSecurityStore();

  useEffect(() => {
    if (visible && killStage === 'targeting') {
      // Start crosshairs animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(crosshairsAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(crosshairsAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [visible, killStage]);

  const initiateLocationSpoofing = () => {
    setKillStage('spoofing');
    
    // Simulate location spoofing process
    setTimeout(() => {
      Alert.alert(
        '🌍 Location Spoofed',
        `Target believes they are in: ${locationData.spoofed.location}\nActual location acquisition in progress...`,
        [{ text: 'Continue', onPress: () => setKillStage('revealing') }]
      );
    }, 2000);
  };

  const revealRealLocation = () => {
    // Simulate real location reveal
    setTimeout(() => {
      Alert.alert(
        '🎯 Real Location Acquired',
        `Target's actual location: ${locationData.real.location}\nCoordinates: ${locationData.real.lat}, ${locationData.real.lng}\n\nReady for strike authorization.`,
        [
          { text: 'Cancel Mission', style: 'cancel', onPress: () => onClose() },
          { text: 'Authorize Strike', style: 'destructive', onPress: () => setKillStage('strike') }
        ]
      );
    }, 3000);
  };

  const executeRemoteKill = async () => {
    if (!adminAuthenticated) {
      Alert.alert('Access Denied', 'Admin authentication required for remote kill operations');
      return;
    }

    setIsExecuting(true);
    
    try {
      // Start missile strike animation
      Animated.sequence([
        Animated.timing(strikeAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(strikeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();

      // Execute actual remote kill through backend
      const killResponse = await omertaAPI.makeRequest('/admin/multisig/initiate', {
        method: 'POST',
        body: JSON.stringify({
          session_token: `admin_${Date.now()}`,
          operation_type: 'remote_kill',
          target_device_id: targetDevice?.id || 'target_device_001',
          target_oid: targetDevice?.oid || 'target_oid_classified',
          operation_data: {
            kill_method: 'steelos_shredder',
            location_spoofing: true,
            spoofed_location: locationData.spoofed,
            real_location: locationData.real,
            strike_authorization: 'MISSILE_STRIKE_AUTHORIZED',
            admin_signature: deviceId
          }
        })
      });

      // Simulate strike process
      setTimeout(() => {
        setKillStage('complete');
        setIsExecuting(false);
        
        Alert.alert(
          '💥 REMOTE KILL EXECUTED',
          `Target device eliminated successfully.\n\nOperation Details:\n• Location spoofing: SUCCESSFUL\n• Real location: ${locationData.real.location}\n• Strike method: Digital obliteration\n• STEELOS-Shredder: DEPLOYED\n• Data destruction: 100% COMPLETE`,
          [
            {
              text: 'Mission Complete',
              onPress: () => {
                onClose();
                // Reset for next operation
                setKillStage('targeting');
                strikeAnim.setValue(0);
                crosshairsAnim.setValue(0);
              }
            }
          ]
        );
      }, 4000);

    } catch (error) {
      console.error('Remote kill execution failed:', error);
      setIsExecuting(false);
      Alert.alert('Operation Failed', 'Remote kill could not be executed. Check admin authorization.');
    }
  };

  const getMissileStrikeView = () => {
    return (
      <View style={styles.fpvContainer}>
        {/* FPV Missile View */}
        <View style={styles.fpvScreen}>
          <Text style={styles.fpvLabel}>🎯 FPV MISSILE STRIKE VIEW</Text>
          
          {/* Target Crosshairs */}
          <Animated.View style={[
            styles.crosshairs,
            {
              opacity: crosshairsAnim,
              transform: [{
                scale: crosshairsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1.2]
                })
              }]
            }
          ]}>
            <View style={styles.crosshairLine} />
            <View style={[styles.crosshairLine, styles.crosshairVertical]} />
            <View style={styles.targetCenter} />
          </Animated.View>

          {/* Target Info */}
          <View style={styles.targetInfo}>
            <Text style={styles.targetText}>TARGET ACQUIRED</Text>
            <Text style={styles.coordinatesText}>
              LAT: {locationData.real.lat} LON: {locationData.real.lng}
            </Text>
            <Text style={styles.locationText}>{locationData.real.location}</Text>
          </View>

          {/* Strike Animation */}
          {isExecuting && (
            <Animated.View style={[
              styles.strikeEffect,
              {
                opacity: strikeAnim,
                transform: [{
                  scale: strikeAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 2, 4]
                  })
                }]
              }
            ]}>
              <Text style={styles.strikeText}>💥</Text>
            </Animated.View>
          )}

          {/* HUD Elements */}
          <View style={styles.hudElements}>
            <Text style={styles.hudText}>RANGE: 0.8km</Text>
            <Text style={styles.hudText}>WIND: 2.1 m/s</Text>
            <Text style={styles.hudText}>ELEV: 45°</Text>
          </View>
        </View>

        {/* Strike Authorization */}
        <TouchableOpacity 
          style={styles.strikeButton}
          onPress={executeRemoteKill}
          disabled={isExecuting}
        >
          <Text style={styles.strikeButtonText}>
            {isExecuting ? '🚀 MISSILE INBOUND...' : '💥 AUTHORIZE STRIKE'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>💀 REMOTE KILL SYSTEM</Text>
            <Text style={styles.subtitle}>Advanced Targeting & Elimination</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {killStage === 'targeting' && (
              <View style={styles.targetingStage}>
                <Text style={styles.stageTitle}>🎯 TARGET ACQUISITION</Text>
                <Text style={styles.stageDescription}>
                  Preparing location spoofing and real position acquisition
                </Text>
                
                <View style={styles.targetDetails}>
                  <Text style={styles.detailLabel}>Target Device:</Text>
                  <Text style={styles.detailValue}>{targetDevice?.id || 'CLASSIFIED_DEVICE_001'}</Text>
                  
                  <Text style={styles.detailLabel}>Target OID:</Text>
                  <Text style={styles.detailValue}>{targetDevice?.oid || 'CLASSIFIED_OID_REDACTED'}</Text>
                  
                  <Text style={styles.detailLabel}>Spoofed Location:</Text>
                  <Text style={styles.detailValue}>{locationData.spoofed.location}</Text>
                </View>

                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={initiateLocationSpoofing}
                >
                  <Text style={styles.actionButtonText}>🌍 INITIATE LOCATION SPOOFING</Text>
                </TouchableOpacity>
              </View>
            )}

            {killStage === 'spoofing' && (
              <View style={styles.spoofingStage}>
                <Text style={styles.stageTitle}>🌍 LOCATION SPOOFING ACTIVE</Text>
                <Text style={styles.spoofingText}>
                  Target believes they are in: {locationData.spoofed.location}
                </Text>
                <Text style={styles.statusText}>Acquiring real location coordinates...</Text>
                
                <View style={styles.loadingIndicator}>
                  <Text style={styles.loadingText}>🛰️ GPS TRIANGULATION IN PROGRESS</Text>
                </View>
              </View>
            )}

            {killStage === 'revealing' && (
              <View style={styles.revealingStage}>
                <Text style={styles.stageTitle}>🎯 LOCATION REVEALED</Text>
                
                <View style={styles.locationComparison}>
                  <View style={styles.locationBlock}>
                    <Text style={styles.locationHeader}>SPOOFED (What they see)</Text>
                    <Text style={styles.locationDetails}>{locationData.spoofed.location}</Text>
                    <Text style={styles.coordinates}>
                      {locationData.spoofed.lat}, {locationData.spoofed.lng}
                    </Text>
                  </View>
                  
                  <View style={styles.locationBlock}>
                    <Text style={styles.locationHeader}>REAL (Actual position)</Text>
                    <Text style={[styles.locationDetails, styles.realLocation]}>
                      {locationData.real.location}
                    </Text>
                    <Text style={[styles.coordinates, styles.realCoordinates]}>
                      {locationData.real.lat}, {locationData.real.lng}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => setKillStage('strike')}
                >
                  <Text style={styles.actionButtonText}>🚀 PREPARE STRIKE</Text>
                </TouchableOpacity>
              </View>
            )}

            {killStage === 'strike' && getMissileStrikeView()}

            {killStage === 'complete' && (
              <View style={styles.completeStage}>
                <Text style={styles.completeTitle}>✅ MISSION ACCOMPLISHED</Text>
                <Text style={styles.completeText}>
                  Remote kill operation completed successfully.
                  Target device has been digitally obliterated.
                </Text>
                
                <View style={styles.missionStats}>
                  <Text style={styles.statItem}>🎯 Target: ELIMINATED</Text>
                  <Text style={styles.statItem}>🌍 Location: COMPROMISED</Text>
                  <Text style={styles.statItem}>💥 Strike: SUCCESSFUL</Text>
                  <Text style={styles.statItem}>🔥 Data: 100% DESTROYED</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#111',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#ff0000',
    maxHeight: '90%',
  },
  header: {
    backgroundColor: '#ff0000',
    padding: 20,
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
    alignItems: 'center',
    position: 'relative',
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
  content: {
    padding: 20,
  },
  targetingStage: {
    alignItems: 'center',
  },
  stageTitle: {
    color: '#ff0000',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  stageDescription: {
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
  },
  targetDetails: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    marginBottom: 20,
  },
  detailLabel: {
    color: '#666',
    fontSize: 12,
    marginBottom: 2,
  },
  detailValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: 'monospace',
  },
  actionButton: {
    backgroundColor: '#ff0000',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  spoofingStage: {
    alignItems: 'center',
  },
  spoofingText: {
    color: '#00ff00',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  statusText: {
    color: '#ffaa00',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingIndicator: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  revealingStage: {
    alignItems: 'center',
  },
  locationComparison: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  locationBlock: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 10,
    width: '48%',
    alignItems: 'center',
  },
  locationHeader: {
    color: '#666',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  locationDetails: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  realLocation: {
    color: '#ff0000',
  },
  coordinates: {
    color: '#666',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  realCoordinates: {
    color: '#ff4444',
  },
  fpvContainer: {
    alignItems: 'center',
  },
  fpvScreen: {
    backgroundColor: '#000',
    width: '100%',
    height: 300,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#ff0000',
    marginBottom: 20,
  },
  fpvLabel: {
    position: 'absolute',
    top: 10,
    color: '#ff0000',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  crosshairs: {
    position: 'absolute',
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crosshairLine: {
    position: 'absolute',
    backgroundColor: '#ff0000',
    width: 80,
    height: 2,
  },
  crosshairVertical: {
    width: 2,
    height: 80,
  },
  targetCenter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ff0000',
    backgroundColor: 'transparent',
  },
  targetInfo: {
    position: 'absolute',
    top: 40,
    left: 10,
  },
  targetText: {
    color: '#ff0000',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  coordinatesText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  locationText: {
    color: '#fff',
    fontSize: 10,
  },
  strikeEffect: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  strikeText: {
    fontSize: 60,
  },
  hudElements: {
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
  hudText: {
    color: '#00ff00',
    fontSize: 10,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  strikeButton: {
    backgroundColor: '#ff0000',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#fff',
  },
  strikeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  completeStage: {
    alignItems: 'center',
  },
  completeTitle: {
    color: '#00ff00',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  completeText: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  missionStats: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 10,
    width: '100%',
  },
  statItem: {
    color: '#00ff00',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
});