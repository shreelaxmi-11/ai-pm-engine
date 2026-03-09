import type { DecisionInputs, ArchRec, ArchDecision, TradeoffLine, FailureMode, ThirtyDayAction } from "./types";

function selectPattern(i: DecisionInputs): ArchDecision {
  if (i.privacyRequirement === "high" && i.scaleLevel === "prototype")
    return { label:"Pattern", value:"On-Device SLM", confidence:"strong", rationale:"High privacy + prototype stage → small language model fully on-device. No data leaves the device. Start fast, validate quality before scaling.", alternatives:["Local RAG with embedded vector store"] };
  if (i.privacyRequirement === "high")
    return { label:"Pattern", value:"Private RAG (self-hosted)", confidence:"strong", rationale:"High privacy at scale requires your own infrastructure. Self-hosted LLM + vector DB keeps all data internal. Tradeoff: higher ops burden.", alternatives:["On-premise LLM + pgvector","Azure OpenAI with private endpoints"] };
  if (i.dataFreshness === "live" && i.latencyRequirement === "real-time")
    return { label:"Pattern", value:"Streaming Agentic Pipeline", confidence:"strong", rationale:"Live data + real-time UX requires an agent that fetches, reasons, and streams simultaneously. No pre-indexing possible.", alternatives:["Tool-calling with streaming","ReAct agent"] };
  if (i.dataFreshness === "static" && i.budget === "low")
    return { label:"Pattern", value:"Cached RAG", confidence:"strong", rationale:"Static knowledge + low budget → index once, serve many. Pre-compute embeddings and cache common queries aggressively.", alternatives:["Fine-tuned smaller model","Prompt-stuffed context"] };
  if (i.customization === "heavy" && i.scaleLevel === "enterprise")
    return { label:"Pattern", value:"Fine-tuned Foundation Model + RAG", confidence:"moderate", rationale:"Heavy domain customization at enterprise scale → fine-tune for style/domain, RAG for freshness. Expensive but highest quality ceiling.", alternatives:["Full custom model","RLHF on base model"] };
  if (i.outputType === "code")
    return { label:"Pattern", value:"Code-Specialized RAG + LLM", confidence:"strong", rationale:"Code generation needs code-specific embeddings and models trained on code corpora. Generic RAG underperforms significantly.", alternatives:["Inline model","Code interpreter agent"] };
  if (i.outputType === "structured")
    return { label:"Pattern", value:"Structured Output Pipeline", confidence:"strong", rationale:"Deterministic structured output needs function calling or JSON mode with schema validation and retry logic.", alternatives:["LLM + parser + validator","DSPy structured generation"] };
  return { label:"Pattern", value:"Hybrid RAG", confidence:"moderate", rationale:"Balanced requirements → cloud-hosted LLM with retrieval. Semantic search + metadata filtering gives the best coverage-to-cost ratio.", alternatives:["Pure semantic RAG","BM25 + dense retrieval"] };
}

function selectModel(i: DecisionInputs): ArchDecision {
  if (i.outputType === "multimodal")
    return { label:"Model Class", value:"Multimodal Foundation (GPT-4o / Gemini 1.5)", confidence:"strong", rationale:"Multimodal output requires a natively multimodal model. No workaround.", alternatives:["Claude 3.5 Sonnet","Gemini Ultra"] };
  if (i.privacyRequirement === "high")
    return { label:"Model Class", value:"Open-weight SLM (Llama 3 / Mistral / Phi-3)", confidence:"strong", rationale:"Privacy requires a self-hostable model. Open weights give full data control and are deployable on your own infra.", alternatives:["Llama 3.1 8B for speed","Llama 3.1 70B for quality"] };
  if (i.outputType === "code")
    return { label:"Model Class", value:"Code LLM (GPT-4o / DeepSeek Coder)", confidence:"strong", rationale:"Code tasks need models trained heavily on code corpora. Generic models underperform on nuanced code generation.", alternatives:["Codestral","StarCoder2"] };
  if (i.latencyRequirement === "real-time" && i.budget === "low")
    return { label:"Model Class", value:"Fast SLM (GPT-4o-mini / Claude Haiku / Gemini Flash)", confidence:"strong", rationale:"Real-time + low budget → optimize for speed and cost. Small fast models at ~100ms are 10x cheaper than frontier.", alternatives:["Llama 3.1 8B on Groq","Phi-3 mini"] };
  if (i.customization === "heavy")
    return { label:"Model Class", value:"Fine-tuned GPT-4o-mini or Llama 3", confidence:"moderate", rationale:"Heavy domain customization → fine-tune a mid-size model. More cost-effective than prompting a frontier model long-term.", alternatives:["Few-shot frontier model","DPO-aligned base model"] };
  if (i.budget === "high" && i.latencyRequirement !== "real-time")
    return { label:"Model Class", value:"Frontier LLM (GPT-4o / Claude 3.5 Sonnet)", confidence:"moderate", rationale:"High budget + non-real-time → use the best reasoning model. Highest quality ceiling, easiest to iterate on.", alternatives:["Gemini 1.5 Pro","Claude 3 Opus"] };
  return { label:"Model Class", value:"Mid-tier LLM (GPT-4o-mini / Claude Haiku)", confidence:"moderate", rationale:"Balanced requirements → capable, cost-effective model. Often 90% of frontier quality at 10% of the cost.", alternatives:["GPT-4o with caching","Mistral Medium"] };
}

