import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface NewsItem {
  title: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  impact: 'high' | 'medium' | 'low';
  time: string;
  source: string;
  metal: string;
}

export const useMarketNews = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch latest market analysis entries
      const { data, error: fetchError } = await supabase
        .from('market_analysis')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        const newsItems: NewsItem[] = data.map((item) => {
          // Extract key factors as news headlines
          const keyFactors = Array.isArray(item.key_factors) 
            ? item.key_factors as string[]
            : [];
          
          // Create news item from analysis
          const title = keyFactors.length > 0 
            ? keyFactors[0] as string
            : item.analysis_text?.substring(0, 100) || `${item.metal} market update`;
          
          // Calculate time ago
          const createdAt = new Date(item.created_at);
          const now = new Date();
          const diffHours = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
          const timeAgo = diffHours < 1 ? 'Just now' : `${diffHours}h ago`;

          // Determine impact based on sentiment strength
          let impact: 'high' | 'medium' | 'low' = 'medium';
          if (item.sentiment === 'bullish' || item.sentiment === 'bearish') {
            impact = 'high';
          }

          return {
            title,
            sentiment: (item.sentiment as 'bullish' | 'bearish' | 'neutral') || 'neutral',
            impact,
            time: timeAgo,
            source: `AI Analysis - ${item.metal}`,
            metal: item.metal
          };
        });

        // Also add additional news from key_factors
        const additionalNews: NewsItem[] = [];
        data.forEach((item) => {
          const keyFactors = Array.isArray(item.key_factors) 
            ? item.key_factors as string[]
            : [];
          
          keyFactors.slice(1, 3).forEach((factor, idx) => {
            const createdAt = new Date(item.created_at);
            const now = new Date();
            const diffHours = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)) + idx;
            
            additionalNews.push({
              title: factor as string,
              sentiment: (item.sentiment as 'bullish' | 'bearish' | 'neutral') || 'neutral',
              impact: 'medium',
              time: `${diffHours}h ago`,
              source: `Market Analysis - ${item.metal}`,
              metal: item.metal
            });
          });
        });

        setNews([...newsItems, ...additionalNews].slice(0, 12));
      }
    } catch (err) {
      console.error('Error fetching market news:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch news');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  return { news, isLoading, error, refetch: fetchNews };
};
