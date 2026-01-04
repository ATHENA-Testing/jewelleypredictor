import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

// Fetch live rates using Firecrawl (handles JavaScript rendering)
async function fetchWithFirecrawl(): Promise<Record<string, number> | null> {
  try {
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.log('Firecrawl API key not configured, skipping Firecrawl');
      return null;
    }

    console.log('Fetching live rates from GoodReturns.in using Firecrawl...');

    // Scrape gold rates page with Firecrawl
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
      console.error('Firecrawl gold scrape failed:', goldResponse.status);
      return null;
    }

    const goldData = await goldResponse.json();
    const goldMarkdown = goldData.data?.markdown || goldData.markdown || '';
    console.log('Firecrawl gold markdown length:', goldMarkdown.length);

    // Extract gold rates from markdown
    let gold24k: number | null = null;
    let gold22k: number | null = null;

    // Pattern: Look for "24K Gold /g" followed by "₹13,582"
    const gold24kMatch = goldMarkdown.match(/24K\s*Gold\s*\/g[\s\S]*?₹\s*([\d,]+)/i) ||
                          goldMarkdown.match(/24\s*(?:Carat|karat)\s*Gold[\s\S]*?₹\s*([\d,]+)/i);
    const gold22kMatch = goldMarkdown.match(/22K\s*Gold\s*\/g[\s\S]*?₹\s*([\d,]+)/i) ||
                          goldMarkdown.match(/22\s*(?:Carat|karat)\s*Gold[\s\S]*?₹\s*([\d,]+)/i);

    if (gold24kMatch && gold24kMatch[1]) {
      gold24k = parseInt(gold24kMatch[1].replace(/,/g, ''));
      console.log('Firecrawl extracted Gold 24K:', gold24k);
    }

    if (gold22kMatch && gold22kMatch[1]) {
      gold22k = parseInt(gold22kMatch[1].replace(/,/g, ''));
      console.log('Firecrawl extracted Gold 22K:', gold22k);
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
      console.log('Firecrawl silver markdown length:', silverMarkdown.length);

      const silverMatch = silverMarkdown.match(/Silver\s*\/g[\s\S]*?₹\s*([\d,]+)/i) ||
                           silverMarkdown.match(/₹\s*([\d,]+)\s*per\s*gram/i);

      if (silverMatch && silverMatch[1]) {
        silver = parseInt(silverMatch[1].replace(/,/g, ''));
        console.log('Firecrawl extracted Silver:', silver);
      }
    }

    // Validate rates
    if (!gold24k || !gold22k || gold24k < 5000 || gold24k > 25000 || gold22k < 5000 || gold22k > 25000) {
      console.log('Invalid Firecrawl gold rates - 24K:', gold24k, '22K:', gold22k);
      return null;
    }

    const rates: Record<string, number> = {
      GOLD_24K: gold24k,
      GOLD_22K: gold22k,
    };

    if (silver && silver >= 50 && silver <= 500) {
      rates.SILVER = silver;
    }

    console.log('Firecrawl live rates:', JSON.stringify(rates));
    return rates;

  } catch (error) {
    console.error('Error fetching with Firecrawl:', error);
    return null;
  }
}