function selectRetrieval(i: DecisionInputs): ArchDecision {
  if (i.dataFreshness === "live")
    return { label:"Retrieval Strategy", value:"Tool-calling + Real-time API fetch", confidence:"strong", rationale:"Live data cannot be pre-indexed. LLM must call tools at inference time. Build robust timeout and fallback handling.", alternatives:["Streaming retrieval with SSE","Webhook-updated vector store"] };
  if (i.outputType === "code")
    return { label:"Retrieval Strategy", value:"Code embedding + AST-aware chunking", confidence:"strong", rationale:"Code retrieval needs structure-aware chunking and code-specific embeddings. Function-level chunking outperforms line-based.", alternatives:["BM25 on code tokens","Symbol lookup"] };
  if (i.dataFreshness === "static" && i.budget === "low")
    return { label:"Retrieval Strategy", value:"BM25 keyword + sparse vector hybrid", confidence:"strong", rationale:"Static corpus + low budget → BM25 is free, fast, effective. Add sparse vectors for semantic coverage at minimal cost.", alternatives:["Pure BM25 (ElasticSearch)","FAISS flat index"] };
  if (i.privacyRequirement === "high")
    return { label:"Retrieval Strategy", value:"Self-hosted pgvector or Chroma", confidence:"strong", rationale:"Privacy requires on-premise vector storage. pgvector on Postgres is the easiest self-hosted path.", alternatives:["Qdrant self-hosted","Weaviate local"] };
  return { label:"Retrieval Strategy", value:"Semantic vector search + metadata filtering", confidence:"strong", rationale:"Standard RAG: embed with text-embedding-3, store in vector DB, filter by metadata. Tune chunk size for your domain.", alternatives:["Pinecone","Supabase pgvector","Weaviate Cloud"] };
}

function selectDeployment(i: DecisionInputs): ArchDecision {
  if (i.privacyRequirement === "high" && i.scaleLevel !== "prototype")
    return { label:"Deployment", value:"Self-hosted / Private VPC", confidence:"strong", rationale:"High privacy at scale requires full infra control. AWS/GCP/Azure private VPC with no public endpoints." };
  if (i.scaleLevel === "prototype")
    return { label:"Deployment", value:"Serverless (Vercel / Railway / Render)", confidence:"strong", rationale:"Prototype → minimize ops burden. Serverless handles scale-zero and fast iteration without infra investment." };
  if (i.scaleLevel === "enterprise")
    return { label:"Deployment", value:"Kubernetes + Managed LLM endpoints", confidence:"moderate", rationale:"Enterprise scale needs orchestrated containers, SLA guarantees, and managed inference with autoscaling." };
  return { label:"Deployment", value:"Cloud API + managed vector DB", confidence:"strong", rationale:"Startup/growth: managed services minimize ops. OpenAI API + Pinecone/Supabase is fastest path to production." };
}

function selectOpt(i: DecisionInputs): ArchDecision {
  if (i.latencyRequirement === "real-time")
    return { label:"Key Optimization", value:"Streaming + semantic caching + prompt compression", confidence:"strong", rationale:"Real-time UX lives on perceived latency. Stream tokens immediately, cache repeated queries, compress prompts." };
  if (i.latencyRequirement === "async" && i.scaleLevel === "enterprise")
    return { label:"Key Optimization", value:"Batch inference + result caching", confidence:"strong", rationale:"Async at scale → batch similar requests together and amortize compute cost." };
  if (i.budget === "low")
    return { label:"Key Optimization", value:"Aggressive caching + smaller model fallback", confidence:"strong", rationale:"Low budget demands cache-first design. Route simple queries to a tiny fast model." };
  return { label:"Key Optimization", value:"Semantic caching + chunk-size tuning", confidence:"moderate", rationale:"Cache semantically similar queries, tune retrieval chunk size per query type for best precision." };
}

