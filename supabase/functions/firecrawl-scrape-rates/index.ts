import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapedRates {
  GOLD_24K: number | null;
  GOLD_22K: number | null;
  SILVER: number | null;
  source: string;
  scrapedAt: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scraping GoodReturns.in gold rates with Firecrawl...');

    // Scrape gold rates page
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
        waitFor: 2000, // Wait for JS rendering
      }),
    });

    if (!goldResponse.ok) {
      const errorData = await goldResponse.text();
      console.error('Firecrawl gold scrape error:', errorData);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to scrape gold rates' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const goldData = await goldResponse.json();
    const goldMarkdown = goldData.data?.markdown || goldData.markdown || '';
    console.log('Gold markdown length:', goldMarkdown.length);
    console.log('Gold markdown preview:', goldMarkdown.substring(0, 1000));

    // Extract gold rates from markdown
    // Pattern: "24K Gold /g" followed by "₹13,582" or similar
    let gold24k: number | null = null;
    let gold22k: number | null = null;

    // Pattern 1: Look for "24K Gold /g" followed by price on next line or same line
    const gold24kMatch = goldMarkdown.match(/24K\s*Gold\s*\/g[\s\S]*?₹\s*([\d,]+)/i) ||
                          goldMarkdown.match(/₹([\d,]+)[\s\S]*?24\s*(?:Carat|karat|K)/i) ||
                          goldMarkdown.match(/24\s*(?:Carat|karat)\s*Gold[\s\S]*?₹\s*([\d,]+)/i);
    
    const gold22kMatch = goldMarkdown.match(/22K\s*Gold\s*\/g[\s\S]*?₹\s*([\d,]+)/i) ||
                          goldMarkdown.match(/₹([\d,]+)[\s\S]*?22\s*(?:Carat|karat|K)/i) ||
                          goldMarkdown.match(/22\s*(?:Carat|karat)\s*Gold[\s\S]*?₹\s*([\d,]+)/i);

    if (gold24kMatch && gold24kMatch[1]) {
      gold24k = parseInt(gold24kMatch[1].replace(/,/g, ''));
      console.log('Extracted Gold 24K:', gold24k);
    }

    if (gold22kMatch && gold22kMatch[1]) {
      gold22k = parseInt(gold22kMatch[1].replace(/,/g, ''));
      console.log('Extracted Gold 22K:', gold22k);
    }

    // Scrape silver rates page
    console.log('Scraping GoodReturns.in silver rates with Firecrawl...');
    
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
      console.log('Silver markdown length:', silverMarkdown.length);
      console.log('Silver markdown preview:', silverMarkdown.substring(0, 500));

      // Extract silver rate
      const silverMatch = silverMarkdown.match(/Silver\s*\/g[\s\S]*?₹\s*([\d,]+)/i) ||
                           silverMarkdown.match(/₹([\d,]+)\s*per\s*gram/i) ||
                           silverMarkdown.match(/price[\s\S]*?₹\s*([\d,]+)\s*per\s*gram/i);

      if (silverMatch && silverMatch[1]) {
        silver = parseInt(silverMatch[1].replace(/,/g, ''));
        console.log('Extracted Silver:', silver);
      }
    }

    // Validate rates
    const isGoldValid = gold24k && gold22k && gold24k >= 5000 && gold24k <= 25000 && gold22k >= 5000 && gold22k <= 25000;
    const isSilverValid = silver && silver >= 50 && silver <= 500;

    const rates: ScrapedRates = {
      GOLD_24K: isGoldValid ? gold24k : null,
      GOLD_22K: isGoldValid ? gold22k : null,
      SILVER: isSilverValid ? silver : null,
      source: 'GoodReturns.in via Firecrawl',
      scrapedAt: new Date().toISOString(),
    };

    console.log('Scraped rates:', JSON.stringify(rates));

    return new Response(
      JSON.stringify({ 
        success: true, 
        rates,
        goldMarkdownPreview: goldMarkdown.substring(0, 500),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in firecrawl-scrape-rates:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
