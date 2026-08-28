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
import { AIAssistantChat } from "@/components/Dashboard/AIAssistantChat";
import { PortfolioTracker } from "@/components/Dashboard/PortfolioTracker";
import { FestivalPlanner } from "@/components/Dashboard/FestivalPlanner";
import { GoldCalculators } from "@/components/Dashboard/GoldCalculators";
import { ShareToEarn } from "@/components/Dashboard/ShareToEarn";
import { DailyStreak } from "@/components/Dashboard/DailyStreak";
import { GoalPlanner } from "@/components/Dashboard/GoalPlanner";
import { WhatsAppDigest } from "@/components/Dashboard/WhatsAppDigest";
import { PriceAlertsCenter } from "@/components/Dashboard/PriceAlertsCenter";
import { WatchlistFavorites } from "@/components/Dashboard/WatchlistFavorites";
import { NewsSentimentDigest } from "@/components/Dashboard/NewsSentimentDigest";
import { SubscriptionGate } from "@/components/Dashboard/SubscriptionGate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, RefreshCw, Crown, TrendingUp, Brain, Zap, Target, Sparkles, ShieldCheck, LayoutDashboard, LineChart, Globe2, Briefcase, Calculator, Gift } from "lucide-react";

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

const SECTIONS = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "ai", label: "AI Expert", icon: Brain },
  { value: "predictions", label: "Predictions", icon: LineChart },
  { value: "markets", label: "Markets", icon: Globe2 },
  { value: "portfolio", label: "Portfolio", icon: Briefcase },
  { value: "tools", label: "Tools", icon: Calculator },
  { value: "rewards", label: "Rewards", icon: Gift },
];


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
        {/* Welcome / Value strip */}
        <Card className="mb-6 border-border bg-gradient-to-br from-primary/5 via-card to-warning/5 overflow-hidden">
          <CardContent className="p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="p-2.5 bg-gradient-primary rounded-lg shrink-0">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-bold text-foreground truncate">
                      Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""} 👋
                    </h2>
                    {user && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          const { supabase } = await import("@/integrations/supabase/client");
                          await supabase.auth.signOut();
                          toast.success("Signed out");
                          navigate("/auth");
                        }}
                        className="shrink-0 h-8 px-2 text-muted-foreground hover:text-foreground"
                        title="Sign out"
                      >
                        <span className="text-xs">Sign out</span>
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your AI-powered jewellery market intelligence — live prices, predictions & smart trade signals.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:flex md:items-center gap-3 shrink-0">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 border border-success/20">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <div>
                    <p className="text-[10px] text-muted-foreground leading-none">Accuracy</p>
                    <p className="text-sm font-bold text-success">98.5%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                  <Brain className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-[10px] text-muted-foreground leading-none">AI Signals</p>
                    <p className="text-sm font-bold text-primary">Live</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/20">
                  <Target className="w-4 h-4 text-warning" />
                  <div>
                    <p className="text-[10px] text-muted-foreground leading-none">Forecast</p>
                    <p className="text-sm font-bold text-warning">365d</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border border-border">
                  <ShieldCheck className="w-4 h-4 text-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground leading-none">Metals</p>
                    <p className="text-sm font-bold text-foreground">{metals.length || 6}</p>
                  </div>
                </div>
              </div>
            </div>
            {!isAdmin && !activeSubscription && (
              <div className="mt-4 flex items-center justify-between gap-3 p-3 rounded-lg bg-warning/10 border border-warning/30">
                <div className="flex items-center gap-2 min-w-0">
                  <Zap className="w-4 h-4 text-warning shrink-0" />
                  <p className="text-xs text-foreground truncate">
                    Unlock AI Recommendations, Predictions & Trade Signals
                  </p>
                </div>
                <Button size="sm" onClick={() => navigate("/pricing")} className="bg-gradient-primary shrink-0">
                  <Crown className="w-3.5 h-3.5 mr-1" /> Upgrade
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

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

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 1. Metal Price Cards - Free (most important, first thing users see) */}
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

        {/* Section navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="-mx-4 px-4 overflow-x-auto pb-1">
            <TabsList className="inline-flex w-max bg-card border border-border">
              {SECTIONS.map((s) => (
                <TabsTrigger key={s.value} value={s.value} className="gap-1.5 whitespace-nowrap">
                  <s.icon className="w-3.5 h-3.5" />
                  {s.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-8">
            <DailyStreak />
            <NewsSentimentDigest />
            <SubscriptionGate hasAccess={canAccess("investment_plan")} featureName="Investment Plan">
              <TodayInvestmentPlan />
            </SubscriptionGate>
            <MarketNews />
          </TabsContent>

          {/* AI EXPERT */}
          <TabsContent value="ai" className="space-y-8">
            {(() => {
              const planName = activeSubscription?.subscription_plans?.name;
              const isPremium = isAdmin || (!!activeSubscription && planName !== "Free Trial");
              return (
                <SubscriptionGate hasAccess={isPremium} featureName="AI Metal Market Expert (Premium)">
                  <AIAssistantChat />
                </SubscriptionGate>
              );
            })()}
            <SubscriptionGate hasAccess={canAccess("ai_recommendations")} featureName="AI Recommendations">
              {recsLoading ? <Skeleton className="h-64 rounded-lg" /> : <AIRecommendations recommendations={recommendations} />}
            </SubscriptionGate>
            <SubscriptionGate hasAccess={canAccess("buy_sell_timing")} featureName="Buy/Sell Timing">
              <BuySellTimingSuggestions suggestions={suggestions} isLoading={suggestionsLoading} />
            </SubscriptionGate>
          </TabsContent>

          {/* PREDICTIONS */}
          <TabsContent value="predictions" className="space-y-8">
            <SubscriptionGate hasAccess={canAccess("predictions")} featureName="365-Day Predictions">
              <YearlyPrediction />
            </SubscriptionGate>
            <SubscriptionGate hasAccess={canAccess("technical_indicators")} featureName="Technical Analysis">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TechnicalIndicators metal={selectedMetal} />
                <MarketAnalysisCard analysis={marketAnalysis} isLoading={marketLoading} onRefresh={refetchMarketAnalysis} />
              </div>
            </SubscriptionGate>
            <SubscriptionGate hasAccess={canAccess("historical_data")} featureName="Historical Charts">
              <HistoricalComparisonChart />
            </SubscriptionGate>
            <SubscriptionGate hasAccess={canAccess("historical_data")} featureName="Historical Data">
              <HistoricalDataTable />
            </SubscriptionGate>
          </TabsContent>

          {/* MARKETS */}
          <TabsContent value="markets" className="space-y-8">
            <SubscriptionGate hasAccess={canAccess("market_analysis")} featureName="Rate Comparison">
              <RateComparison />
            </SubscriptionGate>
            <SubscriptionGate hasAccess={canAccess("city_rates")} featureName="City-wise Rates">
              <CityRatesTable basePrices={basePrices} isLoading={isLoading} />
            </SubscriptionGate>
          </TabsContent>

          {/* PORTFOLIO */}
          <TabsContent value="portfolio" className="space-y-8">
            <PortfolioTracker />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <WatchlistFavorites />
              <PriceAlertsCenter />
            </div>
            <GoalPlanner />
            <SubscriptionGate hasAccess={canAccess("technical_indicators")} featureName="Alert Configuration">
              <AlertConfiguration />
            </SubscriptionGate>
          </TabsContent>

          {/* TOOLS */}
          <TabsContent value="tools" className="space-y-8">
            <GoldCalculators />
            <FestivalPlanner />
          </TabsContent>

          {/* REWARDS */}
          <TabsContent value="rewards" className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ShareToEarn />
              <WhatsAppDigest />
            </div>
          </TabsContent>
        </Tabs>


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
