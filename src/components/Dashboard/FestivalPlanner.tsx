import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { useMetalPrices } from "@/hooks/useMetalPrices";

interface Event {
  name: string;
  date: string; // ISO
  type: "festival" | "muhurat";
  significance: string;
}

// India auspicious gold-buying calendar (2026)
const EVENTS: Event[] = [
  { name: "Akshaya Tritiya", date: "2026-04-20", type: "festival", significance: "Most auspicious day to buy gold in India" },
  { name: "Pushya Nakshatra", date: "2026-06-15", type: "muhurat", significance: "Highly favourable for gold & silver purchases" },
  { name: "Varalakshmi Vratam", date: "2026-08-07", type: "festival", significance: "Auspicious for buying gold ornaments" },
  { name: "Navratri Begins", date: "2026-10-11", type: "festival", significance: "9 nights — gold buying considered auspicious" },
  { name: "Dussehra (Vijayadashami)", date: "2026-10-20", type: "festival", significance: "Victory day — ideal for new investments" },
  { name: "Dhanteras", date: "2026-11-07", type: "festival", significance: "Wealth festival — biggest gold buying day" },
  { name: "Diwali", date: "2026-11-08", type: "festival", significance: "Lakshmi Puja — gold & silver coins tradition" },
  { name: "Guru Pushya Yoga", date: "2026-12-10", type: "muhurat", significance: "Rare yoga — extremely auspicious for gold" },
];

export const FestivalPlanner = () => {
  const { metals } = useMetalPrices();
  const gold22 = metals.find((m) => m.metal === "Gold 22K")?.pricePerGram || 0;
  const change = metals.find((m) => m.metal === "Gold 22K")?.changePercent || 0;

  const upcoming = useMemo(() => {
    const today = new Date();
    return EVENTS
      .map((e) => ({ ...e, daysLeft: Math.ceil((new Date(e.date).getTime() - today.getTime()) / 86400000) }))
      .filter((e) => e.daysLeft >= 0)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 6);
  }, []);

  const verdict = (daysLeft: number) => {
    // Simple rule: if market trending up & event far, buy now. If down or close, wait.
    if (daysLeft <= 7) return { label: "Plan Now", tone: "warning" as const, icon: Calendar };
    if (change > 0.5) return { label: "Buy Early", tone: "success" as const, icon: TrendingUp };
    if (change < -0.5) return { label: "Wait & Watch", tone: "primary" as const, icon: TrendingDown };
    return { label: "Neutral", tone: "muted" as const, icon: Calendar };
  };

  return (
    <Card className="border-border bg-gradient-to-br from-card to-warning/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="p-2 bg-warning/10 rounded-lg"><Sparkles className="w-4 h-4 text-warning" /></div>
          Festival & Muhurat Planner
        </CardTitle>
        <p className="text-xs text-muted-foreground">Auspicious gold buying days in India with AI verdict</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {upcoming.map((e) => {
            const v = verdict(e.daysLeft);
            const Icon = v.icon;
            const toneClass =
              v.tone === "success" ? "bg-success/10 border-success/30 text-success" :
              v.tone === "warning" ? "bg-warning/10 border-warning/30 text-warning" :
              v.tone === "primary" ? "bg-primary/10 border-primary/30 text-primary" :
              "bg-muted border-border text-muted-foreground";
            return (
              <div key={e.name} className="p-3 rounded-lg border border-border bg-card">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{e.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      {" · "}{e.daysLeft === 0 ? "Today" : `${e.daysLeft}d left`}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${toneClass}`}>
                    <Icon className="w-3 h-3 mr-1" />{v.label}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">{e.significance}</p>
                {gold22 > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Current 22K: <span className="font-semibold text-foreground">₹{gold22.toLocaleString("en-IN")}/g</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
