import { NextRequest } from "next/server";
export const runtime = "nodejs";
export const maxDuration = 60;

// ── Search providers ──────────────────────────────────────────────────────────

async function searchSerper(query: string, key: string): Promise<{ title: string; url: string; content: string; type: string }[]> {
  if (!key) return [];
  const results: { title: string; url: string; content: string; type: string }[] = [];

  // Run 6 highly targeted queries — like Google AI Overview would
  const queries = [
    query,                                                          // base query — triggers AI Overview / answer box
    `${query} model hardware specs`,
    `${query} pricing cost`,
    `${query} how it works technical architecture`,
    `${query} context window latency performance`,
    `${query} privacy deployment on-device cloud`,
    `${query} OpenAI GPT Claude powered by which model`,
    `${query} engineering blog how built infrastructure`,
    `${query} site:notion.so OR site:openai.com OR site:anthropic.com`,
    `"${query}" model GPT Claude Gemini powered`,
  ];

  await Promise.all(queries.map(async (q) => {
    try {
      const r = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-KEY": key },
        body: JSON.stringify({ q, num: 6, gl: "us", hl: "en" }),
      });
      if (!r.ok) return;
      const d = await r.json();

      // Answer box = highest quality, closest to AI Overview
      if (d.answerBox?.answer)
        results.push({ title: `[ANSWER BOX] ${d.answerBox.title ?? q}`, url: d.answerBox.link ?? "", content: d.answerBox.answer, type: "official" });
      if (d.answerBox?.snippet)
        results.push({ title: `[SNIPPET] ${d.answerBox.title ?? q}`, url: d.answerBox.link ?? "", content: d.answerBox.snippet, type: "official" });
      if (d.answerBox?.snippetHighlighted?.length)
        results.push({ title: `[HIGHLIGHTED] ${q}`, url: d.answerBox.link ?? "", content: d.answerBox.snippetHighlighted.join(" "), type: "official" });

      // Knowledge graph = structured facts
      if (d.knowledgeGraph) {
        const kg = d.knowledgeGraph;
        const kgText = [
          kg.description,
          ...(kg.attributes ? Object.entries(kg.attributes).map(([k, v]) => `${k}: ${v}`) : []),
        ].filter(Boolean).join("\n");
        if (kgText) results.push({ title: `[KNOWLEDGE GRAPH] ${kg.title ?? q}`, url: kg.descriptionLink ?? "", content: kgText, type: "official" });
      }

      // Organic results
      for (const x of (d.organic ?? [])) {
        if (!results.find(e => e.url === x.link)) {
          const isOfficial = x.link?.includes(query.toLowerCase().split(" ")[0]) || x.link?.includes("official") || x.sitelinks;
          results.push({ title: x.title ?? "", url: x.link ?? "", content: x.snippet ?? "", type: isOfficial ? "official" : "article" });
        }
      }

      // People Also Ask — additional context
      for (const p of (d.peopleAlsoAsk ?? []).slice(0, 3))
        if (p.answer) results.push({ title: `[Q&A] ${p.question}`, url: p.link ?? "", content: p.answer, type: "article" });

    } catch { /* ignore */ }
  }));
  return results;
}

async function searchTavily(query: string, key: string): Promise<{ title: string; url: string; content: string; type: string }[]> {
  if (!key) return [];
  const results: { title: string; url: string; content: string; type: string }[] = [];
  await Promise.all([
    `${query} official documentation technical specs`,
    `${query} hardware infrastructure engineering deep dive`,
    `${query} pricing model context window`,
    `${query} system design architecture how it works`,
  ].map(async (q) => {
    try {
      const r = await fetch("https://api.tavily.com/search", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: key, query: q, search_depth: "advanced", max_results: 4,
          include_domains: [], exclude_domains: ["reddit.com", "quora.com", "pinterest.com", "medium.com"],
        }),
      });
      if (!r.ok) return;
      const d = await r.json();
      for (const x of (d.results ?? []))
        if (!results.find(e => e.url === x.url))
          results.push({ title: x.title ?? "", url: x.url ?? "", content: (x.content ?? "").slice(0, 2000), type: x.url?.includes("official") ? "official" : "article" });
    } catch { /* ignore */ }
  }));
  return results;
}

