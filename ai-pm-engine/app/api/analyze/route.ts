import { NextRequest } from "next/server";
export const runtime = "nodejs";
export const maxDuration = 60;

// ── Step 1: Get top URLs from Google via Serper ───────────────────────────────
async function getGoogleUrls(query: string, key: string): Promise<{
  answerBoxes: { title: string; url: string; content: string }[];
  knowledgeGraph: string;
  urls: string[];
  organicSnippets: { title: string; url: string; snippet: string }[];
}> {
  const answerBoxes: { title: string; url: string; content: string }[] = [];
  let knowledgeGraph = "";
  const urlSet = new Set<string>();
  const organicSnippets: { title: string; url: string; snippet: string }[] = [];

  if (!key) return { answerBoxes, knowledgeGraph, urls: [], organicSnippets };

  const queries = [
    query,
    `${query} model architecture how it works`,
    `${query} pricing hardware specs technical`,
  ];

  await Promise.all(queries.map(async (q) => {
    try {
      const r = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-KEY": key },
        body: JSON.stringify({ q, num: 8, gl: "us", hl: "en" }),
      });
      if (!r.ok) return;
      const d = await r.json();

      // Collect answer boxes — immediate high-quality facts
      if (d.answerBox?.answer)
        answerBoxes.push({ title: d.answerBox.title ?? q, url: d.answerBox.link ?? "", content: d.answerBox.answer });
      if (d.answerBox?.snippet)
        answerBoxes.push({ title: d.answerBox.title ?? q, url: d.answerBox.link ?? "", content: d.answerBox.snippet });
      if (d.answerBox?.snippetHighlighted?.length)
        answerBoxes.push({ title: q, url: d.answerBox.link ?? "", content: d.answerBox.snippetHighlighted.join(" ") });

      // Knowledge graph — structured facts
      if (d.knowledgeGraph) {
        const kg = d.knowledgeGraph;
        const attrs = kg.attributes ? Object.entries(kg.attributes).map(([k, v]) => `${k}: ${v}`).join("\n") : "";
        knowledgeGraph += `${kg.title ?? ""}: ${kg.description ?? ""}\n${attrs}\n`;
      }

      // People Also Ask — extra context
      for (const p of (d.peopleAlsoAsk ?? []).slice(0, 3))
        if (p.answer) answerBoxes.push({ title: p.question, url: p.link ?? "", content: p.answer });

      // Collect top organic URLs to fetch full content
      for (const x of (d.organic ?? []).slice(0, 6)) {
        if (x.link && !urlSet.has(x.link)) {
          urlSet.add(x.link);
          organicSnippets.push({ title: x.title ?? "", url: x.link, snippet: x.snippet ?? "" });
        }
      }
    } catch { /**/ }
  }));

  return { answerBoxes, knowledgeGraph, urls: Array.from(urlSet), organicSnippets };
}

