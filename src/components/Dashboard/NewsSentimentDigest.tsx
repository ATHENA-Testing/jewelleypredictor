import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Newspaper, TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMarketNews } from "@/hooks/useMarketNews";

interface Analysis { sentiment: string | null; analysis_text: string; created_at: string; metal: string }

const tagFor = (title: string, summary: string): "bullish" | "bearish" | "neutral" => {
  const t = `${title} ${summary}`.toLowerCase();
  if (/(rally|surge|jump|gain|rise|rises|up|high|record|bullish|strong|boost|climb)/.test(t)) return "bullish";
  if (/(fall|drop|decline|slump|down|low|bearish|weak|crash|plunge|loss)/.test(t)) return "bearish";
  return "neutral";
};

const sentimentBadge = (s: "bullish" | "bearish" | "neutral") => {
  const map = {
    bullish: { cls: "bg-success/15 text-success border-success/30", Icon: TrendingUp, label: "Bullish" },
    bearish: { cls: "bg-destructive/15 text-destructive border-destructive/30", Icon: TrendingDown, label: "Bearish" },
    neutral: { cls: "bg-muted text-foreground border-border", Icon: Minus, label: "Neutral" },
  } as const;
  const { cls, Icon, label } = map[s];
  return (
    <Badge variant="outline" className={`gap-1 ${cls}`}>
      <Icon className="w-3 h-3" /> {label}
    </Badge>
  );
};

export const NewsSentimentDigest = () => {
  const { news, isLoading } = useMarketNews();
  const [analysis, setAnalysis] = useState<Analysis[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("market_analysis").select("sentiment, analysis_text, created_at, metal")
        .order("created_at", { ascending: false }).limit(3);
      setAnalysis((data as Analysis[]) ?? []);
    })();
  }, []);

  const digest = useMemo(() => {
    if (news.length === 0) return null;
    const tagged = news.map((n) => ({ ...n, tag: (n.sentiment as "bullish" | "bearish" | "neutral") || tagFor(n.title, "") }));
    const counts = { bullish: 0, bearish: 0, neutral: 0 };
    tagged.forEach((t) => { counts[t.tag] += 1; });
    const overall: "bullish" | "bearish" | "neutral" =
      counts.bullish > counts.bearish ? "bullish" : counts.bearish > counts.bullish ? "bearish" : "neutral";
    return { tagged, counts, overall };
  }, [news]);

  return (
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-card to-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Newspaper className="w-5 h-5 text-primary" />
          News Sentiment & AI Digest
          {digest && <span className="ml-auto">{sentimentBadge(digest.overall)}</span>}
        </CardTitle>
        <p className="text-xs text-muted-foreground">Live market headlines auto-classified plus today's AI verdict.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Digest summary */}
        {analysis.length > 0 && (
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <p className="text-xs font-semibold text-foreground">AI Daily Digest — {analysis[0].metal}</p>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-3">{analysis[0].analysis_text}</p>
          </div>
        )}

        {/* Sentiment summary chips */}
        {digest && (
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded-lg bg-success/10 border border-success/20 text-center">
              <p className="text-[10px] text-muted-foreground">Bullish</p>
              <p className="text-lg font-bold text-success">{digest.counts.bullish}</p>
            </div>
            <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
              <p className="text-[10px] text-muted-foreground">Bearish</p>
              <p className="text-lg font-bold text-destructive">{digest.counts.bearish}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted border border-border text-center">
              <p className="text-[10px] text-muted-foreground">Neutral</p>
              <p className="text-lg font-bold text-foreground">{digest.counts.neutral}</p>
            </div>
          </div>
        )}

        {/* Tagged news feed */}
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {isLoading && <p className="text-xs text-muted-foreground">Loading headlines…</p>}
          {digest?.tagged.slice(0, 8).map((n, i) => (
            <div key={i} className="block p-2 rounded-lg border border-border bg-card">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-foreground line-clamp-2 flex-1">{n.title}</p>
                {sentimentBadge(n.tag)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{n.source} • {n.time}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
