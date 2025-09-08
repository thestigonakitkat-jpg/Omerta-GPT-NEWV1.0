/**
 * LiveKit Video Calling Manager for OMERTÀ
 * Handles video calling, voice scrambling, avatar overlays, and speaking detection
 */

import { 
  Room, 
  RemoteParticipant, 
  LocalParticipant, 
  Track, 
  AudioTrack,
  VideoTrack,
  ConnectionState,
  ParticipantEvent,
  RoomEvent,
  TrackEvent
} from 'livekit-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LiveKitTokenResponse {
  token: string;
  ws_url: string;
  session_id: string;
  room_name: string;
  participant_identity: string;
  participant_name: string;
  expires_at: string;
  server_info: {
    url: string;
    api_key: string;
  };
}

export interface LiveKitRoomConfig {
  room_name: string;
  max_participants: number;
  is_private: boolean;
  requires_approval: boolean;
  voice_scrambler_enabled: boolean;
  face_blur_enabled: boolean;
  recording_enabled: boolean;
}

export interface ParticipantInfo {
  identity: string;
  name: string;
  isSpeaking: boolean;
  isLocal: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'unknown';
}

export interface VoiceScramblerSettings {
  enabled: boolean;
  type: 'pitch' | 'robot' | 'echo' | 'whisper' | 'deep';
  intensity: number; // 0-100
}

export interface FaceBlurSettings {
  enabled: boolean;
  type: 'blur' | 'avatar' | 'pixelate';
  intensity: number; // 0-100
  avatarStyle?: 'omerta' | 'anonymous' | 'geometric';
}

