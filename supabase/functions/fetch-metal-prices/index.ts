import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TROY_OZ_TO_GRAMS = 31.1035;

interface MetalPrice {
  metal: string;
  symbol: string;
  price: number;
  pricePerGram: number;
  change: number;
  changePercent: number;
  unit: string;
  timestamp: number;
  location: string;
}

interface ManualRate {
  metal: string;
  price_per_gram: number;
}

// Fetch admin-set manual rates from database
async function fetchManualRates(): Promise<Record<string, number> | null> {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabaseClient
      .from('manual_market_rates')
      .select('metal, price_per_gram');

    if (error) {
      console.error('Error fetching manual rates:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.log('No manual rates found in database');
      return null;
    }

    const rates: Record<string, number> = {};
    data.forEach((rate: ManualRate) => {
      if (rate.metal === 'Gold 24K') rates.GOLD_24K = rate.price_per_gram;
      else if (rate.metal === 'Gold 22K') rates.GOLD_22K = rate.price_per_gram;
      else if (rate.metal === 'Silver') rates.SILVER = rate.price_per_gram;
      else if (rate.metal === 'Platinum') rates.PLATINUM = rate.price_per_gram;
      else if (rate.metal === 'Palladium') rates.PALLADIUM = rate.price_per_gram;
      else if (rate.metal === 'Diamond') rates.DIAMOND = rate.price_per_gram;
    });

    console.log('Manual rates from database:', JSON.stringify(rates));
    return rates;
  } catch (error) {
    console.error('Error in fetchManualRates:', error);
    return null;
  }
}

