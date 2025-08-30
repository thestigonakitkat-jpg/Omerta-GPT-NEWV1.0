import * as Clipboard from "expo-clipboard";
import { AppState } from "react-native";

let clearTimer: any = null;
let subscribed = false;

function ensureSubscribed() {
  if (subscribed) return;
  AppState.addEventListener("change", (state) => {
    if (state !== "active") {
      // Clear clipboard when app goes to background
      Clipboard.setStringAsync("");
      if (clearTimer) {
        clearTimeout(clearTimer);
        clearTimer = null;
      }
    }
  });
  subscribed = true;
}

export async function safeCopyToClipboard(text: string, ms: number = 10000) {
  ensureSubscribed();
  try {
    await Clipboard.setStringAsync(text);
  } catch {}
  if (clearTimer) clearTimer = clearTimeout(clearTimer);
  clearTimer = setTimeout(() => {
    Clipboard.setStringAsync("");
    clearTimer = null;
  }, ms);
}