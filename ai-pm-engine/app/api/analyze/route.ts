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

// ── Step 2: Extract full page content from exact URLs via Tavily Extract ────
async function fetchFullContent(
  urls: string[],
  query: string,
  key: string
): Promise<{ title: string; url: string; content: string }[]> {
  if (!key || !urls.length) return [];
  const results: { title: string; url: string; content: string }[] = [];

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
    "x.ai", "tesla.com", "developer.nvidia.com",
    "grammarly.com", "perplexity.ai", "blog.perplexity.ai",
  ];

  const priorityUrls = urls.filter(u => PRIORITY_DOMAINS.some(d => u.includes(d)));
  const otherUrls = urls.filter(u => !priorityUrls.includes(u));
  const toExtract = [...priorityUrls.slice(0, 6), ...otherUrls.slice(0, 3)];

  // Tavily /extract — returns full clean text of each exact URL
  try {
    const r = await fetch("https://api.tavily.com/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: key, urls: toExtract }),
    });
    if (r.ok) {
      const d = await r.json();
      for (const x of (d.results ?? [])) {
        if (x.url && x.raw_content) {
          results.push({
            title: x.url,
            url: x.url,
            content: (x.raw_content as string).slice(0, 8000),
          });
        }
      }
    }
  } catch { /**/ }

  // Fallback: broad Tavily search if extract didn't get enough
  if (results.length < 3) {
    try {
      const r = await fetch("https://api.tavily.com/search", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: key,
          query: `${query} model architecture hardware pricing technical`,
          search_depth: "advanced", max_results: 5,
          exclude_domains: ["reddit.com", "quora.com", "pinterest.com", "tiktok.com"],
        }),
      });
      if (r.ok) {
        const d = await r.json();
        for (const x of (d.results ?? []))
          if (!results.find(e => e.url === x.url))
            results.push({ title: x.title ?? "", url: x.url ?? "", content: (x.content ?? "").slice(0, 4000) });
      }
    } catch { /**/ }
  }

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
        contents: { text: { maxCharacters: 5000 } }
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
const SYNTHESIZE_SYSTEM = `You are a world-class AI product analyst. Founders and senior PMs will read this. Be accurate, specific, and expert.

══ YOUR JOB ══
You have been given full text from real web pages about this product — engineering blogs, official docs, press releases, technical reports.
READ THEM CAREFULLY. Your job is to extract every fact from these pages and build a complete, accurate analysis.

══ CONFIDENCE RULES ══
"confirmed" → explicitly stated in the provided source text
"inferred"  → strongly implied by the source text, or cross-referenced across multiple sources
"unknown"   → genuinely not mentioned anywhere in sources AND you have no reliable basis

IMPORTANT: You are Claude, trained on data up to early 2026. You have deep knowledge of the AI industry.
If the sources confirm a fact, mark it "confirmed".
If the sources don't mention something but you know it from your training (e.g. a well-known product's hardware), mark it "inferred" — do NOT mark it "unknown".
Reserve "unknown" only for truly obscure or undisclosed information with zero basis.

══ HOW TO READ THE SOURCES ══
- Official engineering blogs (netflixtechblog.com, engineering.fb.com, openai.com, anthropic.com, github.blog, ai.google) are highest trust — treat as ground truth
- Official product pages and docs are high trust
- News articles and reviews are medium trust — corroborate with other sources if possible
- Extract exact model names, hardware names, latency numbers, pricing, context windows from the text
- If a source says "we use H100s" that is "confirmed" hardware
- If a source says "powered by GPT-4" that is "confirmed" model name

══ PM INSIGHTS — MANDATORY FORMAT ══
Each insight MUST: reference a SPECIFIC fact from the sources + give a specific number + describe a decision the PM must own.

BANNED — these will be rejected:
✗ "Monitor user feedback to improve quality"
✗ "Consider the competitive landscape"
✗ "Explore partnerships"
✗ "Ensure compliance with regulations"
✗ Any insight without a specific number from the actual product

REQUIRED — every insight references something real:
✓ "Notion uses prompt caching with Claude — confirmed 85% latency reduction and 90% cost savings per call. PM must set cache hit rate target >70%. Any prompt redesign that drops below this threshold reverts — the feature economics break below it."
✓ "Netflix recommendation CTR drops ~30% when p99 latency exceeds 100ms (confirmed from Netflix Tech Blog). PM must gate every model update behind offline eval that proves <100ms p99 before any A/B test."
✓ "Samsung Transcript Assist runs fully on-device on Exynos 2400 NPU (34.4 TOPS, confirmed). PM must define WER budget per language: English <5%, Korean <8%. Any OTA regression past this is blocked."
✓ "GitHub Copilot acceptance rate benchmarks at 30-35% (confirmed from GitHub blog). PM must track acceptance rate per language — if Python drops below 30%, the fine-tuning pipeline needs retraining on recent Python corpus."

══ INFRA DIAGRAM ══
Every component name must reference the actual product:
✓ "Notion Prompt Cache Layer (Claude 3.7)", "Netflix Two-Tower Retrieval Model", "Exynos 2400 NPU ASR Engine"
✗ "AI Model", "Backend Server", "Data Preprocessor", "Inference Engine"

Return ONLY raw JSON. No markdown. No backticks. No text outside JSON.

{
  "featureName": "string",
  "company": "string",
  "category": "Summarization|Conversational AI|Code Generation|Image Generation|Search|Writing Assistant|Voice|Vision|Recommendation|Other",
  "emoji": "single emoji",
  "tagline": "max 12 words — specific to this product",
  "userProblem": "2-3 sentences: concrete before/after, specific friction removed",
  "summary": "3-4 sentences: technical how it works, what makes it architecturally different, cite specific facts from sources",
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
  "optimizations": ["string — each must be a specific technique from the sources"],
  "tradeoffs": [
    { "label": "string", "description": "2-3 sentences: real tension confirmed by sources, what was gained, what was lost, why this decision was made", "dimension": "quality-latency|privacy-accuracy|cost-scale|ondevice-cloud|general" },
    { "label": "string", "description": "string", "dimension": "string" },
    { "label": "string", "description": "string", "dimension": "string" }
  ],
  "productImpact": {
    "adoptionSignal": "string — specific number if found in sources",
    "retentionImpact": "string",
    "churnImpact": "string",
    "userSegment": "string",
    "successMetrics": ["string", "string", "string"]
  },
  "pmInsights": ["string", "string", "string", "string", "string"],
  "infraDiagram": [
    { "layer": "Input Layer", "description": "How user input enters", "components": [
      { "name": "product-specific name", "detail": "specific technical detail from sources", "children": [{ "name": "string", "detail": "string" }] }
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
  const tavilyKey    = process.env.TAVILY_API_KEY ?? "";
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? "";
  const openaiKey    = process.env.OPENAI_API_KEY ?? "";
  const serperKey    = process.env.SERPER_API_KEY ?? "";
  const exaKey       = process.env.EXA_API_KEY ?? "";
  const useClaude    = !!anthropicKey;

  if (!tavilyKey || (!anthropicKey && !openaiKey))
    return new Response(JSON.stringify({ error: "Missing TAVILY_API_KEY and ANTHROPIC_API_KEY (or OPENAI_API_KEY)." }), { status: 500 });

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

        // Sanitize text — strip surrogate pairs and non-UTF8 chars that break JSON
        const sanitize = (s: string) => s
          .replace(/[\uD800-\uDFFF]/g, "")   // lone surrogates
          .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "") // control chars
          .replace(/\uFFFD/g, "")              // replacement chars
          .trim();

        // ── Phase 3: Extract confirmed facts ──────────────────────────────────
        const topForExtract = allSources.slice(0, 20);
        const sourcesText = topForExtract
          .map((s, i) => `[${i+1}] ${sanitize(s.title)}\nURL: ${s.url}\n${sanitize(s.content).slice(0, 3000)}`)
          .join("\n\n---\n\n");

        const kgSection = google.knowledgeGraph ? `\nKNOWLEDGE GRAPH:\n${sanitize(google.knowledgeGraph)}\n` : "";

        // ── Helper: call Claude or OpenAI ────────────────────────────────────
        const callLLM = async (system: string, user: string, fast: boolean): Promise<string> => {
          if (useClaude) {
            const r = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": anthropicKey,
                "anthropic-version": "2023-06-01",
              },
              body: JSON.stringify({
                model: fast ? "claude-haiku-4-5-20251001" : "claude-sonnet-4-5-20251001",
                max_tokens: fast ? 1500 : 4096,
                system,
                messages: [{ role: "user", content: user }],
              }),
            });
            if (!r.ok) throw new Error(`Anthropic error (${r.status}): ${await r.text()}`);
            const d = await r.json();
            return d.content?.[0]?.text ?? "";
          } else {
            const r = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
              body: JSON.stringify({
                model: fast ? "gpt-4o-mini" : "gpt-4o",
                temperature: fast ? 0 : 0.1,
                max_tokens: fast ? 1500 : 4096,
                stream: false,
                response_format: { type: "json_object" },
                messages: [{ role: "system", content: system }, { role: "user", content: user }],
              }),
            });
            if (!r.ok) throw new Error(`OpenAI error (${r.status})`);
            const d = await r.json();
            return d.choices?.[0]?.message?.content ?? "";
          }
        };

        const extractRaw = await callLLM(
          EXTRACT_SYSTEM,
          `Product: "${query.trim()}"${kgSection}\n\nSources:\n${sourcesText}`,
          true
        );
        let extracted: Record<string, unknown> = {};
        try {
          const clean = extractRaw.replace(/```json|```/g, "").trim();
          const f = clean.indexOf("{"), l = clean.lastIndexOf("}");
          extracted = JSON.parse(f >= 0 ? clean.slice(f, l + 1) : clean);
        } catch { /**/ }

        // ── Phase 4: Synthesize full analysis ────────────────────────────────
        send("status", { step: 4, message: `Synthesizing with ${useClaude ? "Claude Sonnet" : "GPT-4o"}…` });

        const synthesizeMsg = `Analyze THIS SPECIFIC FEATURE: "${query.trim()}"