// Legacy: Attempt to scrape live rates directly (may fail due to JS rendering)
async function fetchFromGoodReturns(): Promise<Record<string, number> | null> {
  try {
    console.log('Attempting direct fetch from GoodReturns.in (fallback)');
    console.log('Note: This may fail as GoodReturns uses JavaScript rendering');
    
    // Fetch gold rates from Hyderabad page
    const goldResponse = await fetch('https://www.goodreturns.in/gold-rates/hyderabad.html', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
    
    if (!goldResponse.ok) {
      console.error('Failed to fetch gold rates from GoodReturns, status:', goldResponse.status);
      return null;
    }
    
    const goldHtml = await goldResponse.text();
    console.log('Gold HTML length:', goldHtml.length);
    
    let gold24k: number | null = null;
    let gold22k: number | null = null;
    
    // Pattern 1: Look for span with id="24K-price" - handle both ₹ and unicode
    let gold24kMatch = goldHtml.match(/id\s*=\s*["']24K-price["'][^>]*>[\s]*[₹\u20B9]?\s*([\d,]+)/i);
    let gold22kMatch = goldHtml.match(/id\s*=\s*["']22K-price["'][^>]*>[\s]*[₹\u20B9]?\s*([\d,]+)/i);
    
    if (gold24kMatch) {
      console.log('Pattern 1 matched for 24K:', gold24kMatch[1]);
    }
    if (gold22kMatch) {
      console.log('Pattern 1 matched for 22K:', gold22kMatch[1]);
    }
    
    // Pattern 2: Look for price in the intro text with strong tags
    if (!gold24kMatch) {
      gold24kMatch = goldHtml.match(/<strong>[₹\u20B9]?([\d,]+)<\/strong>\s*(?:<\/strong>)?\s*per\s*gram\s*for\s*24/i);
      if (gold24kMatch) console.log('Pattern 2 matched for 24K:', gold24kMatch[1]);
    }
    if (!gold22kMatch) {
      gold22kMatch = goldHtml.match(/<strong>[₹\u20B9]?([\d,]+)<\/strong>\s*(?:<\/strong>)?\s*per\s*gram\s*for\s*22/i);
      if (gold22kMatch) console.log('Pattern 2 matched for 22K:', gold22kMatch[1]);
    }
    
    // Pattern 3: Look for the table row pattern "Today 24 Carat Gold Rate"
    if (!gold24kMatch) {
      gold24kMatch = goldHtml.match(/24\s*Carat[\s\S]{0,200}?<td>[₹\u20B9]?([\d,]+)<\/td>/i);
      if (gold24kMatch) console.log('Pattern 3 matched for 24K:', gold24kMatch[1]);
    }
    if (!gold22kMatch) {
      gold22kMatch = goldHtml.match(/22\s*Carat[\s\S]{0,200}?<td>[₹\u20B9]?([\d,]+)<\/td>/i);
      if (gold22kMatch) console.log('Pattern 3 matched for 22K:', gold22kMatch[1]);
    }
    
    // Pattern 4: Generic pattern for "24K Gold" followed by price
    if (!gold24kMatch) {
      gold24kMatch = goldHtml.match(/24K\s*(?:Gold)?\s*[^<]*?[₹\u20B9]([\d,]+)/i);
      if (gold24kMatch) console.log('Pattern 4 matched for 24K:', gold24kMatch[1]);
    }
    if (!gold22kMatch) {
      gold22kMatch = goldHtml.match(/22K\s*(?:Gold)?\s*[^<]*?[₹\u20B9]([\d,]+)/i);
      if (gold22kMatch) console.log('Pattern 4 matched for 22K:', gold22kMatch[1]);
    }
    
    if (gold24kMatch && gold24kMatch[1]) {
      gold24k = parseInt(gold24kMatch[1].replace(/,/g, ''));
      console.log('Extracted Gold 24K rate:', gold24k);
    }
    
    if (gold22kMatch && gold22kMatch[1]) {
      gold22k = parseInt(gold22kMatch[1].replace(/,/g, ''));
      console.log('Extracted Gold 22K rate:', gold22k);
    }
    
    // Fetch silver rates
    const silverResponse = await fetch('https://www.goodreturns.in/silver-rates/hyderabad.html', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'identity',
      }
    });
    
    let silver: number | null = null;
    
    if (silverResponse.ok) {
      const silverHtml = await silverResponse.text();
      console.log('Silver HTML length:', silverHtml.length);
      
      // Pattern 1: Look for "Silver /g" followed by price
      let silverMatch = silverHtml.match(/Silver\s*\/g[\s\S]*?[₹\u20B9]([\d,]+)/i);
      if (silverMatch) console.log('Silver Pattern 1 matched:', silverMatch[1]);
      
      // Pattern 2: Look for price in intro text
      if (!silverMatch) {
        silverMatch = silverHtml.match(/<strong>[₹\u20B9]?([\d,]+)<\/strong>\s*per\s*gram/i);
        if (silverMatch) console.log('Silver Pattern 2 matched:', silverMatch[1]);
      }
      
      // Pattern 3: Look in table for 1 gram price  
      if (!silverMatch) {
        silverMatch = silverHtml.match(/<td>1<\/td>\s*<td>[₹\u20B9]?([\d,]+)<\/td>/i);
        if (silverMatch) console.log('Silver Pattern 3 matched:', silverMatch[1]);
      }
      
      if (silverMatch && silverMatch[1]) {
        silver = parseInt(silverMatch[1].replace(/,/g, ''));
        console.log('Extracted Silver rate:', silver);
      }
    }
    
    // Validate extracted rates - Gold should be between 5000-25000 per gram (INR)
    if (!gold24k || !gold22k || gold24k < 5000 || gold24k > 25000 || gold22k < 5000 || gold22k > 25000) {
      console.log('Invalid gold rates extracted - 24K:', gold24k, '22K:', gold22k);
      return null;
    }
    
    // Validate silver - should be between 50-500 per gram
    if (silver && (silver < 50 || silver > 500)) {
      console.log('Invalid silver rate extracted:', silver);
      silver = null;
    }
    
    const rates: Record<string, number> = {
      GOLD_24K: gold24k,
      GOLD_22K: gold22k,
    };
    
    if (silver) {
      rates.SILVER = silver;
    }
    
    console.log('GoodReturns live rates:', JSON.stringify(rates));
    return rates;
    
  } catch (error) {
    console.error('Error fetching from GoodReturns:', error);
    return null;
  }
}

// Update manual rates in database with live scraped data
async function updateManualRates(rates: Record<string, number>): Promise<void> {
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
    
    for (const update of updates) {
      if (!update.price) continue;
      
      const { error } = await supabaseClient
        .from('manual_market_rates')
        .update({ 
          price_per_gram: update.price,
          updated_at: new Date().toISOString(),
          notes: `Auto-updated from GoodReturns.in on ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}`
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
    console.log('Fetching metal prices (Indian domestic rates)');

    // PRIORITY 1: Try Firecrawl first (handles JavaScript rendering)
    let liveRates = await fetchWithFirecrawl();
    let source = 'GoodReturns.in via Firecrawl';
    
    // PRIORITY 2: Try direct fetch (fallback, may fail due to JS rendering)
    if (!liveRates) {
      liveRates = await fetchFromGoodReturns();
      source = 'GoodReturns.in';
    }
    
    // PRIORITY 3: Fetch admin-set manual rates from database as fallback
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
      await updateManualRates(liveRates);
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
        location: 'All India'
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
        location: 'All India'
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
        location: 'All India'
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
        location: 'All India'
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
        location: 'All India'
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
        location: 'All India'
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
      source: usingLiveRates ? 'GoodReturns.in' : 'Manual rates',
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
