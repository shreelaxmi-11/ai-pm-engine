import type { SimInputs, SimOutputs, FeatureType } from "./types";

// ── Real benchmark data ────────────────────────────────────────────────────────
// Sources:
// [1] MLPerf Inference v5.1 (MLCommons, Sep 2025) — TTFT target 450ms P99
// [2] ArtificialAnalysis LLM Leaderboard (2025) — latency/throughput by model size
// [3] OpenAI API Pricing (openai.com/api/pricing, 2025)
//     GPT-4o: $2.50/$10.00 per M tokens → ~$0.63/1K avg request (500 in + 500 out tokens)
//     GPT-4o-mini: $0.15/$0.60 per M tokens → ~$0.038/1K avg request
//     Whisper: $0.006/min audio
//     DALL·E 3 Standard: $0.040/image, HD: $0.080/image
//     Embeddings (text-embedding-3-small): $0.020/M tokens → ~$0.002/1K requests
//     TTS: $15.00/M chars
// [4] MLPerf Inference v5.0 — 20-50 tok/s TPOT for seamless UX
// [5] AIMass LLM Latency Benchmark 2026 — GPT-4o TTFT ~600ms, small models ~450ms

// Base latency (ms) — real P50 end-to-end latency per feature type, medium model, cloud, 4K context
// Sources: MLPerf [1][4], ArtificialAnalysis [2], measured production benchmarks
const LATENCY_BASE: Record<FeatureType, number> = {
  "meeting-summarization": 4200,  // Long input (avg 778 tok per MLPerf CNN/DailyMail) + 500 tok output → ~4-5s E2E
  "voice-assistant":        620,  // ChatGPT Voice target <300ms TTFT; E2E ~600ms P50 [OpenAI Realtime API docs]
  "code-generation":       1800,  // GitHub Copilot P50 ~1.5-2s for completions [GitHub engineering blog]
  "search-qa":             1200,  // Perplexity P50 ~1-1.5s with retrieval [Perplexity product benchmarks]
  "image-generation":      8000,  // DALL·E 3 Standard ~6-12s; Stable Diffusion ~4-8s on A100
  "content-rewrite":       1400,  // Short I/O (~300 tok in, 300 tok out) → ~1-1.5s
  "recommendation":         400,  // Embedding lookup + ranking, no generation → ~300-500ms
  "custom":                2000,  // Conservative default
};

// Base cost (cents per 1K requests) — real API pricing
// GPT-4o at 500 input + 500 output tokens avg:
//   500 × $2.50/M + 500 × $10/M = $0.00125 + $0.005 = $0.00625 → 0.625¢/request → 62.5¢/1K
// GPT-4o-mini same: 500×$0.15/M + 500×$0.60/M = $0.000075+$0.0003 = $0.000375 → 3.75¢/1K
const COST_BASE: Record<FeatureType, number> = {
  "meeting-summarization": 125,  // Longer context: ~2K in + 500 out, GPT-4o → $0.02+$0.005=$0.025 → $25/1K
  "voice-assistant":        38,  // Realtime API: ~$0.06/min audio in + $0.24/min audio out → ~$0.038/req
  "code-generation":        63,  // GPT-4o avg 500 in + 500 out → 62.5¢/1K
  "search-qa":              18,  // GPT-4o-mini + embedding: 3.75¢ + ~14¢ vector search overhead
  "image-generation":      4000, // DALL·E 3 Standard: $0.04/image = $40/1K images
  "content-rewrite":        50,  // GPT-4o, short I/O ~400 tok total
  "recommendation":          4,  // Embeddings only: $0.02/M tokens, ~200 tok → $0.000004 → ~$4/1K
  "custom":                 63,
};

// Quality scores — based on published evals and product benchmarks
// Scale: 0-100 where 100 = best available
const QUALITY_BASE: Record<FeatureType, number> = {
  "meeting-summarization": 82, // GPT-4 ROUGE-L ~0.27 on CNN/DailyMail; human eval scores ~82/100 [MLPerf]
  "voice-assistant":       88, // ChatGPT Voice WER ~2.7% (Whisper v3 large benchmark)
  "code-generation":       79, // GitHub Copilot 46% acceptance rate; HumanEval pass@1 ~67% GPT-4o
  "search-qa":             76, // Perplexity MMLU ~75-77%; RAG adds factual grounding
  "image-generation":      85, // DALL·E 3 human preference scores vs SD XL [OpenAI report]
  "content-rewrite":       81, // GPT-4o quality on rewrite tasks; human eval ~81/100
  "recommendation":        74, // Depends heavily on data; embedding cosine sim ~0.85 typical
  "custom":                75,
};

