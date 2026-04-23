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

    // Try multiple models in order, falling back when one is rate-limited or out of credits
    const MODEL_FALLBACK_CHAIN: Array<{ model: string; reasoning?: { effort: string } }> = [
      { model: "google/gemini-2.5-pro", reasoning: { effort: "medium" } },
      { model: "google/gemini-2.5-flash", reasoning: { effort: "low" } },
      { model: "google/gemini-2.5-flash-lite" },
      { model: "openai/gpt-5-mini" },
      { model: "openai/gpt-5-nano" },
    ];

    let aiResp: Response | null = null;
    let usedModel = "";
    let lastErr: { status: number; text: string } | null = null;

    for (const cfg of MODEL_FALLBACK_CHAIN) {
      const body: Record<string, unknown> = {
        model: cfg.model,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
        temperature: 0.4,
      };
      if (cfg.reasoning) body.reasoning = cfg.reasoning;

      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (resp.ok) {
        aiResp = resp;
        usedModel = cfg.model;
        console.log(`ai-metal-assistant: using model ${usedModel}`);
        break;
      }

      const text = await resp.text();
      lastErr = { status: resp.status, text };
      console.warn(`Model ${cfg.model} failed (${resp.status}) — trying next. ${text.slice(0, 150)}`);
    }

    if (!aiResp) {
      // ── DETERMINISTIC FALLBACK ──
      // All AI models failed (likely 402 credits). Compute a useful answer
      // directly from manual rates + history + predictions so the user is never blocked.
      const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user")?.content ?? "";
      const fallbackText = buildDeterministicAnswer(
        String(lastUserMsg),
        manualRates ?? [],
        history ?? [],
        predictions ?? [],
        analysis ?? [],
        istNow,
      );

      const note = lastErr?.status === 402
        ? "_AI models are temporarily out of credits — showing data-driven analysis computed directly from live rates, history & predictions._"
        : lastErr?.status === 429
        ? "_AI models are rate-limited — showing data-driven analysis computed directly from live rates, history & predictions._"
        : "_AI service unavailable — showing data-driven analysis computed directly from live rates, history & predictions._";

      const fullText = `${note}\n\n${fallbackText}`;

      // Stream as SSE so the client (which expects streaming) renders it identically
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // chunk into ~40-char pieces for a smooth typing effect
          const chunks = fullText.match(/[\s\S]{1,40}/g) ?? [fullText];
          for (const c of chunks) {
            const payload = { choices: [{ delta: { content: c } }] };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
          }
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "X-Model-Used": "deterministic-fallback",
          "X-Fallback-Reason": String(lastErr?.status ?? "unknown"),
        },
      });
    }

    return new Response(aiResp.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "X-Model-Used": usedModel,
      },
    });
  } catch (e) {
    console.error("ai-metal-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─────────────────────────────────────────────────────────────────────
// Deterministic answer builder — used when ALL AI models are unavailable.
// Produces a markdown response grounded ONLY in the live DB context.
// ─────────────────────────────────────────────────────────────────────
function buildDeterministicAnswer(
  userQuery: string,
  manualRates: any[],
  history: any[],
  predictions: any[],
  analysis: any[],
  istNow: Date,
): string {
  const q = userQuery.toLowerCase();
  const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  const fmtDate = (d: string | Date) => {
    const dt = typeof d === "string" ? new Date(d) : d;
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
  };

  const wantsBuy = /\b(buy|purchase|invest|when to buy|best time)\b/.test(q) && !/\bsell\b/.test(q);
  const wantsSell = /\bsell\b/.test(q);

  const metalsAsked: string[] = [];
  if (/22\s*k|22kt|22 ?karat/.test(q)) metalsAsked.push("gold_22k");
  if (/24\s*k|24kt|24 ?karat/.test(q)) metalsAsked.push("gold_24k");
  if (/\bgold\b/.test(q) && !metalsAsked.length) metalsAsked.push("gold_22k", "gold_24k");
  if (/\bsilver\b/.test(q)) metalsAsked.push("silver");
  if (/\bplatinum\b/.test(q)) metalsAsked.push("platinum");
  if (/\bpalladium\b/.test(q)) metalsAsked.push("palladium");
  if (/\bdiamond\b/.test(q)) metalsAsked.push("diamond");
  if (!metalsAsked.length) metalsAsked.push("gold_22k", "gold_24k", "silver");

  const ratesMap = new Map<string, number>();
  for (const r of manualRates) ratesMap.set(String(r.metal).toLowerCase(), Number(r.price_per_gram));

  const lines: string[] = [];
  lines.push(`**📊 Data-Driven Market Analysis** — _${istNow.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST_\n`);

  for (const metal of metalsAsked) {
    const current = ratesMap.get(metal);
    if (!current) {
      lines.push(`### ${prettyMetal(metal)}\n- ⚠️ No baseline rate available for **${metal}**.\n`);
      continue;
    }

    const metalHistory = history
      .filter((h) => String(h.metal).toLowerCase() === metal)
      .map((h) => ({ price: Number(h.price_per_gram), at: new Date(h.recorded_at) }))
      .sort((a, b) => b.at.getTime() - a.at.getTime());

    const last30 = metalHistory.slice(0, 30);
    const avg30 = last30.length ? last30.reduce((s, x) => s + x.price, 0) / last30.length : current;
    const min30 = last30.length ? Math.min(...last30.map((x) => x.price)) : current;
    const max30 = last30.length ? Math.max(...last30.map((x) => x.price)) : current;
    const week = metalHistory.slice(0, 7);
    const weekTrend = week.length >= 2 ? ((week[0].price - week[week.length - 1].price) / week[week.length - 1].price) * 100 : 0;

    const metalPreds = predictions
      .filter((p) => String(p.metal).toLowerCase() === metal)
      .map((p) => ({
        date: p.prediction_date as string,
        price: Number(p.predicted_price),
        conf: Number(p.confidence_score),
        low: Number(p.confidence_low),
        high: Number(p.confidence_high),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const next30 = metalPreds.slice(0, 30);
    const lowest = next30.length ? next30.reduce((m, x) => (x.price < m.price ? x : m), next30[0]) : null;
    const highest = next30.length ? next30.reduce((m, x) => (x.price > m.price ? x : m), next30[0]) : null;

    lines.push(`### ${prettyMetal(metal)}`);
    lines.push(`- **Current rate:** ${inr(current)}/gram`);
    lines.push(`- **30-day range:** ${inr(min30)} – ${inr(max30)} (avg ${inr(avg30)})`);
    lines.push(`- **7-day trend:** ${weekTrend >= 0 ? "📈 +" : "📉 "}${weekTrend.toFixed(2)}%`);

    if (wantsBuy && lowest) {
      const delta = lowest.price - current;
      const pct = (delta / current) * 100;
      const verdict = delta < 0
        ? `✅ **Wait to buy.** Predicted dip to ${inr(lowest.price)} on **${fmtDate(lowest.date)}** (save ${inr(-delta)}/g, ${(-pct).toFixed(2)}% lower).`
        : `🛒 **Buy now.** Today's ${inr(current)} is the lowest in the 30-day forecast. Lowest ahead: ${inr(lowest.price)} on ${fmtDate(lowest.date)}.`;
      lines.push(`- **Best buy window:** ${verdict}`);
      lines.push(`- _Confidence: ${(lowest.conf * 100).toFixed(0)}% • Range ${inr(lowest.low)}–${inr(lowest.high)}_`);
    } else if (wantsSell && highest) {
      const delta = highest.price - current;
      const pct = (delta / current) * 100;
      const verdict = delta > 0
        ? `✅ **Hold to sell.** Predicted peak ${inr(highest.price)} on **${fmtDate(highest.date)}** (gain ${inr(delta)}/g, +${pct.toFixed(2)}%).`
        : `💰 **Sell now.** Today's ${inr(current)} is the highest in the 30-day forecast.`;
      lines.push(`- **Best sell window:** ${verdict}`);
      lines.push(`- _Confidence: ${(highest.conf * 100).toFixed(0)}% • Range ${inr(highest.low)}–${inr(highest.high)}_`);
    } else if (lowest && highest) {
      lines.push(`- **Next 30 days:** Low ${inr(lowest.price)} on ${fmtDate(lowest.date)} • High ${inr(highest.price)} on ${fmtDate(highest.date)}`);
      const buyDelta = ((lowest.price - current) / current) * 100;
      const sellDelta = ((highest.price - current) / current) * 100;
      lines.push(`- **Buy guidance:** ${buyDelta < -0.5 ? `Wait — projected ${buyDelta.toFixed(2)}% dip` : "Buy now — no meaningful dip projected"}`);
      lines.push(`- **Sell guidance:** ${sellDelta > 0.5 ? `Hold — projected +${sellDelta.toFixed(2)}% peak` : "Sell now — no meaningful peak projected"}`);
    }
    lines.push("");
  }

  const recent = analysis.slice(0, 3);
  if (recent.length) {
    lines.push(`### 📰 Recent Market Sentiment`);
    for (const a of recent) {
      const sent = a.sentiment ? `**${String(a.sentiment).toUpperCase()}**` : "";
      lines.push(`- ${prettyMetal(String(a.metal))} ${sent}: ${String(a.analysis_text).slice(0, 160)}${String(a.analysis_text).length > 160 ? "…" : ""}`);
    }
    lines.push("");
  }

  lines.push(`---\n_Source: Admin-verified rates, ${history.length} historical points, ${predictions.length} forward predictions._`);
  return lines.join("\n");
}

function prettyMetal(m: string): string {
  const map: Record<string, string> = {
    gold_22k: "🟡 Gold 22K",
    gold_24k: "🟡 Gold 24K",
    silver: "⚪ Silver",
    platinum: "⚫ Platinum",
    palladium: "🔘 Palladium",
    diamond: "💎 Diamond",
  };
  return map[m.toLowerCase()] ?? m;
}