// PRIORITY 1: Fetch from LiveChennai - Most accurate real-time Hyderabad rates
async function fetchFromLiveChennai(): Promise<Record<string, number> | null> {
  try {
    console.log('Fetching live rates from LiveChennai (Hyderabad)...');
    
    const response = await fetch('https://www.livechennai.com/gold_silverrate_hyderabad.asp', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
    
    if (!response.ok) {
      console.error('LiveChennai fetch failed:', response.status);
      return null;
    }
    
    const html = await response.text();
    console.log('LiveChennai HTML length:', html.length);
    
    let gold24k: number | null = null;
    let gold22k: number | null = null;
    let silver: number | null = null;
    
    // Pattern 1: Look for the summary table "1 Gm (22 K)" - Format: | 12/Jan/2026 | 13,030 (155 ) | 287.00 (12.00 ) |
    // This is the most reliable pattern in HTML
    const summaryPattern = /(\d{1,2}\/\w+\/\d{4})[^|]*\|\s*([\d,]+)\s*\([^)]*\)\s*\|\s*([\d.]+)/;
    const summaryMatch = html.match(summaryPattern);
    if (summaryMatch) {
      gold22k = parseInt(summaryMatch[2].replace(/,/g, ''));
      silver = Math.round(parseFloat(summaryMatch[3]));
      console.log('LiveChennai summary matched - Date:', summaryMatch[1], '22K:', gold22k, 'Silver:', silver);
    }
    
    // Pattern 2: Look for the detailed gold rate table
    // Format in HTML: <td>12/January/2026</td><td>14215.00</td><td>13030.00</td>
    const tablePattern = /<td>\s*(\d{1,2}\/\w+\/\d{4})\s*<\/td>\s*<td>\s*([\d,.]+)\s*<\/td>\s*<td>\s*([\d,.]+)\s*<\/td>/i;
    const tableMatch = html.match(tablePattern);
    if (tableMatch) {
      gold24k = Math.round(parseFloat(tableMatch[2].replace(/,/g, '')));
      const gold22kTable = Math.round(parseFloat(tableMatch[3].replace(/,/g, '')));
      // Only use if gold22k not already found or if this looks more accurate
      if (!gold22k || Math.abs(gold22k - gold22kTable) < 100) {
        gold22k = gold22kTable;
      }
      console.log('LiveChennai table matched - Date:', tableMatch[1], '24K:', gold24k, '22K:', gold22kTable);
    }
    
    // Pattern 3: Look for "Pure Gold (24 k)" header followed by "Standard Gold (22 K)"
    // Then find the first data row
    const pureGoldIdx = html.indexOf('Pure Gold');
    if (pureGoldIdx > 0) {
      const afterPureGold = html.substring(pureGoldIdx);
      // Find the first row of actual data (date followed by prices)
      const rowMatch = afterPureGold.match(/<tr[^>]*>\s*<td>\s*(\d{1,2}\/\w+\/\d{4})\s*<\/td>\s*<td>\s*([\d,.]+)\s*<\/td>\s*<td>\s*([\d,.]+)\s*<\/td>/i);
      if (rowMatch) {
        const extracted24k = Math.round(parseFloat(rowMatch[2].replace(/,/g, '')));
        const extracted22k = Math.round(parseFloat(rowMatch[3].replace(/,/g, '')));
        if (!gold24k && extracted24k >= 10000 && extracted24k <= 20000) {
          gold24k = extracted24k;
        }
        if (!gold22k && extracted22k >= 10000 && extracted22k <= 18000) {
          gold22k = extracted22k;
        }
        console.log('LiveChennai row match - 24K:', extracted24k, '22K:', extracted22k);
      }
    }
    
    // Pattern 4: Fallback - look for specific patterns in text
    // "13,030" format for 22K gold rate
    if (!gold22k) {
      const gold22kTextMatch = html.match(/1\s*Gm\s*\(22\s*K\)[^<]*<\/th>[^<]*<\/tr>[^<]*<tr[^>]*>[^<]*<td[^>]*>[^<]*<\/td>[^<]*<td[^>]*>\s*([\d,]+)/i);
      if (gold22kTextMatch) {
        gold22k = parseInt(gold22kTextMatch[1].replace(/,/g, ''));
        console.log('LiveChennai 22K text match:', gold22k);
      }
    }
    
    // Calculate 24K from 22K if not found (22K is 91.67% purity of 24K)
    if (!gold24k && gold22k && gold22k >= 10000) {
      gold24k = Math.round(gold22k / 0.9167);
      console.log('Calculated 24K from 22K:', gold24k);
    }
    
    // Validate rates
    if (!gold24k || !gold22k || gold24k < 10000 || gold24k > 20000 || gold22k < 10000 || gold22k > 18000) {
      console.log('Invalid LiveChennai gold rates - 24K:', gold24k, '22K:', gold22k);
      return null;
    }
    
    // Validate relationship: 22K should be approximately 91.67% of 24K
    const expectedRatio = gold22k / gold24k;
    if (expectedRatio < 0.88 || expectedRatio > 0.95) {
      console.log('LiveChennai rate ratio suspicious:', expectedRatio, '- 24K:', gold24k, '22K:', gold22k);
      // Recalculate 22K from 24K or vice versa
      if (gold24k > gold22k) {
        // Rates look correct direction, just slightly off ratio - accept them
      } else {
        console.log('22K > 24K is invalid, rejecting');
        return null;
      }
    }
    
    const rates: Record<string, number> = {
      GOLD_24K: gold24k,
      GOLD_22K: gold22k,
    };
    
    if (silver && silver >= 100 && silver <= 500) {
      rates.SILVER = silver;
    }
    
    console.log('LiveChennai live rates:', JSON.stringify(rates));
    return rates;
    
  } catch (error) {
    console.error('Error fetching from LiveChennai:', error);
    return null;
  }
}

