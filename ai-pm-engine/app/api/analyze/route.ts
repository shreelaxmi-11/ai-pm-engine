import { NextRequest } from "next/server";
export const runtime = "nodejs";
export const maxDuration = 60;

// ── Authoritative domain map — fetch directly from source ────────────────────
const AUTHORITATIVE_DOMAINS: Record<string, string[]> = {
  // OpenAI
  "notion":         ["notion.so", "notion.com"],
  "chatgpt":        ["openai.com"],
  "openai":         ["openai.com"],
  "dall-e":         ["openai.com"],
  "whisper":        ["openai.com"],
  "sora":           ["openai.com"],
  // Microsoft
  "github copilot": ["github.blog", "github.com"],
  "copilot":        ["github.blog", "github.com", "microsoft.com", "blogs.microsoft.com"],
  "azure":          ["microsoft.com", "blogs.microsoft.com", "azure.microsoft.com"],
  "bing":           ["microsoft.com", "blogs.microsoft.com"],
  // Google
  "gemini":         ["blog.google", "deepmind.google", "ai.google", "blog.google"],
  "google lens":    ["blog.google", "ai.google"],
  "google":         ["blog.google", "ai.google", "deepmind.google"],
  "bard":           ["blog.google", "ai.google"],
  "waymo":          ["waymo.com", "blog.waymo.com"],
  // Apple
  "apple":          ["apple.com", "developer.apple.com", "machinelearning.apple.com"],
  "siri":           ["apple.com", "machinelearning.apple.com"],
  // Samsung
  "samsung":        ["news.samsung.com", "samsung.com", "research.samsung.com"],
  // Meta
  "meta ai":        ["ai.meta.com", "engineering.fb.com", "research.facebook.com"],
  "llama":          ["ai.meta.com", "engineering.fb.com"],
  "meta":           ["ai.meta.com", "engineering.fb.com", "research.facebook.com"],
  "instagram":      ["engineering.fb.com", "ai.meta.com"],
  "facebook":       ["engineering.fb.com", "ai.meta.com"],
  "reels":          ["engineering.fb.com", "ai.meta.com"],
  // Netflix
  "netflix":        ["netflixtechblog.com", "research.netflix.com"],
  // Amazon
  "amazon":         ["aws.amazon.com", "developer.amazon.com", "aboutamazon.com"],
  "alexa":          ["developer.amazon.com", "aws.amazon.com"],
  "aws":            ["aws.amazon.com", "aws.amazon.com/blogs"],
  "rekognition":    ["aws.amazon.com"],
  "bedrock":        ["aws.amazon.com"],
  // Anthropic
  "claude":         ["anthropic.com"],
  // Grammarly
  "grammarly":      ["grammarly.com"],
  // Perplexity
  "perplexity":     ["perplexity.ai", "blog.perplexity.ai"],
  // Midjourney / image gen
  "midjourney":     ["midjourney.com", "docs.midjourney.com"],
  "stable diffusion": ["stability.ai", "huggingface.co"],
  // Spotify
  "spotify":        ["engineering.atspotify.com", "newsroom.spotify.com"],
  // Uber
  "uber":           ["eng.uber.com"],
  // Airbnb
  "airbnb":         ["medium.com/airbnb-engineering"],
  // LinkedIn
  "linkedin":       ["engineering.linkedin.com"],
  // Twitter/X
  "twitter":        ["blog.twitter.com", "engineering.twitter.com"],
  "grok":           ["x.ai"],
  // Tesla
  "tesla":          ["tesla.com"],
  // Nvidia
  "nvidia":         ["developer.nvidia.com", "blogs.nvidia.com"],
};

function getAuthoritativeDomains(query: string): string[] {
  const ql = query.toLowerCase();
  for (const [key, domains] of Object.entries(AUTHORITATIVE_DOMAINS)) {
    if (ql.includes(key)) return domains;
  }
  return [];
}

// ── Search providers ──────────────────────────────────────────────────────────