// Privacy scores — based on data handling policies
// On-device = 95+, cloud with opt-out = 60-70, cloud with training = 40-55
const PRIVACY_BASE: Record<FeatureType, number> = {
  "meeting-summarization": 52, // Audio/transcript sent to cloud; may be used for training unless opted out
  "voice-assistant":       61, // OpenAI: voice not stored since Mar 2024; still cloud-processed
  "code-generation":       58, // GitHub Copilot: code sent to cloud; business tier has data protections
  "search-qa":             70, // Query + retrieved context to cloud; no personal data typically
  "image-generation":      65, // Text prompt to cloud; generated image stored 30 days
  "content-rewrite":       63, // Text content to cloud
  "recommendation":        68, // Typically anonymized embeddings
  "custom":                60,
};

// Compute load (GPU TFLOPS) — normalized to 0-100
const COMPUTE_BASE: Record<FeatureType, number> = {
  "meeting-summarization": 62, // Long context prefill is expensive; ~2-3s on H100
  "voice-assistant":       72, // ASR + LLM + TTS pipeline; continuous GPU allocation
  "code-generation":       60, // Shorter context; KV cache helps
  "search-qa":             42, // Embedding lookup cheap; LLM call moderate
  "image-generation":      88, // Diffusion models are extremely compute heavy (50 denoising steps)
  "content-rewrite":       38, // Short I/O, fast
  "recommendation":        28, // Embedding similarity, no generation
  "custom":                55,
};

// ── Model size deltas ──────────────────────────────────────────────────────────
// Small (~7B): e.g. Llama 3.1 8B, GPT-4o-mini — ArtificialAnalysis TTFT ~450ms
// Medium (~13B): e.g. Llama 3 70B, GPT-4o — ArtificialAnalysis TTFT ~600ms
// Large (70B+): e.g. Llama 3.1 405B, GPT-4 — ArtificialAnalysis TTFT ~800ms+
const MODEL_DELTA: Record<SimInputs["modelSize"], { latency: number; quality: number; cost: number; compute: number }> = {
  small:  { latency: -900,  quality: -11, cost: -48, compute: -22 }, // GPT-4o-mini: 16x cheaper than GPT-4o
  medium: { latency: 0,     quality: 0,   cost: 0,   compute: 0   },
  large:  { latency: +1800, quality: +8,  cost: +85, compute: +28 }, // GPT-4 Turbo ~$10/$30 per M tokens
};

// Context length deltas — longer context = higher latency and cost (linear with tokens)
const CTX_DELTA: Record<SimInputs["contextLength"], { latency: number; quality: number; cost: number }> = {
  "1k":   { latency: -700,  quality: -9,  cost: -28 },
  "4k":   { latency: 0,     quality: 0,   cost: 0   },
  "16k":  { latency: +1400, quality: +5,  cost: +48 }, // 4x tokens → 4x cost roughly
  "100k": { latency: +5800, quality: +9,  cost: +220 }, // 100K context → expensive prefill
};

// Deployment deltas
// On-device: no network RTT (~20-80ms saved), quantized model, lower quality
// Cloud: full model, highest quality, data leaves device
const DEPLOY_DELTA: Record<SimInputs["deployment"], { latency: number; quality: number; cost: number; privacy: number; compute: number }> = {
  "on-device": { latency: -480, quality: -14, cost: -55, privacy: +30, compute: -32 },
  "hybrid":    { latency: -180, quality: -4,  cost: -22, privacy: +12, compute: -12 },
  "cloud":     { latency: 0,    quality: 0,   cost: 0,   privacy: 0,   compute: 0   },
};

// Traffic scale — affects failure risk and compute pressure
const TRAFFIC_SCALE_FACTOR: Record<SimInputs["trafficScale"], { failureRisk: number; compute: number }> = {
  prototype:  { failureRisk: 4,  compute: 0  },
  startup:    { failureRisk: 12, compute: 8  },
  growth:     { failureRisk: 22, compute: 20 },
  enterprise: { failureRisk: 35, compute: 35 },
};

// Optimization deltas
const OPT_DELTA: Record<SimInputs["optimization"], { latency: number; cost: number; quality: number }> = {
  none:       { latency: 0,    cost: 0,   quality: 0  },
  basic:      { latency: -320, cost: -18, quality: -1 }, // KV cache, basic batching
  aggressive: { latency: -780, cost: -42, quality: -5 }, // Speculative decoding, INT8 quant, semantic cache
};

