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

// Scrape live rates from GoodReturns.in
async function fetchFromGoodReturns(): Promise<Record<string, number> | null> {
  try {
    console.log('Fetching live rates from GoodReturns.in');
    
    // Fetch gold rates from Hyderabad page (All India base)
    const goldResponse = await fetch('https://www.goodreturns.in/gold-rates/hyderabad.html', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!goldResponse.ok) {
      console.error('Failed to fetch gold rates from GoodReturns');
      return null;
    }
    
    const goldHtml = await goldResponse.text();
    
    // Extract gold rates using regex patterns
    // Looking for patterns like "₹13,507" near "24K Gold"
    const gold24kMatch = goldHtml.match(/24K\s*Gold\s*\/g[\s\S]*?₹\s*([\d,]+)/i) ||
                         goldHtml.match(/₹\s*([\d,]+)[\s\S]*?24\s*(?:Carat|karat|K)/i);
    const gold22kMatch = goldHtml.match(/22K\s*Gold\s*\/g[\s\S]*?₹\s*([\d,]+)/i) ||
                         goldHtml.match(/₹\s*([\d,]+)[\s\S]*?22\s*(?:Carat|karat|K)/i);
    
    let gold24k: number | null = null;
    let gold22k: number | null = null;
    
    if (gold24kMatch) {
      gold24k = parseInt(gold24kMatch[1].replace(/,/g, ''));
      console.log('Extracted Gold 24K rate:', gold24k);
    }
    
    if (gold22kMatch) {
      gold22k = parseInt(gold22kMatch[1].replace(/,/g, ''));
      console.log('Extracted Gold 22K rate:', gold22k);
    }
    
    // Fetch silver rates
    const silverResponse = await fetch('https://www.goodreturns.in/silver-rates/hyderabad.html', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    let silver: number | null = null;
    
    if (silverResponse.ok) {
      const silverHtml = await silverResponse.text();
      const silverMatch = silverHtml.match(/Silver\s*\/g[\s\S]*?₹\s*([\d,]+)/i) ||
                          silverHtml.match(/₹\s*([\d,]+)[\s\S]*?per\s*gram/i);
      
      if (silverMatch) {
        silver = parseInt(silverMatch[1].replace(/,/g, ''));
        console.log('Extracted Silver rate:', silver);
      }
    }
    
    // Validate extracted rates
    if (!gold24k || !gold22k || gold24k < 5000 || gold24k > 20000 || gold22k < 5000 || gold22k > 20000) {
      console.log('Invalid gold rates extracted, falling back to manual rates');
      return null;
    }
    
    const rates: Record<string, number> = {
      GOLD_24K: gold24k,
      GOLD_22K: gold22k,
      SILVER: silver || 100, // Will be overridden by manual rate if invalid
    };
    
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
      const { error } = await supabaseClient
        .from('manual_market_rates')
        .update({ 
          price_per_gram: update.price,
          updated_at: new Date().toISOString(),
          notes: `Auto-updated from GoodReturns.in on ${new Date().toLocaleDateString('en-IN')}`
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

    // PRIORITY 1: Try to fetch live rates from GoodReturns.in
    const liveRates = await fetchFromGoodReturns();
    
    // PRIORITY 2: Fetch admin-set manual rates from database as fallback
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
      // Merge live rates with manual rates (live takes precedence for gold)
      ratesPerGram = {
        ...manualRates,
        GOLD_24K: liveRates.GOLD_24K,
        GOLD_22K: liveRates.GOLD_22K,
      };
      
      if (liveRates.SILVER && liveRates.SILVER > 50) {
        ratesPerGram.SILVER = liveRates.SILVER;
      }
      
      usingLiveRates = true;
      console.log('Using live rates from GoodReturns.in');
      
      // Update manual rates in database for consistency
      await updateManualRates(liveRates);
    } else {
      ratesPerGram = manualRates;
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
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

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
      source: usingLiveRates ? 'GoodReturns.in' : 'Manual rates'
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
