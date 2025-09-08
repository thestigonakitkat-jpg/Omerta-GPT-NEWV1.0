/**
 * Face Blur Controls Component for OMERTÀ Video Calls
 * Real-time face blur and avatar overlay system for visual privacy
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
  ScrollView,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../state/theme';

export interface FaceBlurSettings {
  enabled: boolean;
  type: 'blur' | 'avatar' | 'pixelate' | 'mask';
  intensity: number; // 0-100
  blurRadius: number; // 0-50
  pixelSize: number; // 2-20
  avatarStyle: 'omerta' | 'anonymous' | 'geometric' | 'animal';
  maskOpacity: number; // 0-100
  edgeDetection: boolean;
  faceTrackingAccuracy: number; // 0-100
}

interface FaceBlurControlsProps {
  visible: boolean;
  onClose: () => void;
  settings: FaceBlurSettings;
  onSettingsChange: (settings: Partial<FaceBlurSettings>) => void;
  theme: any;
}

const BLUR_TYPES = [
  {
    id: 'blur' as const,
    name: 'Blur Effect',
    description: 'Gaussian blur over face area',
    icon: 'eye-off',
    color: '#22c55e'
  },
  {
    id: 'avatar' as const,
    name: 'Avatar Overlay',
    description: 'Digital avatar replacement',
    icon: 'person',
    color: '#3b82f6'
  },
  {
    id: 'pixelate' as const,
    name: 'Pixelate',
    description: 'Mosaic pixelation effect',
    icon: 'grid',
    color: '#8b5cf6'
  },
  {
    id: 'mask' as const,
    name: 'Privacy Mask',
    description: 'Solid color mask overlay',
    icon: 'glasses',
    color: '#f59e0b'
  }
];

const AVATAR_STYLES = [
  {
    id: 'omerta' as const,
    name: 'OMERTÀ Agent',
    description: 'Classic spy aesthetic',
    preview: '🕴️'
  },
  {
    id: 'anonymous' as const,
    name: 'Anonymous',
    description: 'Guy Fawkes mask style',
    preview: '🎭'
  },
  {
    id: 'geometric' as const,
    name: 'Geometric',
    description: 'Abstract geometric shapes',
    preview: '🔷'
  },
  {
    id: 'animal' as const,
    name: 'Animal',
    description: 'Cute animal characters',
    preview: '🐺'
  }
];

export default function FaceBlurControls({ 
  visible, 
  onClose, 
  settings, 
  onSettingsChange,
  theme 
}: FaceBlurControlsProps) {
  const [previewMode, setPreviewMode] = useState(false);
  const [calibrating, setCalibrating] = useState(false);

  const handleTypeChange = (type: FaceBlurSettings['type']) => {
    onSettingsChange({ type });
  };

  const handleIntensityChange = (intensity: number) => {
    onSettingsChange({ intensity });
  };

  const handleParameterChange = (parameter: string, value: number | boolean | string) => {
    onSettingsChange({ [parameter]: value });
  };

  const toggleEnabled = () => {
    onSettingsChange({ enabled: !settings.enabled });
  };

  const resetToDefaults = () => {
    const defaults: Partial<FaceBlurSettings> = {
      type: 'blur',
      intensity: 75,
      blurRadius: 15,
      pixelSize: 8,
      avatarStyle: 'omerta',
      maskOpacity: 80,
      edgeDetection: true,
      faceTrackingAccuracy: 85
    };
    onSettingsChange(defaults);
  };

  const startCalibration = () => {
    setCalibrating(true);
    // Simulate calibration process
    setTimeout(() => {
      setCalibrating(false);
    }, 3000);
  };

  const currentBlurType = BLUR_TYPES.find(type => type.id === settings.type);
  const currentAvatarStyle = AVATAR_STYLES.find(style => style.id === settings.avatarStyle);

  const renderAdvancedControls = () => {
    switch (settings.type) {
      case 'blur':
        return (
          <View style={styles.advancedSection}>
            <Text style={[styles.advancedTitle, { color: theme.colors.text }]}>
              Blur Settings
            </Text>
            
            <View style={styles.controlGroup}>
              <Text style={[styles.parameterLabel, { color: theme.colors.text }]}>
                Blur Radius: {settings.blurRadius}px
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={50}
                step={1}
                value={settings.blurRadius}
                onValueChange={(value) => handleParameterChange('blurRadius', value)}
                minimumTrackTintColor={theme.colors.accent}
                maximumTrackTintColor={theme.colors.border}
                thumbTintColor={theme.colors.accent}
              />
            </View>
            
            <View style={styles.controlGroup}>
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => handleParameterChange('edgeDetection', !settings.edgeDetection)}
              >
                <Text style={[styles.toggleLabel, { color: theme.colors.text }]}>
                  Edge Detection
                </Text>
                <View style={[
                  styles.toggle,
                  { backgroundColor: settings.edgeDetection ? theme.colors.accent : theme.colors.border }
                ]}>
                  <View style={[
                    styles.toggleThumb,
                    {
                      backgroundColor: '#fff',
                      transform: [{ translateX: settings.edgeDetection ? 20 : 0 }]
                    }
                  ]} />
                </View>
              </TouchableOpacity>
              <Text style={[styles.toggleDescription, { color: theme.colors.textSecondary }]}>
                Better face edge detection for cleaner blur boundaries
              </Text>
            </View>
          </View>
        );
      
      case 'avatar':
        return (
          <View style={styles.advancedSection}>
            <Text style={[styles.advancedTitle, { color: theme.colors.text }]}>
              Avatar Settings
            </Text>
            
            <View style={styles.avatarGrid}>
              {AVATAR_STYLES.map((avatarStyle) => (
                <TouchableOpacity
                  key={avatarStyle.id}
                  style={[
                    styles.avatarCard,
                    {
                      backgroundColor: settings.avatarStyle === avatarStyle.id 
                        ? theme.colors.accent 
                        : theme.colors.background,
                      borderColor: settings.avatarStyle === avatarStyle.id 
                        ? theme.colors.accent 
                        : theme.colors.border
                    }
                  ]}
                  onPress={() => handleParameterChange('avatarStyle', avatarStyle.id)}
                >
                  <Text style={styles.avatarPreview}>{avatarStyle.preview}</Text>
                  <Text style={[
                    styles.avatarName,
                    { 
                      color: settings.avatarStyle === avatarStyle.id ? '#fff' : theme.colors.text 
                    }
                  ]}>
                    {avatarStyle.name}
                  </Text>
                  <Text style={[
                    styles.avatarDescription,
                    { 
                      color: settings.avatarStyle === avatarStyle.id 
                        ? 'rgba(255, 255, 255, 0.8)' 
                        : theme.colors.textSecondary 
                    }
                  ]}>
                    {avatarStyle.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      
      case 'pixelate':
        return (
          <View style={styles.advancedSection}>
            <Text style={[styles.advancedTitle, { color: theme.colors.text }]}>
              Pixelation Settings
            </Text>
            
            <View style={styles.controlGroup}>
              <Text style={[styles.parameterLabel, { color: theme.colors.text }]}>
                Pixel Size: {settings.pixelSize}px
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={2}
                maximumValue={20}
                step={1}
                value={settings.pixelSize}
                onValueChange={(value) => handleParameterChange('pixelSize', value)}
                minimumTrackTintColor={theme.colors.accent}
                maximumTrackTintColor={theme.colors.border}
                thumbTintColor={theme.colors.accent}
              />
            </View>
          </View>
        );
      
      case 'mask':
        return (
          <View style={styles.advancedSection}>
            <Text style={[styles.advancedTitle, { color: theme.colors.text }]}>
              Mask Settings
            </Text>
            
            <View style={styles.controlGroup}>
              <Text style={[styles.parameterLabel, { color: theme.colors.text }]}>
                Mask Opacity: {settings.maskOpacity}%
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={100}
                step={5}
                value={settings.maskOpacity}
                onValueChange={(value) => handleParameterChange('maskOpacity', value)}
                minimumTrackTintColor={theme.colors.accent}
                maximumTrackTintColor={theme.colors.border}
                thumbTintColor={theme.colors.accent}
              />
            </View>
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
            Face Privacy
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
                name="eye-off" 
                size={24} 
                color={settings.enabled ? theme.colors.accent : theme.colors.textSecondary} 
              />
              <View style={styles.statusContent}>
                <Text style={[styles.statusTitle, { color: theme.colors.text }]}>
                  Visual Privacy Protection
                </Text>
                <Text style={[styles.statusDescription, { color: theme.colors.textSecondary }]}>
                  {settings.enabled 
                    ? `Active - ${currentBlurType?.name} (${settings.intensity}% intensity)`
                    : 'Disabled - Your face will be visible to other participants'
                  }
                </Text>
              </View>
            </View>
          </View>

          {/* Privacy Type Selection */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Privacy Method
            </Text>
            
            <View style={styles.typeGrid}>
              {BLUR_TYPES.map((blurType) => (
                <TouchableOpacity
                  key={blurType.id}
                  style={[
                    styles.typeCard,
                    {
                      backgroundColor: settings.type === blurType.id 
                        ? blurType.color 
                        : theme.colors.background,
                      borderColor: settings.type === blurType.id 
                        ? blurType.color 
                        : theme.colors.border
                    }
                  ]}
                  onPress={() => handleTypeChange(blurType.id)}
                  disabled={!settings.enabled}
                >
                  <Ionicons 
                    name={blurType.icon as any} 
                    size={24} 
                    color={settings.type === blurType.id ? '#fff' : theme.colors.text} 
                  />
                  <Text style={[
                    styles.typeName,
                    { 
                      color: settings.type === blurType.id ? '#fff' : theme.colors.text,
                      opacity: settings.enabled ? 1 : 0.5
                    }
                  ]}>
                    {blurType.name}
                  </Text>
                  <Text style={[
                    styles.typeDescription,
                    { 
                      color: settings.type === blurType.id 
                        ? 'rgba(255, 255, 255, 0.8)' 
                        : theme.colors.textSecondary,
                      opacity: settings.enabled ? 1 : 0.5
                    }
                  ]}>
                    {blurType.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Intensity Control */}
          {settings.enabled && (
            <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Privacy Intensity: {settings.intensity}%
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
                  Minimal
                </Text>
                <Text style={[styles.intensityLabel, { color: theme.colors.textSecondary }]}>
                  Maximum
                </Text>
              </View>
            </View>
          )}

          {/* Advanced Controls */}
          {settings.enabled && renderAdvancedControls()}

          {/* Face Tracking Accuracy */}
          {settings.enabled && (
            <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Face Tracking
              </Text>
              
              <View style={styles.controlGroup}>
                <Text style={[styles.parameterLabel, { color: theme.colors.text }]}>
                  Tracking Accuracy: {settings.faceTrackingAccuracy}%
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={50}
                  maximumValue={100}
                  step={5}
                  value={settings.faceTrackingAccuracy}
                  onValueChange={(value) => handleParameterChange('faceTrackingAccuracy', value)}
                  minimumTrackTintColor={theme.colors.accent}
                  maximumTrackTintColor={theme.colors.border}
                  thumbTintColor={theme.colors.accent}
                />
              </View>
              
              <TouchableOpacity
                style={[
                  styles.calibrateButton,
                  { 
                    backgroundColor: calibrating ? theme.colors.warning : theme.colors.info,
                    opacity: settings.enabled ? 1 : 0.5
                  }
                ]}
                onPress={startCalibration}
                disabled={!settings.enabled || calibrating}
              >
                <Ionicons 
                  name={calibrating ? 'sync' : 'camera'} 
                  size={20} 
                  color="#fff" 
                />
                <Text style={styles.calibrateButtonText}>
                  {calibrating ? 'Calibrating...' : 'Calibrate Face Detection'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Preview Section */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Privacy Preview
            </Text>
            
            <View style={styles.previewContainer}>
              <View style={[
                styles.previewFrame,
                { 
                  borderColor: settings.enabled ? theme.colors.accent : theme.colors.border,
                  backgroundColor: theme.colors.background
                }
              ]}>
                <Text style={[styles.previewPlaceholder, { color: theme.colors.textSecondary }]}>
                  {settings.enabled 
                    ? `${currentBlurType?.name} Preview\n${settings.type === 'avatar' ? currentAvatarStyle?.preview || '🕴️' : '👤'}`
                    : 'Privacy Disabled\n👤'
                  }
                </Text>
              </View>
              
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
                  name={previewMode ? 'stop' : 'eye'} 
                  size={20} 
                  color="#fff" 
                />
                <Text style={styles.previewButtonText}>
                  {previewMode ? 'Stop Preview' : 'Test Privacy'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Performance Info */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.performanceInfo}>
              <Ionicons name="speedometer" size={20} color={theme.colors.info} />
              <View style={styles.performanceContent}>
                <Text style={[styles.performanceTitle, { color: theme.colors.text }]}>
                  Performance Impact
                </Text>
                <Text style={[styles.performanceDescription, { color: theme.colors.textSecondary }]}>
                  Face privacy processing uses device CPU. Higher accuracy and intensity may impact battery life.
                </Text>
              </View>
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
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeCard: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    gap: 8,
  },
  typeName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  typeDescription: {
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
  advancedSection: {
    backgroundColor: 'transparent',
    padding: 0,
    marginBottom: 16,
  },
  advancedTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  controlGroup: {
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 2,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  toggleDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  avatarCard: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    gap: 8,
  },
  avatarPreview: {
    fontSize: 32,
  },
  avatarName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  avatarDescription: {
    fontSize: 12,
    textAlign: 'center',
  },
  calibrateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  calibrateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  previewContainer: {
    alignItems: 'center',
    gap: 16,
  },
  previewFrame: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPlaceholder: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  performanceInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  performanceContent: {
    flex: 1,
  },
  performanceTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  performanceDescription: {
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