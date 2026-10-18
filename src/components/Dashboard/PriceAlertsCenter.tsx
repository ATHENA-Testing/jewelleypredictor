import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, BellRing, Plus, Trash2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMetalPrices } from "@/hooks/useMetalPrices";
import { toast } from "sonner";

interface Alert {
  id: string;
  metal: string;
  condition: "above" | "below";
  target_price: number;
  is_active: boolean;
  triggered_at: string | null;
  note: string | null;
}

export const PriceAlertsCenter = () => {
  const { user } = useAuth();
  const { metals } = useMetalPrices();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [metal, setMetal] = useState("Gold 24K");
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [target, setTarget] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const priceMap = useMemo(() => {
    const m: Record<string, number> = {};
    metals.forEach((x) => { m[x.metal] = x.pricePerGram; });
    return m;
  }, [metals]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("price_alerts").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: false });
    setAlerts((data as Alert[]) ?? []);
  };

  useEffect(() => { load(); }, [user]);

  // Client-side evaluation: notify when target hit
  useEffect(() => {
    if (!user || alerts.length === 0 || metals.length === 0) return;
    alerts.forEach(async (a) => {
      if (!a.is_active || a.triggered_at) return;
      const live = priceMap[a.metal];
      if (live == null) return;
      const hit = a.condition === "above" ? live >= a.target_price : live <= a.target_price;
      if (hit) {
        await supabase.from("price_alerts")
          .update({ triggered_at: new Date().toISOString(), last_price: live })
          .eq("id", a.id);
        toast.success(`🔔 ${a.metal} is ${a.condition} ₹${a.target_price}/g (now ₹${live.toFixed(2)})`, { duration: 8000 });
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(`MetalPredict Alert: ${a.metal}`, {
            body: `${a.metal} is now ${a.condition} ₹${a.target_price}/g (₹${live.toFixed(2)})`,
          });
        }
        load();
      }
    });
  }, [priceMap, alerts, user]);

  const requestPermission = async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
        const p = await Notification.requestPermission();
      if (p === "granted") toast.success("Browser notifications enabled");
    }
  };

  const addAlert = async () => {
    if (!user || !target) return;
    setSaving(true);
    const { error } = await supabase.from("price_alerts").insert({
      user_id: user.id, metal, condition, target_price: parseFloat(target), note: note || null,
    });
    setSaving(false);
    if (error) { toast.error("Failed to add alert"); return; }
    toast.success("Alert created");
    setTarget(""); setNote("");
    requestPermission();
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("price_alerts").delete().eq("id", id);
    load();
  };

  const reactivate = async (id: string) => {
    await supabase.from("price_alerts").update({ triggered_at: null, is_active: true }).eq("id", id);
    load();
  };

  return (
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-card to-warning/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <BellRing className="w-5 h-5 text-primary" />
          Price Alerts Center
          <Badge variant="secondary" className="ml-auto">{alerts.filter((a) => a.is_active && !a.triggered_at).length} active</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">Get notified the moment a metal crosses your target price.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <Select value={metal} onValueChange={setMetal}>
            <SelectTrigger className="md:col-span-2"><SelectValue /></SelectTrigger>
            <SelectContent>
              {metals.map((m) => <SelectItem key={m.metal} value={m.metal}>{m.metal}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={condition} onValueChange={(v) => setCondition(v as "above" | "below")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="above">Above</SelectItem>
              <SelectItem value="below">Below</SelectItem>
            </SelectContent>
          </Select>
          <Input type="number" placeholder="₹ per gram" value={target} onChange={(e) => setTarget(e.target.value)} />
          <Button onClick={addAlert} disabled={!target || saving} className="bg-gradient-primary">
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
        <Input placeholder="Optional note (e.g. buying for wedding)" value={note} onChange={(e) => setNote(e.target.value)} />

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {alerts.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No alerts yet. Add one above.</p>
          )}
          {alerts.map((a) => {
            const live = priceMap[a.metal];
            const triggered = !!a.triggered_at;
            return (
              <div key={a.id} className={`flex items-center justify-between p-3 rounded-lg border ${triggered ? "bg-success/10 border-success/30" : "bg-card border-border"}`}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {a.metal} {a.condition} ₹{a.target_price}/g
                    {triggered && <Badge variant="default" className="ml-2 text-[10px] bg-success">Triggered</Badge>}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Live: {live != null ? `₹${live.toFixed(2)}` : "—"}{a.note ? ` • ${a.note}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {triggered && (
                    <Button size="icon" variant="ghost" onClick={() => reactivate(a.id)} title="Re-arm">
                      <Check className="w-4 h-4" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => remove(a.id)} title="Delete">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {"Notification" in window && Notification.permission !== "granted" && (
          <Button variant="outline" size="sm" onClick={requestPermission} className="w-full">
            <Bell className="w-3 h-3 mr-1" /> Enable browser notifications
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
