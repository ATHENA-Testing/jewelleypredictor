import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Gift, Share2, Copy, Users, Sparkles, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const ShareToEarn = () => {
  const { user } = useAuth();
  const [code, setCode] = useState<string>("");
  const [rewards, setRewards] = useState<{
    share_bonus_days: number;
    referral_bonus_days: number;
    streak_bonus_days: number;
    share_count: number;
  } | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const load = async () => {
    if (!user) return;
    const [{ data: prof }, { data: rew }, { count }] = await Promise.all([
      supabase.from("profiles").select("referral_code").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_rewards").select("share_bonus_days, referral_bonus_days, streak_bonus_days, share_count").eq("user_id", user.id).maybeSingle(),
      supabase.from("referrals").select("*", { count: "exact", head: true }).eq("referrer_user_id", user.id),
    ]);
    if (prof?.referral_code) setCode(prof.referral_code);
    setRewards(rew ?? { share_bonus_days: 0, referral_bonus_days: 0, streak_bonus_days: 0, share_count: 0 });
    setReferralCount(count ?? 0);
  };

  useEffect(() => { load(); }, [user]);

  const shareUrl = code ? `${window.location.origin}/auth?ref=${code}` : "";
  const shareText = `🪙 Track real-time gold, silver & diamond rates with AI predictions on MetalPredict Pro. Use my code ${code} to get +3 bonus trial days! ${shareUrl}`;

  const handleShare = async () => {
    if (!code || sharing) return;
    setSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({ title: "MetalPredict Pro", text: shareText, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast.success("Share message copied!");
      }
      const { data, error } = await supabase.rpc("claim_share_reward");
      if (error) throw error;
      const res = data as { granted: boolean; reason?: string; bonus_days: number };
      if (res.granted) toast.success("🎁 +1 bonus day added to your trial!");
      else if (res.reason === "cooldown") toast.info("Share again in 1 hour to earn more days.");
      else if (res.reason === "cap_reached") toast.info("You've hit the 7-day share bonus cap.");
      await load();
    } catch (e: unknown) {
      const err = e as { message?: string };
      if (err?.message && !err.message.includes("AbortError")) toast.error("Share failed");
    } finally {
      setSharing(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const totalBonus = (rewards?.share_bonus_days ?? 0) + (rewards?.referral_bonus_days ?? 0) + (rewards?.streak_bonus_days ?? 0);

  return (
    <Card className="border-2 border-warning/30 bg-gradient-to-br from-warning/5 via-card to-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Gift className="w-5 h-5 text-warning" />
          Share & Earn Free Days
          <Badge variant="secondary" className="ml-auto">+{totalBonus} bonus days</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Share with friends: <span className="font-semibold text-foreground">+1 day per share</span> (max 7) •
          <span className="font-semibold text-foreground"> +3 days</span> when they sign up with your code (both of you).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded-lg bg-success/10 border border-success/20 text-center">
            <p className="text-[10px] text-muted-foreground">Shares</p>
            <p className="text-lg font-bold text-success">{rewards?.share_count ?? 0}</p>
          </div>
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-center">
            <p className="text-[10px] text-muted-foreground">Referrals</p>
            <p className="text-lg font-bold text-primary">{referralCount}</p>
          </div>
          <div className="p-2 rounded-lg bg-warning/10 border border-warning/20 text-center">
            <p className="text-[10px] text-muted-foreground">Days earned</p>
            <p className="text-lg font-bold text-warning">+{totalBonus}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Input value={shareUrl} readOnly className="text-xs font-mono" />
          <Button variant="outline" size="icon" onClick={handleCopy} disabled={!code}>
            {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        <Button onClick={handleShare} disabled={!code || sharing} className="w-full bg-gradient-primary">
          <Share2 className="w-4 h-4 mr-2" />
          {sharing ? "Sharing..." : "Share & Earn +1 Day"}
        </Button>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Sparkles className="w-3 h-3 text-warning" />
          Your code: <span className="font-mono font-bold text-foreground">{code || "…"}</span>
          <Users className="w-3 h-3 ml-auto" /> Bonus applies to current subscription
        </div>
      </CardContent>
    </Card>
  );
};
