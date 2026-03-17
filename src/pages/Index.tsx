import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MetalPriceCard } from "@/components/Dashboard/MetalPriceCard";
import { TechnicalIndicators } from "@/components/Dashboard/TechnicalIndicators";
import { AlertConfiguration } from "@/components/Dashboard/AlertConfiguration";
import { MarketNews } from "@/components/Dashboard/MarketNews";
import { YearlyPrediction } from "@/components/Dashboard/YearlyPrediction";
import { AIRecommendations } from "@/components/Dashboard/AIRecommendations";
import { CityRatesTable } from "@/components/Dashboard/CityRatesTable";
import { BuySellTimingSuggestions } from "@/components/Dashboard/BuySellTimingSuggestions";
import { RateComparison } from "@/components/Dashboard/RateComparison";
import { HistoricalDataTable } from "@/components/Dashboard/HistoricalDataTable";
import { HistoricalComparisonChart } from "@/components/Dashboard/HistoricalComparisonChart";
import { PredictionTicker } from "@/components/Dashboard/PredictionTicker";
import { TodayInvestmentPlan } from "@/components/Dashboard/TodayInvestmentPlan";
import { SubscriptionGate } from "@/components/Dashboard/SubscriptionGate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, RefreshCw, LogIn, Crown } from "lucide-react";
import { useMetalPrices } from "@/hooks/useMetalPrices";
import { useMarketAnalysis } from "@/hooks/useMarketAnalysis";
import { useAIRecommendations } from "@/hooks/useAIRecommendations";
import { useBuySellSuggestions } from "@/hooks/useBuySellSuggestions";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { MarketAnalysisCard } from "@/components/Dashboard/MarketAnalysisCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const AUTO_SYNC_INTERVAL = 5 * 60 * 1000;

