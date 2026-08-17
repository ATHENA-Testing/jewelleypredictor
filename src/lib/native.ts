import { Capacitor } from "@capacitor/core";

export const isNative = () => Capacitor.isNativePlatform();

/**
 * Initialise native-only behaviour (status bar, splash screen, hardware back button).
 * Safe to call on the web — it no-ops there.
 */
export async function initNative() {
  if (!isNative()) return;

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#7c3aed" });
    }
  } catch {
    /* status bar plugin unavailable */
  }

  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    /* splash plugin unavailable */
  }

  try {
    const { App } = await import("@capacitor/app");
    App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else App.exitApp();
    });
  } catch {
    /* app plugin unavailable */
  }
}
