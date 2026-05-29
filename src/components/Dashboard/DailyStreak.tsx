import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const DailyStreak = () => {
  const { user } = useAuth();
  const [streak, setStreak] = useState(0);
  const [longest, setLongest] = useState(0);
  const recordedRef = useState({ done: false })[0];

  useEffect(() => {
    if (!user || recordedRef.done) return;
    recordedRef.done = true;
    (async () => {
      const { data, error } = await supabase.rpc("record_login_streak");
      if (error) return;
      const res = data as { streak: number; changed: boolean; bonus_granted?: boolean };
      setStreak(res.streak);
      if (res.bonus_granted) toast.success("🔥 7-day streak! +1 bonus trial day added.");
      const { data: row } = await supabase.from("user_rewards").select("longest_streak").eq("user_id", user.id).maybeSingle();
      if (row) setLongest(row.longest_streak);
    })();
  }, [user, recordedRef]);

  const daysToNextBonus = streak === 0 ? 7 : 7 - (streak % 7 || 7);
  const dots = Array.from({ length: 7 }, (_, i) => i < (streak % 7 || (streak > 0 ? 7 : 0)));

  return (
    <Card className="border-warning/30 bg-gradient-to-br from-warning/5 to-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning/20 rounded-lg">
              <Flame className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Daily streak</p>
              <p className="text-xl font-bold text-foreground">{streak} {streak === 1 ? "day" : "days"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {dots.map((on, i) => (
              <div key={i} className={`w-2.5 h-2.5 rounded-full ${on ? "bg-warning" : "bg-muted"}`} />
            ))}
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Trophy className="w-3 h-3" /> Best: {longest}
            </div>
            <p className="text-[11px] text-warning font-semibold mt-1">
              {streak > 0 && streak % 7 === 0 ? "🎁 +1 day earned!" : `${daysToNextBonus}d to +1 bonus`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
