import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, StarOff, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMetalPrices } from "@/hooks/useMetalPrices";
import { useCurrency, CURRENCY_SYMBOLS } from "@/contexts/CurrencyContext";
import { toast } from "sonner";

interface WatchRow { id: string; metal: string; city: string | null }

export const WatchlistFavorites = () => {
  const { user } = useAuth();
  const { metals } = useMetalPrices();
  const { currency } = useCurrency();
  const [rows, setRows] = useState<WatchRow[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("user_watchlist").select("id, metal, city").eq("user_id", user.id);
    setRows((data as WatchRow[]) ?? []);
  };

  useEffect(() => { load(); }, [user]);

  const toggle = async (metal: string) => {
    if (!user) return;
    const existing = rows.find((r) => r.metal === metal && !r.city);
    if (existing) {
      await supabase.from("user_watchlist").delete().eq("id", existing.id);
      toast.success(`${metal} removed from watchlist`);
    } else {
      await supabase.from("user_watchlist").insert({ user_id: user.id, metal });
      toast.success(`${metal} added to watchlist`);
    }
    load();
  };

  const watched = metals.filter((m) => rows.some((r) => r.metal === m.metal));
  const symbol = CURRENCY_SYMBOLS[currency] ?? "₹";

  return (
    <Card className="border-2 border-warning/30 bg-gradient-to-br from-warning/5 via-card to-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Star className="w-5 h-5 text-warning fill-warning" />
          My Watchlist
          <Badge variant="secondary" className="ml-auto">{rows.length} pinned</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">Pin metals for quick-glance pricing on every visit.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {watched.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {watched.map((m) => (
              <div key={m.metal} className="p-3 rounded-lg bg-card border border-border">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground truncate">{m.metal}</p>
                  {m.changePercent >= 0
                    ? <TrendingUp className="w-3 h-3 text-success" />
                    : <TrendingDown className="w-3 h-3 text-destructive" />}
                </div>
                <p className="text-sm font-bold text-foreground mt-1">{symbol}{m.pricePerGram.toFixed(2)}/g</p>
                <p className={`text-[10px] ${m.changePercent >= 0 ? "text-success" : "text-destructive"}`}>
                  {m.changePercent >= 0 ? "+" : ""}{m.changePercent.toFixed(2)}%
                </p>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground self-center mr-2">Toggle:</span>
          {metals.map((m) => {
            const on = rows.some((r) => r.metal === m.metal && !r.city);
            return (
              <Button key={m.metal} size="sm" variant={on ? "default" : "outline"} onClick={() => toggle(m.metal)} className="h-7 text-xs">
                {on ? <Star className="w-3 h-3 mr-1 fill-current" /> : <StarOff className="w-3 h-3 mr-1" />}
                {m.metal}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
