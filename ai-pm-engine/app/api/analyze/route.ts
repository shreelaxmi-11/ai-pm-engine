import { NextRequest } from "next/server";
export const runtime = "edge";

const SYSTEM = `You are a senior AI systems analyst and product manager. Your job is to produce accurate, specific, expert-level technical breakdowns of AI product features.

CRITICAL RULES:
1. Only use facts you found in the sources provided. If a fact is in the sources, mark it "confirmed".
2. If you know something from your training knowledge about this specific product, you may use it — mark it "inferred".
3. Only mark something "unknown" if it is genuinely not findable anywhere. Hardware, pricing, and frameworks are almost never truly unknown for major products.
4. For Samsung features: hardware is always Exynos NPU or Snapdragon NPU — check sources for exact chip. Framework is Samsung Neural SDK or TensorFlow Lite. Never leave Samsung hardware as unknown.
5. For Google features: hardware is Google TPU v4/v5. Framework is JAX or TensorFlow.
6. For OpenAI features: hardware is NVIDIA H100 on Azure. Framework is PyTorch.
4. NEVER hallucinate model names, version numbers, or pricing. If unsure, say "inferred" not "confirmed".
5. pmInsights must be expert-level with specific numbers and real PM decisions — not generic advice.
6. infraDiagram: every layer must have at least one real component with a specific name.
7. Return ONLY raw JSON starting with { ending with }. No markdown, no backticks.

GOOD pmInsight example: "Notion AI routes between GPT-4 and Claude based on task type — summarization leverages Claude's 200K context window while drafting uses GPT-4 for instruction-following. The PM must own latency SLAs: ~1-3s for on-demand summarization, <500ms for inline suggestions or users abandon."

BAD pmInsight example: "Consider user feedback for continuous improvement."

JSON structure — fill EVERY field:
{
  "featureName": "exact product feature name",
  "company": "company name",
  "category": "Summarization|Conversational AI|Code Generation|Image Generation|Search|Writing Assistant|Voice|Vision|Recommendation|Other",
  "emoji": "single relevant emoji",
  "tagline": "one sharp sentence max 12 words describing this feature",
  "userProblem": "2-3 sentences describing the problem this feature solves",
  "summary": "3-4 sentences on how it works technically based on sources",
  "overallConfidence": "high|medium|low",
  "model": {
    "name": { "value": "exact model name from sources", "confidence": "confirmed|inferred|unknown" },
    "provider": { "value": "company name", "confidence": "confirmed|inferred|unknown" },
    "type": { "value": "model type from sources", "confidence": "confirmed|inferred|unknown" },
    "contextWindow": { "value": "context window size from sources", "confidence": "confirmed|inferred|unknown" },
    "finetuned": { "value": "yes — fine-tuned for X | no | unknown", "confidence": "confirmed|inferred|unknown" }
  },
  "performance": {
    "latency": { "value": "specific latency numbers from sources", "confidence": "confirmed|inferred|unknown" },
    "quality": { "value": "specific quality metric or benchmark from sources", "confidence": "confirmed|inferred|unknown" },
    "cost": { "value": "real pricing from sources", "confidence": "confirmed|inferred|unknown" },
    "privacy": { "value": "specific privacy policy from sources", "confidence": "confirmed|inferred|unknown" },
    "reliability": { "value": "uptime or reliability data from sources", "confidence": "confirmed|inferred|unknown" }
  },
  "stack": {
    "hardware": [{ "value": "specific hardware from sources", "confidence": "confirmed|inferred|unknown" }],
    "frameworks": [{ "value": "specific framework from sources", "confidence": "confirmed|inferred|unknown" }],
    "apis": [{ "value": "specific API from sources", "confidence": "confirmed|inferred|unknown" }],
    "vectorDB": { "value": "vector DB used or not applicable", "confidence": "confirmed|inferred|unknown" },
    "orchestration": { "value": "orchestration approach from sources", "confidence": "confirmed|inferred|unknown" },
    "deployment": { "value": "cloud-only | on-device | hybrid — specify what runs where", "confidence": "confirmed|inferred|unknown" }
  },
  "optimizations": ["specific optimization technique found in sources"],
  "tradeoffs": [
    { "label": "specific label", "description": "2-3 sentences: real engineering tension, what was gained, what was sacrificed, why this call was made", "dimension": "quality-latency|privacy-accuracy|cost-scale|ondevice-cloud|general" },
    { "label": "second tradeoff", "description": "...", "dimension": "..." },
    { "label": "third tradeoff", "description": "...", "dimension": "..." }
  ],
  "productImpact": {
    "adoptionSignal": "specific adoption evidence with numbers from sources",
    "retentionImpact": "what specifically drives users back based on sources",
    "churnImpact": "what happens when this feature degrades",
    "userSegment": "primary user segment from sources",
    "successMetrics": ["metric 1 from sources", "metric 2", "metric 3"]
  },
  "pmInsights": [
    "specific insight with numbers and real PM decision this team had to make",
    "failure mode or error budget this PM must explicitly define and own",
    "specific trade-off made in this feature and whether it was the right call with reasoning",
    "what a direct competitor doing this differently reveals about the design space",
    "what this feature must do in the next 12 months to maintain its position"
  ],
  "infraDiagram": [
    { "layer": "Input Layer", "description": "How user input enters the system", "components": [
      { "name": "real component name", "detail": "specific detail", "children": [{ "name": "sub-component", "detail": "detail" }] }
    ]},
    { "layer": "Processing Layer", "description": "Pre-processing and routing", "components": [
      { "name": "real component name", "detail": "specific detail" }
    ]},
    { "layer": "Model Layer", "description": "Core AI inference", "components": [
      { "name": "real model or component name", "detail": "specific detail" }
    ]},
    { "layer": "Output Layer", "description": "Response delivery", "components": [
      { "name": "real component name", "detail": "specific detail" }
    ]},
    { "layer": "Observability Layer", "description": "Monitoring and quality", "components": [
      { "name": "real component name", "detail": "specific detail" }
    ]}
  ],
  "sources": [{ "title": "string", "url": "string", "type": "official|article|analysis" }]
}`;

