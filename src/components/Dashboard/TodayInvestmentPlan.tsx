import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  Shield,
  Target,
  Clock,
  Star,
  ArrowUpRight,
  Gem,
  BarChart3,
} from "lucide-react";

interface InvestmentPlan {
  metal: string;
  currentPrice: number;
  predictedPrice: number;
  growthPercent: number;
  confidence: number;
  sentiment: string;
  timeframe: string;
  riskLevel: "low" | "medium" | "high";
  reasoning: string;
}

const RISK_CONFIG = {
  low: { color: "text-success", bg: "bg-success/10", label: "Low Risk" },
  medium: { color: "text-warning", bg: "bg-warning/10", label: "Medium Risk" },
  high: { color: "text-destructive", bg: "bg-destructive/10", label: "High Risk" },
};

const METAL_ICONS: Record<string, typeof Gem> = {
  "Gold 24K": Star,
  "Gold 22K": Star,
  Silver: Gem,
  Platinum: Gem,
  Palladium: Gem,
  Diamond: Gem,
};

export const TodayInvestmentPlan = () => {
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const metals = ["Gold 24K", "Gold 22K", "Silver", "Platinum", "Palladium", "Diamond"];

      // Fetch latest prices
      const { data: priceData } = await supabase
        .from("metal_prices_history")
        .select("metal, price_per_gram")
        .order("recorded_at", { ascending: false })
        .limit(20);

      const latestPrices: Record<string, number> = {};
      priceData?.forEach((p) => {
        if (!latestPrices[p.metal]) latestPrices[p.metal] = p.price_per_gram;
      });

      // Fetch predictions (30-90 day outlook)
      const { data: predictions } = await supabase
        .from("metal_predictions")
        .select("*")
        .gte("prediction_date", new Date().toISOString().split("T")[0])
        .order("prediction_date", { ascending: true })
        .limit(100);

      // Fetch market analysis
      const { data: analysis } = await supabase
        .from("market_analysis")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      const investmentPlans: InvestmentPlan[] = metals
        .map((metal) => {
          const currentPrice = latestPrices[metal] || 0;
          if (currentPrice === 0) return null;

          const metalPreds = predictions?.filter((p) => p.metal === metal) || [];
          const metalAnalysis = analysis?.find((a) => a.metal === metal);

          // Get 30-day and 90-day predictions
          const shortTermPred = metalPreds.slice(0, 30);
          const longTermPred = metalPreds.slice(0, 90);

          const avgShortTerm =
            shortTermPred.length > 0
              ? shortTermPred.reduce((s, p) => s + p.predicted_price, 0) / shortTermPred.length
              : currentPrice;
          const avgLongTerm =
            longTermPred.length > 0
              ? longTermPred.reduce((s, p) => s + p.predicted_price, 0) / longTermPred.length
              : currentPrice;

          const predictedPrice = longTermPred.length > 0 ? avgLongTerm : avgShortTerm;
          const growthPercent = ((predictedPrice - currentPrice) / currentPrice) * 100;
          const confidence = metalPreds[0]?.confidence_score
            ? parseFloat(metalPreds[0].confidence_score.toString())
            : 65;

          const sentiment = metalAnalysis?.sentiment || "neutral";

          let riskLevel: "low" | "medium" | "high" = "medium";
          if (Math.abs(growthPercent) < 3 && confidence > 70) riskLevel = "low";
          else if (Math.abs(growthPercent) > 8 || confidence < 60) riskLevel = "high";

          let timeframe = "3-6 months";
          if (growthPercent > 5) timeframe = "1-3 months";
          else if (growthPercent > 2) timeframe = "3-6 months";
          else timeframe = "6-12 months";

          const keyFactors = metalAnalysis?.key_factors as string[] | null;
          const reasoning =
            keyFactors && keyFactors.length > 0
              ? keyFactors[0]
              : sentiment === "bullish"
              ? "Strong upward momentum with positive market indicators"
              : sentiment === "bearish"
              ? "Market correction expected — consider strategic entry points"
              : "Stable outlook — good for portfolio diversification";

          return {
            metal,
            currentPrice,
            predictedPrice,
            growthPercent,
            confidence,
            sentiment,
            timeframe,
            riskLevel,
            reasoning,
          };
        })
        .filter(Boolean) as InvestmentPlan[];

      // Sort by growth potential (highest first)
      investmentPlans.sort((a, b) => b.growthPercent - a.growthPercent);
      setPlans(investmentPlans);
    } catch (err) {
      console.error("Error fetching investment plans:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const topPick = plans[0];
  const otherPlans = plans.slice(1);

  if (isLoading) {
    return (
      <div className="mb-8">
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (!topPick) return null;

  const TopIcon = METAL_ICONS[topPick.metal] || Gem;

  return (
    <div className="mb-8 space-y-4">
      {/* Hero: Top Pick */}
      <Card className="relative overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-card via-card to-primary/5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg md:text-xl">
                🏆 Today's Best Investment Plan
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-xs border-primary/30 text-primary">
              <Clock className="h-3 w-3 mr-1" />
              Updated Today
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Top Pick Card */}
            <div className="md:col-span-5 p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-3">
                <TopIcon className="h-5 w-5 text-gold" />
                <span className="text-lg font-bold text-foreground">{topPick.metal}</span>
                <Badge className="bg-success/20 text-success border-success/30 text-xs">
                  <Star className="h-3 w-3 mr-1" /> #1 Pick
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-muted-foreground">Current Price</span>
                  <span className="text-xl font-bold text-foreground">
                    ₹{topPick.currentPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-muted-foreground">Target Price</span>
                  <span className="text-xl font-bold text-success">
                    ₹{topPick.predictedPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-sm text-muted-foreground">Expected Growth</span>
                  <div className={`flex items-center gap-1 font-bold ${topPick.growthPercent >= 0 ? "text-success" : "text-destructive"}`}>
                    {topPick.growthPercent >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {topPick.growthPercent >= 0 ? "+" : ""}{topPick.growthPercent.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="md:col-span-7 flex flex-col justify-between gap-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-card border border-border text-center">
                  <Shield className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Risk</p>
                  <p className={`text-sm font-semibold ${RISK_CONFIG[topPick.riskLevel].color}`}>
                    {RISK_CONFIG[topPick.riskLevel].label}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border text-center">
                  <BarChart3 className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Confidence</p>
                  <p className="text-sm font-semibold text-primary">{topPick.confidence.toFixed(0)}%</p>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border text-center">
                  <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Horizon</p>
                  <p className="text-sm font-semibold text-foreground">{topPick.timeframe}</p>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-xs text-muted-foreground mb-1 font-medium">AI Insight</p>
                <p className="text-sm text-foreground">{topPick.reasoning}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Other Plans Grid */}
      {otherPlans.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {otherPlans.map((plan) => {
            const Icon = METAL_ICONS[plan.metal] || Gem;
            const risk = RISK_CONFIG[plan.riskLevel];
            return (
              <Card key={plan.metal} className="bg-card border border-border hover:border-primary/30 transition-colors">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">{plan.metal}</span>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${risk.color} ${risk.bg} border-0`}>
                      {risk.label}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">₹{plan.currentPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                    <div className={`flex items-center gap-0.5 text-sm font-bold ${plan.growthPercent >= 0 ? "text-success" : "text-destructive"}`}>
                      {plan.growthPercent >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {plan.growthPercent >= 0 ? "+" : ""}{plan.growthPercent.toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Target: ₹{plan.predictedPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })} • {plan.timeframe}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
