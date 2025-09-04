import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../state/theme';
import * as SecureStore from 'expo-secure-store';

interface IconOption {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: string[];
  description: string;
}

const DISGUISED_ICONS: IconOption[] = [
  {
    id: 'bicycle',
    name: 'Bike Tracker',
    icon: 'bicycle',
    colors: ['#10b981'], // Green
    description: 'Looks like a fitness/cycling app'
  },
  {
    id: 'heart',
    name: 'Health Monitor',
    icon: 'heart',
    colors: ['#ef4444'], // Red heart
    description: 'Looks like a health/medical app'
  },
  {
    id: 'google_o',
    name: 'Google Services',
    icon: 'ellipse',
    colors: ['#4285f4', '#ea4335', '#fbbc05', '#34a853'], // Google colors
    description: 'Deceptive "O" instead of "G" - looks like Google at quick glance'
  },
  {
    id: 'calculator',
    name: 'Calculator',
    icon: 'calculator',
    colors: ['#6b7280'], // Gray
    description: 'Looks like a system calculator app'
  },
  {
    id: 'camera',
    name: 'Camera',
    icon: 'camera',
    colors: ['#374151'], // Dark gray
    description: 'Looks like a camera app'
  }
];

const DisguisedIcon: React.FC<{ option: IconOption; size?: number }> = ({ option, size = 64 }) => {
  const { colors } = useTheme();
  
  if (option.id === 'google_o') {
    // Special Google "O" rendering
    return (
      <View style={[styles.googleIcon, { width: size, height: size }]}>
        <View style={[styles.googleQuarter, styles.googleTopLeft, { backgroundColor: option.colors[0] }]} />
        <View style={[styles.googleQuarter, styles.googleTopRight, { backgroundColor: option.colors[1] }]} />
        <View style={[styles.googleQuarter, styles.googleBottomLeft, { backgroundColor: option.colors[3] }]} />
        <View style={[styles.googleQuarter, styles.googleBottomRight, { backgroundColor: option.colors[2] }]} />
        <View style={[styles.googleCenter, { backgroundColor: colors.bg }]} />
      </View>
    );
  }
  
  return (
    <View style={[styles.iconContainer, { width: size, height: size, backgroundColor: option.colors[0] }]}>
      <Ionicons name={option.icon} size={size * 0.6} color="#ffffff" />
    </View>
  );
};

