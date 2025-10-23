import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MarketAnalysisData {
  sentiment: 'bullish' | 'bearish' | 'neutral';
  analysis: string;
  key_factors: string[];
  technical_summary: string;
  economic_impact: string;
  recommendations: string[];
  sources: string[];
}

export const useMarketAnalysis = (metal: string) => {
  const [analysis, setAnalysis] = useState<MarketAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check for recent analysis (within last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recentAnalysis } = await supabase
        .from('market_analysis')
        .select('*')
        .eq('metal', metal)
        .eq('analysis_type', 'comprehensive')
        .gte('created_at', oneHourAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (recentAnalysis) {
        const factors = recentAnalysis.key_factors as any;
        setAnalysis({
          sentiment: recentAnalysis.sentiment as any,
          analysis: recentAnalysis.analysis_text,
          key_factors: factors?.factors || [],
          technical_summary: factors?.technical || '',
          economic_impact: factors?.economic || '',
          recommendations: factors?.recommendations || [],
          sources: recentAnalysis.sources as string[] || []
        });
      } else {
        // Generate new analysis
        const { data, error: functionError } = await supabase.functions.invoke('generate-market-analysis', {
          body: { metal }
        });

        if (functionError) throw functionError;
        setAnalysis(data);
      }
    } catch (err) {
      console.error('Error fetching market analysis:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analysis');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (metal) {
      fetchAnalysis();
    }
  }, [metal]);

  return { analysis, isLoading, error, refetch: fetchAnalysis };
};