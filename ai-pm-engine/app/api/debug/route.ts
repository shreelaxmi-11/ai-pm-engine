import { NextRequest } from "next/server";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(_req: NextRequest) {
  const serperKey    = process.env.SERPER_API_KEY ?? "";
  const exaKey       = process.env.EXA_API_KEY ?? "";
  const tavilyKey    = process.env.TAVILY_API_KEY ?? "";
  const openaiKey    = process.env.OPENAI_API_KEY ?? "";
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? "";

  const results: Record<string, unknown> = {
    version: "2025-03-09-v4",  // bump this to confirm new code is deployed
    activeModel: anthropicKey ? "Claude Sonnet (claude-sonnet-4-5-20250929)" : "GPT-4o (fallback)",
    keys: {
      ANTHROPIC_API_KEY: anthropicKey ? `set (${anthropicKey.slice(0,8)}...)` : "MISSING ← this is why GPT-4o is being used",
      TAVILY_API_KEY:    tavilyKey    ? `set (${tavilyKey.slice(0,8)}...)`    : "MISSING",
      OPENAI_API_KEY:    openaiKey    ? `set (${openaiKey.slice(0,8)}...)`    : "MISSING",
      SERPER_API_KEY:    serperKey    ? `set (${serperKey.slice(0,8)}...)`    : "MISSING",
      EXA_API_KEY:       exaKey       ? `set (${exaKey.slice(0,8)}...)`       : "MISSING",
    }
  };

  if (serperKey) {
    try {
      const r = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-KEY": serperKey },
        body: JSON.stringify({ q: "Notion AI pricing", num: 3 }),
      });
      const d = await r.json();
      results.serper = {
        status: r.status,
        answerBox: d.answerBox ?? null,
        knowledgeGraph: d.knowledgeGraph ?? null,
        organicCount: d.organic?.length ?? 0,
        firstSnippet: d.organic?.[0]?.snippet ?? null,
      };
    } catch (e) { results.serper = { error: String(e) }; }
  } else { results.serper = "SKIPPED — key missing"; }

  if (exaKey) {
    try {
      const r = await fetch("https://api.exa.ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": exaKey },
        body: JSON.stringify({ query: "Notion AI pricing", numResults: 2, contents: { text: { maxCharacters: 200 } } }),
      });
      const d = await r.json();
      results.exa = { status: r.status, resultCount: d.results?.length ?? 0, firstResult: d.results?.[0]?.text?.slice(0,200) ?? null };
    } catch (e) { results.exa = { error: String(e) }; }
  } else { results.exa = "SKIPPED — key missing"; }

  if (tavilyKey) {
    try {
      const r = await fetch("https://api.tavily.com/search", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: tavilyKey, query: "Notion AI pricing", max_results: 2 }),
      });
      const d = await r.json();
      results.tavily = { status: r.status, resultCount: d.results?.length ?? 0, firstResult: d.results?.[0]?.content?.slice(0,200) ?? null };
    } catch (e) { results.tavily = { error: String(e) }; }
  }

  // Test Anthropic API directly
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? "";
  if (anthropicKey) {
    try {
      const t0 = Date.now();
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 50,
          messages: [{ role: "user", content: "Reply with just: OK" }]
        }),
      });
      const d = await r.json();
      results.anthropic = {
        status: r.status,
        latencyMs: Date.now() - t0,
        response: d.content?.[0]?.text ?? d,
        error: d.error ?? null,
      };
    } catch (e) { results.anthropic = { error: String(e) }; }
  } else {
    results.anthropic = "MISSING KEY";
  }

  return new Response(JSON.stringify(results, null, 2), { headers: { "Content-Type": "application/json" } });
}
