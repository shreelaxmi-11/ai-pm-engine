"use client";
import { useState, useEffect, useRef } from "react";
import { runSimulator, FEATURE_TYPE_OPTIONS, DEFAULT_SIM } from "@/lib/simulator";
import type { SimInputs } from "@/lib/types";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";

function getArchDiagram(inp: SimInputs): { steps: string[]; notes: string } {
  const base: Record<SimInputs["featureType"], string[]> = {
    "voice-assistant":       ["🎤 Mic input", "ASR model", "LLM inference", "TTS model", "🔊 Audio output"],
    "meeting-summarization": ["📝 Transcript", "Text chunking", "Embedding model", "LLM summarization", "📄 Summary"],
    "code-generation":       ["💻 User prompt", "Context retrieval", "Code LLM", "Syntax check", "✅ Code output"],
    "search-qa":             ["🔍 User query", "Embedding model", "Vector DB", "Reranker", "LLM answer"],
    "image-generation":      ["✏️ Text prompt", "CLIP encoder", "Diffusion model", "Safety filter", "🖼️ Image"],
    "content-rewrite":       ["📄 Input text", "Style analysis", "LLM rewrite", "Quality check", "✅ Output"],
    "recommendation":        ["👤 User context", "Embedding model", "Vector search", "Ranking model", "📋 Results"],
    "custom":                ["📥 Input", "Preprocessing", "LLM inference", "Postprocessing", "📤 Output"],
  };
  const steps = base[inp.featureType];
  if (inp.deployment === "on-device") return { steps, notes: "On-device: All steps run locally. No data leaves the device. Model is quantized (INT4/INT8) to fit memory constraints." };
  if (inp.deployment === "hybrid") return { steps, notes: "Hybrid: Simple queries handled on-device (fast + private). Complex queries routed to cloud (quality). More engineering complexity." };
  return { steps, notes: "Cloud: All steps run on managed infrastructure. Access to largest models. Best quality, but data leaves your system and latency includes network round-trip." };
}

function getCostBreakdown(inp: SimInputs, totalCost: number): { label: string; pct: number; cents: number }[] {
  if (inp.featureType === "image-generation") return [
    { label: "Diffusion model compute", pct: 75, cents: +(totalCost * 0.75).toFixed(1) },
    { label: "Safety filter", pct: 10, cents: +(totalCost * 0.10).toFixed(1) },
    { label: "Storage / CDN", pct: 15, cents: +(totalCost * 0.15).toFixed(1) },
  ];
  if (inp.deployment === "on-device") return [
    { label: "Device compute (amortized)", pct: 60, cents: +(totalCost * 0.60).toFixed(1) },
    { label: "Model download / update", pct: 25, cents: +(totalCost * 0.25).toFixed(1) },
    { label: "Cloud fallback requests", pct: 15, cents: +(totalCost * 0.15).toFixed(1) },
  ];
  const hasVectorDB = ["search-qa", "recommendation", "meeting-summarization"].includes(inp.featureType);
  if (hasVectorDB) return [
    { label: "LLM inference tokens", pct: 55, cents: +(totalCost * 0.55).toFixed(1) },
    { label: "Embedding model", pct: 15, cents: +(totalCost * 0.15).toFixed(1) },
    { label: "Vector DB queries", pct: 20, cents: +(totalCost * 0.20).toFixed(1) },
    { label: "Network / egress", pct: 10, cents: +(totalCost * 0.10).toFixed(1) },
  ];
  return [
    { label: "LLM inference tokens", pct: 70, cents: +(totalCost * 0.70).toFixed(1) },
    { label: "Embedding model", pct: 15, cents: +(totalCost * 0.15).toFixed(1) },
    { label: "Network / egress", pct: 15, cents: +(totalCost * 0.15).toFixed(1) },
  ];
}