function selectObs(i: DecisionInputs): ArchDecision {
  if (i.scaleLevel === "enterprise")
    return { label:"Observability", value:"LangSmith / Arize Phoenix + custom dashboards", confidence:"strong", rationale:"Enterprise needs full LLM tracing, hallucination detection, cost attribution, and SLA monitoring." };
  if (i.scaleLevel === "prototype")
    return { label:"Observability", value:"Simple logging + Langfuse (free tier)", confidence:"strong", rationale:"Prototype: Langfuse gives LLM tracing for free. Log inputs/outputs to catch errors before they compound." };
  return { label:"Observability", value:"Langfuse or Helicone + retrieval quality metrics", confidence:"moderate", rationale:"Track retrieval precision, LLM latency, token cost, response quality. Alert on hallucination signal early." };
}

function deriveTradeoffs(i: DecisionInputs): TradeoffLine[] {
  const t: TradeoffLine[] = [];
  if (i.latencyRequirement === "real-time") t.push({ gain:"Fast perceived response via streaming", cost:"Higher infra complexity and cost", severity:"medium" });
  if (i.privacyRequirement === "high") t.push({ gain:"Full data control — no external exposure", cost:"Higher ops burden, smaller model quality ceiling", severity:"high" });
  if (i.dataFreshness === "live") t.push({ gain:"Always current information in responses", cost:"Latency per tool call, external API dependency", severity:"high" });
  if (i.customization === "heavy") t.push({ gain:"Domain-specific quality improvements", cost:"Fine-tuning cost, dataset curation, retraining cadence", severity:"high" });
  if (i.budget === "low") t.push({ gain:"Low operating cost at scale", cost:"Must trade quality — smaller models, heavier caching", severity:"medium" });
  if (i.scaleLevel === "enterprise") t.push({ gain:"Handles extreme concurrency and SLA guarantees", cost:"Significant infra investment and dedicated ops team", severity:"high" });
  t.push({ gain:"RAG keeps knowledge fresh without retraining", cost:"Retrieval quality directly caps output — garbage in, garbage out", severity:"medium" });
  return t;
}

function deriveFailures(i: DecisionInputs): FailureMode[] {
  const m: FailureMode[] = [
    { name:"Retrieval mismatch", likelihood:"high", mitigation:"Evaluate retrieval precision separately from LLM quality. Use Cohere Rerank to improve top-k relevance on your golden dataset." },
    { name:"Hallucination on missing context", likelihood: i.dataFreshness === "live" ? "high" : "medium", mitigation:"Instruct model to say 'I don't know' when confidence is low. Evaluate with RAGAS hallucination metrics before launch." },
  ];
  if (i.latencyRequirement === "real-time") m.push({ name:"Latency spikes under load", likelihood:"medium", mitigation:"Set hard timeout budgets per pipeline stage. Degrade gracefully — return partial results rather than timeout." });
  if (i.dataFreshness === "live") m.push({ name:"External API failure cascades", likelihood:"medium", mitigation:"Circuit breaker pattern. Fallback to last-known cached result with a staleness warning shown to the user." });
  if (i.scaleLevel === "enterprise") m.push({ name:"Token cost explosion at scale", likelihood:"high", mitigation:"Implement hard per-user token quotas. Route aggressively to smaller models for simple queries. Monitor cost/query daily." });
  return m;
}