async function searchSerper(query: string, key: string): Promise<{ title: string; url: string; content: string; type: string }[]> {
  if (!key) return [];
  const results: { title: string; url: string; content: string; type: string }[] = [];
  const queries = [
    query,
    `${query} model architecture how it works`,
    `${query} pricing hardware specs`,
    `${query} technical infrastructure`,
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
      if (d.answerBox?.answer)
        results.push({ title: `[ANSWER BOX] ${d.answerBox.title ?? q}`, url: d.answerBox.link ?? "", content: d.answerBox.answer, type: "official" });
      if (d.answerBox?.snippet && d.answerBox.snippet !== d.answerBox.answer)
        results.push({ title: `[SNIPPET] ${d.answerBox.title ?? q}`, url: d.answerBox.link ?? "", content: d.answerBox.snippet, type: "official" });
      if (d.knowledgeGraph) {
        const kg = d.knowledgeGraph;
        const kgText = [kg.description, ...(kg.attributes ? Object.entries(kg.attributes).map(([k, v]) => `${k}: ${v}`) : [])].filter(Boolean).join("\n");
        if (kgText) results.push({ title: `[KNOWLEDGE GRAPH] ${kg.title ?? q}`, url: kg.descriptionLink ?? "", content: kgText, type: "official" });
      }
      for (const p of (d.peopleAlsoAsk ?? []).slice(0, 2))
        if (p.answer) results.push({ title: `[Q&A] ${p.question}`, url: p.link ?? "", content: p.answer, type: "article" });
      for (const x of (d.organic ?? []).slice(0, 5))
        if (!results.find(e => e.url === x.link))
          results.push({ title: x.title ?? "", url: x.link ?? "", content: x.snippet ?? "", type: "article" });
    } catch { /**/ }
  }));
  return results;
}

async function searchTavily(query: string, key: string): Promise<{ title: string; url: string; content: string; type: string }[]> {
  if (!key) return [];
  const results: { title: string; url: string; content: string; type: string }[] = [];
  const authDomains = getAuthoritativeDomains(query);

  const searches: Array<{ q: string; domains?: string[] }> = [
    // 1. Deep search on authoritative domains if we know them
    ...(authDomains.length > 0 ? [{ q: `${query} model architecture pricing hardware`, domains: authDomains }] : []),
    // 2. General deep search
    { q: `${query} technical architecture model infrastructure how it works` },
    { q: `${query} hardware GPU NPU chip pricing context window latency` },
  ];

  await Promise.all(searches.map(async ({ q, domains }) => {
    try {
      const r = await fetch("https://api.tavily.com/search", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: key, query: q, search_depth: "advanced", max_results: 5,
          ...(domains ? { include_domains: domains } : {}),
          exclude_domains: ["reddit.com", "quora.com", "pinterest.com", "tiktok.com"],
        }),
      });
      if (!r.ok) return;
      const d = await r.json();
      for (const x of (d.results ?? []))
        if (!results.find(e => e.url === x.url))
          results.push({
            title: x.title ?? "",
            url: x.url ?? "",
            content: (x.content ?? "").slice(0, 3000), // longer content = more facts
            type: authDomains.some(d => x.url?.includes(d)) ? "official" : "article"
          });
    } catch { /**/ }
  }));
  return results;
}

async function searchExa(query: string, key: string): Promise<{ title: string; url: string; content: string; type: string }[]> {
  if (!key) return [];
  const results: { title: string; url: string; content: string; type: string }[] = [];
  try {
    const r = await fetch("https://api.exa.ai/search", {
      method: "POST", headers: { "Content-Type": "application/json", "x-api-key": key },
      body: JSON.stringify({
        query: `${query} technical specifications model hardware pricing`,
        numResults: 6, useAutoprompt: true,
        contents: { text: { maxCharacters: 2000 } }
      }),
    });
    if (r.ok) {
      const d = await r.json();
      for (const x of (d.results ?? []))
        results.push({ title: x.title ?? "", url: x.url ?? "", content: x.text ?? "", type: "article" });
    }
  } catch { /**/ }
  return results;
}

// ── Call 1: extract confirmed facts only ─────────────────────────────────────
const EXTRACT_SYSTEM = `You are a precise fact extractor. Read these search results and pull out ONLY what is explicitly stated.
Do not infer. Do not guess. Return null for anything not directly stated.
Return ONLY this JSON:
{
  "modelName": "exact model name if stated",
  "provider": "AI provider if stated",
  "contextWindow": "context size if stated",
  "hardware": "specific chip/GPU/NPU if stated",
  "frameworks": "ML framework if stated",
  "latency": "latency numbers if stated",
  "cost": "exact pricing if stated",
  "privacy": "privacy policy if stated",
  "deployment": "cloud/on-device/hybrid if stated",
  "adoptionSignal": "user count or growth metric if stated",
  "qualityMetric": "accuracy or benchmark if stated",
  "keyFacts": ["important facts quoted directly from sources — up to 12 quotes"]
}`;

