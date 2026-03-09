import { NextRequest } from "next/server";
export const runtime = "edge";

// ── Known facts — fallback only when search finds nothing ─────────────────────
const KNOWN_FACTS: Record<string, string> = {
  //"openai":              "Hardware: NVIDIA H100 SXM5 on Azure. Framework: PyTorch + TensorRT. GPT-4o context: 128K tokens.",
  // "chatgpt voice":       "Model: GPT-4o native speech-to-speech (Realtime API). Hardware: NVIDIA H100 on Azure. Framework: PyTorch. Context: 128K tokens. API: WebSocket streaming. Latency: <320ms avg. Cost: Plus $20/mo, Pro $200/mo. Privacy: audio not stored after session since Mar 2024.",
  // "chatgpt":             "Model: GPT-4o (Plus/Pro), GPT-4o mini (Free). Hardware: NVIDIA H100 on Azure. Framework: PyTorch. Context: 128K tokens. Cost: Free / Plus $20/mo / Pro $200/mo.",
  // "github copilot":      "Model: GPT-4 Codex lineage, fine-tuned on public GitHub code. Hardware: NVIDIA A100 on Azure. Framework: PyTorch. Context: 64K tokens. Latency: 200-400ms. Cost: Free (limited) / $10/mo individual / $19/mo business.",
  // "google lens":         "Model: Vision Transformer ViT + Gemini multimodal. Hardware: Google TPU v5 (cloud), Tensor G3 NPU on Pixel (on-device). Framework: JAX cloud, TFLite on-device. Latency: <200ms on-device, 800-1200ms cloud. Cost: free. Deployment: hybrid.",
  // "gemini live":         "Model: Gemini 1.5 Flash real-time audio. Hardware: Google TPU v5. Framework: JAX. Context: 1M tokens. Latency: <300ms. Cost: free / Google One AI Premium $19.99/mo.",
  // "gemini":              "Model: Gemini 1.5 Pro/Flash. Hardware: Google TPU v5p. Framework: JAX. Context: 1M tokens. Cost: Free / Advanced $19.99/mo.",
  // "notion ai":           "Model: OpenAI GPT-4 + Anthropic Claude (multi-model routing). Hardware: NVIDIA A100 on Azure + AWS. Framework: PyTorch. Context: entire document. Cost: $10/mo per member add-on, $8/mo annually. Privacy: Zero data retention Enterprise. Deployment: cloud-only.",
  // "grammarly":           "Model: Proprietary transformers + GPT-4 for GrammarlyGO. Hardware: custom GPU clusters. Framework: PyTorch. Latency: <100ms grammar, 1-2s generative. Cost: Free / Premium $12/mo / Business $15/user/mo. Deployment: hybrid.",
  // "perplexity":          "Model: Routes GPT-4o + Claude 3.5 + Llama 3 + Mixtral. Hardware: NVIDIA H100 cluster. Framework: PyTorch. Context: 32K tokens. Latency: 2-4s. Cost: Free / Pro $20/mo. Architecture: live web search + LLM synthesis.",
  // "samsung transcript":  "Model: Custom on-device ASR. Hardware: Exynos 2400 NPU 34.4 TOPS (Samsung) / Snapdragon 8 Gen 3 NPU (US). Framework: Samsung Neural SDK + TensorFlow Lite. Context: 3 hours audio. Latency: real-time <100ms display lag. Cost: free bundled. Privacy: fully on-device, audio never sent to Samsung. Languages: 13+.",
  // "samsung":             "Hardware: Exynos 2400 NPU (34.4 TOPS, 6-core) / Snapdragon 8 Gen 3 NPU. Framework: Samsung Neural SDK + TensorFlow Lite. Samsung Gauss LLM for cloud tasks. Galaxy AI: hybrid on-device + cloud.",
  // "apple intelligence":  "Model: Custom Apple foundation models. Hardware: Apple Neural Engine (A17 Pro/M-series) + Apple Silicon PCC servers. Framework: Core ML. Latency: <100ms on-device. Cost: free. Deployment: hybrid on-device + Private Cloud Compute.",
  // "claude":              "Model: Claude 3.5 Sonnet/Haiku. Hardware: AWS Trainium2 + Inferentia2. Framework: JAX. Context: 200K tokens. Cost: Free / Pro $20/mo / Team $25/user/mo.",
  // "copilot":             "Model: GPT-4o via OpenAI. Hardware: Azure NVIDIA H100. Framework: PyTorch. Context: 128K tokens. Cost: Free / Pro $20/mo / M365 $30/user/mo.",
  // "meta ai":             "Model: Llama 3.1 405B. Hardware: NVIDIA H100 Meta infra + custom MTIA chips. Framework: PyTorch. Context: 128K tokens. Cost: free.",
  // "midjourney":          "Model: Midjourney V6.1 proprietary diffusion. Hardware: NVIDIA A100 clusters. Framework: PyTorch. Latency: 30-60s. Cost: Basic $10/mo / Standard $30/mo / Pro $60/mo.",
  // "dall-e":              "Model: DALL-E 3. Hardware: NVIDIA H100 on Azure. Framework: PyTorch. Latency: 10-30s/image. Cost: included ChatGPT Plus / API $0.04-0.08/image.",
  // "whisper":             "Model: Whisper large-v3. Hardware: NVIDIA GPU. Framework: PyTorch. Context: 30s audio chunks sliding window. WER: 2.7% English. Cost: $0.006/min API, free open source.",
  // "stable diffusion":    "Model: SDXL / SD 3.0 open source. Hardware: NVIDIA A100 or consumer GPU. Framework: PyTorch. Cost: free self-hosted. Deployment: local or cloud.",
  // "nano banana":         "Model: Gemini 3 Pro Image. Hardware: Google TPU v5. Framework: JAX. Context: 1M tokens, up to 14 reference images. Latency: 5-12s/image. Cost: $0.134-$0.24/image. Deployment: cloud-only.",
};