// PRIORITY 2: Fetch live rates using Firecrawl from LiveChennai (handles JavaScript)
async function fetchWithFirecrawlLiveChennai(): Promise<Record<string, number> | null> {
  try {
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.log('Firecrawl API key not configured');
      return null;
    }

    console.log('Fetching from LiveChennai via Firecrawl...');

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://www.livechennai.com/gold_silverrate_hyderabad.asp',
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    if (!response.ok) {
      console.error('Firecrawl LiveChennai scrape failed:', response.status);
      return null;
    }

    const data = await response.json();
    const markdown = data.data?.markdown || data.markdown || '';
    console.log('Firecrawl LiveChennai markdown length:', markdown.length);

    let gold24k: number | null = null;
    let gold22k: number | null = null;
    let silver: number | null = null;

    // Pattern: Look for table format "| 12/Jan/2026 | 13,030 (155 ) | 287.00 (12.00 ) |"
    const summaryMatch = markdown.match(/\d{1,2}\/\w{3}\/\d{4}\s*\|\s*([\d,]+)\s*\([^)]*\)\s*\|\s*([\d.]+)/);
    if (summaryMatch) {
      gold22k = parseInt(summaryMatch[1].replace(/,/g, ''));
      silver = Math.round(parseFloat(summaryMatch[2]));
      console.log('Firecrawl LiveChennai summary - 22K:', gold22k, 'Silver:', silver);
    }

    // Pattern: Look for "| 12/January/2026 | 14215.00 | 13030.00 |"
    const tableMatch = markdown.match(/\d{1,2}\/\w+\/\d{4}\s*\|\s*([\d,.]+)\s*\|\s*([\d,.]+)/);
    if (tableMatch) {
      gold24k = Math.round(parseFloat(tableMatch[1].replace(/,/g, '')));
      if (!gold22k) gold22k = Math.round(parseFloat(tableMatch[2].replace(/,/g, '')));
      console.log('Firecrawl LiveChennai table - 24K:', gold24k, '22K:', gold22k);
    }

    // Pattern: "1 Gm (22 K)" followed by rate like "13,030"
    const gold22kMatch = markdown.match(/1\s*Gm\s*\(22\s*K\)[\s\S]*?\|\s*([\d,]+)/i);
    if (gold22kMatch && !gold22k) {
      gold22k = parseInt(gold22kMatch[1].replace(/,/g, ''));
      console.log('Firecrawl extracted 22K:', gold22k);
    }

    // Pattern: "Pure Gold (24 k)" with rate
    const gold24kPattern = markdown.match(/Pure\s*Gold\s*\(24\s*k?\)[\s\S]*?([\d,]+(?:\.\d+)?)/i);
    if (gold24kPattern && !gold24k) {
      gold24k = Math.round(parseFloat(gold24kPattern[1].replace(/,/g, '')));
      console.log('Firecrawl extracted 24K:', gold24k);
    }

    // Calculate 24K from 22K if not found (22K is 91.67% of 24K purity)
    if (!gold24k && gold22k) {
      gold24k = Math.round(gold22k / 0.9167);
      console.log('Calculated 24K from 22K:', gold24k);
    }

    if (!gold24k || !gold22k || gold24k < 10000 || gold24k > 20000 || gold22k < 10000 || gold22k > 18000) {
      console.log('Invalid Firecrawl LiveChennai rates - 24K:', gold24k, '22K:', gold22k);
      return null;
    }

    const rates: Record<string, number> = {
      GOLD_24K: gold24k,
      GOLD_22K: gold22k,
    };

    if (silver && silver >= 100 && silver <= 500) {
      rates.SILVER = silver;
    }

    console.log('Firecrawl LiveChennai rates:', JSON.stringify(rates));
    return rates;

  } catch (error) {
    console.error('Error fetching with Firecrawl LiveChennai:', error);
    return null;
  }
}

