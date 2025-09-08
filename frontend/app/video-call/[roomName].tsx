/**
 * OMERTÀ Video Call Screen
 * Multi-participant grid video calling with voice scrambling and face blur
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  Dimensions,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LiveKitRoom, VideoView, useRoomContext, useTracks } from '@livekit/react-native';
import { Track, ConnectionState } from 'livekit-client';
import { livekitManager } from '../../src/utils/livekitManager';
import { useTheme } from '../../src/state/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function VideoCallScreen() {
  const { roomName } = useLocalSearchParams<{ roomName: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  
  const [isConnecting, setIsConnecting] = useState(true);
  const [token, setToken] = useState<string>('');
  const [wsUrl, setWsUrl] = useState<string>('');
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [voiceScramblerEnabled, setVoiceScramblerEnabled] = useState(true);
  const [faceBlurEnabled, setFaceBlurEnabled] = useState(true);
  const [participants, setParticipants] = useState<any[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);

  useEffect(() => {
    initializeCall();
    return () => {
      cleanup();
    };
  }, []);

  const initializeCall = async () => {
    try {
      if (!roomName) {
        Alert.alert('Error', 'Room name is required');
        router.back();
        return;
      }

      setIsConnecting(true);
      
      // Request token from backend
      const tokenData = await livekitManager.requestToken(
        roomName as string,
        `User_${Date.now()}`, // Generate participant name
        { omerta_security: true },
        4 // 4 hour TTL
      );

      setToken(tokenData.token);
      setWsUrl(tokenData.ws_url);
      
      console.log('Token obtained for room:', roomName);
      
    } catch (error) {
      console.error('Failed to initialize call:', error);
      Alert.alert(
        'Connection Failed',
        'Failed to connect to video call. Please try again.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const cleanup = async () => {
    try {
      await livekitManager.endSession();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  };

  const handleEndCall = async () => {
    Alert.alert(
      'End Call',
      'Are you sure you want to end this call?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'End Call', 
          style: 'destructive',
          onPress: async () => {
            await cleanup();
            router.back();
          }
        }
      ]
    );
  };

  const toggleMicrophone = async () => {
    try {
      const enabled = await livekitManager.toggleMicrophone();
      setMicEnabled(enabled);
    } catch (error) {
      console.error('Failed to toggle microphone:', error);
    }
  };

  const toggleCamera = async () => {
    try {
      const enabled = await livekitManager.toggleCamera();
      setVideoEnabled(enabled);
    } catch (error) {
      console.error('Failed to toggle camera:', error);
    }
  };

  const toggleVoiceScrambler = async () => {
    try {
      const newEnabled = !voiceScramblerEnabled;
      await livekitManager.updateVoiceScrambler({ enabled: newEnabled });
      setVoiceScramblerEnabled(newEnabled);
    } catch (error) {
      console.error('Failed to toggle voice scrambler:', error);
    }
  };

  const toggleFaceBlur = async () => {
    try {
      const newEnabled = !faceBlurEnabled;
      await livekitManager.updateFaceBlur({ enabled: newEnabled });
      setFaceBlurEnabled(newEnabled);
    } catch (error) {
      console.error('Failed to toggle face blur:', error);
    }
  };

  if (isConnecting || !token || !wsUrl) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Connecting to video call...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      
      <LiveKitRoom
        serverUrl={wsUrl}
        token={token}
        connectOptions={{
          autoSubscribe: true,
        }}
        onConnected={() => {
          console.log('Connected to LiveKit room');
          setConnectionState(ConnectionState.Connected);
        }}
        onDisconnected={() => {
          console.log('Disconnected from LiveKit room');
          setConnectionState(ConnectionState.Disconnected);
        }}
      >
        <VideoCallContent
          roomName={roomName as string}
          micEnabled={micEnabled}
          videoEnabled={videoEnabled}
          voiceScramblerEnabled={voiceScramblerEnabled}
          faceBlurEnabled={faceBlurEnabled}
          onEndCall={handleEndCall}
          onToggleMic={toggleMicrophone}
          onToggleCamera={toggleCamera}
          onToggleVoiceScrambler={toggleVoiceScrambler}
          onToggleFaceBlur={toggleFaceBlur}
          theme={theme}
        />
      </LiveKitRoom>
    </SafeAreaView>
  );
}

interface VideoCallContentProps {
  roomName: string;
  micEnabled: boolean;
  videoEnabled: boolean;
  voiceScramblerEnabled: boolean;
  faceBlurEnabled: boolean;
  onEndCall: () => void;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleVoiceScrambler: () => void;
  onToggleFaceBlur: () => void;
  theme: any;
}

function VideoCallContent({
  roomName,
  micEnabled,
  videoEnabled,
  voiceScramblerEnabled,
  faceBlurEnabled,
  onEndCall,
  onToggleMic,
  onToggleCamera,
  onToggleVoiceScrambler,
  onToggleFaceBlur,
  theme
}: VideoCallContentProps) {
  const room = useRoomContext();
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone], {
    onlySubscribed: false,
  });

  const videoTracks = tracks.filter(track => track.source === Track.Source.Camera);
  const participantCount = videoTracks.length;

  // Calculate grid layout based on participant count
  const getGridLayout = (count: number) => {
    if (count <= 1) return { rows: 1, cols: 1 };
    if (count <= 2) return { rows: 1, cols: 2 };
    if (count <= 4) return { rows: 2, cols: 2 };
    return { rows: 3, cols: 3 }; // Max 9 participants
  };

  const gridLayout = getGridLayout(Math.min(participantCount, 9));
  const participantWidth = screenWidth / gridLayout.cols;
  const participantHeight = (screenHeight * 0.6) / gridLayout.rows;

  return (
    <View style={styles.callContainer}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.roomName, { color: theme.colors.text }]}>
          {roomName}
        </Text>
        <Text style={[styles.participantCount, { color: theme.colors.textSecondary }]}>
          {participantCount} participant{participantCount !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Video Grid */}
      <View style={styles.videoGrid}>
        {videoTracks.slice(0, 9).map((track, index) => (
          <ParticipantVideoTile
            key={track.participant.identity}
            track={track}
            width={participantWidth}
            height={participantHeight}
            theme={theme}
            showSpeakingIndicator={true}
          />
        ))}
      </View>

      {/* Security Indicators */}
      <View style={[styles.securityBar, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.securityIndicator}>
          <Ionicons 
            name={voiceScramblerEnabled ? 'shield-checkmark' : 'shield-outline'} 
            size={16} 
            color={voiceScramblerEnabled ? theme.colors.accent : theme.colors.textSecondary} 
          />
          <Text style={[
            styles.securityText, 
            { color: voiceScramblerEnabled ? theme.colors.accent : theme.colors.textSecondary }
          ]}>
            Voice
          </Text>
        </View>
        
        <View style={styles.securityIndicator}>
          <Ionicons 
            name={faceBlurEnabled ? 'eye-off' : 'eye'} 
            size={16} 
            color={faceBlurEnabled ? theme.colors.accent : theme.colors.textSecondary} 
          />
          <Text style={[
            styles.securityText, 
            { color: faceBlurEnabled ? theme.colors.accent : theme.colors.textSecondary }
          ]}>
            Face
          </Text>
        </View>
        
        <View style={styles.securityIndicator}>
          <Ionicons name="lock-closed" size={16} color={theme.colors.accent} />
          <Text style={[styles.securityText, { color: theme.colors.accent }]}>
            E2EE
          </Text>
        </View>
      </View>

      {/* Control Panel */}
      <View style={[styles.controlPanel, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            micEnabled ? styles.controlButtonActive : styles.controlButtonInactive
          ]}
          onPress={onToggleMic}
        >
          <Ionicons 
            name={micEnabled ? 'mic' : 'mic-off'} 
            size={24} 
            color={micEnabled ? theme.colors.background : theme.colors.error} 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlButton,
            videoEnabled ? styles.controlButtonActive : styles.controlButtonInactive
          ]}
          onPress={onToggleCamera}
        >
          <Ionicons 
            name={videoEnabled ? 'videocam' : 'videocam-off'} 
            size={24} 
            color={videoEnabled ? theme.colors.background : theme.colors.error} 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlButton,
            voiceScramblerEnabled ? styles.controlButtonActive : styles.controlButtonInactive
          ]}
          onPress={onToggleVoiceScrambler}
        >
          <Ionicons 
            name="shield-checkmark" 
            size={24} 
            color={voiceScramblerEnabled ? theme.colors.background : theme.colors.textSecondary} 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlButton,
            faceBlurEnabled ? styles.controlButtonActive : styles.controlButtonInactive
          ]}
          onPress={onToggleFaceBlur}
        >
          <Ionicons 
            name="eye-off" 
            size={24} 
            color={faceBlurEnabled ? theme.colors.background : theme.colors.textSecondary} 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.endCallButton]}
          onPress={onEndCall}
        >
          <Ionicons name="call" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface ParticipantVideoTileProps {
  track: any;
  width: number;
  height: number;
  theme: any;
  showSpeakingIndicator: boolean;
}