class LiveKitManager {
  private room: Room | null = null;
  private currentSessionId: string | null = null;
  private participants: Map<string, ParticipantInfo> = new Map();
  private voiceScramblerSettings: VoiceScramblerSettings = {
    enabled: true,
    type: 'robot',
    intensity: 50
  };
  private faceBlurSettings: FaceBlurSettings = {
    enabled: true,
    type: 'blur',
    intensity: 75
  };
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    this.loadSettings();
  }

  /**
   * Request LiveKit token from backend
   */
  async requestToken(
    roomName: string, 
    participantName?: string,
    metadata?: any,
    ttlHours: number = 4
  ): Promise<LiveKitTokenResponse> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/livekit/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room_name: roomName,
          participant_name: participantName,
          metadata,
          ttl_hours: ttlHours
        })
      });

      if (!response.ok) {
        throw new Error(`Token request failed: ${response.status}`);
      }

      const tokenData = await response.json();
      console.log('LiveKit token received:', tokenData.participant_identity);
      return tokenData;
    } catch (error) {
      console.error('Failed to request LiveKit token:', error);
      throw error;
    }
  }

  /**
   * Connect to LiveKit room
   */
  async connectToRoom(tokenData: LiveKitTokenResponse): Promise<Room> {
    try {
      if (this.room) {
        await this.disconnectFromRoom();
      }

      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: { width: 640, height: 480 },
          facingMode: 'user'
        },
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.currentSessionId = tokenData.session_id;
      this.setupRoomListeners();

      // Connect to room
      await this.room.connect(tokenData.ws_url, tokenData.token);
      
      console.log('Connected to LiveKit room:', tokenData.room_name);
      
      // Setup local participant
      this.updateParticipantInfo(this.room.localParticipant, true);
      
      // Setup existing remote participants
      this.room.remoteParticipants.forEach(participant => {
        this.updateParticipantInfo(participant, false);
      });

      // Enable camera and microphone by default
      await this.room.localParticipant.enableCameraAndMicrophone();

      return this.room;
    } catch (error) {
      console.error('Failed to connect to LiveKit room:', error);
      throw error;
    }
  }

  /**
   * Disconnect from current room
   */
  async disconnectFromRoom(): Promise<void> {
    try {
      if (this.room) {
        await this.room.disconnect();
        this.room = null;
        this.participants.clear();
        this.currentSessionId = null;
        this.emit('disconnected');
        console.log('Disconnected from LiveKit room');
      }
    } catch (error) {
      console.error('Failed to disconnect from room:', error);
    }
  }

  /**
   * Create a new room
   */
  async createRoom(config: LiveKitRoomConfig): Promise<any> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/livekit/room/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`Room creation failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Room created:', config.room_name);
      return result;
    } catch (error) {
      console.error('Failed to create room:', error);
      throw error;
    }
  }

  /**
   * Get list of active rooms
   */
  async getActiveRooms(): Promise<any[]> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/livekit/rooms`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch rooms: ${response.status}`);
      }

      const result = await response.json();
      return result.rooms || [];
    } catch (error) {
      console.error('Failed to get active rooms:', error);
      throw error;
    }
  }

  /**
   * Toggle microphone on/off
   */
  async toggleMicrophone(): Promise<boolean> {
    if (!this.room?.localParticipant) return false;

    try {
      const enabled = this.room.localParticipant.isMicrophoneEnabled;
      await this.room.localParticipant.setMicrophoneEnabled(!enabled);
      
      this.updateParticipantInfo(this.room.localParticipant, true);
      this.emit('microphoneToggled', !enabled);
      
      return !enabled;
    } catch (error) {
      console.error('Failed to toggle microphone:', error);
      return false;
    }
  }

  /**
   * Toggle camera on/off
   */
  async toggleCamera(): Promise<boolean> {
    if (!this.room?.localParticipant) return false;

    try {
      const enabled = this.room.localParticipant.isCameraEnabled;
      await this.room.localParticipant.setCameraEnabled(!enabled);
      
      this.updateParticipantInfo(this.room.localParticipant, true);
      this.emit('cameraToggled', !enabled);
      
      return !enabled;
    } catch (error) {
      console.error('Failed to toggle camera:', error);
      return false;
    }
  }

  /**
   * Update voice scrambler settings
   */
  async updateVoiceScrambler(settings: Partial<VoiceScramblerSettings>): Promise<void> {
    this.voiceScramblerSettings = { ...this.voiceScramblerSettings, ...settings };
    await this.saveSettings();
    
    if (this.room?.localParticipant) {
      // TODO: Apply voice processing to audio track
      this.applyVoiceScrambling();
    }
    
    this.emit('voiceScramblerChanged', this.voiceScramblerSettings);
  }

  /**
   * Update face blur settings
   */
  async updateFaceBlur(settings: Partial<FaceBlurSettings>): Promise<void> {
    this.faceBlurSettings = { ...this.faceBlurSettings, ...settings };
    await this.saveSettings();
    
    if (this.room?.localParticipant) {
      // TODO: Apply face processing to video track
      this.applyFaceBlur();
    }
    
    this.emit('faceBlurChanged', this.faceBlurSettings);
  }

  /**
   * Get current participant list
   */
  getParticipants(): ParticipantInfo[] {
    return Array.from(this.participants.values());
  }

  /**
   * Get current room state
   */
  getRoomState(): {
    connected: boolean;
    participantCount: number;
    connectionState: ConnectionState;
    roomName?: string;
  } {
    return {
      connected: this.room?.state === ConnectionState.Connected,
      participantCount: this.participants.size,
      connectionState: this.room?.state || ConnectionState.Disconnected,
      roomName: this.room?.name
    };
  }

  /**
   * Add event listener
   */
  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  /**
   * Remove event listener
   */
  off(event: string, listener: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, ...args: any[]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  /**
   * Setup room event listeners
   */
  private setupRoomListeners(): void {
    if (!this.room) return;

    this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log('Participant connected:', participant.identity);
      this.updateParticipantInfo(participant, false);
      this.emit('participantConnected', participant);
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log('Participant disconnected:', participant.identity);
      this.participants.delete(participant.identity);
      this.emit('participantDisconnected', participant);
    });

    this.room.on(RoomEvent.TrackPublished, (publication, participant) => {
      console.log('Track published:', publication.trackSid, participant.identity);
      this.emit('trackPublished', publication, participant);
    });

    this.room.on(RoomEvent.TrackUnpublished, (publication, participant) => {
      console.log('Track unpublished:', publication.trackSid, participant.identity);
      this.emit('trackUnpublished', publication, participant);
    });

    this.room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
      this.emit('audioPlaybackChanged');
    });

    this.room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      console.log('Connection state changed:', state);
      this.emit('connectionStateChanged', state);
    });

    this.room.on(RoomEvent.Disconnected, (reason) => {
      console.log('Room disconnected:', reason);
      this.emit('disconnected', reason);
    });
  }

  /**
   * Update participant information
   */
  private updateParticipantInfo(participant: LocalParticipant | RemoteParticipant, isLocal: boolean): void {
    const info: ParticipantInfo = {
      identity: participant.identity,
      name: participant.name || participant.identity,
      isSpeaking: participant.isSpeaking,
      isLocal,
      audioEnabled: participant.isMicrophoneEnabled,
      videoEnabled: participant.isCameraEnabled,
      connectionQuality: 'unknown'
    };

    this.participants.set(participant.identity, info);
    this.emit('participantUpdated', info);
  }

  /**
   * Apply voice scrambling to audio track
   */
  private async applyVoiceScrambling(): Promise<void> {
    // TODO: Implement voice scrambling using Web Audio API or native audio processing
    console.log('Applying voice scrambling:', this.voiceScramblerSettings);
  }

  /**
   * Apply face blur to video track
   */
  private async applyFaceBlur(): Promise<void> {
    // TODO: Implement face blur using canvas processing or TensorFlow.js
    console.log('Applying face blur:', this.faceBlurSettings);
  }

  /**
   * Load settings from storage
   */
  private async loadSettings(): Promise<void> {
    try {
      const voiceSettings = await AsyncStorage.getItem('livekit_voice_scrambler');
      if (voiceSettings) {
        this.voiceScramblerSettings = JSON.parse(voiceSettings);
      }

      const faceSettings = await AsyncStorage.getItem('livekit_face_blur');
      if (faceSettings) {
        this.faceBlurSettings = JSON.parse(faceSettings);
      }
    } catch (error) {
      console.error('Failed to load LiveKit settings:', error);
    }
  }

  /**
   * Save settings to storage
   */
  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem('livekit_voice_scrambler', JSON.stringify(this.voiceScramblerSettings));
      await AsyncStorage.setItem('livekit_face_blur', JSON.stringify(this.faceBlurSettings));
    } catch (error) {
      console.error('Failed to save LiveKit settings:', error);
    }
  }

  /**
   * End session and cleanup
   */
  async endSession(): Promise<void> {
    try {
      if (this.currentSessionId) {
        await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/livekit/session/end`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: this.currentSessionId
          })
        });
      }
    } catch (error) {
      console.error('Failed to end session:', error);
    } finally {
      await this.disconnectFromRoom();
    }
  }
}

// Global instance
export const livekitManager = new LiveKitManager();
export default livekitManager;