import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MarketAnalysisData } from "@/hooks/useMarketAnalysis";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface MarketAnalysisCardProps {
  analysis: MarketAnalysisData | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const MarketAnalysisCard = ({ analysis, isLoading, onRefresh }: MarketAnalysisCardProps) => {
  if (isLoading) {
    return (
      <Card className="p-6 bg-gradient-card border-2 border-border">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-32 w-full" />
      </Card>
    );
  }

  if (!analysis) return null;

  const getSentimentIcon = () => {
    switch (analysis.sentiment) {
      case 'bullish':
        return <TrendingUp className="w-5 h-5 text-success" />;
      case 'bearish':
        return <TrendingDown className="w-5 h-5 text-destructive" />;
      default:
        return <Minus className="w-5 h-5 text-warning" />;
    }
  };

  const getSentimentColor = () => {
    switch (analysis.sentiment) {
      case 'bullish':
        return 'bg-success/10 text-success border-success/20';
      case 'bearish':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-warning/10 text-warning border-warning/20';
    }
  };

  return (
    <Card className="p-6 bg-gradient-card border-2 border-border space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-foreground">Market Analysis</h3>
          <Badge variant="outline" className={getSentimentColor()}>
            {getSentimentIcon()}
            <span className="ml-1">{analysis.sentiment.toUpperCase()}</span>
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        {analysis.analysis}
      </p>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="factors">
          <AccordionTrigger className="text-sm font-semibold">Key Market Factors</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {analysis.key_factors.map((factor, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                  <span className="text-sm text-muted-foreground">{factor}</span>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="technical">
          <AccordionTrigger className="text-sm font-semibold">Technical Analysis</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-muted-foreground">{analysis.technical_summary}</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="economic">
          <AccordionTrigger className="text-sm font-semibold">Economic Impact</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-muted-foreground">{analysis.economic_impact}</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="recommendations">
          <AccordionTrigger className="text-sm font-semibold">Recommendations</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {analysis.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-success mt-2" />
                  <span className="text-sm text-muted-foreground">{rec}</span>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {analysis.sources && analysis.sources.length > 0 && (
        <div className="pt-4 border-t border-border space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Sources</h4>
          <div className="space-y-1">
            {analysis.sources.map((source, index) => (
              <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                <ExternalLink className="w-3 h-3" />
                <span>{source}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};