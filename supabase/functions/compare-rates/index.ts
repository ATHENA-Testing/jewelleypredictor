import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SourceRate {
  source: string;
  gold24k: number | null;
  gold22k: number | null;
  silver: number | null;
  fetchedAt: string;
  status: 'success' | 'failed' | 'partial';
}

// Fetch from LiveChennai directly
async function fetchLiveChennai(): Promise<SourceRate> {
  const result: SourceRate = { source: 'LiveChennai.com', gold24k: null, gold22k: null, silver: null, fetchedAt: new Date().toISOString(), status: 'failed' };
  try {
    const response = await fetch('https://www.livechennai.com/gold_silverrate_hyderabad.asp', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      }
    });
    if (!response.ok) return result;
    const html = await response.text();

    // Table pattern: date | 24K | 22K
    const tableMatch = html.match(/<td>\s*(\d{1,2}\/\w+\/\d{4})\s*<\/td>\s*<td>\s*([\d,.]+)\s*<\/td>\s*<td>\s*([\d,.]+)\s*<\/td>/i);
    if (tableMatch) {
      result.gold24k = Math.round(parseFloat(tableMatch[2].replace(/,/g, '')));
      result.gold22k = Math.round(parseFloat(tableMatch[3].replace(/,/g, '')));
    }

    // Summary pattern for silver
    const summaryMatch = html.match(/(\d{1,2}\/\w+\/\d{4})[^|]*\|\s*([\d,]+)\s*\([^)]*\)\s*\|\s*([\d.]+)/);
    if (summaryMatch) {
      if (!result.gold22k) result.gold22k = parseInt(summaryMatch[2].replace(/,/g, ''));
      result.silver = Math.round(parseFloat(summaryMatch[3]));
    }

    // Calculate 24K from 22K if needed
    if (!result.gold24k && result.gold22k) {
      result.gold24k = Math.round(result.gold22k / 0.9167);
    }

    result.status = (result.gold24k && result.gold22k) ? 'success' : result.gold24k || result.gold22k ? 'partial' : 'failed';
  } catch (e) {
    console.error('LiveChennai error:', e);
  }
  return result;
}

// Fetch from GoodReturns via Firecrawl
async function fetchGoodReturns(): Promise<SourceRate> {
  const result: SourceRate = { source: 'GoodReturns.in', gold24k: null, gold22k: null, silver: null, fetchedAt: new Date().toISOString(), status: 'failed' };
  try {
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) return result;

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://www.goodreturns.in/gold-rates/hyderabad.html', formats: ['markdown'], onlyMainContent: true, waitFor: 2000 }),
    });
    if (!response.ok) return result;

    const data = await response.json();
    const md = data.data?.markdown || data.markdown || '';

    const g24 = md.match(/24K\s*Gold\s*\/g[\s\S]*?₹\s*([\d,]+)/i);
    const g22 = md.match(/22K\s*Gold\s*\/g[\s\S]*?₹\s*([\d,]+)/i);
    if (g24) result.gold24k = parseInt(g24[1].replace(/,/g, ''));
    if (g22) result.gold22k = parseInt(g22[1].replace(/,/g, ''));

    // Fetch silver
    const silverResp = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://www.goodreturns.in/silver-rates/hyderabad.html', formats: ['markdown'], onlyMainContent: true, waitFor: 2000 }),
    });
    if (silverResp.ok) {
      const sData = await silverResp.json();
      const sMd = sData.data?.markdown || sData.markdown || '';
      const sMatch = sMd.match(/Silver\s*\/g[\s\S]*?₹\s*([\d,]+)/i) || sMd.match(/₹\s*([\d,]+)\s*per\s*gram/i);
      if (sMatch) result.silver = parseInt(sMatch[1].replace(/,/g, ''));
    }

    result.status = (result.gold24k && result.gold22k) ? 'success' : result.gold24k || result.gold22k ? 'partial' : 'failed';
  } catch (e) {
    console.error('GoodReturns error:', e);
  }
  return result;
}

// Fetch manual/database rates
async function fetchDatabaseRates(): Promise<SourceRate> {
  const result: SourceRate = { source: 'Database (Manual)', gold24k: null, gold22k: null, silver: null, fetchedAt: new Date().toISOString(), status: 'failed' };
  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { data, error } = await supabaseClient.from('manual_market_rates').select('metal, price_per_gram, updated_at');
    if (error || !data) return result;

    data.forEach((r: any) => {
      if (r.metal === 'Gold 24K') result.gold24k = Number(r.price_per_gram);
      else if (r.metal === 'Gold 22K') result.gold22k = Number(r.price_per_gram);
      else if (r.metal === 'Silver') result.silver = Number(r.price_per_gram);
    });
    result.fetchedAt = data[0]?.updated_at || result.fetchedAt;
    result.status = (result.gold24k && result.gold22k) ? 'success' : 'partial';
  } catch (e) {
    console.error('Database error:', e);
  }
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Fetch all sources in parallel
    const [livechennai, goodreturns, database] = await Promise.all([
      fetchLiveChennai(),
      fetchGoodReturns(),
      fetchDatabaseRates(),
    ]);

    const sources = [livechennai, goodreturns, database];

    // Calculate consensus / verification
    const successSources = sources.filter(s => s.status === 'success');
    const gold22kValues = successSources.map(s => s.gold22k).filter(Boolean) as number[];
    const gold24kValues = successSources.map(s => s.gold24k).filter(Boolean) as number[];

    let verified = false;
    let maxDiff22k = 0;
    if (gold22kValues.length >= 2) {
      maxDiff22k = Math.max(...gold22kValues) - Math.min(...gold22kValues);
      verified = maxDiff22k <= 100; // Within ₹100 = verified
    }

    return new Response(JSON.stringify({
      success: true,
      sources,
      verification: {
        verified,
        sourcesChecked: sources.length,
        sourcesAvailable: successSources.length,
        maxDifference22k: maxDiff22k,
        consensusNote: verified
          ? `Rates verified across ${successSources.length} sources (within ₹${maxDiff22k} difference)`
          : successSources.length < 2
            ? 'Insufficient sources for verification'
            : `Rates differ by ₹${maxDiff22k} across sources`,
      },
      fetchedAt: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in compare-rates:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
