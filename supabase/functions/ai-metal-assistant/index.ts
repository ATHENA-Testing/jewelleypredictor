import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Pull live market context
    const [
      { data: manualRates },
      { data: history },
      { data: predictions },
      { data: analysis },
      { data: learnings },
    ] = await Promise.all([
      supabase.from("manual_market_rates").select("metal, price_per_gram, updated_at, notes"),
      supabase
        .from("metal_prices_history")
        .select("metal, price_per_gram, change_percent, recorded_at")
        .order("recorded_at", { ascending: false })
        .limit(120),
      supabase
        .from("metal_predictions")
        .select("metal, prediction_date, predicted_price, confidence_high, confidence_low, confidence_score, reasoning, sources")
        .gte("prediction_date", new Date().toISOString().split("T")[0])
        .order("prediction_date", { ascending: true })
        .limit(60),
      supabase
        .from("market_analysis")
        .select("metal, analysis_type, analysis_text, sentiment, key_factors, sources, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("prediction_learnings")
        .select("metal, prediction_date, predicted_price, actual_price, accuracy_percentage")
        .order("prediction_date", { ascending: false })
        .limit(15),
    ]);

    const now = new Date();
    const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);

    const systemPrompt = `You are an expert precious-metals & jewellery market advisor for the Indian market (rates in INR per gram, diamonds per carat). Today is ${istNow.toUTCString().replace("GMT", "IST")}.

You give specific, accurate, actionable advice grounded ONLY in the live data below. Always:
- Cite **specific dates and times (IST)** when recommending buy/sell windows.
- Quote **current price** vs **predicted price** with the **% delta** and **₹ difference per gram**.
- Explain **why** (technical levels, predicted trend, sentiment, key factors).
- Mention **confidence score** when using predictions.
- List **sources** at the end if any data point came from a source field.
- If user asks about a metal not in our data, say so — never invent prices.
- Be concise: structured bullets > long paragraphs. Use markdown.

=== LIVE BASELINE RATES (admin-verified, primary truth, INR/gram) ===
${JSON.stringify(manualRates ?? [], null, 2)}

=== RECENT PRICE HISTORY (last 120 ticks) ===
${JSON.stringify(history ?? [], null, 2)}

=== FORWARD PREDICTIONS (next 60 days) ===
${JSON.stringify(predictions ?? [], null, 2)}

=== RECENT MARKET ANALYSIS ===
${JSON.stringify(analysis ?? [], null, 2)}

=== MODEL ACCURACY LEARNINGS ===
${JSON.stringify(learnings ?? [], null, 2)}

When recommending the best time to buy/sell ornaments, find the lowest predicted price (for buying) or highest (for selling) within the prediction window, give the exact date, the price, the difference vs today, and a 1-2 line reasoning. Always end with a "Sources" line if applicable.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
        reasoning: { effort: "medium" },
        temperature: 0.4,
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please try again in a minute." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(aiResp.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-metal-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
