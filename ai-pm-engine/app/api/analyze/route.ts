import { NextRequest } from "next/server";
export const runtime = "edge";

const KNOWN_FACTS = `
KNOWN PUBLIC FACTS — use these when relevant, mark as "confirmed":

OPENAI:
- Hardware: NVIDIA A100 (80GB) and H100 SXM5 GPUs on Microsoft Azure (ND A100 v4 / ND H100 v5 series)
- Framework: PyTorch for training, custom inference stack, TensorRT for optimization
- ChatGPT Voice / Realtime API: uses Whisper v3 for ASR, GPT-4o for reasoning, custom TTS model
- GPT-4o context window: 128K tokens
- Realtime API uses WebSocket for bidirectional audio streaming
- ChatGPT Plus: $20/month, includes Voice Mode
- Latency targets: <300ms first audio chunk for Voice Mode
- Privacy: voice data not stored by default since March 2024

GOOGLE:
- Hardware: custom TPU v4 and TPU v5e pods, also NVIDIA A100/H100 for some workloads
- Framework: JAX for training large models, TensorFlow for production inference
- Gemini 1.5 Pro: 1M token context window
- Gemini 1.5 Flash: 1M token context window, optimized for speed
- Google Lens: uses Vision Transformer (ViT) + multimodal Gemini models, TensorFlow Lite on-device
- Google Lens runs hybrid: lightweight model on-device (TFLite), heavy processing in cloud
- Nano Banana Pro (Gemini 3 Pro Image): 1M token context window, 14 reference images per prompt, $0.134-$0.24 per image, 5-12s latency

MICROSOFT / GITHUB:
- GitHub Copilot: uses OpenAI Codex (GPT-4 based), fine-tuned on public GitHub code
- GitHub Copilot Individual: $10/month or $100/year
- GitHub Copilot Business: $19/user/month
- Copilot runs on Azure OpenAI Service — Hardware: NVIDIA A100 GPUs on Azure

META:
- Hardware: NVIDIA H100 GPUs, custom MTIA chips
- Framework: PyTorch (Meta created PyTorch)
- Llama 3.1: 128K context window

ANTHROPIC (Claude):
- Hardware: NVIDIA A100/H100 on AWS and Google Cloud
- Framework: JAX for training
- Claude 3.5 Sonnet: 200K context window

NOTION AI:
- Powered by OpenAI GPT-4 and Anthropic Claude (multiple LLMs via API routing)
- Hardware: NVIDIA A100 on Azure (via OpenAI API) and AWS (via Anthropic API)
- Framework: PyTorch (via provider APIs)
- $10/month add-on or included in Business/Enterprise plan
- Context: entire document content passed as context to LLM API
- Deployment: cloud-only
- Privacy: Zero data retention for Enterprise plan

GRAMMARLY:
- Uses custom transformer models + OpenAI GPT-4 for GrammarlyGO generative features
- On-device processing for basic grammar checking, cloud for AI writing suggestions
- Free tier available, Premium $12/month

PERPLEXITY:
- Uses multiple LLMs: GPT-4o, Claude 3.5, Llama 3, Mixtral (model routing by query type)
- Real-time web search + LLM synthesis pipeline
- Perplexity Pro: $20/month
- Hardware: NVIDIA H100 inference cluster

SAMSUNG GALAXY AI:
- On-device AI uses Samsung Exynos NPU — Exynos 2400 has 6-core NPU at 34.4 TOPS
- Snapdragon 8 Gen 3 NPU for US/some international variants
- Samsung Neural SDK + TensorFlow Lite for on-device inference
- Samsung Gauss: proprietary LLM for cloud tasks
- Galaxy AI features run hybrid: sensitive data on-device, complex tasks in cloud
- Transcript Assist: fully on-device ASR, audio never leaves the device, supports 13+ languages
- Transcript Assist context: up to 3 hours of audio per session
`;