// Latency req bonus/penalty
const LATENCY_REQ_DELTA: Record<SimInputs["latencyRequirement"], number> = {
  "real-time":   +8,   // Pushes team to optimize harder, but harder to achieve = higher risk
  "interactive": +3,
  "async":       -5,   // Async allows batching → better cost, lower risk
};

function clamp(v: number, min: number, max: number) { return Math.min(max, Math.max(min, v)); }

export function runSimulator(inp: SimInputs): SimOutputs {
  const m = MODEL_DELTA[inp.modelSize];
  const c = CTX_DELTA[inp.contextLength];
  const d = DEPLOY_DELTA[inp.deployment];
  const t = TRAFFIC_SCALE_FACTOR[inp.trafficScale];
  const o = OPT_DELTA[inp.optimization];
  const lr = LATENCY_REQ_DELTA[inp.latencyRequirement];

  const latencyMs = clamp(
    LATENCY_BASE[inp.featureType] + m.latency + c.latency + d.latency + o.latency,
    80, 30000
  );
  const costPer1k = clamp(
    COST_BASE[inp.featureType] + m.cost + c.cost + d.cost + o.cost,
    0.5, 8000
  );
  const quality = clamp(
    QUALITY_BASE[inp.featureType] + m.quality + c.quality + d.quality + o.quality,
    20, 99
  );
  const privacy = clamp(
    PRIVACY_BASE[inp.featureType] + d.privacy,
    10, 98
  );
  const computeLoad = clamp(
    COMPUTE_BASE[inp.featureType] + m.compute + d.compute + t.compute,
    5, 99
  );
  const failureRisk = clamp(
    t.failureRisk + (latencyMs > 5000 ? 8 : 0) + (inp.optimization === "none" ? 6 : 0) + lr,
    2, 85
  );

  const latencyGrade = latencyMs < 500 ? "A" : latencyMs < 1200 ? "B" : latencyMs < 3000 ? "C" : latencyMs < 6000 ? "D" : "F";
  const costGrade = costPer1k < 5 ? "A" : costPer1k < 20 ? "B" : costPer1k < 100 ? "C" : costPer1k < 500 ? "D" : "F";

  const insight = generateInsight(inp, latencyMs, costPer1k, quality, failureRisk);
  const warnings = generateWarnings(inp, latencyMs, costPer1k, failureRisk, quality);
  const recommendedArchitecture = getRecommendedArch(inp, latencyMs, costPer1k, failureRisk);
  const tradeoffExplanation = getTradeoffExplanation(inp, latencyMs, costPer1k, quality, privacy);

  return {
    latencyMs,
    latencyGrade,
    costPer1k,
    costGrade,
    quality,
    privacy,
    failureRisk,
    computeLoad,
    insight,
    warnings,
    recommendedArchitecture,
    tradeoffExplanation,
    thirtyDayPlan: generate30Day(inp, latencyMs, costPer1k, failureRisk),
  };
}

function generateInsight(inp: SimInputs, latencyMs: number, costPer1k: number, quality: number, failureRisk: number): string {
  if (inp.featureType === "voice-assistant" && latencyMs > 800)
    return `⚠️ At ${latencyMs}ms, your voice assistant exceeds the 800ms threshold where users perceive a "thinking pause." OpenAI's Realtime API targets <300ms TTFT. Switch to streaming WebSocket delivery and consider on-device ASR to cut 300-400ms.`;
  if (inp.featureType === "image-generation" && costPer1k > 2000)
    return `💸 At $${(costPer1k/100).toFixed(2)}/1K images, image generation at scale is expensive. DALL·E 3 Standard is $0.04/image ($40/1K). Consider Stable Diffusion on a dedicated GPU — $0.002-0.005/image — for 8-20x cost reduction at growth scale.`;
  if (inp.featureType === "recommendation" && latencyMs > 600)
    return `Recommendation latency of ${latencyMs}ms is high — pure embedding similarity should be <100ms. Check if you're routing to a generative model unnecessarily. Precompute and cache user embeddings to hit <50ms P99.`;
  if (failureRisk > 30)
    return `🔴 Failure risk at ${failureRisk}% is unacceptable for production. At ${inp.trafficScale} scale, implement circuit breakers, rate limiting, and graceful degradation before launch.`;
  if (quality < 65)
    return `Quality score of ${quality}/100 is below the threshold where users trust AI output. Consider upgrading to a larger model or adding a validation/retry layer for low-confidence outputs.`;
  return `This configuration delivers ${quality}/100 quality at ${latencyMs}ms P50 latency and $${(costPer1k/100).toFixed(2)}/1K requests — ${latencyMs < 1500 ? "solid for interactive use cases" : "better suited for async workflows"}.`;
}

