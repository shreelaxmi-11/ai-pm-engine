import { NextRequest } from "next/server";
export const runtime = "edge";

const SYSTEM = `You are a senior AI systems analyst. Your job is to extract accurate, specific technical facts about AI product features from live search results.

EXTRACTION RULES - read every source carefully:
1. PRIORITIZE live sources above all else. If a source says X, use X and mark "confirmed".
2. For context window: never say "N/A". Describe what the model actually processes - tokens for LLMs, document-level for writing tools, audio duration for speech, image/scene for vision models.
3. For latency: extract any specific ms/s numbers mentioned. If only qualitative ("fast", "real-time"), say that and mark "inferred".
4. For cost: extract exact pricing from sources. If not found, use your training knowledge and mark "inferred".
5. For hardware/framework: extract from engineering blogs, job listings, or official docs in the sources.
6. Confidence labels: "confirmed" = explicitly stated in a source. "inferred" = reasoned from related evidence. "unknown" = genuinely not findable.
7. NEVER say "Not publicly disclosed" or "N/A" without a good reason - dig into the sources first.
8. pmInsights: must contain specific numbers, real decisions, and concrete trade-offs. No generic advice.
9. infraDiagram: use REAL component names from the sources. 4-5 layers minimum.
10. Return ONLY raw JSON starting with { ending with }.`

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
    "name": { "value": "exact model e.g. GPT-4o, Whisper v3, ViT-L/14", "confidence": "confirmed|inferred|unknown" },
    "provider": { "value": "string", "confidence": "confirmed|inferred|unknown" },
    "type": { "value": "e.g. Multimodal LLM, Vision Transformer, Speech-to-Speech", "confidence": "confirmed|inferred|unknown" },
    "contextWindow": { "value": "e.g. 128K tokens, N/A for vision", "confidence": "confirmed|inferred|unknown" },
    "finetuned": { "value": "yes - fine-tuned for X | no | unknown", "confidence": "confirmed|inferred|unknown" }
  },
  "performance": {
    "latency": { "value": "specific numbers e.g. <300ms first chunk, ~200ms on-device", "confidence": "confirmed|inferred|unknown" },
    "quality": { "value": "specific metric e.g. WER 2.7%, top-1 87% ImageNet, or qualitative with data", "confidence": "confirmed|inferred|unknown" },
    "cost": { "value": "real pricing e.g. $20/mo Plus, $10/mo Copilot, free+$20/mo Pro", "confidence": "confirmed|inferred|unknown" },
    "privacy": { "value": "specific policy e.g. not stored after session, on-device = no data sent", "confidence": "confirmed|inferred|unknown" },
    "reliability": { "value": "e.g. 99.9%+ API target, no consumer SLA", "confidence": "confirmed|inferred|unknown" }
  },
  "stack": {
    "hardware": [{ "value": "e.g. NVIDIA H100 SXM5 on Azure, Google TPU v4, Exynos 2400 NPU", "confidence": "confirmed|inferred|unknown" }],
    "frameworks": [{ "value": "e.g. PyTorch, JAX, TensorFlow Lite, TensorRT", "confidence": "confirmed|inferred|unknown" }],
    "apis": [{ "value": "e.g. Realtime API WebSocket, REST+SSE, on-device SDK", "confidence": "confirmed|inferred|unknown" }],
    "vectorDB": { "value": "e.g. not applicable (generative feature) | Pinecone | pgvector", "confidence": "confirmed|inferred|unknown" },
    "orchestration": { "value": "e.g. custom pipeline, multi-model router", "confidence": "confirmed|inferred|unknown" },
    "deployment": { "value": "cloud-only | on-device+cloud hybrid - specify which parts run where", "confidence": "confirmed|inferred|unknown" }
  },
  "optimizations": ["specific techniques e.g. INT8 quantization, KV cache, WebSocket streaming, speculative decoding"],
  "tradeoffs": [
    { "label": "label", "description": "2-3 sentences: real tension, what was gained/lost, why this call", "dimension": "quality-latency|privacy-accuracy|cost-scale|ondevice-cloud|general" },
    { "label": "label", "description": "...", "dimension": "..." },
    { "label": "label", "description": "...", "dimension": "..." }
  ],
  "productImpact": {
    "adoptionSignal": "specific evidence e.g. 100M users, #1 App Store, 1.5M subscribers",
    "retentionImpact": "what drives users back specifically because of this feature",
    "churnImpact": "what happens when this feature degrades",
    "userSegment": "specific segment e.g. developers 50+ completions/day",
    "successMetrics": ["specific metric", "second metric", "third metric"]
  },
  "pmInsights": [
    "insight with specific numbers and real PM decision",
    "failure mode or error budget this PM must define",
    "trade-off made and whether it was right - with reasoning",
    "what a competitor doing this differently reveals",
    "what this feature must do in next 12 months"
  ],
  "infraDiagram": [
    { "layer": "Input Layer", "description": "How user input enters the system", "components": [
      { "name": "real component name", "detail": "specific detail with numbers", "children": [{ "name": "sub-component", "detail": "detail" }] }
    ]},
    { "layer": "Processing Layer", "description": "Pre-processing and routing", "components": [] },
    { "layer": "Model Layer", "description": "Core AI inference", "components": [] },
    { "layer": "Output Layer", "description": "Response delivery", "components": [] },
    { "layer": "Observability Layer", "description": "Monitoring and quality", "components": [] }
  ],
  "sources": [{ "title": "string", "url": "string", "type": "official|article|analysis" }]
}`;

async function searchTavily(query: string, key: string) {
  const results: { title: string; url: string; content: string }[] = [];
  // Extract core product name for targeted searches
  const q = query.trim();
  await Promise.all([
    `${q} AI model architecture how it works engineering blog`,
    `${q} machine learning infrastructure GPU latency benchmarks`,
    `${q} product specs pricing context window performance`,
    `${q} site:engineering.fb.com OR site:research.google OR site:openai.com OR site:blog.google OR site:samsung.com technical`,
    `"${q}" system design on-device cloud inference pipeline`,
    `${q} product manager PM metrics adoption trade-offs`,
  ].map(async (sq) => {
    try {
      const r = await fetch("https://api.tavily.com/search", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: key,
          query: sq,
          search_depth: "advanced",
          max_results: 4,
          include_domains: [],
          exclude_domains: ["pinterest.com","reddit.com","quora.com"],
        }),
      });
      if (!r.ok) return;
      const d = await r.json();
      for (const x of (d.results ?? []))
        if (!results.find(e => e.url === x.url))
          results.push({ title: x.title ?? "", url: x.url ?? "", content: (x.content ?? "").slice(0, 1500) });
    } catch { /* ignore */ }
  }));
  return results.slice(0, 12);
}

export async function POST(req: NextRequest) {
  const tavilyKey    = process.env.TAVILY_API_KEY ?? "";
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? "";
  if (!tavilyKey)   return new Response(JSON.stringify({ error: "Missing TAVILY_API_KEY." }), { status: 500 });
  if (!anthropicKey) return new Response(JSON.stringify({ error: "Missing ANTHROPIC_API_KEY." }), { status: 500 });

  const { query } = await req.json();
  if (!query?.trim()) return new Response(JSON.stringify({ error: "Query required" }), { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (event: string, data: unknown) =>
        ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ event, data })}\n\n`));
      try {
        send("status", { step: 1, message: "Searching public sources…" });
        const sources = await searchTavily(query.trim(), tavilyKey);
        if (!sources.length) { send("error", { message: "No sources found. Check TAVILY_API_KEY in Vercel." }); ctrl.close(); return; }

        send("status", { step: 2, message: `Found ${sources.length} sources. Analyzing…` });
        const sourcesText = sources.map((s, i) => `[${i+1}] ${s.title}\nURL: ${s.url}\n${s.content}`).join("\n\n---\n\n");

        const userMsg = `Analyze: "${query.trim()}"

YOUR PRIMARY JOB: Extract every specific fact you can find in the sources below. Read each source carefully.

LIVE SOURCES (${sources.length} retrieved - these are your ground truth):
---
${sourcesText}
---

EXTRACTION CHECKLIST - find each of these in the sources:
- Model name: look for exact model names, version numbers, architecture names
- Context window: look for token counts, document size limits, audio duration, image resolution limits
- Latency: look for ms, seconds, "real-time", benchmarks, SLA numbers
- Cost: look for pricing pages, subscription tiers, per-request costs
- Hardware: look for GPU/TPU/NPU mentions, chip names, cloud provider names
- Framework: look for PyTorch, JAX, TensorFlow, ONNX, TensorRT mentions
- Deployment: look for "on-device", "cloud", "hybrid", "edge" mentions
- Privacy: look for data retention policies, "not stored", "on-device processing"

FOR EACH FIELD:
- If found in sources: use exact value, mark "confirmed"
- If reasonably inferable from sources: mark "inferred"  
- If truly not anywhere: mark "unknown" (avoid this)
- NEVER use "N/A" - always describe what the feature actually processes

Return ONLY raw JSON, no markdown, no backticks.`;

        send("status", { step: 3, message: "Extracting fields and PM signals…" });

        // Sanitize before sending to Claude
        const sanitize = (s: string) => {
          if (!s) return "";
          let r = "";
          for (let i = 0; i < s.length; i++) {
            const c = s.charCodeAt(i);
            if (c >= 0xD800 && c <= 0xDBFF) {
              const n = s.charCodeAt(i+1);
              if (n >= 0xDC00 && n <= 0xDFFF) { r += s[i] + s[i+1]; i++; }
            } else if (c >= 0xDC00 && c <= 0xDFFF) {
              // skip lone surrogate
            } else if (c < 0x0009 || (c > 0x000D && c < 0x0020)) {
              // skip control chars
            } else { r += s[i]; }
          }
          return r;
        };

        const llmRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 4000,
            system: sanitize(SYSTEM),
            messages: [{ role: "user", content: sanitize(userMsg) }],
          }),
        });

        if (!llmRes.ok) { send("error", { message: `Anthropic error (${llmRes.status}): ${(await llmRes.text()).slice(0,200)}` }); ctrl.close(); return; }

        send("status", { step: 4, message: "Building dashboard…" });
        const llmData = await llmRes.json();
        const raw = llmData.content?.[0]?.text ?? "";
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
        const seen = new Set((result.sources ?? []).map((s: { url: string }) => s.url));
        for (const s of sources)
          if (!seen.has(s.url)) { result.sources = [...(result.sources ?? []), { title: s.title, url: s.url, type: "article" }]; seen.add(s.url); }

        send("complete", result);
      } catch (e) {
        send("error", { message: e instanceof Error ? e.message : "Unknown error." });
      } finally { ctrl.close(); }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
}
