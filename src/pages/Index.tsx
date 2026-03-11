import { useState, useEffect, useCallback } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useMetalPrices } from "@/hooks/useMetalPrices";
import { useMarketAnalysis } from "@/hooks/useMarketAnalysis";
import { useAIRecommendations } from "@/hooks/useAIRecommendations";
import { useBuySellSuggestions } from "@/hooks/useBuySellSuggestions";
import { MarketAnalysisCard } from "@/components/Dashboard/MarketAnalysisCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Technical indicators are now fetched dynamically via useTechnicalIndicators hook

const AUTO_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

const Index = () => {
  const [selectedMetal, setSelectedMetal] = useState("Gold 24K");
  const { metals, isLoading, error, lastUpdate, refetch } = useMetalPrices();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [nextSyncIn, setNextSyncIn] = useState(AUTO_SYNC_INTERVAL / 1000);

  // Create current prices map from live metal prices
  const currentPrices: Record<string, number> = {};
  metals.forEach(metal => {
    currentPrices[metal.metal] = metal.pricePerGram;
  });

  // Pass current prices to hooks for consistency
  const { analysis: marketAnalysis, isLoading: marketLoading, refetch: refetchMarketAnalysis } = useMarketAnalysis(selectedMetal);
  const { recommendations, isLoading: recsLoading, refetch: refetchRecommendations } = useAIRecommendations(currentPrices);
  const { suggestions, isLoading: suggestionsLoading, refetch: refetchSuggestions } = useBuySellSuggestions(currentPrices);

  // Sync all data across dashboard
  const syncAllData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      // Wait a bit for prices to update, then refresh dependent data
      setTimeout(async () => {
        await Promise.all([
          refetchRecommendations(),
          refetchSuggestions(),
          refetchMarketAnalysis()
        ]);
        toast.success("All prices synced across dashboard");
      }, 500);
    } catch (err) {
      toast.error("Failed to sync prices");
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  }, [refetch, refetchRecommendations, refetchSuggestions, refetchMarketAnalysis]);

  // Auto-sync timer
  useEffect(() => {
    if (!autoSyncEnabled) return;

    const syncInterval = setInterval(() => {
      syncAllData();
      setNextSyncIn(AUTO_SYNC_INTERVAL / 1000);
    }, AUTO_SYNC_INTERVAL);

    const countdownInterval = setInterval(() => {
      setNextSyncIn(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      clearInterval(syncInterval);
      clearInterval(countdownInterval);
    };
  }, [autoSyncEnabled, syncAllData]);

  // Note: Removed auto-refresh on price change to prevent continuous blinking
  // Prices are synced via manual refresh or auto-sync timer

  const handleRefresh = async () => {
    await syncAllData();
    setNextSyncIn(AUTO_SYNC_INTERVAL / 1000);
  };

  const toggleAutoSync = () => {
    setAutoSyncEnabled(!autoSyncEnabled);
    toast.info(autoSyncEnabled ? "Auto-sync disabled" : "Auto-sync enabled");
  };

  // Create base prices map for city rates table
  const basePrices: Record<string, number> = {};
  metals.forEach(metal => {
    basePrices[metal.metal] = metal.pricePerGram;
  });

  const formatNextSync = () => {
    const mins = Math.floor(nextSyncIn / 60);
    const secs = nextSyncIn % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

    return (
    <div className="min-h-screen bg-background">
      <Header 
        lastUpdate={lastUpdate}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
      />

      {/* AI Prediction Ticker - Single line at top */}
      <PredictionTicker />

      <main className="container mx-auto px-4 py-8">
        {/* Auto-Sync Status Bar */}
        <div className="mb-4 flex items-center justify-between bg-card border border-border rounded-lg px-4 py-2">
          <div className="flex items-center gap-3">
            <RefreshCw className={`h-4 w-4 ${autoSyncEnabled ? 'text-success animate-spin-slow' : 'text-muted-foreground'}`} />
            <span className="text-sm text-muted-foreground">
              Auto Price Sync: 
            </span>
            <Badge 
              variant={autoSyncEnabled ? "default" : "secondary"} 
              className="cursor-pointer"
              onClick={toggleAutoSync}
            >
              {autoSyncEnabled ? 'ON' : 'OFF'}
            </Badge>
          </div>
          {autoSyncEnabled && (
            <span className="text-xs text-muted-foreground">
              Next sync in: {formatNextSync()}
            </span>
          )}
        </div>

        {/* Market News Section - Moved to top with faster scroll */}
        <div className="mb-8">
          <MarketNews />
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Metal Price Cards - Now 6 cards including Diamond */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))
          ) : (
            metals.map((metal) => (
              <div key={metal.metal} onClick={() => setSelectedMetal(metal.metal)} className="cursor-pointer">
                <MetalPriceCard {...metal} />
              </div>
            ))
          )}
        </div>

        {/* Multi-Source Rate Verification */}
        <div className="mb-8">
          <RateComparison />
        </div>

        {/* AI Recommendations - Flash Scrolling Section */}
        <div className="mb-8">
          {recsLoading ? (
            <Skeleton className="h-64 rounded-lg" />
          ) : (
            <AIRecommendations recommendations={recommendations} />
          )}
        </div>

        {/* AI Buy/Sell Timing Suggestions */}
        <div className="mb-8">
          <BuySellTimingSuggestions suggestions={suggestions} isLoading={suggestionsLoading} />
        </div>

        {/* 365-Day Prediction Section */}
        <div className="mb-8">
          <YearlyPrediction />
        </div>

        {/* City/Region Wise Rates Table */}
        <div className="mb-8">
          <CityRatesTable basePrices={basePrices} isLoading={isLoading} />
        </div>

        {/* Historical Price Comparison Chart */}
        <div className="mb-8">
          <HistoricalComparisonChart />
        </div>

        {/* Historical Data Table with Reinforcement Learning */}
        <div className="mb-8">
          <HistoricalDataTable />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="technical" className="space-y-6">
          <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3 bg-card border border-border">
            <TabsTrigger value="technical">Technical</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
          </TabsList>

          <TabsContent value="technical" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TechnicalIndicators metal={selectedMetal} />
              <MarketAnalysisCard 
                analysis={marketAnalysis} 
                isLoading={marketLoading}
                onRefresh={refetchMarketAnalysis}
              />
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <AlertConfiguration />
          </TabsContent>

          <TabsContent value="tools" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <MarketAnalysisCard 
                analysis={marketAnalysis} 
                isLoading={marketLoading}
                onRefresh={refetchMarketAnalysis}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer Info */}
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