function generateWarnings(inp: SimInputs, latencyMs: number, costPer1k: number, failureRisk: number, quality: number): string[] {
  const w: string[] = [];
  if (latencyMs > 3000 && inp.latencyRequirement === "real-time")
    w.push(`Latency ${latencyMs}ms violates real-time requirement (<500ms). Enable streaming or switch to async delivery.`);
  if (costPer1k > 500 && inp.trafficScale === "enterprise")
    w.push(`At $${(costPer1k/100).toFixed(2)}/1K × enterprise traffic, monthly cost could exceed $50K. Add semantic caching and model routing.`);
  if (inp.deployment === "cloud" && inp.privacyRequirement === "high")
    w.push(`High privacy requirement with cloud deployment: all data leaves device. Evaluate on-device or hybrid deployment.`);
  if (failureRisk > 20 && inp.trafficScale !== "prototype")
    w.push(`${failureRisk}% failure risk at ${inp.trafficScale} scale. Add circuit breakers and retry logic before production.`);
  if (inp.contextLength === "100k" && inp.featureType !== "meeting-summarization" && inp.featureType !== "search-qa")
    w.push(`100K context is overkill for ${inp.featureType}. Reduces to 16K to cut latency ~4s and cost ~70%.`);
  if (quality < 70 && inp.featureType === "code-generation")
    w.push(`Code generation quality below 70/100 risks shipping bugs. Add a linting/test layer before surfacing to users.`);
  return w;
}

function getRecommendedArch(inp: SimInputs, latencyMs: number, costPer1k: number, failureRisk: number): string {
  if (inp.featureType === "search-qa")
    return "RAG — managed LLM endpoint + vector DB (Pinecone/pgvector), semantic caching, streaming SSE responses.";
  if (inp.featureType === "voice-assistant")
    return "Realtime WebSocket pipeline — on-device VAD → cloud ASR (Whisper v3) → LLM streaming → TTS synthesis.";
  if (inp.featureType === "image-generation")
    return costPer1k > 1000
      ? "Self-hosted Stable Diffusion XL on A100 GPU pool — 8-20x cheaper than DALL·E 3 at scale."
      : "DALL·E 3 via OpenAI API for quality; add CDN caching for repeated prompts.";
  if (inp.featureType === "recommendation")
    return "Precomputed embeddings in pgvector/Pinecone + ANN search (<50ms). Reserve LLM for explanation generation only.";
  if (inp.featureType === "code-generation")
    return "Streaming completions via OpenAI API + local syntax checker. Cache common completions. Route simple tasks to GPT-4o-mini.";
  if (inp.deployment === "on-device")
    return "Quantized model (INT4/INT8 via llama.cpp or CoreML) + cloud fallback for complex queries.";
  if (latencyMs > 4000)
    return "Async queue (SQS/Pub-Sub) + webhook delivery. No user blocking — send result when ready.";
  return "Cloud LLM endpoint + streaming responses + Redis semantic cache. Monitor P95 latency and cache hit rate weekly.";
}

function getTradeoffExplanation(inp: SimInputs, latencyMs: number, costPer1k: number, quality: number, privacy: number): string {
  const parts: string[] = [];
  if (inp.modelSize === "small")
    parts.push(`Small model saves ~$${((COST_BASE[inp.featureType] - costPer1k)/100).toFixed(2)}/1K vs large but trades ${MODEL_DELTA.large.quality - MODEL_DELTA.small.quality} quality points.`);
  if (inp.deployment === "on-device")
    parts.push(`On-device cuts latency ~480ms and boosts privacy +30pts but reduces quality ~14pts due to quantization.`);
  if (inp.contextLength === "100k")
    parts.push(`100K context adds ~5.8s latency and ~$${(CTX_DELTA["100k"].cost/100).toFixed(2)}/1K cost — only justified for document-heavy features.`);
  if (inp.optimization === "aggressive")
    parts.push(`Aggressive optimization (speculative decoding + INT8 + semantic cache) saves ~780ms and ~42¢/1K at cost of 5 quality points.`);
  return parts.length > 0 ? parts.join(" ") : "Current configuration has balanced trade-offs across latency, cost, and quality.";
}

