import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MessageCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const WhatsAppDigest = () => {
  const { user } = useAuth();
  const [phone, setPhone] = useState("");
  const [time, setTime] = useState("09:00");
  const [optedIn, setOptedIn] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("whatsapp_optins").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setPhone(data.phone || "");
        setTime((data.preferred_time as string)?.slice(0, 5) || "09:00");
        setOptedIn(data.opted_in);
      }
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    if (!/^\+?\d{10,15}$/.test(phone.replace(/\s/g, ""))) {
      toast.error("Enter a valid phone number (with country code)");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("whatsapp_optins").upsert({
      user_id: user.id,
      phone: phone.replace(/\s/g, ""),
      preferred_time: `${time}:00`,
      opted_in: optedIn,
    }, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success(optedIn ? "✓ Subscribed to daily digest" : "Preferences saved");
  };

  return (
    <Card className="border-success/30 bg-gradient-to-br from-success/5 to-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <MessageCircle className="w-5 h-5 text-success" />
          WhatsApp Daily Rate Digest
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Get today's gold, silver & diamond rates with AI verdict delivered every morning.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">WhatsApp number</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> Delivery time (IST)</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-muted/30">
          <Label htmlFor="optin" className="text-sm cursor-pointer">Send me the daily digest</Label>
          <Switch id="optin" checked={optedIn} onCheckedChange={setOptedIn} />
        </div>
        <Button onClick={save} disabled={saving} className="w-full bg-success hover:bg-success/90 text-success-foreground">
          {saving ? "Saving..." : "Save Preferences"}
        </Button>
        <p className="text-[10px] text-muted-foreground text-center">
          Free for all subscribers. Standard messaging rates may apply.
        </p>
      </CardContent>
    </Card>
  );
};