async function searchExa(query: string, key: string): Promise<{ title: string; url: string; content: string; type: string }[]> {
  if (!key) return [];
  const results: { title: string; url: string; content: string; type: string }[] = [];
  await Promise.all([
    `${query} technical specifications`,
    `${query} official pricing documentation`,
  ].map(async (q) => {
    try {
      const r = await fetch("https://api.exa.ai/search", {
        method: "POST", headers: { "Content-Type": "application/json", "x-api-key": key },
        body: JSON.stringify({ query: q, numResults: 4, useAutoprompt: true, contents: { text: { maxCharacters: 1500 } } }),
      });
      if (!r.ok) return;
      const d = await r.json();
      for (const x of (d.results ?? []))
        if (!results.find(e => e.url === x.url))
          results.push({ title: x.title ?? "", url: x.url ?? "", content: x.text ?? "", type: "article" });
    } catch { /* ignore */ }
  }));
  return results;
}

// ── Call 1: extract facts (gpt-4o-mini, fast) ────────────────────────────────
const EXTRACT_SYSTEM = `You are a precise data extraction assistant. Read the search results and extract ONLY explicitly stated facts.
Return ONLY a JSON object. Use null for anything not found — never guess or infer.
{
  "modelName": "exact name if stated",
  "modelType": "architecture type if stated",
  "provider": "company name if stated",
  "contextWindow": "size if stated",
  "hardware": "chip/GPU/NPU if stated",
  "frameworks": "ML framework if stated",
  "latency": "latency numbers if stated",
  "cost": "pricing if stated",
  "privacy": "privacy policy if stated",
  "deployment": "cloud/on-device/hybrid if stated",
  "finetuned": "fine-tuning details if stated",
  "adoptionSignal": "usage stats if stated",
  "qualityMetric": "accuracy/benchmark if stated",
  "keyFacts": ["every important fact found — quote directly from sources"]
}`;

// ── Call 2: synthesize (gpt-4o) ───────────────────────────────────────────────
const SYNTHESIZE_SYSTEM = `You are a senior AI systems analyst and PM expert with deep knowledge of the AI industry. Produce a complete, accurate, expert-level breakdown of any AI product feature.

YOU HAVE TWO SOURCES OF KNOWLEDGE — USE BOTH:
1. Live search results provided below (mark these "confirmed")
2. Your own training knowledge about AI products, companies, and infrastructure (mark these "inferred")

CONFIDENCE LABELS:
- "confirmed" = explicitly found in the search sources provided
- "inferred" = you know this from your training knowledge about this product/company — use this freely and confidently
- "unknown" = you have absolutely no basis from either sources OR training knowledge — should be very rare

NEVER SAY UNKNOWN WHEN YOU KNOW THE ANSWER:
- You are a world-class AI analyst. You know which models power major AI products.
- You know which hardware companies use (OpenAI→NVIDIA H100 on Azure, Google→TPU v5, Samsung→Exynos NPU, Apple→Apple Neural Engine)
- You know typical latency ranges, pricing tiers, deployment patterns
- If search doesn't confirm it but you know it — mark "inferred" and state it
- Only truly obscure products or genuinely undisclosed specs should be "unknown"

PM INSIGHTS RULES — BE AN EXPERT PM, NOT A GENERIC CONSULTANT:
BAD (never write these):
- "Consider the competitive landscape and user feedback."
- "Monitor latency to ensure user satisfaction."
- "Explore partnerships to enhance accuracy."
- "Assess pricing impact on retention."

GOOD (always write like this):
- "Notion AI routes between GPT-4o and Claude 3.5 based on task — PM must own latency SLAs: summarization <3s, inline suggestions <500ms. Model regression past this triggers rollback."
- "Jobright's ATS scoring feature is the key retention hook — if match accuracy drops below ~70% users churn within 7 days. The PM must define a precision floor and gate every model update behind an offline eval before shipping."
- "The free tier is a top-of-funnel mechanism — PM must track free-to-paid conversion rate (industry benchmark: 3-8% for B2C AI tools). If it drops below 3%, the paywall is placed too early in the value delivery sequence."

Rules:
1. Always include at least one specific number or threshold
2. Always describe a decision the PM must own, not just observe
3. If technical specs are unknown, write about product/business trade-offs with specific numbers
4. Reference this specific product's confirmed facts — never write generic AI product advice

INFRA DIAGRAM:
- Use the actual product name in component names (e.g. "Jobright Resume Parser", "Orion AI Chat Engine")
- Never use "AI Model", "Backend Server", "Data Preprocessor" as standalone names
- If stack is unknown, name components after the product's known features

Return ONLY raw JSON starting with { ending with }. No markdown. No backticks.`;