const SYSTEM = `You are a senior AI systems analyst. Produce expert, specific, accurate PM breakdowns of AI features.

${KNOWN_FACTS}

CRITICAL RULES:
1. Live search sources come first — extract every fact you can find from them.
2. KNOWN FACTS above are ground truth for listed products — use when sources don't cover something, mark "confirmed".
3. Use your training knowledge for anything still missing — mark "inferred".
4. "unknown" is a last resort — only use it when a field genuinely cannot be found or inferred anywhere.
5. Hardware is NEVER unknown — every AI product runs on specific hardware. Find it in sources, KNOWN FACTS, or infer from company.
6. Frameworks are NEVER unknown for major companies — find in sources or infer from company patterns.
7. pmInsights: expert-level with specific numbers and real PM decisions. No generic advice.
8. infraDiagram: 4-5 layers, REAL component names. Every layer must have at least one component.
9. Return ONLY raw JSON starting with { ending with }. No markdown, no backticks.

BAD pmInsight: "Consider user feedback for continuous improvement."
GOOD pmInsight: "Samsung Transcript Assist processes audio entirely on the Exynos 2400 NPU (34.4 TOPS) — no audio ever leaves the device. The PM must define a WER (word error rate) budget per language: English target <5%, Korean <8%. Any regression beyond this triggers a model rollback before the next OTA."

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
    "name": { "value": "model name", "confidence": "confirmed|inferred|unknown" },
    "provider": { "value": "string", "confidence": "confirmed|inferred|unknown" },
    "type": { "value": "model type", "confidence": "confirmed|inferred|unknown" },
    "contextWindow": { "value": "context size", "confidence": "confirmed|inferred|unknown" },
    "finetuned": { "value": "yes — fine-tuned for X | no | unknown", "confidence": "confirmed|inferred|unknown" }
  },
  "performance": {
    "latency": { "value": "specific numbers", "confidence": "confirmed|inferred|unknown" },
    "quality": { "value": "specific metric or qualitative with data", "confidence": "confirmed|inferred|unknown" },
    "cost": { "value": "real pricing", "confidence": "confirmed|inferred|unknown" },
    "privacy": { "value": "specific policy", "confidence": "confirmed|inferred|unknown" },
    "reliability": { "value": "uptime or reliability data", "confidence": "confirmed|inferred|unknown" }
  },
  "stack": {
    "hardware": [{ "value": "specific hardware", "confidence": "confirmed|inferred|unknown" }],
    "frameworks": [{ "value": "specific framework", "confidence": "confirmed|inferred|unknown" }],
    "apis": [{ "value": "specific API", "confidence": "confirmed|inferred|unknown" }],
    "vectorDB": { "value": "vector DB or not applicable", "confidence": "confirmed|inferred|unknown" },
    "orchestration": { "value": "orchestration approach", "confidence": "confirmed|inferred|unknown" },
    "deployment": { "value": "cloud-only | on-device | hybrid — specify", "confidence": "confirmed|inferred|unknown" }
  },
  "optimizations": ["specific technique"],
  "tradeoffs": [
    { "label": "label", "description": "2-3 sentences: real tension, what was gained/lost, why", "dimension": "quality-latency|privacy-accuracy|cost-scale|ondevice-cloud|general" },
    { "label": "label", "description": "...", "dimension": "..." },
    { "label": "label", "description": "...", "dimension": "..." }
  ],
  "productImpact": {
    "adoptionSignal": "specific evidence with numbers",
    "retentionImpact": "what drives users back specifically",
    "churnImpact": "what happens when this feature degrades",
    "userSegment": "specific segment with detail",
    "successMetrics": ["specific metric", "second metric", "third metric"]
  },
  "pmInsights": [
    "insight with specific numbers and real PM decision",
    "failure mode or error budget this PM must define",
    "trade-off made and whether it was right — with reasoning",
    "what a competitor doing this differently reveals",
    "what this feature must do in next 12 months"
  ],
  "infraDiagram": [
    { "layer": "Input Layer", "description": "How user input enters the system", "components": [
      { "name": "real component name", "detail": "specific detail", "children": [{ "name": "sub-component", "detail": "detail" }] }
    ]},
    { "layer": "Processing Layer", "description": "Pre-processing and routing", "components": [
      { "name": "component name", "detail": "specific detail" }
    ]},
    { "layer": "Model Layer", "description": "Core AI inference", "components": [
      { "name": "component name", "detail": "specific detail" }
    ]},
    { "layer": "Output Layer", "description": "Response delivery", "components": [
      { "name": "component name", "detail": "specific detail" }
    ]},
    { "layer": "Observability Layer", "description": "Monitoring and quality", "components": [
      { "name": "component name", "detail": "specific detail" }
    ]}
  ],
  "sources": [{ "title": "string", "url": "string", "type": "official|article|analysis" }]
}`;

async function searchTavily(query: string, key: string): Promise<{ title: string; url: string; content: string }[]> {
  if (!key) return [];
  const results: { title: string; url: string; content: string }[] = [];
  const queries = [
    `${query} technical architecture model how it works`,
    `${query} hardware NPU chip infrastructure latency`,
    `${query} pricing cost specs official`,
    `${query} engineering system design pipeline`,
  ];
  await Promise.all(queries.map(async (q) => {
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
          results.push({ title: x.title ?? "", url: x.url ?? "", content: (x.content ?? "").slice(0, 1200) });
    } catch { /* ignore */ }
  }));
  return results;
}