// ── Step 2: Fetch full content of URLs via Tavily ────────────────────────────
async function fetchFullContent(
  urls: string[],
  query: string,
  key: string
): Promise<{ title: string; url: string; content: string }[]> {
  if (!key) return [];
  const results: { title: string; url: string; content: string }[] = [];

  // Prioritize authoritative domains
  const PRIORITY_DOMAINS = [
    "openai.com", "anthropic.com", "ai.google", "blog.google", "deepmind.google",
    "microsoft.com", "github.blog", "notion.so", "notion.com",
    "news.samsung.com", "samsung.com", "research.samsung.com",
    "apple.com", "machinelearning.apple.com",
    "netflixtechblog.com", "research.netflix.com",
    "engineering.fb.com", "ai.meta.com",
    "aws.amazon.com", "developer.amazon.com",
    "engineering.atspotify.com", "newsroom.spotify.com",
    "eng.uber.com", "engineering.linkedin.com",
    "x.ai", "tesla.com", "nvidia.com", "developer.nvidia.com",
    "grammarly.com", "perplexity.ai", "blog.perplexity.ai",
  ];

  const priorityUrls = urls.filter(u => PRIORITY_DOMAINS.some(d => u.includes(d)));
  const otherUrls = urls.filter(u => !priorityUrls.includes(u));
  const orderedUrls = [...priorityUrls, ...otherUrls].slice(0, 8);

  await Promise.all(orderedUrls.map(async (url) => {
    try {
      const r = await fetch("https://api.tavily.com/search", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: key,
          query: `${query} model architecture hardware pricing`,
          search_depth: "advanced",
          max_results: 1,
          include_domains: [new URL(url).hostname],
        }),
      });
      if (!r.ok) return;
      const d = await r.json();
      for (const x of (d.results ?? []))
        if (!results.find(e => e.url === x.url))
          results.push({ title: x.title ?? "", url: x.url ?? "", content: (x.content ?? "").slice(0, 3000) });
    } catch { /**/ }
  }));

  // Also do 2 broad deep searches for anything missed
  await Promise.all([
    `${query} technical architecture model infrastructure`,
    `${query} hardware GPU NPU pricing context window`,
  ].map(async (q) => {
    try {
      const r = await fetch("https://api.tavily.com/search", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: key, query: q, search_depth: "advanced", max_results: 4,
          exclude_domains: ["reddit.com", "quora.com", "pinterest.com", "tiktok.com"],
        }),
      });
      if (!r.ok) return;
      const d = await r.json();
      for (const x of (d.results ?? []))
        if (!results.find(e => e.url === x.url))
          results.push({ title: x.title ?? "", url: x.url ?? "", content: (x.content ?? "").slice(0, 3000) });
    } catch { /**/ }
  }));

  return results;
}

// ── Step 3: Exa semantic search ───────────────────────────────────────────────
async function searchExa(query: string, key: string): Promise<{ title: string; url: string; content: string }[]> {
  if (!key) return [];
  try {
    const r = await fetch("https://api.exa.ai/search", {
      method: "POST", headers: { "Content-Type": "application/json", "x-api-key": key },
      body: JSON.stringify({
        query: `${query} technical specifications model hardware pricing architecture`,
        numResults: 6, useAutoprompt: true,
        contents: { text: { maxCharacters: 2500 } }
      }),
    });
    if (!r.ok) return [];
    const d = await r.json();
    return (d.results ?? []).map((x: { title?: string; url?: string; text?: string }) => ({
      title: x.title ?? "", url: x.url ?? "", content: x.text ?? ""
    }));
  } catch { return []; }
}

// ── Extract: literal facts from sources only ─────────────────────────────────
const EXTRACT_SYSTEM = `Extract ONLY facts explicitly stated in these sources. Be literal. No inference. Return null for anything not directly stated.
IMPORTANT: If sources contradict each other, note the contradiction in keyFacts. Do not pick the wrong one.
Return ONLY this JSON:
{
  "modelName": "exact model name if stated",
  "provider": "AI provider company if stated",
  "contextWindow": "context size if stated",
  "hardware": "specific chip/GPU/NPU if stated",
  "frameworks": "ML frameworks if stated",
  "latency": "latency numbers if stated",
  "cost": "exact pricing if stated",
  "privacy": "privacy policy if stated",
  "deployment": "cloud/on-device/hybrid if stated — be precise about what runs where",
  "adoptionSignal": "user count or growth metric if stated",
  "qualityMetric": "accuracy or benchmark if stated",
  "keyFacts": ["important facts quoted directly — up to 15 quotes, include any contradictions found"]
}`;

