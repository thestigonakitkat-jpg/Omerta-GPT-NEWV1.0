/**
 * Voice Scrambler Component for OMERTÀ Video Calls
 * Real-time voice modification for privacy protection
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Slider,
  SafeAreaView,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../state/theme';

export interface VoiceScramblerSettings {
  enabled: boolean;
  type: 'pitch' | 'robot' | 'echo' | 'whisper' | 'deep';
  intensity: number; // 0-100
  pitchShift: number; // -12 to +12 semitones
  robotAmount: number; // 0-100
  echoDelay: number; // 0-500ms
  whisperIntensity: number; // 0-100
  deepAmount: number; // 0-100
}

interface VoiceScramblerProps {
  visible: boolean;
  onClose: () => void;
  settings: VoiceScramblerSettings;
  onSettingsChange: (settings: Partial<VoiceScramblerSettings>) => void;
  theme: any;
}

const VOICE_TYPES = [
  {
    id: 'pitch' as const,
    name: 'Pitch Shift',
    description: 'Higher or lower voice pitch',
    icon: 'musical-note',
    color: '#22c55e'
  },
  {
    id: 'robot' as const,
    name: 'Robot Voice',
    description: 'Mechanical/robotic sound',
    icon: 'hardware-chip',
    color: '#3b82f6'
  },
  {
    id: 'echo' as const,
    name: 'Echo Effect',
    description: 'Voice with echo/reverb',
    icon: 'radio',
    color: '#8b5cf6'
  },
  {
    id: 'whisper' as const,
    name: 'Whisper Mode',
    description: 'Soft whispered voice',
    icon: 'volume-low',
    color: '#f59e0b'
  },
  {
    id: 'deep' as const,
    name: 'Deep Voice',
    description: 'Lower, deeper tone',
    icon: 'volume-high',
    color: '#ef4444'
  }
];

export default function VoiceScrambler({ 
  visible, 
  onClose, 
  settings, 
  onSettingsChange,
  theme 
}: VoiceScramblerProps) {
  const [previewMode, setPreviewMode] = useState(false);

  const handleTypeChange = (type: VoiceScramblerSettings['type']) => {
    onSettingsChange({ type });
  };

  const handleIntensityChange = (intensity: number) => {
    onSettingsChange({ intensity });
  };

  const handleParameterChange = (parameter: string, value: number) => {
    onSettingsChange({ [parameter]: value });
  };

  const toggleEnabled = () => {
    onSettingsChange({ enabled: !settings.enabled });
  };

  const resetToDefaults = () => {
    const defaults: Partial<VoiceScramblerSettings> = {
      type: 'robot',
      intensity: 50,
      pitchShift: 0,
      robotAmount: 50,
      echoDelay: 150,
      whisperIntensity: 70,
      deepAmount: 60
    };
    onSettingsChange(defaults);
  };

  const currentVoiceType = VOICE_TYPES.find(type => type.id === settings.type);

  const renderAdvancedControls = () => {
    switch (settings.type) {
      case 'pitch':
        return (
          <View style={styles.advancedControls}>
            <Text style={[styles.parameterLabel, { color: theme.colors.text }]}>
              Pitch Shift: {settings.pitchShift > 0 ? '+' : ''}{settings.pitchShift} semitones
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={-12}
              maximumValue={12}
              step={1}
              value={settings.pitchShift}
              onValueChange={(value) => handleParameterChange('pitchShift', value)}
              minimumTrackTintColor={theme.colors.accent}
              maximumTrackTintColor={theme.colors.border}
              thumbTintColor={theme.colors.accent}
            />
          </View>
        );
      
      case 'robot':
        return (
          <View style={styles.advancedControls}>
            <Text style={[styles.parameterLabel, { color: theme.colors.text }]}>
              Robot Amount: {settings.robotAmount}%
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={100}
              step={5}
              value={settings.robotAmount}
              onValueChange={(value) => handleParameterChange('robotAmount', value)}
              minimumTrackTintColor={theme.colors.accent}
              maximumTrackTintColor={theme.colors.border}
              thumbTintColor={theme.colors.accent}
            />
          </View>
        );
      
      case 'echo':
        return (
          <View style={styles.advancedControls}>
            <Text style={[styles.parameterLabel, { color: theme.colors.text }]}>
              Echo Delay: {settings.echoDelay}ms
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={500}
              step={25}
              value={settings.echoDelay}
              onValueChange={(value) => handleParameterChange('echoDelay', value)}
              minimumTrackTintColor={theme.colors.accent}
              maximumTrackTintColor={theme.colors.border}
              thumbTintColor={theme.colors.accent}
            />
          </View>
        );
      
      case 'whisper':
        return (
          <View style={styles.advancedControls}>
            <Text style={[styles.parameterLabel, { color: theme.colors.text }]}>
              Whisper Intensity: {settings.whisperIntensity}%
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={100}
              step={5}
              value={settings.whisperIntensity}
              onValueChange={(value) => handleParameterChange('whisperIntensity', value)}
              minimumTrackTintColor={theme.colors.accent}
              maximumTrackTintColor={theme.colors.border}
              thumbTintColor={theme.colors.accent}
            />
          </View>
        );
      
      case 'deep':
        return (
          <View style={styles.advancedControls}>
            <Text style={[styles.parameterLabel, { color: theme.colors.text }]}>
              Deep Amount: {settings.deepAmount}%
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={100}
              step={5}
              value={settings.deepAmount}
              onValueChange={(value) => handleParameterChange('deepAmount', value)}
              minimumTrackTintColor={theme.colors.accent}
              maximumTrackTintColor={theme.colors.border}
              thumbTintColor={theme.colors.accent}
            />
          </View>
        );
      
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity style={styles.headerButton} onPress={onClose}>
            <Text style={[styles.headerButtonText, { color: theme.colors.text }]}>
              Close
            </Text>
          </TouchableOpacity>
          
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Voice Scrambler
          </Text>
          
          <TouchableOpacity 
            style={[
              styles.enableButton,
              { backgroundColor: settings.enabled ? theme.colors.accent : theme.colors.border }
            ]}
            onPress={toggleEnabled}
          >
            <Text style={[
              styles.enableButtonText,
              { color: settings.enabled ? '#fff' : theme.colors.textSecondary }
            ]}>
              {settings.enabled ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Status Section */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.statusRow}>
              <Ionicons 
                name="shield-checkmark" 
                size={24} 
                color={settings.enabled ? theme.colors.accent : theme.colors.textSecondary} 
              />
              <View style={styles.statusContent}>
                <Text style={[styles.statusTitle, { color: theme.colors.text }]}>
                  Voice Protection
                </Text>
                <Text style={[styles.statusDescription, { color: theme.colors.textSecondary }]}>
                  {settings.enabled 
                    ? `Active - ${currentVoiceType?.name} (${settings.intensity}% intensity)`
                    : 'Disabled - Your natural voice will be transmitted'
                  }
                </Text>
              </View>
            </View>
          </View>

          {/* Voice Type Selection */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Voice Type
            </Text>
            
            <View style={styles.voiceTypeGrid}>
              {VOICE_TYPES.map((voiceType) => (
                <TouchableOpacity
                  key={voiceType.id}
                  style={[
                    styles.voiceTypeCard,
                    {
                      backgroundColor: settings.type === voiceType.id 
                        ? voiceType.color 
                        : theme.colors.background,
                      borderColor: settings.type === voiceType.id 
                        ? voiceType.color 
                        : theme.colors.border
                    }
                  ]}
                  onPress={() => handleTypeChange(voiceType.id)}
                  disabled={!settings.enabled}
                >
                  <Ionicons 
                    name={voiceType.icon as any} 
                    size={24} 
                    color={settings.type === voiceType.id ? '#fff' : theme.colors.text} 
                  />
                  <Text style={[
                    styles.voiceTypeName,
                    { 
                      color: settings.type === voiceType.id ? '#fff' : theme.colors.text,
                      opacity: settings.enabled ? 1 : 0.5
                    }
                  ]}>
                    {voiceType.name}
                  </Text>
                  <Text style={[
                    styles.voiceTypeDescription,
                    { 
                      color: settings.type === voiceType.id 
                        ? 'rgba(255, 255, 255, 0.8)' 
                        : theme.colors.textSecondary,
                      opacity: settings.enabled ? 1 : 0.5
                    }
                  ]}>
                    {voiceType.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Intensity Control */}
          {settings.enabled && (
            <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Overall Intensity: {settings.intensity}%
              </Text>
              
              <Slider
                style={styles.intensitySlider}
                minimumValue={0}
                maximumValue={100}
                step={5}
                value={settings.intensity}
                onValueChange={handleIntensityChange}
                minimumTrackTintColor={theme.colors.accent}
                maximumTrackTintColor={theme.colors.border}
                thumbTintColor={theme.colors.accent}
              />
              
              <View style={styles.intensityLabels}>
                <Text style={[styles.intensityLabel, { color: theme.colors.textSecondary }]}>
                  Subtle
                </Text>
                <Text style={[styles.intensityLabel, { color: theme.colors.textSecondary }]}>
                  Extreme
                </Text>
              </View>
            </View>
          )}

          {/* Advanced Controls */}
          {settings.enabled && renderAdvancedControls()}

          {/* Preview Section */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Voice Preview
            </Text>
            
            <TouchableOpacity
              style={[
                styles.previewButton,
                { 
                  backgroundColor: previewMode ? theme.colors.error : theme.colors.accent,
                  opacity: settings.enabled ? 1 : 0.5
                }
              ]}
              onPress={() => setPreviewMode(!previewMode)}
              disabled={!settings.enabled}
            >
              <Ionicons 
                name={previewMode ? 'stop' : 'mic'} 
                size={20} 
                color="#fff" 
              />
              <Text style={styles.previewButtonText}>
                {previewMode ? 'Stop Preview' : 'Test Voice'}
              </Text>
            </TouchableOpacity>
            
            <Text style={[styles.previewDescription, { color: theme.colors.textSecondary }]}>
              {previewMode 
                ? 'Speaking with voice scrambler active...'
                : 'Tap to hear how your voice will sound to others'
              }
            </Text>
          </View>

          {/* Security Info */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.securityInfo}>
              <Ionicons name="information-circle" size={20} color={theme.colors.info} />
              <Text style={[styles.securityText, { color: theme.colors.textSecondary }]}>
                Voice scrambling is applied locally before transmission. Your original voice never leaves your device.
              </Text>
            </View>
          </View>

          {/* Reset Button */}
          <TouchableOpacity
            style={[styles.resetButton, { borderColor: theme.colors.border }]}
            onPress={resetToDefaults}
          >
            <Ionicons name="refresh" size={20} color={theme.colors.textSecondary} />
            <Text style={[styles.resetButtonText, { color: theme.colors.textSecondary }]}>
              Reset to Defaults
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerButton: {
    padding: 4,
  },
  headerButtonText: {
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  enableButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 50,
    alignItems: 'center',
  },
  enableButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  voiceTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  voiceTypeCard: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    gap: 8,
  },
  voiceTypeName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  voiceTypeDescription: {
    fontSize: 12,
    textAlign: 'center',
  },
  intensitySlider: {
    width: '100%',
    height: 40,
  },
  intensityLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  intensityLabel: {
    fontSize: 12,
  },
  advancedControls: {
    backgroundColor: 'transparent',
    padding: 0,
    marginBottom: 16,
  },
  parameterLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 8,
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  previewDescription: {
    fontSize: 14,
    textAlign: 'center',
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  securityText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginBottom: 32,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});