function getKnownFacts(query: string): string {
  const ql = query.toLowerCase();
  const keys = Object.keys(KNOWN_FACTS).sort((a, b) => b.length - a.length);
  for (const key of keys) if (ql.includes(key)) return KNOWN_FACTS[key];
  return "";
}

// ── Search providers ──────────────────────────────────────────────────────────

async function searchTavily(query: string, key: string): Promise<{ title: string; url: string; content: string }[]> {
  if (!key) return [];
  const results: { title: string; url: string; content: string }[] = [];
  await Promise.all([
    `${query} model architecture technical infrastructure how it works`,
    `${query} hardware chip NPU GPU latency performance specs`,
    `${query} pricing cost context window official`,
    `${query} on-device cloud deployment privacy engineering`,
  ].map(async (q) => {
    try {
      const r = await fetch("https://api.tavily.com/search", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: key, query: q, search_depth: "advanced", max_results: 3,
          exclude_domains: ["reddit.com", "quora.com", "pinterest.com"] }),
      });
      if (!r.ok) return;
      const d = await r.json();
      for (const x of (d.results ?? []))
        if (!results.find(e => e.url === x.url))
          results.push({ title: x.title ?? "", url: x.url ?? "", content: (x.content ?? "").slice(0, 1500) });
    } catch { /* ignore */ }
  }));
  return results;
}