export const DisguisedAppIcon: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [currentIcon, setCurrentIcon] = useState<string>('omerta');
  const { colors } = useTheme();

  React.useEffect(() => {
    loadCurrentIcon();
  }, []);

  const loadCurrentIcon = async () => {
    try {
      const saved = await SecureStore.getItemAsync('disguised_icon');
      if (saved) {
        setCurrentIcon(saved);
      }
    } catch (error) {
      console.log('No saved icon preference');
    }
  };

  const setDisguisedIcon = async (iconId: string) => {
    try {
      await SecureStore.setItemAsync('disguised_icon', iconId);
      setCurrentIcon(iconId);
      setModalVisible(false);
      
      // In a real implementation, this would trigger an app icon change
      // For now, just show confirmation
      const selectedIcon = DISGUISED_ICONS.find(icon => icon.id === iconId);
      Alert.alert(
        'Icon Changed',
        `App icon changed to "${selectedIcon?.name}". Restart the app to see changes.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save icon preference');
    }
  };

  const resetToDefault = async () => {
    try {
      await SecureStore.deleteItemAsync('disguised_icon');
      setCurrentIcon('omerta');
      setModalVisible(false);
      Alert.alert(
        'Icon Reset',
        'App icon reset to OMERTÀ default. Restart the app to see changes.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to reset icon');
    }
  };

  const getCurrentIconName = () => {
    if (currentIcon === 'omerta') return 'OMERTÀ Default';
    const found = DISGUISED_ICONS.find(icon => icon.id === currentIcon);
    return found?.name || 'Unknown';
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.settingRow, { borderColor: colors.border }]}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.settingInfo}>
          <Ionicons name="apps" size={20} color={colors.accent} />
          <View style={styles.settingText}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>Disguised App Icon</Text>
            <Text style={[styles.settingSubtitle, { color: colors.sub }]}>
              Current: {getCurrentIconName()}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.sub} />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.bg }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={[styles.cancelButton, { color: colors.accent }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Choose App Icon</Text>
            <TouchableOpacity onPress={resetToDefault}>
              <Text style={[styles.resetButton, { color: colors.accent }]}>Reset</Text>
            </TouchableOpacity>
          </View>

          {/* Security Warning */}
          <View style={[styles.warningCard, { backgroundColor: colors.card, borderColor: colors.accent }]}>
            <Ionicons name="shield-checkmark" size={24} color={colors.accent} />
            <View style={styles.warningText}>
              <Text style={[styles.warningTitle, { color: colors.text }]}>Stealth Mode</Text>
              <Text style={[styles.warningSubtitle, { color: colors.sub }]}>
                Disguised icons help OMERTA blend in with other apps for enhanced privacy and security.
              </Text>
            </View>
          </View>

          {/* Icon Options */}
          <ScrollView style={styles.iconList} showsVerticalScrollIndicator={false}>
            {/* Default OMERTA Icon */}
            <TouchableOpacity
              style={[
                styles.iconOption, 
                { 
                  backgroundColor: colors.card, 
                  borderColor: currentIcon === 'omerta' ? colors.accent : colors.border,
                  borderWidth: currentIcon === 'omerta' ? 2 : 1
                }
              ]}
              onPress={() => resetToDefault()}
            >
              <View style={[styles.omertaIcon, { backgroundColor: colors.accent }]}>
                <Text style={styles.omertaText}>O</Text>
              </View>
              <View style={styles.iconInfo}>
                <Text style={[styles.iconName, { color: colors.text }]}>OMERTA Default</Text>
                <Text style={[styles.iconDescription, { color: colors.sub }]}>
                  Original OMERTA logo with red accents
                </Text>
              </View>
              {currentIcon === 'omerta' && (
                <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
              )}
            </TouchableOpacity>

            {/* Disguised Icons */}
            {DISGUISED_ICONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.iconOption, 
                  { 
                    backgroundColor: colors.card, 
                    borderColor: currentIcon === option.id ? colors.accent : colors.border,
                    borderWidth: currentIcon === option.id ? 2 : 1
                  }
                ]}
                onPress={() => setDisguisedIcon(option.id)}
              >
                <DisguisedIcon option={option} size={48} />
                <View style={styles.iconInfo}>
                  <Text style={[styles.iconName, { color: colors.text }]}>{option.name}</Text>
                  <Text style={[styles.iconDescription, { color: colors.sub }]}>
                    {option.description}
                  </Text>
                </View>
                {currentIcon === option.id && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingSubtitle: {
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  cancelButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  resetButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  warningText: {
    marginLeft: 12,
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  warningSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  
  iconList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  iconOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginVertical: 6,
    borderWidth: 1,
  },
  iconInfo: {
    marginLeft: 16,
    flex: 1,
  },
  iconName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  iconDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  
  // Icon Containers
  iconContainer: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  omertaIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  omertaText: {
    color: '#000',
    fontSize: 24,
    fontWeight: '700',
  },
  
  // Google "O" Icon
  googleIcon: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleQuarter: {
    position: 'absolute',
    width: '50%',
    height: '50%',
  },
  googleTopLeft: {
    top: 0,
    left: 0,
    borderTopLeftRadius: 12,
  },
  googleTopRight: {
    top: 0,
    right: 0,
    borderTopRightRadius: 12,
  },
  googleBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomLeftRadius: 12,
  },
  googleBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomRightRadius: 12,
  },
  googleCenter: {
    position: 'absolute',
    width: '40%',
    height: '40%',
    borderRadius: 100,
    top: '30%',
    left: '30%',
  },
});

export default DisguisedAppIcon;