function ParticipantVideoTile({
  track,
  width,
  height,
  theme,
  showSpeakingIndicator
}: ParticipantVideoTileProps) {
  const participant = track.participant;
  const isSpeaking = participant.isSpeaking;
  const isLocal = participant.isLocal;

  return (
    <View style={[
      styles.participantTile,
      {
        width: width - 4,
        height: height - 4,
        borderColor: isSpeaking && showSpeakingIndicator ? theme.colors.accent : 'transparent',
        borderWidth: isSpeaking && showSpeakingIndicator ? 3 : 0
      }
    ]}>
      <VideoView
        style={styles.videoView}
        videoTrack={track.videoTrack}
        mirror={isLocal}
      />
      
      {/* Speaking Indicator Light */}
      {isSpeaking && showSpeakingIndicator && (
        <View style={[styles.speakingIndicator, { backgroundColor: theme.colors.accent }]}>
          <View style={styles.speakingPulse} />
        </View>
      )}
      
      {/* Participant Name */}
      <View style={styles.participantInfo}>
        <Text style={[styles.participantName, { color: '#fff' }]}>
          {participant.name || participant.identity}
          {isLocal && ' (You)'}
        </Text>
        
        {/* Audio/Video Status */}
        <View style={styles.statusIcons}>
          {!participant.isMicrophoneEnabled && (
            <Ionicons name="mic-off" size={12} color="#fff" />
          )}
          {!participant.isCameraEnabled && (
            <Ionicons name="videocam-off" size={12} color="#fff" />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  callContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  roomName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  participantCount: {
    fontSize: 14,
    marginTop: 4,
  },
  videoGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  participantTile: {
    margin: 2,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  videoView: {
    flex: 1,
  },
  speakingIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  speakingPulse: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  participantInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participantName: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  statusIcons: {
    flexDirection: 'row',
    gap: 4,
  },
  securityBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 24,
  },
  securityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  securityText: {
    fontSize: 12,
    fontWeight: '500',
  },
  controlPanel: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 16,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: '#4f46e5',
  },
  controlButtonInactive: {
    backgroundColor: '#6b7280',
  },
  endCallButton: {
    backgroundColor: '#ef4444',
  },
});