const Index = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { activeSubscription, hasAccess } = useSubscription(user?.id);

  const [selectedMetal, setSelectedMetal] = useState("Gold 24K");
  const { metals, isLoading, error, lastUpdate, refetch } = useMetalPrices();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [nextSyncIn, setNextSyncIn] = useState(AUTO_SYNC_INTERVAL / 1000);

  // Helper: admin has full access, otherwise check subscription
  const canAccess = (feature?: string, metal?: string): boolean => {
    if (isAdmin) return true;
    if (!user) return false;
    return hasAccess(metal, feature);
  };

  const currentPrices: Record<string, number> = {};
  metals.forEach(metal => {
    currentPrices[metal.metal] = metal.pricePerGram;
  });

  const { analysis: marketAnalysis, isLoading: marketLoading, refetch: refetchMarketAnalysis } = useMarketAnalysis(selectedMetal);
  const { recommendations, isLoading: recsLoading, refetch: refetchRecommendations } = useAIRecommendations(currentPrices);
  const { suggestions, isLoading: suggestionsLoading, refetch: refetchSuggestions } = useBuySellSuggestions(currentPrices);

  const syncAllData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      setTimeout(async () => {
        await Promise.all([refetchRecommendations(), refetchSuggestions(), refetchMarketAnalysis()]);
        toast.success("All prices synced across dashboard");
      }, 500);
    } catch {
      toast.error("Failed to sync prices");
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  }, [refetch, refetchRecommendations, refetchSuggestions, refetchMarketAnalysis]);

  useEffect(() => {
    if (!autoSyncEnabled) return;
    const syncInterval = setInterval(() => {
      syncAllData();
      setNextSyncIn(AUTO_SYNC_INTERVAL / 1000);
    }, AUTO_SYNC_INTERVAL);
    const countdownInterval = setInterval(() => {
      setNextSyncIn(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => { clearInterval(syncInterval); clearInterval(countdownInterval); };
  }, [autoSyncEnabled, syncAllData]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, user, navigate]);

  const handleRefresh = async () => {
    await syncAllData();
    setNextSyncIn(AUTO_SYNC_INTERVAL / 1000);
  };

  const toggleAutoSync = () => {
    setAutoSyncEnabled(!autoSyncEnabled);
    toast.info(autoSyncEnabled ? "Auto-sync disabled" : "Auto-sync enabled");
  };

  const basePrices: Record<string, number> = {};
  metals.forEach(metal => { basePrices[metal.metal] = metal.pricePerGram; });

  const formatNextSync = () => {
    const mins = Math.floor(nextSyncIn / 60);
    const secs = nextSyncIn % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (authLoading || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        lastUpdate={lastUpdate}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
      />

      {user && !isAdmin && activeSubscription?.subscription_plans?.name === 'Free Trial' && (
        <div className="bg-success/10 border-b border-success/20 px-4 py-2">
          <div className="container mx-auto flex items-center justify-between">
            <span className="text-sm text-foreground">🎉 You have a 3-day free trial! Expires {new Date(activeSubscription.expires_at).toLocaleDateString()}</span>
            <Button size="sm" onClick={() => navigate("/pricing")} className="bg-gradient-primary">
              <Crown className="w-3 h-3 mr-1" /> View Plans
            </Button>
          </div>
        </div>
      )}

      {user && !isAdmin && !activeSubscription && (
        <div className="bg-warning/10 border-b border-warning/20 px-4 py-2">
          <div className="container mx-auto flex items-center justify-between">
            <span className="text-sm text-foreground">Your free trial has expired. Upgrade for full access.</span>
            <Button size="sm" onClick={() => navigate("/pricing")} className="bg-gradient-primary">
              <Crown className="w-3 h-3 mr-1" /> Upgrade
            </Button>
          </div>
        </div>
      )}

      <PredictionTicker />

      <main className="container mx-auto px-4 py-8">
        {/* Auto-Sync Status Bar */}
        <div className="mb-4 flex items-center justify-between bg-card border border-border rounded-lg px-4 py-2">
          <div className="flex items-center gap-3">
            <RefreshCw className={`h-4 w-4 ${autoSyncEnabled ? 'text-success animate-spin-slow' : 'text-muted-foreground'}`} />
            <span className="text-sm text-muted-foreground">Auto Price Sync:</span>
            <Badge variant={autoSyncEnabled ? "default" : "secondary"} className="cursor-pointer" onClick={toggleAutoSync}>
              {autoSyncEnabled ? 'ON' : 'OFF'}
            </Badge>
          </div>
          {autoSyncEnabled && (
            <span className="text-xs text-muted-foreground">Next sync in: {formatNextSync()}</span>
          )}
        </div>

        {/* Today's Best Investment Plan - Premium */}
        <SubscriptionGate hasAccess={canAccess("investment_plan")} featureName="Investment Plan">
          <TodayInvestmentPlan />
        </SubscriptionGate>

        {/* Market News - Free */}
        <div className="mb-8 mt-8">
          <MarketNews />
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Metal Price Cards - Free (basic view) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} className="h-40 rounded-lg" />))
          ) : (
            metals.map((metal) => (
              <div key={metal.metal} onClick={() => setSelectedMetal(metal.metal)} className="cursor-pointer">
                <MetalPriceCard {...metal} />
              </div>
            ))
          )}
        </div>

        {/* Rate Comparison - Premium */}
        <SubscriptionGate hasAccess={canAccess("market_analysis")} featureName="Rate Comparison">
          <div className="mb-8">
            <RateComparison />
          </div>
        </SubscriptionGate>

        {/* AI Recommendations - Premium */}
        <SubscriptionGate hasAccess={canAccess("ai_recommendations")} featureName="AI Recommendations">
          <div className="mb-8">
            {recsLoading ? (
              <Skeleton className="h-64 rounded-lg" />
            ) : (
              <AIRecommendations recommendations={recommendations} />
            )}
          </div>
        </SubscriptionGate>

        {/* Buy/Sell Timing - Premium */}
        <SubscriptionGate hasAccess={canAccess("buy_sell_timing")} featureName="Buy/Sell Timing">
          <div className="mb-8">
            <BuySellTimingSuggestions suggestions={suggestions} isLoading={suggestionsLoading} />
          </div>
        </SubscriptionGate>

        {/* 365-Day Prediction - Premium */}
        <SubscriptionGate hasAccess={canAccess("predictions")} featureName="365-Day Predictions">
          <div className="mb-8">
            <YearlyPrediction />
          </div>
        </SubscriptionGate>

        {/* City Rates - Premium */}
        <SubscriptionGate hasAccess={canAccess("city_rates")} featureName="City-wise Rates">
          <div className="mb-8">
            <CityRatesTable basePrices={basePrices} isLoading={isLoading} />
          </div>
        </SubscriptionGate>

        {/* Historical Charts - Premium */}
        <SubscriptionGate hasAccess={canAccess("historical_data")} featureName="Historical Charts">
          <div className="mb-8">
            <HistoricalComparisonChart />
          </div>
        </SubscriptionGate>

        <SubscriptionGate hasAccess={canAccess("historical_data")} featureName="Historical Data">
          <div className="mb-8">
            <HistoricalDataTable />
          </div>
        </SubscriptionGate>

        {/* Technical & Alerts Tabs - Premium */}
        <SubscriptionGate hasAccess={canAccess("technical_indicators")} featureName="Technical Analysis">
          <Tabs defaultValue="technical" className="space-y-6">
            <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3 bg-card border border-border">
              <TabsTrigger value="technical">Technical</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
              <TabsTrigger value="tools">Tools</TabsTrigger>
            </TabsList>
            <TabsContent value="technical" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TechnicalIndicators metal={selectedMetal} />
                <MarketAnalysisCard analysis={marketAnalysis} isLoading={marketLoading} onRefresh={refetchMarketAnalysis} />
              </div>
            </TabsContent>
            <TabsContent value="alerts" className="space-y-6">
              <AlertConfiguration />
            </TabsContent>
            <TabsContent value="tools" className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <MarketAnalysisCard analysis={marketAnalysis} isLoading={marketLoading} onRefresh={refetchMarketAnalysis} />
              </div>
            </TabsContent>
          </Tabs>
        </SubscriptionGate>

        {/* Footer */}
        <div className="mt-12 p-6 bg-gradient-card border-2 border-border rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">98.5%</div>
              <p className="text-sm text-muted-foreground">Prediction Accuracy</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-success mb-2">6</div>
              <p className="text-sm text-muted-foreground">Metals & Gems Tracked</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-warning mb-2">24/7</div>
              <p className="text-sm text-muted-foreground">Live Market Data</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