JSON structure:
{
  "featureName": "string",
  "company": "string",
  "category": "Summarization|Conversational AI|Code Generation|Image Generation|Search|Writing Assistant|Voice|Vision|Recommendation|Other",
  "emoji": "single emoji",
  "tagline": "max 12 words",
  "userProblem": "2-3 sentences, concrete before/after",
  "summary": "3-4 sentences, technical how it works",
  "overallConfidence": "high|medium|low",
  "model": {
    "name": { "value": "string", "confidence": "confirmed|inferred|unknown" },
    "provider": { "value": "string", "confidence": "confirmed|inferred|unknown" },
    "type": { "value": "string", "confidence": "confirmed|inferred|unknown" },
    "contextWindow": { "value": "string", "confidence": "confirmed|inferred|unknown" },
    "finetuned": { "value": "string", "confidence": "confirmed|inferred|unknown" }
  },
  "performance": {
    "latency": { "value": "string", "confidence": "confirmed|inferred|unknown" },
    "quality": { "value": "string", "confidence": "confirmed|inferred|unknown" },
    "cost": { "value": "string", "confidence": "confirmed|inferred|unknown" },
    "privacy": { "value": "string", "confidence": "confirmed|inferred|unknown" },
    "reliability": { "value": "string", "confidence": "confirmed|inferred|unknown" }
  },
  "stack": {
    "hardware": [{ "value": "string", "confidence": "confirmed|inferred|unknown" }],
    "frameworks": [{ "value": "string", "confidence": "confirmed|inferred|unknown" }],
    "apis": [{ "value": "string", "confidence": "confirmed|inferred|unknown" }],
    "vectorDB": { "value": "string", "confidence": "confirmed|inferred|unknown" },
    "orchestration": { "value": "string", "confidence": "confirmed|inferred|unknown" },
    "deployment": { "value": "string", "confidence": "confirmed|inferred|unknown" }
  },
  "optimizations": ["string"],
  "tradeoffs": [
    { "label": "string", "description": "2-3 sentences: real tension, what was gained, what was lost, why", "dimension": "quality-latency|privacy-accuracy|cost-scale|ondevice-cloud|general" },
    { "label": "string", "description": "string", "dimension": "string" },
    { "label": "string", "description": "string", "dimension": "string" }
  ],
  "productImpact": {
    "adoptionSignal": "string",
    "retentionImpact": "string",
    "churnImpact": "string",
    "userSegment": "string",
    "successMetrics": ["string", "string", "string"]
  },
  "pmInsights": ["string", "string", "string", "string", "string"],
  "infraDiagram": [
    { "layer": "Input Layer", "description": "How user input enters the system", "components": [
      { "name": "string", "detail": "string", "children": [{ "name": "string", "detail": "string" }] }
    ]},
    { "layer": "Processing Layer", "description": "Pre-processing and routing", "components": [{ "name": "string", "detail": "string" }]},
    { "layer": "Model Layer", "description": "Core AI inference", "components": [{ "name": "string", "detail": "string" }]},
    { "layer": "Output Layer", "description": "Response delivery", "components": [{ "name": "string", "detail": "string" }]},
    { "layer": "Observability Layer", "description": "Monitoring and quality", "components": [{ "name": "string", "detail": "string" }]}
  ],
  "sources": [{ "title": "string", "url": "string", "type": "official|article|analysis" }]
}`;

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const tavilyKey = process.env.TAVILY_API_KEY ?? "";
  const openaiKey = process.env.OPENAI_API_KEY ?? "";
  const serperKey = process.env.SERPER_API_KEY ?? "";
  const exaKey    = process.env.EXA_API_KEY ?? "";

  if (!tavilyKey || !openaiKey)
    return new Response(JSON.stringify({ error: "TAVILY_API_KEY and OPENAI_API_KEY are required." }), { status: 500 });

  const { query } = await req.json();
  if (!query?.trim()) return new Response(JSON.stringify({ error: "Query required" }), { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (event: string, data: unknown) =>
        ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ event, data })}\n\n`));

      try {
        // ── Step 1: All providers in parallel ────────────────────────────────
        const activeProviders = ["Serper (Google)", tavilyKey ? "Tavily" : null, exaKey ? "Exa" : null].filter(Boolean).join(" + ");
        send("status", { step: 1, message: `Searching via ${activeProviders}…` });

        const [serperResults, tavilyResults, exaResults] = await Promise.all([
          searchSerper(query.trim(), serperKey),
          searchTavily(query.trim(), tavilyKey),
          searchExa(query.trim(), exaKey),
        ]);

        // Serper first (highest trust), then Exa, then Tavily
        const seen = new Set<string>();
        const allSources: { title: string; url: string; content: string; type: string; provider: string }[] = [];
        for (const [results, provider] of [
          [serperResults, "Serper"],
          [exaResults, "Exa"],
          [tavilyResults, "Tavily"],
        ] as [{ title: string; url: string; content: string; type: string }[], string][]) {
          for (const s of results) {
            const k = s.url || s.title;
            if (k && !seen.has(k)) { seen.add(k); allSources.push({ ...s, provider }); }
          }
        }

        if (!allSources.length) { send("error", { message: "No sources found. Check API keys." }); ctrl.close(); return; }

        const countByProvider = allSources.reduce((acc, s) => { acc[s.provider] = (acc[s.provider] ?? 0) + 1; return acc; }, {} as Record<string, number>);
        const providerSummary = Object.entries(countByProvider).map(([p, n]) => `${p}:${n}`).join(", ");
        send("status", { step: 2, message: `Found ${allSources.length} sources (${providerSummary}). Extracting facts…` });

        // ── Step 2: Extract facts (fast, cheap) ──────────────────────────────
        const sourcesForExtract = allSources.slice(0, 24)
          .map((s, i) => `[${i + 1}] ${s.title}\nURL: ${s.url}\n${s.content}`)
          .join("\n\n---\n\n");

        const extractRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: "gpt-4o-mini", temperature: 0, max_tokens: 1200, stream: false,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: EXTRACT_SYSTEM },
              { role: "user", content: `Product: "${query.trim()}"\n\nSources:\n${sourcesForExtract}` }
            ]
          }),
        });

        let extracted: Record<string, unknown> = {};
        if (extractRes.ok) {
          const d = await extractRes.json();
          try { extracted = JSON.parse(d.choices?.[0]?.message?.content ?? "{}"); } catch { /* ignore */ }
        }

        // ── Step 3: Synthesize full analysis ─────────────────────────────────
        send("status", { step: 3, message: "Synthesizing analysis…" });

        // Prioritize answer boxes and knowledge graph at the top
        const prioritySources = allSources.filter(s => s.title.startsWith("[ANSWER BOX]") || s.title.startsWith("[SNIPPET]") || s.title.startsWith("[KNOWLEDGE GRAPH]"));
        const regularSources = allSources.filter(s => !prioritySources.includes(s));
        const orderedSources = [...prioritySources, ...regularSources];

        const synthesizeMsg = `Analyze: "${query.trim()}"

STEP 1 — CONFIRMED FACTS extracted from live search:
${JSON.stringify(extracted, null, 2)}

STEP 2 — ALL SEARCH SOURCES (${orderedSources.length} results, answer boxes first):
${orderedSources.slice(0, 28).map((s, i) => `[${i + 1}] ${s.title}\n${s.content.slice(0, 500)}`).join("\n\n---\n\n")}

STEP 3 — For every field not covered above, use your training knowledge about "${query.trim()}" and mark "inferred". You are an expert — state what you know confidently.

Produce the complete JSON. Return ONLY the JSON.`;

        const synthRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: "gpt-4o", temperature: 0.1, max_tokens: 4000, stream: false,
            response_format: { type: "json_object" },
            messages: [{ role: "system", content: SYNTHESIZE_SYSTEM }, { role: "user", content: synthesizeMsg }]
          }),
        });

        if (!synthRes.ok) { send("error", { message: `OpenAI error (${synthRes.status})` }); ctrl.close(); return; }

        send("status", { step: 4, message: "Building dashboard…" });
        const synthData = await synthRes.json();
        const raw = synthData.choices?.[0]?.message?.content ?? "";
        if (!raw) { send("error", { message: "Empty response. Try again." }); ctrl.close(); return; }

        let result;
        try { result = JSON.parse(raw); }
        catch {
          const f = raw.indexOf("{"), l = raw.lastIndexOf("}");
          if (f === -1 || l === -1) { send("error", { message: "Parse error. Try again." }); ctrl.close(); return; }
          try { result = JSON.parse(raw.slice(f, l + 1)); }
          catch { send("error", { message: "Parse error. Try again." }); ctrl.close(); return; }
        }

        result.id = query.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "-");
        result.generatedAt = new Date().toISOString();

        // Attach all sources
        const seenUrls = new Set(Array.from((result.sources ?? []).map((s: { url: string }) => s.url)));
        for (const s of allSources)
          if (s.url && !seenUrls.has(s.url)) {
            result.sources = [...(result.sources ?? []), { title: s.title, url: s.url, type: s.type }];
            seenUrls.add(s.url);
          }

        send("complete", result);
      } catch (e) {
        send("error", { message: e instanceof Error ? e.message : "Unknown error." });
      } finally { ctrl.close(); }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
}