// PRIORITY 3: Fetch live rates using Firecrawl from GoodReturns
async function fetchWithFirecrawlGoodReturns(): Promise<Record<string, number> | null> {
  try {
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.log('Firecrawl API key not configured');
      return null;
    }

    console.log('Fetching from GoodReturns via Firecrawl...');

    const goldResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://www.goodreturns.in/gold-rates/hyderabad.html',
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 2000,
      }),
    });

    if (!goldResponse.ok) {
      console.error('Firecrawl GoodReturns scrape failed:', goldResponse.status);
      return null;
    }

    const goldData = await goldResponse.json();
    const goldMarkdown = goldData.data?.markdown || goldData.markdown || '';
    console.log('Firecrawl GoodReturns markdown length:', goldMarkdown.length);

    let gold24k: number | null = null;
    let gold22k: number | null = null;

    // Pattern: "24K Gold /g" followed by "₹13,582"
    const gold24kMatch = goldMarkdown.match(/24K\s*Gold\s*\/g[\s\S]*?₹\s*([\d,]+)/i);
    const gold22kMatch = goldMarkdown.match(/22K\s*Gold\s*\/g[\s\S]*?₹\s*([\d,]+)/i);

    if (gold24kMatch && gold24kMatch[1]) {
      gold24k = parseInt(gold24kMatch[1].replace(/,/g, ''));
      console.log('Firecrawl GoodReturns 24K:', gold24k);
    }

    if (gold22kMatch && gold22kMatch[1]) {
      gold22k = parseInt(gold22kMatch[1].replace(/,/g, ''));
      console.log('Firecrawl GoodReturns 22K:', gold22k);
    }

    // Scrape silver rates
    const silverResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://www.goodreturns.in/silver-rates/hyderabad.html',
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 2000,
      }),
    });

    let silver: number | null = null;

    if (silverResponse.ok) {
      const silverData = await silverResponse.json();
      const silverMarkdown = silverData.data?.markdown || silverData.markdown || '';

      const silverMatch = silverMarkdown.match(/Silver\s*\/g[\s\S]*?₹\s*([\d,]+)/i) ||
                          silverMarkdown.match(/₹\s*([\d,]+)\s*per\s*gram/i);

      if (silverMatch && silverMatch[1]) {
        silver = parseInt(silverMatch[1].replace(/,/g, ''));
        console.log('Firecrawl GoodReturns Silver:', silver);
      }
    }

    if (!gold24k || !gold22k || gold24k < 10000 || gold24k > 20000 || gold22k < 10000 || gold22k > 18000) {
      console.log('Invalid Firecrawl GoodReturns rates - 24K:', gold24k, '22K:', gold22k);
      return null;
    }

    const rates: Record<string, number> = {
      GOLD_24K: gold24k,
      GOLD_22K: gold22k,
    };

    if (silver && silver >= 100 && silver <= 500) {
      rates.SILVER = silver;
    }

    console.log('Firecrawl GoodReturns rates:', JSON.stringify(rates));
    return rates;

  } catch (error) {
    console.error('Error fetching with Firecrawl GoodReturns:', error);
    return null;
  }
}

