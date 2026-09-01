import { useEffect, useState } from "react";
import { Bell, BellRing, Check, Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { enableNativeNotifications } from "@/lib/native";
import { toast } from "sonner";

interface Preferences { push_enabled: boolean; account_alerts: boolean; transaction_alerts: boolean; price_alerts: boolean; reminders: boolean; security_alerts: boolean; promotions: boolean }
interface UserNotification { id: string; title: string; body: string; category: string; read_at: string | null; created_at: string }

const defaults: Preferences = { push_enabled: true, account_alerts: true, transaction_alerts: true, price_alerts: true, reminders: true, security_alerts: true, promotions: false };
const preferenceLabels: Array<[keyof Preferences, string]> = [["push_enabled", "Push notifications"], ["price_alerts", "Price alerts"], ["account_alerts", "Account updates"], ["transaction_alerts", "Payment updates"], ["reminders", "Reminders"], ["security_alerts", "Security alerts"], ["promotions", "Offers and promotions"]];

export const NotificationCenter = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const [prefsResult, notificationsResult] = await Promise.all([
      supabase.from("notification_preferences").select("push_enabled, account_alerts, transaction_alerts, price_alerts, reminders, security_alerts, promotions").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_notifications").select("id, title, body, category, read_at, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    ]);
    if (prefsResult.data) setPreferences(prefsResult.data as Preferences);
    setNotifications((notificationsResult.data as UserNotification[]) ?? []);
  };

  useEffect(() => { void load(); }, [user]);

  const updatePreference = async (key: keyof Preferences, value: boolean) => {
    if (!user) return;
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    setSaving(true);
    const { error } = await supabase.from("notification_preferences").upsert({ user_id: user.id, ...next, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) { setPreferences(preferences); toast.error(error.message); }
  };

  const enableNotifications = async () => {
    if (!user) return;
    const enabled = await enableNativeNotifications(user.id);
    if (enabled) toast.success("Native notifications enabled on this device");
    else if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      toast[permission === "granted" ? "success" : "error"](permission === "granted" ? "Browser notifications enabled" : "Notification permission was not granted");
    } else toast.info("Install the Android app to enable device notifications");
  };

  const markRead = async (notification: UserNotification) => {
    await supabase.from("user_notifications").update({ read_at: new Date().toISOString() }).eq("id", notification.id);
    setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item));
  };

  return <Card className="border-border"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><BellRing className="h-5 w-5 text-primary" />Notifications <Badge variant="secondary" className="ml-auto">{notifications.filter((item) => !item.read_at).length} unread</Badge></CardTitle></CardHeader><CardContent className="space-y-5"><div className="flex items-center justify-between gap-3 border border-border p-3 rounded-md"><div className="flex items-center gap-3"><Smartphone className="h-4 w-4 text-primary" /><div><p className="text-sm font-medium text-foreground">This device</p><p className="text-xs text-muted-foreground">Receive price and account updates</p></div></div><Button size="sm" variant="outline" onClick={enableNotifications}><Bell className="h-4 w-4 mr-1" />Enable</Button></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{preferenceLabels.map(([key, label]) => <label key={key} className="flex items-center justify-between gap-3 border border-border p-3 rounded-md cursor-pointer"><span className="text-sm text-foreground">{label}</span><Switch checked={preferences[key]} disabled={saving} onCheckedChange={(value) => void updatePreference(key, value)} /></label>)}</div><div className="space-y-2">{notifications.map((notification) => <div key={notification.id} className={`flex items-start justify-between gap-3 border p-3 rounded-md ${notification.read_at ? "border-border" : "border-primary/40 bg-primary/5"}`}><div><p className="text-sm font-medium text-foreground">{notification.title}</p><p className="text-xs text-muted-foreground">{notification.body}</p><p className="text-[10px] text-muted-foreground mt-1">{new Date(notification.created_at).toLocaleString("en-IN")}</p></div>{!notification.read_at && <Button size="icon" variant="ghost" onClick={() => void markRead(notification)} title="Mark as read"><Check className="h-4 w-4" /></Button>}</div>)}{notifications.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No in-app notifications yet.</p>}</div></CardContent></Card>;
};