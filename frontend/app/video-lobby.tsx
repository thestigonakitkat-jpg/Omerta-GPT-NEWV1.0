/**
 * OMERTÀ Video Call Lobby
 * Join existing rooms or create new video calls with security features
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Switch
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { livekitManager } from '../src/utils/livekitManager';
import { useTheme } from '../src/state/theme';

interface Room {
  room_name: string;
  created_at: string;
  participant_count: number;
  max_participants: number;
  is_private: boolean;
  requires_approval: boolean;
}

export default function VideoLobbyScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joinRoomName, setJoinRoomName] = useState('');
  
  // Create room form
  const [newRoomName, setNewRoomName] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(4);
  const [isPrivate, setIsPrivate] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [voiceScramblerEnabled, setVoiceScramblerEnabled] = useState(true);
  const [faceBlurEnabled, setFaceBlurEnabled] = useState(true);
  const [recordingEnabled, setRecordingEnabled] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const roomList = await livekitManager.getActiveRooms();
      setRooms(roomList);
    } catch (error) {
      console.error('Failed to load rooms:', error);
      Alert.alert('Error', 'Failed to load active rooms');
    } finally {
      setLoading(false);
    }
  };

  const refreshRooms = async () => {
    try {
      setRefreshing(true);
      const roomList = await livekitManager.getActiveRooms();
      setRooms(roomList);
    } catch (error) {
      console.error('Failed to refresh rooms:', error);
      Alert.alert('Error', 'Failed to refresh rooms');
    } finally {
      setRefreshing(false);
    }
  };

  const handleJoinRoom = (roomName: string) => {
    if (!roomName.trim()) {
      Alert.alert('Error', 'Please enter a room name');
      return;
    }
    
    router.push(`/video-call/${encodeURIComponent(roomName.trim())}`);
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      Alert.alert('Error', 'Please enter a room name');
      return;
    }

    try {
      setCreating(true);
      
      const roomConfig = {
        room_name: newRoomName.trim(),
        max_participants: maxParticipants,
        is_private: isPrivate,
        requires_approval: requiresApproval,
        voice_scrambler_enabled: voiceScramblerEnabled,
        face_blur_enabled: faceBlurEnabled,
        recording_enabled: recordingEnabled
      };

      await livekitManager.createRoom(roomConfig);
      
      setShowCreateModal(false);
      resetCreateForm();
      
      // Join the newly created room
      router.push(`/video-call/${encodeURIComponent(newRoomName.trim())}`);
      
    } catch (error) {
      console.error('Failed to create room:', error);
      Alert.alert('Error', 'Failed to create room. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const resetCreateForm = () => {
    setNewRoomName('');
    setMaxParticipants(4);
    setIsPrivate(false);
    setRequiresApproval(false);
    setVoiceScramblerEnabled(true);
    setFaceBlurEnabled(true);
    setRecordingEnabled(false);
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return 'Unknown';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            OMERTÀ Video Calls
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            Secure • Encrypted • Private
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={refreshRooms}
          disabled={refreshing}
        >
          <Ionicons 
            name="refresh" 
            size={24} 
            color={refreshing ? theme.colors.textSecondary : theme.colors.text} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Join Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Quick Join
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
            Enter a room name to join directly
          </Text>
          
          <View style={styles.quickJoinContainer}>
            <TextInput
              style={[
                styles.quickJoinInput,
                { 
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border
                }
              ]}
              placeholder="Room name"
              placeholderTextColor={theme.colors.textSecondary}
              value={joinRoomName}
              onChangeText={setJoinRoomName}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.joinButton, { backgroundColor: theme.colors.accent }]}
              onPress={() => handleJoinRoom(joinRoomName)}
            >
              <Ionicons name="videocam" size={20} color="#fff" />
              <Text style={styles.joinButtonText}>Join</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Rooms Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Active Rooms
            </Text>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: theme.colors.accent }]}
              onPress={() => setShowCreateModal(true)}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Create</Text>
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.accent} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Loading rooms...
              </Text>
            </View>
          ) : rooms.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="videocam-off" size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No active rooms
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
                Create a new room to start a video call
              </Text>
            </View>
          ) : (
            <View style={styles.roomsList}>
              {rooms.map((room, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.roomCard,
                    { 
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border
                    }
                  ]}
                  onPress={() => handleJoinRoom(room.room_name)}
                >
                  <View style={styles.roomInfo}>
                    <View style={styles.roomHeader}>
                      <Text style={[styles.roomName, { color: theme.colors.text }]}>
                        {room.room_name}
                      </Text>
                      <View style={styles.roomBadges}>
                        {room.is_private && (
                          <View style={[styles.badge, { backgroundColor: theme.colors.warning }]}>
                            <Ionicons name="lock-closed" size={12} color="#fff" />
                          </View>
                        )}
                        {room.requires_approval && (
                          <View style={[styles.badge, { backgroundColor: theme.colors.info }]}>
                            <Ionicons name="checkmark-circle" size={12} color="#fff" />
                          </View>
                        )}
                      </View>
                    </View>
                    
                    <View style={styles.roomDetails}>
                      <Text style={[styles.roomDetail, { color: theme.colors.textSecondary }]}>
                        {room.participant_count}/{room.max_participants} participants
                      </Text>
                      <Text style={[styles.roomDetail, { color: theme.colors.textSecondary }]}>
                        Created: {formatDateTime(room.created_at)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.roomActions}>
                    <View style={[styles.participantCount, { backgroundColor: theme.colors.accent }]}>
                      <Text style={styles.participantCountText}>
                        {room.participant_count}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Security Features Info */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Security Features
          </Text>
          
          <View style={styles.featuresList}>
            <View style={styles.feature}>
              <Ionicons name="shield-checkmark" size={24} color={theme.colors.accent} />
              <View style={styles.featureContent}>
                <Text style={[styles.featureTitle, { color: theme.colors.text }]}>
                  Voice Scrambler
                </Text>
                <Text style={[styles.featureDescription, { color: theme.colors.textSecondary }]}>
                  Real-time voice modification for privacy
                </Text>
              </View>
            </View>
            
            <View style={styles.feature}>
              <Ionicons name="eye-off" size={24} color={theme.colors.accent} />
              <View style={styles.featureContent}>
                <Text style={[styles.featureTitle, { color: theme.colors.text }]}>
                  Face Blur & Avatars
                </Text>
                <Text style={[styles.featureDescription, { color: theme.colors.textSecondary }]}>
                  Visual anonymity with face blur or avatar overlays
                </Text>
              </View>
            </View>
            
            <View style={styles.feature}>
              <Ionicons name="lock-closed" size={24} color={theme.colors.accent} />
              <View style={styles.featureContent}>
                <Text style={[styles.featureTitle, { color: theme.colors.text }]}>
                  End-to-End Encryption
                </Text>
                <Text style={[styles.featureDescription, { color: theme.colors.textSecondary }]}>
                  Military-grade encryption for all communications
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Create Room Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.colors.surface }]}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCreateModal(false)}
            >
              <Text style={[styles.modalCloseText, { color: theme.colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Create Room
            </Text>
            
            <TouchableOpacity
              style={[styles.modalCreateButton, { backgroundColor: theme.colors.accent }]}
              onPress={handleCreateRoom}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.modalCreateText}>Create</Text>
              )}
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>Room Name</Text>
              <TextInput
                style={[
                  styles.formInput,
                  { 
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.text,
                    borderColor: theme.colors.border
                  }
                ]}
                placeholder="Enter room name"
                placeholderTextColor={theme.colors.textSecondary}
                value={newRoomName}
                onChangeText={setNewRoomName}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                Max Participants: {maxParticipants}
              </Text>
              <View style={styles.participantSelector}>
                {[2, 3, 4, 6, 9].map(count => (
                  <TouchableOpacity
                    key={count}
                    style={[
                      styles.participantOption,
                      maxParticipants === count && { backgroundColor: theme.colors.accent },
                      { borderColor: theme.colors.border }
                    ]}
                    onPress={() => setMaxParticipants(count)}
                  >
                    <Text style={[
                      styles.participantOptionText,
                      { color: maxParticipants === count ? '#fff' : theme.colors.text }
                    ]}>
                      {count}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: theme.colors.text }]}>Private Room</Text>
                  <Text style={[styles.switchDescription, { color: theme.colors.textSecondary }]}>
                    Only invited participants can join
                  </Text>
                </View>
                <Switch
                  value={isPrivate}
                  onValueChange={setIsPrivate}
                  trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
                />
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: theme.colors.text }]}>Require Approval</Text>
                  <Text style={[styles.switchDescription, { color: theme.colors.textSecondary }]}>
                    Manual approval for new participants
                  </Text>
                </View>
                <Switch
                  value={requiresApproval}
                  onValueChange={setRequiresApproval}
                  trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
                />
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.formSectionTitle, { color: theme.colors.text }]}>
                Security Features
              </Text>
              
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: theme.colors.text }]}>Voice Scrambler</Text>
                  <Text style={[styles.switchDescription, { color: theme.colors.textSecondary }]}>
                    Enable voice modification by default
                  </Text>
                </View>
                <Switch
                  value={voiceScramblerEnabled}
                  onValueChange={setVoiceScramblerEnabled}
                  trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
                />
              </View>
              
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: theme.colors.text }]}>Face Blur</Text>
                  <Text style={[styles.switchDescription, { color: theme.colors.textSecondary }]}>
                    Enable face blur by default
                  </Text>
                </View>
                <Switch
                  value={faceBlurEnabled}
                  onValueChange={setFaceBlurEnabled}
                  trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
                />
              </View>
              
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: theme.colors.text }]}>Recording</Text>
                  <Text style={[styles.switchDescription, { color: theme.colors.textSecondary }]}>
                    Allow call recording (encrypted)
                  </Text>
                </View>
                <Switch
                  value={recordingEnabled}
                  onValueChange={setRecordingEnabled}
                  trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
                />
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  quickJoinContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  quickJoinInput: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  joinButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  roomsList: {
    gap: 12,
  },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  roomInfo: {
    flex: 1,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  roomBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  roomDetails: {
    gap: 4,
  },
  roomDetail: {
    fontSize: 14,
  },
  roomActions: {
    alignItems: 'center',
    gap: 8,
  },
  participantCount: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantCountText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  featuresList: {
    gap: 16,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  featureDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCreateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  modalCreateText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  formInput: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  participantSelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  participantOption: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  switchDescription: {
    fontSize: 14,
    marginTop: 2,
  },
});