async function searchSerper(query: string, key: string): Promise<{ title: string; url: string; content: string }[]> {
  if (!key) return [];
  const results: { title: string; url: string; content: string }[] = [];
  await Promise.all([
    `${query} context window hardware specs pricing`,
    `${query} model architecture technical`,
  ].map(async (q) => {
    try {
      const r = await fetch("https://google.serper.dev/search", {
        method: "POST", headers: { "Content-Type": "application/json", "X-API-KEY": key },
        body: JSON.stringify({ q, num: 6 }),
      });
      if (!r.ok) return;
      const d = await r.json();
      if (d.answerBox?.answer) results.push({ title: `Answer: ${d.answerBox.title ?? q}`, url: d.answerBox.link ?? "", content: d.answerBox.answer });
      if (d.answerBox?.snippet) results.push({ title: `Snippet: ${d.answerBox.title ?? q}`, url: d.answerBox.link ?? "", content: d.answerBox.snippet });
      if (d.knowledgeGraph?.description) results.push({ title: d.knowledgeGraph.title ?? "Knowledge Graph", url: d.knowledgeGraph.descriptionLink ?? "", content: JSON.stringify(d.knowledgeGraph).slice(0, 800) });
      for (const x of (d.organic ?? []))
        if (!results.find(e => e.url === x.link))
          results.push({ title: x.title ?? "", url: x.link ?? "", content: x.snippet ?? "" });
    } catch { /* ignore */ }
  }));
  return results;
}

async function searchExa(query: string, key: string): Promise<{ title: string; url: string; content: string }[]> {
  if (!key) return [];
  const results: { title: string; url: string; content: string }[] = [];
  await Promise.all([
    `${query} technical specifications architecture`,
    `${query} pricing documentation official`,
  ].map(async (q) => {
    try {
      const r = await fetch("https://api.exa.ai/search", {
        method: "POST", headers: { "Content-Type": "application/json", "x-api-key": key },
        body: JSON.stringify({ query: q, numResults: 4, useAutoprompt: true, contents: { text: { maxCharacters: 1200 } } }),
      });
      if (!r.ok) return;
      const d = await r.json();
      for (const x of (d.results ?? []))
        if (!results.find(e => e.url === x.url))
          results.push({ title: x.title ?? "", url: x.url ?? "", content: x.text ?? "" });
    } catch { /* ignore */ }
  }));
  return results;
}

// ── Call 1: extract raw facts from sources ────────────────────────────────────
const EXTRACT_SYSTEM = `You are a technical research assistant. Extract specific factual data points from search results.
Return ONLY a JSON object with these exact keys — fill each with the best answer found, or null if genuinely not found:
{
  "modelName": "exact model name",
  "modelType": "model architecture type",
  "provider": "company providing the model",
  "contextWindow": "context window size",
  "hardware": "specific hardware chips/GPUs/NPUs",
  "frameworks": "ML frameworks used",
  "latency": "latency numbers",
  "cost": "pricing",
  "privacy": "privacy policy",
  "deployment": "cloud/on-device/hybrid",
  "finetuned": "fine-tuning details",
  "adoptionSignal": "usage numbers or adoption evidence",
  "userSegment": "primary users",
  "keyFacts": ["fact 1", "fact 2", "fact 3", "fact 4", "fact 5"]
}
Be literal. Only extract what is explicitly stated in sources. Do not infer yet.`;