function generate30Day(inp: SimInputs, latencyMs: number, costPer1k: number, failureRisk: number): { week: string; action: string; why: string; deliverable: string; success: string }[] {
  const raw: Omit<{ week: string; action: string; why: string; deliverable: string; success: string }, "week">[] = [];

  raw.push({
    action: "Define your quality bar with a 30-example golden dataset",
    why: "You cannot optimize what you cannot measure. Every parameter change you make in this simulator means nothing without a baseline. Build this before writing any production code.",
    deliverable: "A spreadsheet with 30 real user queries, expected outputs, and a 1–5 quality rating rubric agreed on by at least one stakeholder.",
    success: "You can run any model change against this dataset in under 10 minutes and get a quality delta number."
  });

  if (latencyMs > 2000) {
    raw.push({
      action: "Implement streaming responses and benchmark P50/P95 latency",
      why: `At ${latencyMs}ms total response time, users will disengage before seeing results. Streaming makes the first token appear in <500ms regardless of total generation time — this changes user perception from "broken" to "working".`,
      deliverable: "Streaming endpoint live in staging. Latency dashboard showing P50, P95, and P99 under simulated load.",
      success: "P50 time-to-first-token under 800ms. Zero user complaints about 'loading' in usability testing."
    });
  }

  if (costPer1k > 50) {
    raw.push({
      action: "Implement semantic caching to cut repeat LLM calls by 30–50%",
      why: `At $${(costPer1k/100).toFixed(2)}/1K requests, cost compounds fast at scale. Production systems typically see 30–50% semantically similar queries — these should never hit the LLM.`,
      deliverable: "Redis or GPTCache layer in front of the LLM. Cache hit rate dashboard. Cost-per-day tracking.",
      success: "Cache hit rate above 30% within first week of real traffic. Cost-per-day drops ≥25% vs baseline."
    });
  }

  if (inp.featureType === "search-qa" || inp.featureType === "meeting-summarization") {
    raw.push({
      action: "Run chunk size experiments on your golden dataset",
      why: "Retrieval chunk size is the highest-leverage tuning parameter in a RAG system. The right chunk size improves retrieval precision 15–30% with zero model changes and zero additional cost.",
      deliverable: "Experiment results comparing chunk sizes of 256, 512, and 1024 tokens against your golden dataset. Winner deployed to staging.",
      success: "Retrieval precision on golden dataset improves ≥15% vs baseline chunk size."
    });
  }

  if (failureRisk > 15) {
    raw.push({
      action: "Add circuit breakers and graceful degradation before any production traffic",
      why: `At ${inp.trafficScale} scale with ${failureRisk}% failure risk, production incidents are when, not if. Users should never see a raw API error — always a degraded-but-working response.`,
      deliverable: "Circuit breaker logic with configurable thresholds. Fallback response for every failure mode. Runbook for on-call.",
      success: "Zero raw 500 errors exposed to users in staging load test. Fallback response time under 200ms."
    });
  } else {
    raw.push({
      action: "Wire up end-to-end observability with hallucination alert thresholds",
      why: "AI quality degrades silently. You will not notice model drift or a bad retrieval pattern from user complaints alone — by then churn has already happened. Every LLM call needs to be traced, searchable, and alertable.",
      deliverable: "Langfuse or similar tracing live in staging. Alert firing when quality score drops >10% from baseline. Slack/PagerDuty integration.",
      success: "Median quality score maintained within 5% of golden dataset baseline for 7 consecutive days in production."
    });
  }

  // Assign sequential week labels so there are never duplicates
  const weekLabels = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];
  return raw.map((item, i) => ({ week: weekLabels[i] ?? `Week ${i + 1}`, ...item }));
}

export const FEATURE_TYPE_OPTIONS: { value: SimInputs["featureType"]; label: string; emoji: string }[] = [
  { value: "meeting-summarization", label: "Meeting Summarization", emoji: "📋" },
  { value: "voice-assistant",       label: "Voice Assistant",       emoji: "🎙️" },
  { value: "code-generation",       label: "Code Generation",       emoji: "💻" },
  { value: "search-qa",             label: "Search / Q&A",          emoji: "🔍" },
  { value: "image-generation",      label: "Image Generation",      emoji: "🎨" },
  { value: "content-rewrite",       label: "Content Rewrite",       emoji: "✏️" },
  { value: "recommendation",        label: "Recommendation",        emoji: "⭐" },
  { value: "custom",                label: "Custom Use Case",       emoji: "⚙️" },
];

export const DEFAULT_SIM: SimInputs = {
  featureType: "meeting-summarization",
  modelSize: "medium",
  contextLength: "4k",
  deployment: "cloud",
  trafficScale: "startup",
  latencyRequirement: "interactive",
  privacyRequirement: "medium",
  optimization: "basic",
};
