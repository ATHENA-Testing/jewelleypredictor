import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, AlertCircle, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PredictionAnalysis as PredictionAnalysisType } from "@/hooks/usePredictions";

interface PredictionAnalysisProps {
  analysis: PredictionAnalysisType | null;
  isLoading: boolean;
}

export const PredictionAnalysis = ({ analysis, isLoading }: PredictionAnalysisProps) => {
  if (isLoading) {
    return (
      <Card className="p-6 bg-gradient-card border-2 border-border">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-20 w-full mb-4" />
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
    <Card className="p-6 bg-gradient-card border-2 border-border space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">AI Prediction Analysis</h3>
        <div className="flex items-center gap-2">
          {getSentimentIcon()}
          <Badge variant="outline" className={getSentimentColor()}>
            {analysis.sentiment.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Confidence Score */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Confidence Score</span>
          <span className="text-2xl font-bold text-primary">{analysis.confidence_score}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${analysis.confidence_score}%` }}
          />
        </div>
      </div>

      {/* Reasoning */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold text-foreground">Analysis & Reasoning</h4>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {analysis.reasoning}
        </p>
      </div>

      {/* Key Factors */}
      {analysis.key_factors && analysis.key_factors.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Key Factors</h4>
          <div className="flex flex-wrap gap-2">
            {analysis.key_factors.map((factor, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {factor}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Sources */}
      {analysis.sources && analysis.sources.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-border">
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