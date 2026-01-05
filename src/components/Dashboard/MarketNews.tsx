import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertCircle, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarketNews } from "@/hooks/useMarketNews";
import { Button } from "@/components/ui/button";

export const MarketNews = () => {
  const { news, isLoading, error, refetch } = useMarketNews();

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

  // Calculate overall sentiment
  const bullishCount = news.filter(n => n.sentiment === 'bullish').length;
  const bearishCount = news.filter(n => n.sentiment === 'bearish').length;
  const overallSentiment = bullishCount > bearishCount ? 'Bullish' : 
                           bearishCount > bullishCount ? 'Bearish' : 'Neutral';
  const sentimentPercent = news.length > 0 
    ? Math.round((Math.max(bullishCount, bearishCount) / news.length) * 100)
    : 50;

  if (isLoading) {
    return (
      <Card className="p-6 bg-gradient-card border-2 border-border">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="flex-shrink-0 w-[400px] h-32 rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  const displayNews = news.length > 0 ? news : [
    { title: "Loading latest market intelligence...", sentiment: 'neutral' as const, impact: 'medium' as const, time: 'Now', source: 'System', metal: 'All' }
  ];

  return (
    <Card className="p-6 bg-gradient-card border-2 border-border overflow-hidden">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Market Intelligence</h3>
          <p className="text-sm text-muted-foreground">Live AI-analyzed factors influencing metal prices</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="relative overflow-hidden">
        {/* Scrolling container */}
        <div className="flex gap-4 animate-scroll-news">
          {/* Duplicate items for seamless loop */}
          {[...displayNews, ...displayNews].map((newsItem, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-[400px] p-4 bg-background/50 rounded-lg border border-border hover:border-primary/50 transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  {getSentimentIcon(newsItem.sentiment)}
                  <Badge variant="outline" className={getImpactColor(newsItem.impact)}>
                    {newsItem.impact.toUpperCase()}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {newsItem.metal}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{newsItem.time}</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed mb-2 line-clamp-2">
                {newsItem.title}
              </p>
              <p className="text-xs text-muted-foreground">Source: {newsItem.source}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            AI Sentiment Analysis: <span className={`font-semibold ${overallSentiment === 'Bullish' ? 'text-success' : overallSentiment === 'Bearish' ? 'text-destructive' : 'text-warning'}`}>
              {overallSentiment} ({sentimentPercent}%)
            </span>
          </span>
          <span className="text-muted-foreground">
            {news.length > 0 ? `${news.length} insights • Auto-refreshed` : 'Loading...'}
          </span>
        </div>
      </div>
    </Card>
  );
};