// ── Call 2: synthesize full analysis ─────────────────────────────────────────
const SYNTHESIZE_SYSTEM = `You are a senior AI systems analyst and PM expert. Produce a complete, accurate, expert-level breakdown of an AI product feature.

RULES:
1. Extracted facts (marked EXTRACTED) are from live search — use them and mark "confirmed".
2. Known facts (marked KNOWN) are verified ground truth — use them and mark "confirmed".
3. Use your deep training knowledge to fill remaining gaps — mark "inferred". Be specific and technical.
4. "unknown" is only for fields where you have absolutely zero basis to answer — this should be rare.
5. pmInsights must be expert-level with specific numbers, real engineering decisions, real trade-offs. No generic advice ever.
6. infraDiagram: use REAL component names from the product. Every single layer must have at least one specific component.
7. Return ONLY raw JSON starting with { ending with }. No markdown, no backticks.

EXAMPLE of good vs bad:
BAD pmInsight: "Monitor latency to ensure user satisfaction."
GOOD pmInsight: "Samsung Transcript Assist runs entirely on the Exynos 2400 NPU (34.4 TOPS) — zero audio leaves the device. The PM must own a WER budget per language: English <5%, Korean <8%. Any model update that regresses beyond this threshold must be blocked from OTA rollout."

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
    { "label": "string", "description": "2-3 sentences: real tension, what was gained, what was lost, why this call", "dimension": "quality-latency|privacy-accuracy|cost-scale|ondevice-cloud|general" },
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
        // ── STEP 1: Search all providers in parallel ──────────────────────────
        const activeProviders = ["Tavily", serperKey ? "Serper" : null, exaKey ? "Exa" : null].filter(Boolean).join(" + ");
        send("status", { step: 1, message: `Searching via ${activeProviders}…` });

        const [tavilyResults, serperResults, exaResults] = await Promise.all([
          searchTavily(query.trim(), tavilyKey),
          searchSerper(query.trim(), serperKey),
          searchExa(query.trim(), exaKey),
        ]);

        const seen = new Set<string>();
        const allSources: { title: string; url: string; content: string; provider: string }[] = [];
        for (const [results, provider] of [
          [serperResults, "Serper"],
          [exaResults, "Exa"],
          [tavilyResults, "Tavily"],
        ] as [{ title: string; url: string; content: string }[], string][]) {
          for (const s of results) {
            const k = s.url || s.title;
            if (k && !seen.has(k)) { seen.add(k); allSources.push({ ...s, provider }); }
          }
        }

        if (!allSources.length) { send("error", { message: "No sources found. Check API keys." }); ctrl.close(); return; }

        const countByProvider = allSources.reduce((acc, s) => { acc[s.provider] = (acc[s.provider] ?? 0) + 1; return acc; }, {} as Record<string, number>);
        const providerSummary = Object.entries(countByProvider).map(([p, n]) => `${p}:${n}`).join(", ");
        send("status", { step: 2, message: `Found ${allSources.length} sources (${providerSummary}). Extracting facts…` });

        // ── STEP 2: Call 1 — Extract raw facts from sources ───────────────────
        const sourcesText = allSources.slice(0, 20)
          .map((s, i) => `[${i + 1}] ${s.title} [${s.provider}]\nURL: ${s.url}\n${s.content}`)
          .join("\n\n---\n\n");

        const extractRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: "gpt-4o-mini", temperature: 0, max_tokens: 1000, stream: false,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: EXTRACT_SYSTEM },
              { role: "user", content: `Extract all facts about "${query.trim()}" from these sources:\n\n${sourcesText}` }
            ]
          }),
        });

        let extracted: Record<string, unknown> = {};
        if (extractRes.ok) {
          const extractData = await extractRes.json();
          try { extracted = JSON.parse(extractData.choices?.[0]?.message?.content ?? "{}"); } catch { /* ignore */ }
        }

        // ── STEP 3: Call 2 — Full synthesis with extracted + known facts ──────
        send("status", { step: 3, message: "Synthesizing analysis…" });

        const knownFacts = getKnownFacts(query.trim());
        const synthesizeMsg = `Analyze: "${query.trim()}"

EXTRACTED FACTS (from live search — use these, mark "confirmed"):
${JSON.stringify(extracted, null, 2)}

${knownFacts ? `KNOWN FACTS (verified ground truth — use for gaps, mark "confirmed"):\n${knownFacts}` : ""}

TOP SOURCES for reference:
${allSources.slice(0, 8).map(s => `- ${s.title}: ${s.content.slice(0, 300)}`).join("\n")}

Now produce the complete expert PM analysis. Use extracted facts first, known facts for gaps, your training knowledge for the rest. Mark confidence accurately. Be specific — real numbers, real component names, real PM decisions. Return ONLY the JSON.`;

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
        const seenUrls = new Set(Array.from((result.sources ?? []).map((s: { url: string }) => s.url)));
        for (const s of allSources)
          if (s.url && !seenUrls.has(s.url)) {
            result.sources = [...(result.sources ?? []), { title: s.title, url: s.url, type: "article" }];
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
