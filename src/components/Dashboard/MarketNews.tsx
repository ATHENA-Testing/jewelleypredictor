import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Newspaper, TrendingUp, TrendingDown } from "lucide-react";

interface NewsItem {
  title: string;
  sentiment: "positive" | "negative" | "neutral";
  impact: "high" | "medium" | "low";
  time: string;
  source: string;
}

const MOCK_NEWS: NewsItem[] = [
  {
    title: "Federal Reserve hints at policy changes affecting precious metals",
    sentiment: "positive",
    impact: "high",
    time: "2 hours ago",
    source: "Reuters"
  },
  {
    title: "Gold demand surges in Asian markets amid economic uncertainty",
    sentiment: "positive",
    impact: "high",
    time: "5 hours ago",
    source: "Bloomberg"
  },
  {
    title: "Silver industrial demand shows strong growth in Q4",
    sentiment: "positive",
    impact: "medium",
    time: "8 hours ago",
    source: "Financial Times"
  },
  {
    title: "Central banks continue gold accumulation strategy",
    sentiment: "positive",
    impact: "medium",
    time: "12 hours ago",
    source: "CNBC"
  },
];

export const MarketNews = () => {
  const getSentimentIcon = (sentiment: string) => {
    return sentiment === "positive" ? (
      <TrendingUp className="w-4 h-4 text-success" />
    ) : (
      <TrendingDown className="w-4 h-4 text-danger" />
    );
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "bg-danger/20 text-danger border-danger/30";
      case "medium":
        return "bg-warning/20 text-warning border-warning/30";
      default:
        return "bg-muted/20 text-muted-foreground border-muted/30";
    }
  };

  return (
    <Card className="p-6 bg-gradient-card border-2 border-border">
      <div className="flex items-center gap-2 mb-6">
        <Newspaper className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Market Intelligence</h3>
      </div>

      <div className="space-y-4">
        {MOCK_NEWS.map((news, index) => (
          <div
            key={index}
            className="p-4 bg-background/50 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-start gap-2 flex-1">
                {getSentimentIcon(news.sentiment)}
                <h4 className="text-sm font-medium text-foreground leading-tight">
                  {news.title}
                </h4>
              </div>
              <Badge className={getImpactColor(news.impact)}>
                {news.impact}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground ml-6">
              <span>{news.source}</span>
              <span>•</span>
              <span>{news.time}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/30">
        <p className="text-xs text-primary font-medium">
          💡 AI Sentiment Analysis: Overall market sentiment is <span className="font-bold">Bullish</span> with 75% positive news coverage
        </p>
      </div>
    </Card>
  );
};
