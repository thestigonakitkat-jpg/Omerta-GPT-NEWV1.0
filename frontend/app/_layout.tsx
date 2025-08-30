import { Stack } from "expo-router";
import { useEffect } from "react";
import * as ScreenCapture from "expo-screen-capture";
import { Platform } from "react-native";

export default function RootLayout() {
  useEffect(() => {
    // Global anti-screenshot/screen recording
    let active = true;
    (async () => {
      try {
        await ScreenCapture.preventScreenCaptureAsync();
      } catch (e) {
        // noop on platforms that don't support
      }
    })();
    return () => {
      if (!active) return;
      (async () => {
        try {
          await ScreenCapture.allowScreenCaptureAsync();
        } catch (e) {}
      })();
    };
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false, animation: Platform.select({ ios: "default", android: "fade" }) }} />
  );
}