// ── Call 2: synthesize ────────────────────────────────────────────────────────
const SYNTHESIZE_SYSTEM = `You are a world-class AI product analyst. Founders and PMs will read your analysis. It must be accurate, specific, and deeply expert.

══ CONFIDENCE SYSTEM ══
"confirmed" → fact is in the provided search sources
"inferred"  → you know this from your training knowledge about this specific product — state it confidently with specifics
"unknown"   → you have absolutely no basis from search OR training knowledge — use extremely rarely

YOU KNOW THESE — USE THEM (mark "inferred"):
• Notion AI → GPT-4o + Claude 3.5, cloud-only, NVIDIA H100 on Azure/AWS via APIs, PyTorch, entire-doc context
• ChatGPT Voice → GPT-4o native multimodal, NVIDIA H100 on Azure, PyTorch, WebSocket streaming, <320ms latency
• GitHub Copilot → OpenAI Codex/GPT-4, fine-tuned on GitHub code, Azure, 64K context, 200-400ms latency
• Gemini Live → Gemini 1.5 Flash, Google TPU v5, JAX, 1M context, <300ms
• Google Lens → ViT + Gemini multimodal, TPU v5 cloud + TFLite on-device, hybrid
• Samsung Transcript Assist → on-device ASR, Exynos 2400 NPU 34.4 TOPS / Snapdragon 8 Gen 3, Samsung Neural SDK + TFLite, 3hr context, fully on-device
• Grammarly → custom transformers + GPT-4 for GrammarlyGO, hybrid, PyTorch
• Perplexity → GPT-4o + Claude 3.5 + Llama 3 routing, NVIDIA H100 cluster, real-time web search pipeline
• Netflix → custom recommendation models (two-tower retrieval + ranking), AWS EC2 P4d instances (A100), TensorFlow + PyTorch, 100ms latency SLA, A/B tests 1000+ experiments/year
• Netflix Recommendations → collaborative filtering + content-based, trained on 260M+ member viewing history, AWS, saves ~$1B/year in retention
• Amazon Alexa → custom NLU + ASR models, AWS Inferentia chips, on-device wake word + cloud NLU, <300ms response target
• Amazon Rekognition → AWS Inferentia, TensorFlow, cloud-only, REST API
• AWS Bedrock → multi-model API (Claude, Llama, Titan, Mistral), NVIDIA A100/H100 on AWS, pay-per-token
• Meta AI → Llama 3.1 405B, NVIDIA H100 + custom MTIA chips, PyTorch (Meta created PyTorch), 128K context
• Instagram Reels → custom recommendation transformer, NVIDIA H100, PyTorch, real-time ranking <100ms
• Facebook Feed → DLRM (Deep Learning Recommendation Model), custom AI hardware, PyTorch, trained on trillions of interactions
• Spotify → custom recommendation (BaRT model), GCP TPUs + AWS, PyTorch, 100M+ track embeddings
• Grok (xAI) → Grok-2, custom xAI infrastructure + Oracle Cloud H100s, 128K context
• Tesla Autopilot → custom FSD chip (72 TOPS), PyTorch, on-device inference, camera-only vision
• Siri → custom Apple foundation models, Apple Neural Engine on-device + Private Cloud Compute, Core ML, on-device first
• Apple Intelligence → Apple foundation models, A17 Pro / M-series Neural Engine, Core ML, hybrid on-device + PCC

══ PM INSIGHTS — NON-NEGOTIABLE FORMAT ══
Every single insight MUST have: a specific number + a real decision the PM must own.

BANNED insights (these will be rejected):
✗ Anything without a specific number
✗ "Monitor user feedback"
✗ "Consider the competitive landscape"  
✗ "Explore partnerships"
✗ "Assess pricing impact"

REQUIRED format — every insight looks like one of these:
✓ "[Feature] routes between [Model A] and [Model B] — PM must define latency SLA: <Xms for [task]. Regression triggers rollback."
✓ "Free-to-paid benchmark for [category] is X–Y%. If conversion drops below X%, [specific action]."
✓ "[Feature] runs on [hardware] at [spec]. PM must set [metric] budget: [threshold] per [dimension]. Exceeding blocks [action]."
✓ "Competitor [X] does [approach] differently — this reveals [specific trade-off] the PM must consciously choose."

══ INFRA DIAGRAM ══
Name every component after actual product features:
✓ "Notion AI Multi-Model Router", "Exynos 2400 NPU ASR Engine", "Orion Chat Engine"  
✗ "AI Model", "Backend Server", "Data Preprocessor", "Analytics Engine"

Return ONLY raw JSON. No markdown. No backticks. No text outside the JSON object.

JSON structure:
{
  "featureName": "string",
  "company": "string",
  "category": "Summarization|Conversational AI|Code Generation|Image Generation|Search|Writing Assistant|Voice|Vision|Recommendation|Other",
  "emoji": "single emoji",
  "tagline": "max 12 words",
  "userProblem": "2-3 sentences, concrete before/after, specific friction removed",
  "summary": "3-4 sentences, technical how it works, what makes it different",
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
    { "label": "string", "description": "2-3 sentences: real tension, what was gained, what was lost, why this decision", "dimension": "quality-latency|privacy-accuracy|cost-scale|ondevice-cloud|general" },
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
    { "layer": "Input Layer", "description": "How user input enters", "components": [
      { "name": "product-specific component name", "detail": "specific detail", "children": [{ "name": "string", "detail": "string" }] }
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
    return new Response(JSON.stringify({ error: "Missing required API keys." }), { status: 500 });

  const { query } = await req.json();
  if (!query?.trim()) return new Response(JSON.stringify({ error: "Query required" }), { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (event: string, data: unknown) =>
        ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ event, data })}\n\n`));
      try {
        // ── Step 1: All providers in parallel ────────────────────────────────
        const activeProviders = ["Serper", tavilyKey ? "Tavily" : null, exaKey ? "Exa" : null].filter(Boolean).join(" + ");
        send("status", { step: 1, message: `Searching via ${activeProviders}…` });

        const [serperResults, tavilyResults, exaResults] = await Promise.all([
          searchSerper(query.trim(), serperKey),
          searchTavily(query.trim(), tavilyKey),
          searchExa(query.trim(), exaKey),
        ]);

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
        send("status", { step: 2, message: `Found ${allSources.length} sources (${Object.entries(countByProvider).map(([p,n])=>`${p}:${n}`).join(", ")}). Extracting facts…` });

        // ── Step 2: Extract confirmed facts ──────────────────────────────────
        const prioritySources = allSources.filter(s =>
          s.title.startsWith("[ANSWER BOX]") || s.title.startsWith("[SNIPPET]") ||
          s.title.startsWith("[KNOWLEDGE GRAPH]") || s.title.startsWith("[Q&A]") ||
          s.type === "official"
        );
        const otherSources = allSources.filter(s => !prioritySources.includes(s))
          .sort((a, b) => b.content.length - a.content.length)
          .slice(0, 10);
        const topSources = [...prioritySources, ...otherSources].slice(0, 20);

        const sourcesText = topSources
          .map((s, i) => `[${i+1}] ${s.title}\nURL: ${s.url}\n${s.content.slice(0, 2000)}`)
          .join("\n\n---\n\n");

        const extractRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: "gpt-4o-mini", temperature: 0, max_tokens: 1200, stream: false,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: EXTRACT_SYSTEM },
              { role: "user", content: `Product: "${query.trim()}"\n\nSources:\n${sourcesText}` }
            ]
          }),
        });

        let extracted: Record<string, unknown> = {};
        if (extractRes.ok) {
          const d = await extractRes.json();
          try { extracted = JSON.parse(d.choices?.[0]?.message?.content ?? "{}"); } catch { /**/ }
        }

        // ── Step 3: Full synthesis ────────────────────────────────────────────
        send("status", { step: 3, message: "Synthesizing expert analysis…" });

        const synthesizeMsg = `Analyze: "${query.trim()}"

CONFIRMED FACTS FROM LIVE SEARCH:
${JSON.stringify(extracted, null, 2)}

TOP SOURCES (official and high-content first):
${topSources.slice(0, 14).map((s, i) => `[${i+1}] ${s.title} [${s.type}]\n${s.content.slice(0, 800)}`).join("\n\n---\n\n")}

Instructions:
1. Use confirmed facts above — mark "confirmed"
2. Fill gaps using your training knowledge about this product — mark "inferred"  
3. Every pmInsight needs a specific number and a real PM decision
4. Name infra components after actual product features
5. Return ONLY the JSON`;

        const synthRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: "gpt-4o", temperature: 0.1, max_tokens: 4096, stream: false,
            response_format: { type: "json_object" },
            messages: [{ role: "system", content: SYNTHESIZE_SYSTEM }, { role: "user", content: synthesizeMsg }]
          }),
        });

        if (!synthRes.ok) { send("error", { message: `OpenAI error (${synthRes.status})` }); ctrl.close(); return; }

        send("status", { step: 4, message: "Building dashboard…" });
        const synthData = await synthRes.json();
        const raw = synthData.choices?.[0]?.message?.content ?? "";
        if (!raw) { send("error", { message: "Empty response." }); ctrl.close(); return; }

        let result;
        try { result = JSON.parse(raw); }
        catch {
          const f = raw.indexOf("{"), l = raw.lastIndexOf("}");
          if (f === -1 || l === -1) { send("error", { message: "Parse error." }); ctrl.close(); return; }
          try { result = JSON.parse(raw.slice(f, l + 1)); }
          catch { send("error", { message: "Parse error." }); ctrl.close(); return; }
        }

        result.id = query.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "-");
        result.generatedAt = new Date().toISOString();

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