function derive30Day(i: DecisionInputs, pattern: ArchDecision, model: ArchDecision): ThirtyDayAction[] {
  const actions: ThirtyDayAction[] = [];
  actions.push({ week:"Week 1–2", lever:"Evaluation", title:"Build your golden dataset before writing any production code", description:"Define 30–50 representative queries with ideal outputs. This becomes your eval harness. Every architecture decision from here should be validated against it — not vibes.", deliverable:"Golden dataset + eval script + baseline quality score", success:"You can measure quality improvements and regressions automatically" });
  if (i.dataFreshness === "live") {
    actions.push({ week:"Week 2–3", lever:"Retrieval", title:"Stand up the tool-calling pipeline with circuit breakers", description:`Your ${pattern.value} pattern requires reliable live data fetching. Build with timeout handling, retry logic, and graceful fallback. A broken tool call should never break the user experience.`, deliverable:"Tool-calling layer with fallback + latency P95 measurement", success:"Pipeline handles external API failure without surfacing errors to users" });
  } else {
    actions.push({ week:"Week 2–3", lever:"Retrieval quality", title:"Optimize chunk size and embedding strategy for your domain", description:"Generic chunking underperforms on domain-specific content. Run experiments with chunk sizes 256/512/1024 and compare retrieval precision on your golden dataset. The right chunk size alone improves quality 15–30%.", deliverable:"Chunking experiment results + optimized embedding pipeline", success:"Retrieval precision above 80% on golden dataset" });
  }
  if (i.latencyRequirement === "real-time") {
    actions.push({ week:"Week 3–4", lever:"Latency", title:"Add streaming and measure P50/P95 under realistic load", description:`${model.value} at real-time requirements needs streaming from day one. Add token streaming, semantic caching, and load test with realistic concurrency. Measure P50 and P95 — not just averages.`, deliverable:"Streaming implementation + load test results + latency dashboard", success:"P50 latency under target with streaming perceived < 1s" });
  } else if (i.budget === "low") {
    actions.push({ week:"Week 3–4", lever:"Cost", title:"Implement semantic caching and route cheap queries to small model", description:"Most systems have 30–50% of queries semantically similar to previous ones. Add semantic cache (GPTCache or Redis + embeddings) and route simple queries to a smaller cheaper model.", deliverable:"Semantic cache + model routing logic + cost dashboard", success:"Cost-per-query reduced by at least 30% vs baseline" });
  } else {
    actions.push({ week:"Week 3–4", lever:"Observability", title:"Wire up Langfuse and define your quality alert thresholds", description:"You can't manage quality reactively. Add Langfuse tracing to every LLM call, define hallucination heuristics, and set up alerts before you scale. This is the difference between reactive and proactive quality management.", deliverable:"Langfuse integration + quality alert config + weekly quality report", success:"Every LLM call is traced, searchable, and alertable" });
  }
  return actions;
}

function derivePMQuestions(i: DecisionInputs): string[] {
  const q = [
    "What does 'good enough' quality mean to your users — and how will you measure it before launch?",
    "What is the acceptable latency budget before users disengage or lose trust?",
    "What happens when the model is wrong — who is responsible and how is it surfaced to the user?",
  ];
  if (i.privacyRequirement === "high") q.push("Have you defined your data residency and retention policy before writing a single line of code?");
  if (i.dataFreshness === "live") q.push("How stale is too stale? Define your freshness SLA before designing the retrieval pipeline.");
  if (i.customization === "heavy") q.push("Who owns the fine-tuning dataset and how is it kept up to date as the domain evolves?");
  if (i.scaleLevel === "enterprise") q.push("What are your cost-per-query targets at scale, and what levers do you have if you exceed them?");
  q.push("How will you A/B test this AI feature against the non-AI baseline to measure incremental value?");
  return q;
}

export function generateRecommendation(inputs: DecisionInputs): ArchRec {
  const pattern     = selectPattern(inputs);
  const modelClass  = selectModel(inputs);
  const retrieval   = selectRetrieval(inputs);
  const deployment  = selectDeployment(inputs);
  const optimization= selectOpt(inputs);
  const observability= selectObs(inputs);
  const tradeoffs   = deriveTradeoffs(inputs);
  const failureModes= deriveFailures(inputs);
  const thirtyDayPlan= derive30Day(inputs, pattern, modelClass);
  const pmQuestions = derivePMQuestions(inputs);
  return {
    title: pattern.value, tagline:`${modelClass.value.split(" ")[0]} · ${deployment.value.split(" ")[0]} · ${optimization.value.split(" ")[0]}`,
    summary:`For your constraints — ${inputs.latencyRequirement} latency, ${inputs.privacyRequirement} privacy, ${inputs.dataFreshness} data, ${inputs.scaleLevel} scale — the recommended pattern is ${pattern.value}. ${pattern.rationale}`,
    pattern, modelClass, retrieval, deployment, optimization, observability,
    tradeoffs, failureModes, thirtyDayPlan, pmQuestions,
    complexity: inputs.customization === "heavy" || inputs.privacyRequirement === "high" || inputs.dataFreshness === "live" ? "high" : inputs.scaleLevel === "prototype" ? "low" : "medium",
    costLevel: inputs.budget === "low" ? "low" : inputs.scaleLevel === "enterprise" ? "high" : "medium",
    latencyClass: inputs.latencyRequirement === "real-time" ? "sub-second" : inputs.latencyRequirement === "interactive" ? "1–3s" : "3–10s",
  };
}
