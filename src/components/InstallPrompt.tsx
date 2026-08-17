import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone } from "lucide-react";
import { isNative } from "@/lib/native";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed-at";
const DISMISS_HOURS = 24;

export const InstallPrompt = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    const recentlyDismissed = dismissedAt && Date.now() - dismissedAt < DISMISS_HOURS * 3600 * 1000;
    if (recentlyDismissed) return;

    setIsIOS(ios);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS doesn't fire beforeinstallprompt — show manual instructions
    if (ios) setVisible(true);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setVisible(false);
    setDeferred(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-[100] animate-in slide-in-from-bottom-5">
      <div className="bg-card border border-border rounded-xl shadow-2xl p-4 flex items-start gap-3">
        <img src="/app-icon.png" alt="App icon" width={48} height={48} className="rounded-lg shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm">Install MetalPredict Pro</p>
          {isIOS && !deferred ? (
            <p className="text-xs text-muted-foreground mt-1">
              Tap <span className="font-semibold">Share</span> then{" "}
              <span className="font-semibold">"Add to Home Screen"</span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              Get the full app experience with one tap access.
            </p>
          )}
          {!isIOS && deferred && (
            <Button size="sm" onClick={handleInstall} className="mt-2 bg-gradient-primary h-8">
              <Download className="w-3.5 h-3.5 mr-1" /> Install App
            </Button>
          )}
          {isIOS && (
            <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Smartphone className="w-3 h-3" /> Works just like a native app
            </div>
          )}
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
