import { NextRequest } from "next/server";
export const runtime = "edge";

const SYSTEM = `You are a senior AI systems analyst. Produce expert, specific, accurate PM breakdowns of AI features.

RULES:
1. Source [0] is always the authoritative internal database. Its facts are CONFIRMED and take absolute priority over all other sources.
2. Use additional sources only to ADD new information not in Source [0].
3. Never override Source [0] facts with claims from other sources.
4. pmInsights: expert-level, specific numbers, real PM decisions. No generic advice.
5. infraDiagram: 4-5 layers, REAL component names. Every layer must have at least one component.
6. Return ONLY raw JSON starting with { ending with }. No markdown, no backticks.

BAD pmInsight: "Consider user feedback for continuous improvement."
GOOD pmInsight: "Notion AI routes between GPT-4 and Claude based on task type — summarization leverages Claude's 200K context window while drafting uses GPT-4 for instruction-following. The PM must own latency SLAs for each route: ~1-3s is acceptable for on-demand summarization, but inline suggestions must stay under 500ms or users abandon the feature."

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
    "contextWindow": { "value": "e.g. 128K tokens", "confidence": "confirmed|inferred|unknown" },
    "finetuned": { "value": "yes — fine-tuned for X | no | unknown", "confidence": "confirmed|inferred|unknown" }
  },
  "performance": {
    "latency": { "value": "specific numbers", "confidence": "confirmed|inferred|unknown" },
    "quality": { "value": "specific metric or qualitative with data", "confidence": "confirmed|inferred|unknown" },
    "cost": { "value": "real pricing", "confidence": "confirmed|inferred|unknown" },
    "privacy": { "value": "specific policy", "confidence": "confirmed|inferred|unknown" },
    "reliability": { "value": "e.g. 99.9%+ API target", "confidence": "confirmed|inferred|unknown" }
  },
  "stack": {
    "hardware": [{ "value": "specific hardware", "confidence": "confirmed|inferred|unknown" }],
    "frameworks": [{ "value": "specific framework", "confidence": "confirmed|inferred|unknown" }],
    "apis": [{ "value": "specific API", "confidence": "confirmed|inferred|unknown" }],
    "vectorDB": { "value": "specific or not applicable", "confidence": "confirmed|inferred|unknown" },
    "orchestration": { "value": "specific", "confidence": "confirmed|inferred|unknown" },
    "deployment": { "value": "cloud-only | on-device+cloud hybrid — specify", "confidence": "confirmed|inferred|unknown" }
  },
  "optimizations": ["specific techniques"],
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

// Hardcoded facts injected as Source [0] — highest priority, overrides all Tavily sources
const FACTS_DB: Record<string, string> = {
  "openai": "Hardware: NVIDIA A100/H100 SXM5 on Microsoft Azure (ND H100 v5 series). Framework: PyTorch + TensorRT. ChatGPT Plus: $20/mo. ChatGPT Team: $25/user/mo.",
  "chatgpt voice": "Model: GPT-4o (speech-to-speech, NOT a Whisper pipeline). Hardware: NVIDIA H100 SXM5 on Azure. Framework: PyTorch. Context: 128K tokens. Latency: <320ms avg end-to-end. Cost: Free (limited), Plus $20/mo, Pro $200/mo. Privacy: audio not stored after session by default since March 2024. API: Realtime API over WebSocket. Deployment: cloud-only.",
  "chatgpt": "Model: GPT-4o (Plus/Pro), GPT-4o mini (Free). Hardware: NVIDIA H100 on Azure. Framework: PyTorch. Context: 128K tokens. Latency: ~500ms first token. Cost: Free, Plus $20/mo, Pro $200/mo. Deployment: cloud-only.",
  "github copilot": "Model: GPT-4 based (Codex lineage), fine-tuned on public GitHub code. Hardware: NVIDIA A100 on Azure. Framework: PyTorch. Context: 64K tokens for code. Latency: 200-400ms inline completions. Cost: Free (limited), $10/mo individual, $19/mo business. Deployment: cloud-only via Azure OpenAI Service.",
  "google lens": "Model: Vision Transformer (ViT-L) + Gemini multimodal (cloud). Hardware: Google TPU v5 (cloud), Tensor G3 NPU on Pixel (on-device). Framework: JAX (cloud), TensorFlow Lite (on-device). Latency: <200ms on-device object recognition, 800-1200ms for cloud queries. Cost: free. Deployment: hybrid — TFLite on-device for fast recognition, Gemini cloud for complex queries.",
  "gemini": "Model: Gemini 1.5 Pro / Flash / 2.0. Hardware: Google TPU v5p. Framework: JAX. Context: 1M tokens (Gemini 1.5 Pro). Cost: Free, Advanced $19.99/mo. Deployment: cloud-only.",
  "gemini live": "Model: Gemini 1.5 Flash optimized for real-time audio. Hardware: Google TPU v5. Framework: JAX. Latency: <300ms conversational. Cost: Free / Google One AI Premium $19.99/mo. Deployment: cloud-only.",
  "notion ai": "Model: OpenAI GPT-4 + Anthropic Claude (multi-model routing — NOT GPT-5, NOT Claude Opus 4.5 Beta, NOT Gemini 2.5). Hardware: NVIDIA A100 on Azure (via OpenAI) + AWS (via Anthropic). Framework: PyTorch (via provider APIs). Context: entire document passed as LLM context. Cost: $10/mo per member add-on, $8/mo billed annually. Privacy: Zero data retention for Enterprise plan. Deployment: cloud-only. Orchestration: internal model router selects GPT-4 vs Claude based on task type.",
  "grammarly": "Model: Proprietary transformer + OpenAI GPT-4 for GrammarlyGO. Hardware: custom GPU clusters. Framework: PyTorch. Latency: <100ms grammar (extension), 1-2s generative. Cost: Free, Premium $12/mo, Business $15/user/mo. Deployment: hybrid — grammar on-device in extension, generative features cloud.",
  "perplexity": "Model: Routes across GPT-4o, Claude 3.5, Llama 3, Mixtral. Hardware: NVIDIA H100 cluster. Framework: PyTorch. Context: 32K tokens. Latency: 2-4s full answer. Cost: Free, Pro $20/mo. Deployment: cloud-only. Architecture: live web search + LLM synthesis (RAG pipeline).",
  "samsung transcript assist": "Model: Custom on-device ASR model. Hardware: Exynos 2400 NPU (34.4 TOPS, 6-core) / Snapdragon 8 Gen 3 NPU. Framework: Samsung Neural SDK + TensorFlow Lite. Context: up to 3 hours audio. Latency: real-time, <100ms display lag. Cost: free, bundled with Galaxy S23+. Privacy: fully on-device, audio never sent to Samsung servers. Deployment: on-device only (translation uses cloud).",
  "samsung": "Hardware: Exynos 2400 NPU (34.4 TOPS). Framework: Samsung Neural SDK, TensorFlow Lite. Samsung Gauss LLM for cloud tasks. Galaxy AI: hybrid on-device + cloud.",
  "apple intelligence": "Model: Custom Apple foundation models. Hardware: Apple Neural Engine (A17 Pro / M-series) + Apple Silicon servers. Framework: Core ML. Latency: <100ms on-device. Cost: free with iPhone 15 Pro / iPhone 16 / M-series Mac. Deployment: hybrid — on-device first, Private Cloud Compute for complex tasks. Privacy: PCC requests not logged by Apple.",
  "claude": "Model: Claude 3.5 Sonnet (most capable), Claude 3.5 Haiku (fast). Hardware: AWS Trainium2 + Inferentia2. Framework: JAX. Context: 200K tokens. Latency: ~400ms first token. Cost: Free, Pro $20/mo, Team $25/user/mo. Deployment: cloud-only.",
  "copilot": "Model: GPT-4o via OpenAI partnership. Hardware: Microsoft Azure NVIDIA H100. Framework: PyTorch. Context: 128K tokens. Cost: Free, Pro $20/mo, M365 Copilot $30/user/mo. Deployment: cloud-only.",
  "meta ai": "Model: Llama 3.1 405B. Hardware: NVIDIA H100 on Meta custom infra. Framework: PyTorch. Context: 128K tokens. Cost: free. Deployment: cloud-only.",
};

function getKnownFacts(query: string): string {
  const ql = query.toLowerCase();
  // Longest match first to avoid "chatgpt" matching "chatgpt voice"
  const keys = Object.keys(FACTS_DB).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (ql.includes(key)) return FACTS_DB[key];
  }
  return "";
}

async function searchTavily(query: string, key: string) {
  const results: { title: string; url: string; content: string }[] = [];
  await Promise.all([
    `${query} technical architecture model infrastructure`,
    `${query} latency performance hardware engineering`,
    `${query} product pricing features`,
    `${query} system design pipeline how it works`,
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
          results.push({ title: x.title ?? "", url: x.url ?? "", content: (x.content ?? "").slice(0, 1200) });
    } catch { /* ignore */ }
  }));
  return results.slice(0, 10);
}

export async function POST(req: NextRequest) {
  const tavilyKey = process.env.TAVILY_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!tavilyKey || !openaiKey)
    return new Response(JSON.stringify({ error: "API keys missing. Add TAVILY_API_KEY and OPENAI_API_KEY in Vercel → Settings → Environment Variables." }), { status: 500 });

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

        // Inject known facts as Source [0] — authoritative, overrides all others
        const knownFacts = getKnownFacts(query.trim());
        const source0 = knownFacts
          ? `[0] INTERNAL VERIFIED FACTS DATABASE (highest authority — facts here are CONFIRMED and override all other sources)\n${knownFacts}\n\n---\n\n`
          : "";

        const sourcesText = sources.map((s, i) => `[${i+1}] ${s.title}\nURL: ${s.url}\n${s.content}`).join("\n\n---\n\n");

        const userMsg = `Analyze: "${query.trim()}"

Sources (Source [0] is authoritative internal database — its facts override all others):

${source0}${sourcesText}

Use Source [0] facts directly and mark them "confirmed". Use other sources only to add information not already in Source [0]. Fill remaining gaps with your training knowledge and mark "inferred". Return ONLY the JSON.`;

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

        if (!llmRes.ok) { send("error", { message: `OpenAI error (${llmRes.status}): ${(await llmRes.text()).slice(0,200)}` }); ctrl.close(); return; }

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