async function searchSerper(query: string, key: string): Promise<{ title: string; url: string; content: string }[]> {
  if (!key) return [];
  const results: { title: string; url: string; content: string }[] = [];
  const queries = [
    `${query} context window specs hardware pricing`,
    `${query} model architecture technical details`,
  ];
  await Promise.all(queries.map(async (q) => {
    try {
      const r = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-KEY": key },
        body: JSON.stringify({ q, num: 6 }),
      });
      if (!r.ok) return;
      const d = await r.json();
      if (d.answerBox?.answer)
        results.push({ title: "Google Answer: " + (d.answerBox.title ?? q), url: d.answerBox?.link ?? "", content: d.answerBox.answer });
      if (d.answerBox?.snippet)
        results.push({ title: "Google Snippet: " + (d.answerBox.title ?? q), url: d.answerBox?.link ?? "", content: d.answerBox.snippet });
      if (d.knowledgeGraph)
        results.push({ title: d.knowledgeGraph.title ?? "Knowledge Graph", url: d.knowledgeGraph.descriptionLink ?? "", content: JSON.stringify(d.knowledgeGraph).slice(0, 1000) });
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
  const queries = [
    `${query} technical specifications architecture`,
    `${query} official documentation pricing`,
  ];
  await Promise.all(queries.map(async (q) => {
    try {
      const r = await fetch("https://api.exa.ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": key },
        body: JSON.stringify({ query: q, numResults: 4, useAutoprompt: true,
          contents: { text: { maxCharacters: 1000 } } }),
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

export async function POST(req: NextRequest) {
  const tavilyKey = process.env.TAVILY_API_KEY ?? "";
  const openaiKey = process.env.OPENAI_API_KEY ?? "";
  const serperKey = process.env.SERPER_API_KEY ?? "";
  const exaKey    = process.env.EXA_API_KEY ?? "";

  if (!tavilyKey || !openaiKey)
    return new Response(JSON.stringify({ error: "TAVILY_API_KEY and OPENAI_API_KEY are required in Vercel → Settings → Environment Variables." }), { status: 500 });

  const { query } = await req.json();
  if (!query?.trim()) return new Response(JSON.stringify({ error: "Query required" }), { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (event: string, data: unknown) =>
        ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ event, data })}\n\n`));
      try {
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

        if (!allSources.length) { send("error", { message: "No sources found. Check API keys in Vercel." }); ctrl.close(); return; }

        const countByProvider = allSources.reduce((acc, s) => { acc[s.provider] = (acc[s.provider] ?? 0) + 1; return acc; }, {} as Record<string, number>);
        const providerSummary = Object.entries(countByProvider).map(([p, n]) => `${p}:${n}`).join(", ");
        send("status", { step: 2, message: `Found ${allSources.length} sources (${providerSummary}). Analyzing…` });

        const sourcesText = allSources.slice(0, 22)
          .map((s, i) => `[${i + 1}] ${s.title} [${s.provider}]\nURL: ${s.url}\n${s.content}`)
          .join("\n\n---\n\n");

        const userMsg = `Analyze: "${query.trim()}"

STEP 1 — Extract every fact from these ${allSources.length} live sources:
---
${sourcesText}
---

STEP 2 — For any field not found in sources, check the KNOWN FACTS in your system prompt. If the product matches, use those facts and mark "confirmed".

STEP 3 — For any field still empty after steps 1 and 2, use your training knowledge and mark "inferred". 

NEVER mark a field "unknown" if:
- The product appears in KNOWN FACTS (check system prompt)
- The answer can be reasonably inferred from the company and product type
- Hardware: every AI product runs on specific hardware — infer from company if not in sources
- Frameworks: every AI product uses specific frameworks — infer from company if not in sources
- Pricing: look in sources first, then KNOWN FACTS, then infer from product tier

Return ONLY the JSON. Be specific on every single field.`;

        send("status", { step: 3, message: "Extracting fields and PM signals…" });

        const llmRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: "gpt-4o", temperature: 0.1, max_tokens: 4000, stream: false,
            response_format: { type: "json_object" },
            messages: [{ role: "system", content: SYSTEM }, { role: "user", content: userMsg }]
          }),
        });

        if (!llmRes.ok) { send("error", { message: `OpenAI error (${llmRes.status}): ${(await llmRes.text()).slice(0, 200)}` }); ctrl.close(); return; }

        send("status", { step: 4, message: "Building dashboard…" });
        const llmData = await llmRes.json();
        const raw = llmData.choices?.[0]?.message?.content ?? "";
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