function getTradeoffExplanations(inp: SimInputs, prev: SimInputs): string[] {
  const ex: string[] = [];
  if (inp.modelSize !== prev.modelSize) {
    if (inp.modelSize === "large") ex.push("Model size → Large: More parameters = better reasoning (+Quality), but more compute per token (+Latency, +Cost).");
    if (inp.modelSize === "small") ex.push("Model size → Small: Fewer parameters = faster and cheaper, but simpler reasoning (−Quality). Good for pattern-matching tasks.");
    if (inp.modelSize === "medium") ex.push("Model size → Medium: Balanced trade-off. Good starting point before you have user data to justify going larger.");
  }
  if (inp.contextLength !== prev.contextLength) {
    if (inp.contextLength === "100k") ex.push("Context → 100K tokens: Sees the full document, fewer missed details (+Quality). But 100K tokens takes significantly more compute (+Latency, +Cost).");
    if (inp.contextLength === "1k") ex.push("Context → 1K tokens: Minimal input, very fast and cheap. But misses most context - only works for short, simple queries.");
    if (inp.contextLength === "16k") ex.push("Context → 16K tokens: Good for most documents. Covers a 30-page report or a long meeting transcript.");
  }
  if (inp.deployment !== prev.deployment) {
    if (inp.deployment === "on-device") ex.push("Deployment → On-device: No data leaves the device (+Privacy). But model must be small enough to fit (+Latency reduction but −Quality). No API fees.");
    if (inp.deployment === "cloud") ex.push("Deployment → Cloud: Largest models available (+Quality). Network round-trip adds latency. Data sent to external servers (−Privacy). Pay per token.");
    if (inp.deployment === "hybrid") ex.push("Deployment → Hybrid: Simple queries on-device (fast + private). Complex queries in cloud (quality). Best balance - more engineering work to implement.");
  }
  if (inp.trafficScale !== prev.trafficScale) {
    if (inp.trafficScale === "enterprise") ex.push("Scale → Enterprise: Cost compounds with volume. Failure risk rises with more users hitting edge cases. Requires caching, circuit breakers, and quotas.");
    if (inp.trafficScale === "prototype") ex.push("Scale → Prototype: Minimal cost and risk. The right time to experiment with parameters before committing to an architecture.");
  }
  if (inp.optimization !== prev.optimization) {
    if (inp.optimization === "aggressive") ex.push("Optimization → Aggressive: Caching + quantization + batching cuts latency and cost. Trade-off: some quality loss from approximate cache hits and quantization.");
    if (inp.optimization === "none") ex.push("Optimization → None: Every request hits the LLM directly. Maximum quality, but maximum cost and latency. Fine for prototypes, expensive at scale.");
  }
  if (inp.privacyRequirement !== prev.privacyRequirement && inp.privacyRequirement === "high" && inp.deployment === "cloud") {
    ex.push("⚠️ Conflict: High privacy + Cloud deployment. If data is sensitive (medical, legal, financial), sending it to cloud APIs is a compliance risk. Consider on-device or self-hosted.");
  }
  return ex;
}