// ── Search providers ──────────────────────────────────────────────────────────

async function searchTavily(query: string, key: string): Promise<{ title: string; url: string; content: string }[]> {
  if (!key) return [];
  const results: { title: string; url: string; content: string }[] = [];
  const queries = [
    `${query} model architecture technical how it works`,
    `${query} hardware infrastructure latency performance`,
    `${query} pricing cost specs official`,
    `${query} engineering system design pipeline`,
    `${query} NPU chip processor on-device inference`,
    `${query} Exynos Snapdragon neural processing unit`,
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
    `${query} Exynos Snapdragon NPU chip processor specs`,
    `${query} on-device AI inference hardware`,
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
      // Answer box — highest quality factual snippet
      if (d.answerBox?.answer)
        results.push({ title: "Google Answer: " + (d.answerBox.title ?? q), url: d.answerBox?.link ?? "", content: d.answerBox.answer });
      if (d.answerBox?.snippet)
        results.push({ title: "Google Snippet: " + (d.answerBox.title ?? q), url: d.answerBox?.link ?? "", content: d.answerBox.snippet });
      // Knowledge graph
      if (d.knowledgeGraph)
        results.push({ title: d.knowledgeGraph.title ?? "Knowledge Graph", url: d.knowledgeGraph.descriptionLink ?? "", content: JSON.stringify(d.knowledgeGraph).slice(0, 1000) });
      // Organic results
      for (const x of (d.organic ?? []))
        if (!results.find(e => e.url === x.link))
          results.push({ title: x.title ?? "", url: x.link ?? "", content: (x.snippet ?? "") + (x.sitelinks ? " " + x.sitelinks.map((s: {title:string}) => s.title).join(", ") : "") });
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

// ── Main handler ──────────────────────────────────────────────────────────────

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

        // All providers fire simultaneously
        const [tavilyResults, serperResults, exaResults] = await Promise.all([
          searchTavily(query.trim(), tavilyKey),
          searchSerper(query.trim(), serperKey),
          searchExa(query.trim(), exaKey),
        ]);

        // Merge — Serper first (best for facts), Exa second, Tavily last (best for deep content)
        const seen = new Set<string>();
        const allSources: { title: string; url: string; content: string; provider: string }[] = [];
        for (const [results, provider] of [
          [serperResults, "Serper"],
          [exaResults, "Exa"],
          [tavilyResults, "Tavily"],
        ] as [{ title: string; url: string; content: string }[], string][]) {
          for (const s of results) {
            const key = s.url || s.title;
            if (key && !seen.has(key)) {
              seen.add(key);
              allSources.push({ ...s, provider });
            }
          }
        }

        if (!allSources.length) {
          send("error", { message: "No sources found. Check API keys in Vercel." });
          ctrl.close(); return;
        }

        const countByProvider = allSources.reduce((acc, s) => { acc[s.provider] = (acc[s.provider] ?? 0) + 1; return acc; }, {} as Record<string, number>);
        const providerSummary = Object.entries(countByProvider).map(([p, n]) => `${p}:${n}`).join(", ");
        send("status", { step: 2, message: `Found ${allSources.length} sources (${providerSummary}). Analyzing…` });

        const sourcesText = allSources
          .slice(0, 22)
          .map((s, i) => `[${i + 1}] ${s.title} [${s.provider}]\nURL: ${s.url}\n${s.content}`)
          .join("\n\n---\n\n");

        const userMsg = `Analyze this AI product feature: "${query.trim()}"

Here are ${allSources.length} sources from live web search across multiple providers. Extract every technical fact you can find:

---
${sourcesText}
---

Now produce the complete JSON analysis. Use source facts and mark "confirmed". Use your training knowledge to fill gaps and mark "inferred". Be specific — never vague. Return ONLY the JSON.`;

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