// ── Synthesize: full expert analysis ─────────────────────────────────────────
const SYNTHESIZE_SYSTEM = `You are a world-class AI product analyst. Founders and senior PMs will read this. Be accurate, specific, and deeply expert.

══ CONFIDENCE ══
"confirmed" → in provided sources
"inferred"  → you know this from training knowledge — state it confidently and specifically
"unknown"   → zero basis anywhere — extremely rare, only for truly undisclosed obscure product specs

══ PRODUCT KNOWLEDGE (use as "inferred" when search doesn't confirm) ══
OpenAI: NVIDIA H100 SXM5 on Azure, PyTorch + TensorRT, GPT-4o 128K context
ChatGPT Voice: GPT-4o Realtime API, WebSocket, <320ms latency, Plus $20/mo
GitHub Copilot: GPT-4 Codex fine-tuned on GitHub, Azure, 64K context, $10/mo individual
Gemini / Gemini Live: TPU v5p, JAX, 1M context, <300ms
Google Lens: ViT + Gemini, TPU v5 cloud + TFLite on-device, hybrid
Samsung Galaxy AI / Transcript Assist: CRITICAL FACTS — Transcript Assist is FULLY ON-DEVICE. Audio NEVER leaves the device. NO network connection required for transcription. NO Samsung account required for transcription. Hardware: Exynos 2400 NPU (34.4 TOPS, 6-core) on international models, Snapdragon 8 Gen 3 NPU on US models. Framework: Samsung Neural SDK + TensorFlow Lite. Cost: FREE, bundled with Galaxy S24 series and newer. Context: up to 3 hours of audio per session. Languages: 13+ supported. Latency: real-time display, <100ms lag. The "requires network" message in some Samsung docs refers to OTHER Galaxy AI features like Circle to Search — NOT Transcript Assist.
Apple Intelligence / Siri: Apple Neural Engine, Core ML, on-device + Private Cloud Compute
Notion AI: GPT-4o + Claude 3.5 routing, NVIDIA H100 via APIs, cloud-only, $10/mo
Grammarly: custom transformers + GPT-4, hybrid, PyTorch
Perplexity: GPT-4o + Claude 3.5 + Llama 3 routing, H100 cluster, real-time web search
Meta AI / Llama: Llama 4 Scout (17Bx16E, 10M ctx) + Llama 4 Maverick (17Bx128E, 1M ctx), MoE architecture, NVIDIA H100 training + B200 inference, PyTorch, 600M MAU, free via ads
Instagram Reels: custom recommendation transformer, H100, PyTorch, <100ms ranking
Facebook Feed: DLRM model, custom AI hardware, PyTorch, trillion-scale training
Netflix: two-tower retrieval + ranking neural nets, AWS P4d (A100), TensorFlow + PyTorch, 100ms SLA, 260M+ member history
Amazon Alexa: custom NLU/ASR, AWS Inferentia, on-device wake word + cloud NLU, <300ms
AWS Bedrock: multi-model API (Claude, Llama, Titan), NVIDIA A100/H100, pay-per-token
Spotify: BaRT recommendation model, GCP TPUs + AWS, PyTorch, 100M+ track embeddings
Grok (xAI): Grok-2, Oracle Cloud H100s, 128K context
Tesla Autopilot: custom FSD chip 72 TOPS, PyTorch, camera-only, fully on-device
Uber: real-time ML platform Michelangelo, GCP + AWS, PyTorch, <100ms trip ETA

For ANY product not listed: use search results + your knowledge of that company's known tech patterns.

══ PM INSIGHTS — MANDATORY FORMAT ══
Each insight MUST have: specific number + real decision the PM owns.

BANNED (never write):
✗ "Monitor user feedback to improve quality"
✗ "Consider the competitive landscape"
✗ "Explore partnerships to enhance accuracy"
✗ "Assess pricing impact on retention"
✗ Any vague statement without a specific number

REQUIRED (every insight looks like this):
✓ "Notion AI routes between GPT-4o and Claude 3.5 by task type. PM must define latency SLA: summarization <3s, inline suggestions <500ms. Regression triggers automatic model rollback before next release."
✓ "Netflix recommendation CTR drops ~30% when latency exceeds 100ms. The PM must maintain a p99 serving latency budget and gate any model update that regresses past this on offline eval before A/B test."
✓ "Samsung Transcript Assist runs entirely on Exynos 2400 NPU (34.4 TOPS). PM must define WER budget per language: English <5%, Korean <8%. Any OTA that regresses past this must be blocked."
✓ "Free-to-paid conversion for B2C AI tools benchmarks at 3–8%. If conversion drops below 3%, the paywall hits before value delivery — move it past the first successful output."

══ INFRA DIAGRAM ══
Use REAL product component names. Never generic names.
✓ "Notion AI Multi-Model Router", "Exynos 2400 NPU ASR Engine", "Netflix Two-Tower Retrieval Model"
✗ "AI Model", "Backend Server", "Data Preprocessor", "Analytics Engine"

Return ONLY raw JSON. No markdown. No backticks.

JSON:
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
    { "layer": "Input Layer", "description": "How user input enters", "components": [
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
    return new Response(JSON.stringify({ error: "Missing TAVILY_API_KEY or OPENAI_API_KEY." }), { status: 500 });

  const { query } = await req.json();
  if (!query?.trim()) return new Response(JSON.stringify({ error: "Query required" }), { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (event: string, data: unknown) =>
        ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ event, data })}\n\n`));
      try {
        // ── Phase 1: Google → get URLs + answer boxes ─────────────────────────
        send("status", { step: 1, message: "Searching Google for sources…" });
        const google = await getGoogleUrls(query.trim(), serperKey);

        // ── Phase 2: Fetch full content of those URLs ─────────────────────────
        send("status", { step: 2, message: `Found ${google.urls.length} sources. Fetching full content…` });
        const [fullContent, exaResults] = await Promise.all([
          fetchFullContent(google.urls, query.trim(), tavilyKey),
          searchExa(query.trim(), exaKey),
        ]);

        // Merge all sources
        const seen = new Set<string>();
        const allSources: { title: string; url: string; content: string; type: string }[] = [];

        const addSource = (title: string, url: string, content: string, type: string) => {
          const k = url || title;
          if (k && !seen.has(k) && content.length > 10) {
            seen.add(k);
            allSources.push({ title, url, content, type });
          }
        };

        // Answer boxes first — highest trust
        for (const s of google.answerBoxes) addSource(`[ANSWER BOX] ${s.title}`, s.url, s.content, "official");
        // Full page content — most valuable
        for (const s of fullContent) addSource(s.title, s.url, s.content, "article");
        // Exa semantic results
        for (const s of exaResults) addSource(s.title, s.url, s.content, "article");
        // Organic snippets as fallback
        for (const s of google.organicSnippets) addSource(s.title, s.url, s.snippet, "article");

        send("status", { step: 3, message: `Analyzing ${allSources.length} sources…` });

        // ── Phase 3: Extract confirmed facts ──────────────────────────────────
        const topForExtract = allSources.slice(0, 20);
        const sourcesText = topForExtract
          .map((s, i) => `[${i+1}] ${s.title}\nURL: ${s.url}\n${s.content.slice(0, 2000)}`)
          .join("\n\n---\n\n");

        const kgSection = google.knowledgeGraph ? `\nKNOWLEDGE GRAPH:\n${google.knowledgeGraph}\n` : "";

        const extractRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: "gpt-4o-mini", temperature: 0, max_tokens: 1500, stream: false,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: EXTRACT_SYSTEM },
              { role: "user", content: `Product: "${query.trim()}"${kgSection}\n\nSources:\n${sourcesText}` }
            ]
          }),
        });

        let extracted: Record<string, unknown> = {};
        if (extractRes.ok) {
          const d = await extractRes.json();
          try { extracted = JSON.parse(d.choices?.[0]?.message?.content ?? "{}"); } catch { /**/ }
        }

        // ── Phase 4: Synthesize full analysis ────────────────────────────────
        send("status", { step: 4, message: "Synthesizing expert analysis…" });

        const synthesizeMsg = `Analyze THIS SPECIFIC FEATURE: "${query.trim()}"

CONFIRMED FACTS (extracted from live sources — mark these "confirmed"):
${JSON.stringify(extracted, null, 2)}

${google.knowledgeGraph ? `GOOGLE KNOWLEDGE GRAPH:\n${google.knowledgeGraph}\n` : ""}
TOP SOURCES (full content):
${allSources.slice(0, 16).map((s, i) => `[${i+1}] ${s.title}\n${s.content.slice(0, 1000)}`).join("\n\n---\n\n")}

CRITICAL RULES:
1. Only apply facts that are specifically about "${query.trim()}" — not other features of the same product
2. Use your training knowledge to fill gaps — mark "inferred" with real specific numbers
3. "unknown" only when you have absolutely zero basis — should be rare
4. Every pmInsight MUST contain a specific number and describe a real PM decision to own
5. Name every infra component after actual product features (e.g. "Exynos 2400 NPU ASR Engine" not "AI Model")
Return ONLY the JSON.`;

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
