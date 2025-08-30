import { Platform } from "react-native";
import * as IntentLauncher from "expo-intent-launcher";

export async function openFactoryResetSettings() {
  if (Platform.OS !== 'android') return;
  // Try multiple Android settings intents as some are device/OS specific
  const actions = [
    'android.settings.BACKUP_AND_RESET_SETTINGS',
    'android.settings.PRIVACY_SETTINGS',
    'android.settings.SETTINGS',
  ];
  for (const action of actions) {
    try {
      await IntentLauncher.startActivityAsync(action as any);
      return;
    } catch (e) {
      // try next
    }
  }
}