CONFIRMED FACTS (extracted from live sources — mark these "confirmed"):
${JSON.stringify(extracted, null, 2)}

${google.knowledgeGraph ? `GOOGLE KNOWLEDGE GRAPH:\n${google.knowledgeGraph}\n` : ""}
TOP SOURCES (full content):
${allSources.slice(0, 10).map((s, i) => `[${i+1}] ${sanitize(s.title)}\nURL: ${s.url}\n${sanitize(s.content).slice(0, 4000)}`).join("\n\n---\n\n")}

CRITICAL RULES:
1. Only apply facts specifically about "${query.trim()}" — not other features of the same product
2. Use your training knowledge to fill gaps — mark "inferred" with real specific numbers
3. "unknown" only when you have absolutely zero basis — should be rare
4. Every pmInsight MUST contain a specific number and a real PM decision to own
5. Name every infra component after actual product features (e.g. "Exynos 2400 NPU ASR Engine" not "AI Model")
Return ONLY valid JSON. No markdown. No backticks.`;

        const synthRaw = await callLLM(SYNTHESIZE_SYSTEM, synthesizeMsg, false);
        if (!synthRaw) { send("error", { message: "Empty response." }); ctrl.close(); return; }

        let result;
        try {
          const clean = synthRaw.replace(/```json|```/g, "").trim();
          const f = clean.indexOf("{"), l = clean.lastIndexOf("}");
          result = JSON.parse(f >= 0 ? clean.slice(f, l + 1) : clean);
        }
        catch {
          const f = synthRaw.indexOf("{"), l = synthRaw.lastIndexOf("}");
          if (f === -1 || l === -1) { send("error", { message: "Parse error." }); ctrl.close(); return; }
          try { result = JSON.parse(synthRaw.slice(f, l + 1)); }
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
