import { Stack } from "expo-router";
import { useEffect } from "react";
import * as ScreenCapture from "expo-screen-capture";
import { Platform, AppState } from "react-native";
import { useContacts } from "../src/state/contacts";
import { autoWipe } from "../src/utils/autoWipe";

export default function RootLayout() {
  const contacts = useContacts();

  useEffect(() => {
    // Initialize contacts
    contacts.init();

    // Initialize auto-wipe activity tracking
    autoWipe.updateActivity('app_launch');

    // Global anti-screenshot/screen recording
    let active = true;
    (async () => {
      try {
        await ScreenCapture.preventScreenCaptureAsync();
      } catch (e) {
        // noop on platforms that don't support
      }
    })();

    // Handle app state changes for auto-wipe tracking
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        autoWipe.onAppForeground();
      } else if (nextAppState === 'background') {
        autoWipe.onAppBackground();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (!active) return;
      (async () => {
        try {
          await ScreenCapture.allowScreenCaptureAsync();
        } catch (e) {}
      })();
      
      subscription?.remove();
      autoWipe.destroy(); // Cleanup timers
    };
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false, animation: Platform.select({ ios: "default", android: "fade" }) }} />
  );
}