function ThirtyDayPlan({ items, onEngagement }: { items: { week: string; action: string; why: string; deliverable: string; success: string }[]; onEngagement?: (k: string) => void }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const toggle = (i: number) => {
    setOpenIdx(prev => prev === i ? null : i);
    onEngagement?.("thirtyDayPlan");
  };

  const weekColors = ["#6366F1", "#8B5CF6", "#A78BFA", "#06B6D4", "#10B981"];

  return (
    <div className="card p-5">
      <div className="font-display font-semibold text-text mb-1">30-Day PM Roadmap</div>
      <p className="text-xs text-subtle font-mono mb-4">Based on this configuration - what a PM should ship in the first <span className="text-accent font-semibold">30 days</span>. Click each week to expand.</p>
      {/* Progress bar */}
      <div className="flex items-center gap-1 mb-4">
        {items.map((_,i) => (
          <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{ background: openIdx === i ? weekColors[i % weekColors.length] : `${weekColors[i % weekColors.length]}33` }} />
        ))}
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className={`border rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer ${openIdx === i ? "border-accent/40 bg-accent/5" : "border-border bg-surface hover:border-accent/20"}`}
            onClick={() => toggle(i)}>
            {/* Header row */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Step number circle */}
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: `${weekColors[i % weekColors.length]}22`, color: weekColors[i % weekColors.length], border: `1px solid ${weekColors[i % weekColors.length]}44` }}>
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-mono block mb-0.5" style={{ color: weekColors[i % weekColors.length] }}>{item.week}</span>
                  <p className="text-sm font-semibold text-text truncate">{item.action}</p>
                </div>
              </div>
              <span className={`text-accent text-sm font-mono shrink-0 ml-3 transition-transform duration-300 ${openIdx === i ? "rotate-180" : ""}`}>↓</span>
            </div>

            {/* Expandable detail */}
            {openIdx === i && (
              <div className="px-4 pb-5 space-y-4 border-t border-border/60 pt-4 animate-fade-in">
                {/* Why */}
                <div>
                  <p className="text-xs font-mono text-subtle mb-1.5">WHY THIS MATTERS</p>
                  <p className="text-base text-text-dim leading-relaxed">{item.why}</p>
                </div>

                {/* Deliverable */}
                <div className="bg-ink border border-border rounded-xl p-3">
                  <p className="text-xs font-mono text-subtle mb-1">📦 DELIVERABLE</p>
                  <p className="text-sm text-text leading-relaxed">{item.deliverable}</p>
                </div>

                {/* Success */}
                <div className="bg-confirmed/5 border border-confirmed/20 rounded-xl p-3">
                  <p className="text-xs font-mono text-confirmed mb-1">✓ YOU&apos;LL KNOW IT WORKED WHEN</p>
                  <p className="text-sm text-text leading-relaxed">{item.success}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureTypeGrid({ value, onChange }: { value: SimInputs["featureType"]; onChange: (v: SimInputs["featureType"]) => void }) {
  return (
    <div>
      <div className="section-label mb-3">Feature Type</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {FEATURE_TYPE_OPTIONS.map(o => (
          <button key={o.value} onClick={() => onChange(o.value)}
            className={`flex items-center gap-2 p-3 rounded-2xl border text-left transition-all duration-200 ${value===o.value?"border-accent bg-accent/10 text-text":"border-border bg-surface text-text-dim hover:border-accent/30 hover:text-text"}`}>
            <span className="text-lg">{o.emoji}</span>
            <span className="text-xs font-medium leading-tight">{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Tabs({ label, opts, value, onChange }: { label: string; opts: {value:string;label:string;hint?:string}[]; value: string; onChange:(v:string)=>void }) {
  return (
    <div>
      <div className="section-label mb-2">{label}</div>
      <div className="flex gap-1 p-1 bg-ink rounded-xl border border-border">
        {opts.map(o => (
          <button key={o.value} onClick={() => onChange(o.value)}
            className={`flex-1 py-2 px-1 rounded-lg text-center transition-all duration-200 ${value===o.value?"bg-accent text-white shadow-glow-sm":"text-subtle hover:text-text"}`}>
            <div className="text-xs font-medium">{o.label}</div>
            {o.hint && <div className="text-xs opacity-60 font-mono hidden sm:block">{o.hint}</div>}
          </button>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value, unit, color, max }: { label:string; value:number; unit:string; color:string; max:number }) {
  return (
    <div className="card p-4">
      <div className="section-label mb-2">{label}</div>
      <div className="flex items-end gap-1 mb-2">
        <span className="text-2xl font-display font-bold" style={{color}}>{value}</span>
        <span className="text-sm text-subtle font-mono mb-0.5">{unit}</span>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{width:`${Math.min(100,(value/max)*100)}%`,background:color}}/>
      </div>
    </div>
  );
}

function scoreColor(v: number) { return v >= 75 ? "#22C55E" : v >= 50 ? "#F59E0B" : "#EF4444"; }
function latColor(ms: number)  { return ms <= 1500 ? "#22C55E" : ms <= 4000 ? "#F59E0B" : "#EF4444"; }
function riskColor(r: number)  { return r <= 20 ? "#22C55E" : r <= 35 ? "#F59E0B" : "#EF4444"; }
function costColor(c: number)  { return c <= 10 ? "#22C55E" : c <= 30 ? "#F59E0B" : "#EF4444"; }


function SimMethodology() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden border border-accent/20 bg-accent/5">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-accent/10 transition-colors text-left">
        <div className="flex items-center gap-3">
          <span className="text-lg">🔬</span>
          <div>
            <div className="font-display font-semibold text-text">How this simulation works</div>
            <p className="text-sm text-accent/80 font-mono mt-0.5">All numbers based on real benchmarks - click to see sources</p>
          </div>
        </div>
        <span className={`text-accent font-mono text-sm transition-transform duration-300 ${open ? "rotate-180" : ""}`}>↓</span>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-accent/20 pt-4 space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { icon: "⚡", title: "Latency Model", body: "Baseline latency figures come from MLPerf Inference v5.1 benchmarks and ArtificialAnalysis leaderboard data. Each slider adjusts latency using real scaling factors - e.g. doubling context length adds ~40% to TTFT based on measured KV-cache behavior." },
              { icon: "💰", title: "Cost Model", body: "Base costs sourced directly from OpenAI, Anthropic, and Google pricing pages. Model size multipliers reflect observed cost ratios between model tiers. Traffic scale uses real infrastructure cost curves, not linear extrapolation." },
              { icon: "🎯", title: "Quality & Risk", body: "Quality scores derived from published benchmarks: Whisper v3 WER 2.7%, GitHub Copilot 46% acceptance rate, DALL-E 3 human preference scores. Failure risk increases non-linearly with scale - based on published incident post-mortems." },
            ].map(s => (
              <div key={s.title} className="bg-surface border border-border rounded-2xl p-4">
                <div className="text-lg mb-2">{s.icon}</div>
                <p className="text-sm font-semibold text-text mb-1">{s.title}</p>
                <p className="text-sm text-text-dim leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="bg-surface border border-border rounded-2xl p-4">
            <p className="text-xs font-mono text-subtle mb-2">BENCHMARK SOURCES</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "MLPerf Inference v5.1", url: "https://mlcommons.org/2025/09/mlperf-inference-v5-1-results/" },
                { label: "OpenAI Pricing", url: "https://openai.com/api/pricing/" },
                { label: "ArtificialAnalysis Leaderboard", url: "https://artificialanalysis.ai/leaderboards/models" },
                { label: "Anthropic Pricing", url: "https://www.anthropic.com/pricing" },
              ].map(s => (
                <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-mono text-accent hover:underline border border-accent/20 px-2 py-1 rounded-full">
                  {s.label} ↗
                </a>
              ))}
            </div>
          </div>
          <p className="text-xs text-subtle font-mono">This is a simulation tool for PM decision-making - not a production profiler. Numbers are directionally accurate, not exact. Always validate with your own load testing before launch.</p>
        </div>
      )}
    </div>
  );
}

interface Props { onEngagement?: (k: string) => void }

export function AISystemSimulator({ onEngagement }: Props) {
  const [inp, setInp] = useState<SimInputs>(DEFAULT_SIM);
  const prevInp = useRef<SimInputs | null>(null);
  const [tradeoffs, setTradeoffs] = useState<string[]>([]);

  const out = runSimulator(inp);

  const set = (k: keyof SimInputs) => (v: string) => {
    prevInp.current = { ...inp };
    setInp(p => ({ ...p, [k]: v }));
    onEngagement?.(k);
  };

  useEffect(() => { onEngagement?.("featureType"); }, []);

  useEffect(() => {
    if (prevInp.current) {
      const ex = getTradeoffExplanations(inp, prevInp.current);
      if (ex.length > 0) setTradeoffs(ex);
    }
  }, [inp]);

  const radarData = [
    { subject:"Quality",    value: out.quality },
    { subject:"Privacy",    value: out.privacy },
    { subject:"Reliability",value: Math.max(0, 100 - out.failureRisk) },
    { subject:"Cost eff.",  value: Math.max(0, 100 - out.costPer1k) },
    { subject:"Speed",      value: Math.max(0, 100 - (out.latencyMs / 180)) },
  ];

  const arch = getArchDiagram(inp);
  const costBreakdown = getCostBreakdown(inp, out.costPer1k);

  return (
    <div className="space-y-6">
      <FeatureTypeGrid value={inp.featureType} onChange={v => set("featureType")(v)} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Tabs label="Model Size" value={inp.modelSize} onChange={set("modelSize")}
            opts={[{value:"small",label:"Small",hint:"~7B"},{value:"medium",label:"Medium",hint:"~13B"},{value:"large",label:"Large",hint:"70B+"}]} />
          <Tabs label="Context Length" value={inp.contextLength} onChange={set("contextLength")}
            opts={[{value:"1k",label:"1K"},{value:"4k",label:"4K"},{value:"16k",label:"16K"},{value:"100k",label:"100K"}]} />
          <Tabs label="Deployment" value={inp.deployment} onChange={set("deployment")}
            opts={[{value:"on-device",label:"On-Device",hint:"private"},{value:"hybrid",label:"Hybrid",hint:"mixed"},{value:"cloud",label:"Cloud",hint:"managed"}]} />
          <Tabs label="Traffic Scale" value={inp.trafficScale} onChange={set("trafficScale")}
            opts={[{value:"prototype",label:"Prototype"},{value:"startup",label:"Startup"},{value:"growth",label:"Growth"},{value:"enterprise",label:"Enterprise"}]} />
          <div className="grid grid-cols-2 gap-4">
            <Tabs label="Latency Req." value={inp.latencyRequirement} onChange={set("latencyRequirement")}
              opts={[{value:"real-time",label:"Real-time"},{value:"interactive",label:"Interactive"},{value:"async",label:"Async"}]} />
            <Tabs label="Privacy Req." value={inp.privacyRequirement} onChange={set("privacyRequirement")}
              opts={[{value:"high",label:"High"},{value:"medium",label:"Med."},{value:"low",label:"Low"}]} />
          </div>
          <Tabs label="Optimization" value={inp.optimization} onChange={set("optimization")}
            opts={[{value:"none",label:"None"},{value:"basic",label:"Basic"},{value:"aggressive",label:"Aggressive"}]} />
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="LATENCY"       value={out.latencyMs}    unit="ms"   color={latColor(out.latencyMs)}      max={10000} />
            <Metric label="COST / 1K REQ" value={out.costPer1k}   unit="¢"    color={costColor(out.costPer1k)}     max={80} />
            <Metric label="QUALITY"        value={out.quality} unit="/100" color={scoreColor(out.quality)} max={100} />
            <Metric label="PRIVACY"        value={out.privacy} unit="/100" color={scoreColor(out.privacy)} max={100} />
            <Metric label="FAILURE RISK"   value={out.failureRisk}  unit="%"   color={riskColor(out.failureRisk)}   max={80} />
            <Metric label="COMPUTE LOAD"   value={out.computeLoad}  unit="%"   color={scoreColor(100-out.computeLoad)} max={100} />
          </div>
          <div className="card p-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{top:0,right:20,bottom:0,left:20}}>
                <PolarGrid stroke="#1A1A2E"/>
                <PolarAngleAxis dataKey="subject" tick={{fill:"#6666AA",fontSize:10,fontFamily:"JetBrains Mono"}}/>
                <Radar dataKey="value" stroke="#6366F1" fill="#6366F1" fillOpacity={0.15} strokeWidth={1.5}/>
                <Tooltip contentStyle={{background:"#11111E",border:"1px solid #1A1A2E",borderRadius:8,fontSize:12}} labelStyle={{color:"#EDEDF5"}} itemStyle={{color:"#6366F1"}}/>
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tradeoff explanations */}
      {tradeoffs.length > 0 && (
        <div className="border border-accent/30 rounded-2xl p-5 bg-accent/5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-accent text-sm">⚡</span>
            <span className="section-label">Why did the numbers change?</span>
          </div>
          <div className="space-y-2">
            {tradeoffs.map((e, i) => (
              <p key={i} className="text-sm text-text-dim leading-relaxed border-l-2 border-accent/40 pl-3">{e}</p>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {out.warnings.length > 0 && (
        <div className="space-y-2">
          {out.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-inferred bg-inferred/5 border border-inferred/20 rounded-xl px-3 py-2">
              <span>⚠</span><span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Methodology */}
      <SimMethodology />

      {/* System Insight */}
      <div className="border border-accent/20 rounded-2xl p-5 bg-accent/5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-accent text-sm">◆</span>
          <span className="section-label">System Insight</span>
        </div>
        <p className="text-base text-text-dim leading-relaxed">{out.insight}</p>
        <div className="mt-3 pt-3 border-t border-accent/10 flex flex-wrap gap-2">
          <span className="text-xs font-mono text-subtle">Benchmarks sourced from:</span>
          {[
            { label: "MLPerf v5.1", url: "https://mlcommons.org/2025/09/mlperf-inference-v5-1-results/" },
            { label: "OpenAI Pricing", url: "https://openai.com/api/pricing/" },
            { label: "ArtificialAnalysis", url: "https://artificialanalysis.ai/leaderboards/models" },
          ].map((s) => (
            <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
              className="text-xs font-mono text-accent hover:underline border border-accent/20 px-2 py-0.5 rounded-full">
              {s.label} ↗
            </a>
          ))}
        </div>
      </div>

      {/* Architecture diagram */}
      <div className="card p-5">
        <div className="section-label mb-4">System Architecture</div>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {arch.steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text font-medium">{step}</div>
              {i < arch.steps.length - 1 && <span className="text-accent font-bold text-sm">→</span>}
            </div>
          ))}
        </div>
        <p className="text-sm text-text-dim leading-relaxed border-t border-border pt-3">{arch.notes}</p>
      </div>

      {/* Cost breakdown */}
      <div className="card p-5">
        <div className="section-label mb-1">Cost Breakdown</div>
        <p className="text-xs text-subtle font-mono mb-4">Total: <span className="text-text">{out.costPer1k}¢</span> per 1,000 requests</p>
        <div className="space-y-3">
          {costBreakdown.map((item, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-base text-text-dim">{item.label}</span>
                <span className="text-xs font-mono text-text">{item.cents}¢ <span className="text-subtle">({item.pct}%)</span></span>
              </div>
              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500 bg-accent/70" style={{width:`${item.pct}%`}}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended architecture */}
      <div className="card p-5">
        <div className="section-label mb-2">Recommended Architecture Pattern</div>
        <p className="text-sm text-text font-medium">{out.recommendedArchitecture}</p>
      </div>

      {/* 30-day plan */}
      <ThirtyDayPlan items={out.thirtyDayPlan} onEngagement={onEngagement} />
    </div>
  );
}