// Update manual rates in database with live scraped data
async function updateManualRates(rates: Record<string, number>, source: string): Promise<void> {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const updates = [
      { metal: 'Gold 24K', price: rates.GOLD_24K },
      { metal: 'Gold 22K', price: rates.GOLD_22K },
    ];
    
    if (rates.SILVER && rates.SILVER > 50) {
      updates.push({ metal: 'Silver', price: rates.SILVER });
    }

    if (rates.PLATINUM && rates.PLATINUM > 1000) {
      updates.push({ metal: 'Platinum', price: rates.PLATINUM });
    }

    if (rates.PALLADIUM && rates.PALLADIUM > 1000) {
      updates.push({ metal: 'Palladium', price: rates.PALLADIUM });
    }
    
    for (const update of updates) {
      if (!update.price) continue;
      
      const { error } = await supabaseClient
        .from('manual_market_rates')
        .update({ 
          price_per_gram: update.price,
          updated_at: new Date().toISOString(),
          notes: `Auto-updated from ${source} on ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}`
        })
        .eq('metal', update.metal);
        
      if (error) {
        console.error(`Error updating ${update.metal}:`, error);
      } else {
        console.log(`Updated ${update.metal} to ₹${update.price}/gram`);
      }
    }
  } catch (error) {
    console.error('Error updating manual rates:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await req.json().catch(() => ({}));
    console.log('Fetching metal prices (Hyderabad rates)');

    // PRIORITY 1: Try LiveChennai direct fetch (most accurate for Hyderabad)
    let liveRates = await fetchFromLiveChennai();
    let source = 'LiveChennai.com';
    
    // PRIORITY 2: Try Firecrawl with LiveChennai (handles JavaScript rendering)
    if (!liveRates) {
      liveRates = await fetchWithFirecrawlLiveChennai();
      source = 'LiveChennai via Firecrawl';
    }
    
    // PRIORITY 3: Try Firecrawl with GoodReturns
    if (!liveRates) {
      liveRates = await fetchWithFirecrawlGoodReturns();
      source = 'GoodReturns.in via Firecrawl';
    }
    
    // PRIORITY 4: Fetch admin-set manual rates from database as fallback
    const manualRates = await fetchManualRates();
    
    if (!manualRates || Object.keys(manualRates).length < 6) {
      console.error('Manual rates not available or incomplete');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Manual rates not configured. Admin needs to set rates.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let ratesPerGram: Record<string, number>;
    let usingLiveRates = false;
    
    // Use live rates if available and valid, otherwise use manual rates
    if (liveRates && liveRates.GOLD_24K && liveRates.GOLD_22K) {
      // Merge live rates with manual rates (live takes precedence for gold/silver)
      ratesPerGram = {
        ...manualRates,
        GOLD_24K: liveRates.GOLD_24K,
        GOLD_22K: liveRates.GOLD_22K,
      };
      
      if (liveRates.SILVER && liveRates.SILVER > 50) {
        ratesPerGram.SILVER = liveRates.SILVER;
      }
      
      usingLiveRates = true;
      console.log('Using live rates from', source);
      
      // Update manual rates in database for consistency
      await updateManualRates(liveRates, source);
    } else {
      ratesPerGram = manualRates;
      source = 'Manual rates';
      console.log('Using admin-set manual rates (live fetch failed)');
    }

    const timestamp = Date.now();
    
    const metals: MetalPrice[] = [
      {
        metal: "Gold 24K",
        symbol: "XAU/INR",
        price: ratesPerGram.GOLD_24K * TROY_OZ_TO_GRAMS,
        pricePerGram: ratesPerGram.GOLD_24K,
        change: 0,
        changePercent: 0,
        unit: "per gram",
        timestamp,
        location: 'Hyderabad'
      },
      {
        metal: "Gold 22K",
        symbol: "XAU/INR",
        price: ratesPerGram.GOLD_22K * TROY_OZ_TO_GRAMS,
        pricePerGram: ratesPerGram.GOLD_22K,
        change: 0,
        changePercent: 0,
        unit: "per gram",
        timestamp,
        location: 'Hyderabad'
      },
      {
        metal: "Silver",
        symbol: "XAG/INR",
        price: ratesPerGram.SILVER * TROY_OZ_TO_GRAMS,
        pricePerGram: ratesPerGram.SILVER,
        change: 0,
        changePercent: 0,
        unit: "per gram",
        timestamp,
        location: 'Hyderabad'
      },
      {
        metal: "Platinum",
        symbol: "XPT/INR",
        price: ratesPerGram.PLATINUM * TROY_OZ_TO_GRAMS,
        pricePerGram: ratesPerGram.PLATINUM,
        change: 0,
        changePercent: 0,
        unit: "per gram",
        timestamp,
        location: 'Hyderabad'
      },
      {
        metal: "Palladium",
        symbol: "XPD/INR",
        price: ratesPerGram.PALLADIUM * TROY_OZ_TO_GRAMS,
        pricePerGram: ratesPerGram.PALLADIUM,
        change: 0,
        changePercent: 0,
        unit: "per gram",
        timestamp,
        location: 'Hyderabad'
      },
      {
        metal: "Diamond",
        symbol: "DIA/INR",
        price: ratesPerGram.DIAMOND,
        pricePerGram: ratesPerGram.DIAMOND,
        change: 0,
        changePercent: 0,
        unit: "per carat",
        timestamp,
        location: 'Hyderabad'
      },
    ];

    console.log("Processed metal prices:", JSON.stringify(metals));

    // Store historical price data
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    try {
      const historyRecords = metals.map(metal => ({
        metal: metal.metal,
        price_per_gram: metal.pricePerGram,
        price_per_troy_oz: metal.price,
        change_percent: metal.changePercent,
        recorded_at: new Date().toISOString()
      }));

      const { error: historyError } = await supabaseClient
        .from('metal_prices_history')
        .insert(historyRecords);

      if (historyError) {
        console.error('Error storing historical data:', historyError);
      } else {
        console.log('Historical data stored successfully');
      }
    } catch (storageError) {
      console.error('Error accessing database:', storageError);
    }

    return new Response(JSON.stringify({ 
      metals, 
      success: true,
      usingLiveRates,
      source: source,
      lastUpdated: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in fetch-metal-prices function:', error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
