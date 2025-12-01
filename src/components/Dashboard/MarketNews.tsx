import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

interface NewsItem {
  title: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  impact: 'high' | 'medium' | 'low';
  time: string;
  source: string;
}

const MOCK_NEWS: NewsItem[] = [
  {
    title: "Global gold demand surges as central banks increase reserves amid economic uncertainty",
    sentiment: 'bullish',
    impact: 'high',
    time: '2h ago',
    source: 'Reuters'
  },
  {
    title: "Silver industrial demand rises 15% driven by solar panel manufacturing boom",
    sentiment: 'bullish',
    impact: 'medium',
    time: '4h ago',
    source: 'Bloomberg'
  },
  {
    title: "Federal Reserve signals potential rate cuts impacting precious metal valuations",
    sentiment: 'bullish',
    impact: 'high',
    time: '5h ago',
    source: 'Financial Times'
  },
  {
    title: "Platinum supply constraints from South African mines push prices higher",
    sentiment: 'bullish',
    impact: 'medium',
    time: '7h ago',
    source: 'Mining Weekly'
  },
  {
    title: "Indian wedding season expected to boost gold purchases by 20%",
    sentiment: 'bullish',
    impact: 'high',
    time: '8h ago',
    source: 'Economic Times'
  },
  {
    title: "Geopolitical tensions drive safe-haven demand for precious metals",
    sentiment: 'bullish',
    impact: 'high',
    time: '10h ago',
    source: 'CNBC'
  }
];

export const MarketNews = () => {
  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return <TrendingUp className="w-4 h-4 text-success" />;
      case 'bearish':
        return <TrendingDown className="w-4 h-4 text-destructive" />;
      default:
        return <AlertCircle className="w-4 h-4 text-warning" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium':
        return 'bg-warning/10 text-warning border-warning/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Card className="p-6 bg-gradient-card border-2 border-border overflow-hidden">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Market Intelligence</h3>
        <p className="text-sm text-muted-foreground">Latest news & factors influencing metal costs</p>
      </div>

      <div className="relative overflow-hidden">
        {/* Scrolling container */}
        <div className="flex gap-4 animate-scroll-news">
          {/* Duplicate items for seamless loop */}
          {[...MOCK_NEWS, ...MOCK_NEWS].map((news, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-[400px] p-4 bg-background/50 rounded-lg border border-border hover:border-primary/50 transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  {getSentimentIcon(news.sentiment)}
                  <Badge variant="outline" className={getImpactColor(news.impact)}>
                    {news.impact.toUpperCase()}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{news.time}</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed mb-2">
                {news.title}
              </p>
              <p className="text-xs text-muted-foreground">Source: {news.source}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            AI Sentiment Analysis: <span className="text-success font-semibold">Bullish (78%)</span>
          </span>
          <span className="text-muted-foreground">Updated in real-time</span>
        </div>
      </div>
    </Card>
  );
};