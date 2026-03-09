"use client";
import { GlossaryTerm } from "./Tooltip";
import { useState } from "react";
import type { FeatureAnalysis } from "@/lib/types";
import { InfraDiagram } from "./InfraDiagram";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { ExternalLink } from "lucide-react";

// Map company names to their domain for logo lookup
const COMPANY_DOMAINS: Record<string, string> = {
  "openai": "openai.com",
  "google": "google.com",
  "microsoft": "microsoft.com",
  "github": "github.com",
  "anthropic": "anthropic.com",
  "meta": "meta.com",
  "apple": "apple.com",
  "amazon": "amazon.com",
  "aws": "aws.amazon.com",
  "samsung": "samsung.com",
  "notion": "notion.so",
  "grammarly": "grammarly.com",
  "perplexity": "perplexity.ai",
  "mistral": "mistral.ai",
  "cohere": "cohere.com",
  "hugging face": "huggingface.co",
  "stability ai": "stability.ai",
  "midjourney": "midjourney.com",
  "figma": "figma.com",
  "adobe": "adobe.com",
  "salesforce": "salesforce.com",
  "nvidia": "nvidia.com",
  "x": "x.com",
  "twitter": "x.com",
  "deepmind": "deepmind.com",
  "inflection": "inflection.ai",
  "character.ai": "character.ai",
};

function CompanyLogo({ company, emoji }: { company: string; emoji: string }) {
  const [imgError, setImgError] = useState(false);
  const key = company.toLowerCase().trim();
  const domain = COMPANY_DOMAINS[key] || `${key.replace(/\s+/g, "")}.com`;
  // Use Google's favicon service as primary (free, reliable, no API key needed)
  const logoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

  if (imgError) {
    return (
      <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-2xl shrink-0">
        {emoji || "🤖"}
      </div>
    );
  }

  return (
    <div className="w-14 h-14 rounded-2xl bg-white border border-border flex items-center justify-center overflow-hidden shrink-0">
      <img
        src={logoUrl}
        alt={company}
        className="w-10 h-10 object-contain"
        onError={() => setImgError(true)}
      />
    </div>
  );
}

function FieldRow({ label, field, tip }: { label:string; field:{value:string;confidence:string}; tip?:string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
      <span className="text-xs font-mono text-subtle w-36 shrink-0 pt-0.5">
        {tip ? <GlossaryTerm term={tip}>{label}</GlossaryTerm> : label}
      </span>
      <div className="flex-1 flex items-start justify-between gap-3">
        <span className="text-sm text-text">{field.value}</span>
        <ConfidenceBadge level={field.confidence as "confirmed"|"inferred"|"unknown"}/>
      </div>
    </div>
  );
}
function Tags({ items }: { items:{value:string;confidence:string}[] }) {
  const visible = items.filter(item => item.confidence !== "unknown" && item.value && item.value.toLowerCase() !== "unknown");
  if (visible.length === 0) return null;
  return <div className="flex flex-wrap gap-2">{visible.map((item,i)=>(
    <div key={i} className="flex items-center gap-2 bg-surface border border-border rounded-xl px-3 py-1.5">
      <span className="text-sm text-text">{item.value}</span>
      <ConfidenceBadge level={item.confidence as "confirmed"|"inferred"|"unknown"}/>
    </div>
  ))}</div>;
}
const CONF_STYLE = { high:"text-confirmed border-confirmed/20 bg-confirmed/5", medium:"text-inferred border-inferred/20 bg-inferred/5", low:"text-subtle border-border bg-surface" };


function MethodologySection({ sourceCount }: { sourceCount: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden border border-accent/20 bg-accent/5">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-accent/10 transition-colors text-left">
        <div className="flex items-center gap-3">
          <span className="text-lg">🔬</span>
          <div>
            <div className="font-display font-semibold text-text">How this analysis was made</div>
            <p className="text-sm text-accent/80 font-mono mt-0.5">{sourceCount} sources retrieved - click to see how</p>
          </div>
        </div>
        <span className={`text-accent font-mono text-sm transition-transform duration-300 ${open ? "rotate-180" : ""}`}>↓</span>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-border pt-4 space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { step: "01", icon: "🔍", title: "Live Web Search", body: "6 targeted queries via Tavily API, prioritizing official docs and engineering sources for accuracy." },
              { step: "02", icon: "🧠", title: "Known Facts Layer", body: "A curated database of confirmed specs for major AI products (OpenAI, Google, Samsung, Meta, Anthropic, GitHub) is injected directly - so you get real numbers, not hallucinations." },
              { step: "03", icon: "📊", title: "GPT-4o Synthesis", body: "GPT-4o reads all sources and extracts structured data into every field. Each value is labeled confirmed (from sources), inferred (reasoned from known facts), or unknown." },
            ].map(s => (
              <div key={s.step} className="bg-surface border border-border rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{s.icon}</span>
                  <span className="text-xs font-mono text-accent">{s.step}</span>
                </div>
                <p className="text-sm font-semibold text-text mb-1">{s.title}</p>
                <p className="text-sm text-text-dim leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="bg-surface border border-border rounded-2xl p-4">
            <p className="text-xs font-mono text-subtle mb-2">CONFIDENCE LABELS</p>
            <div className="flex flex-wrap gap-4 text-sm text-text-dim">
              <span><span className="badge-confirmed mr-1.5">● confirmed</span>Directly stated in official sources or known facts database</span>
              <span><span className="badge-inferred mr-1.5">● inferred</span>Reasoned from related public information - likely but not stated</span>
              <span><span className="badge-unknown mr-1.5">● unknown</span>Not found in any available source</span>
            </div>
          </div>
          <p className="text-xs text-subtle font-mono">Data freshness: analyzed on {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}. Re-search the same query to get updated sources.</p>
        </div>
      )}
    </div>
  );
}

export function FeatureDashboard({ data }: { data: FeatureAnalysis }) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <CompanyLogo company={data.company} emoji={data.emoji} />
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-display text-2xl font-bold gradient-text">{data.featureName}</h1>
                <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${CONF_STYLE[data.overallConfidence]}`}>{data.overallConfidence} confidence</span>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-text-dim text-sm">{data.company}</span>
                <span className="text-border">·</span>
                <span className="text-xs font-mono text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">{data.category}</span>
              </div>
            </div>
          </div>
          <div className="text-right text-xs text-subtle font-mono">
            <div>Analyzed {new Date(data.generatedAt).toLocaleDateString()}</div>
            <div className="mt-0.5">{data.sources.length} sources retrieved</div>
          </div>
        </div>
        <div className="mt-5 pt-5 border-t border-border grid md:grid-cols-2 gap-5">
          <div><div className="section-label mb-2">User Problem</div><p className="text-base text-text-dim leading-relaxed">{data.userProblem}</p></div>
          <div><div className="section-label mb-2">Summary</div><p className="text-base text-text-dim leading-relaxed">{data.summary}</p></div>
        </div>
      </div>

      {/* Methodology banner - always visible */}
      <MethodologySection sourceCount={data.sources.length} />

      {/* Model */}
      <div className="card p-6">
        <div className="font-display font-semibold text-text mb-4"><GlossaryTerm term="MODEL & INFERENCE">Model &amp; Inference</GlossaryTerm></div>
        <div className="divide-y divide-border">
          <FieldRow label="MODEL NAME" tip="MODEL NAME"     field={data.model.name}/>
          <FieldRow label="PROVIDER"       field={data.model.provider}/>
          <FieldRow label="TYPE"           field={data.model.type}/>
          <FieldRow label="CONTEXT WINDOW" tip="CONTEXT WINDOW" field={data.model.contextWindow}/>
          <FieldRow label="FINE-TUNED" tip="FINE-TUNED"     field={data.model.finetuned}/>
          <FieldRow label="DEPLOYMENT" tip="DEPLOYMENT"     field={data.stack.deployment}/>
        </div>
      </div>

      {/* Performance */}
      <div className="card p-6">
        <div className="font-display font-semibold text-text mb-4"><GlossaryTerm term="PERFORMANCE">Performance</GlossaryTerm></div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {([["LATENCY",data.performance.latency],["QUALITY",data.performance.quality],["COST",data.performance.cost],["PRIVACY",data.performance.privacy],["RELIABILITY",data.performance.reliability]] as [string,{value:string;confidence:"confirmed"|"inferred"|"unknown"}][]).map(([label,field])=>(
            <div key={label} className="bg-surface rounded-2xl p-4 border border-border">
              <div className="section-label mb-2"><GlossaryTerm term={label}>{label}</GlossaryTerm></div>
              <div className="text-sm font-semibold text-text">{field.value}</div>
              <div className="mt-2"><ConfidenceBadge level={field.confidence}/></div>
            </div>
          ))}
        </div>
      </div>

      {/* Stack */}
      <div className="card p-6">
        <div className="font-display font-semibold text-text mb-5">System Stack</div>
        <div className="space-y-5">
          {data.stack.hardware.some(i => i.confidence !== "unknown" && i.value?.toLowerCase() !== "unknown") && (
            <div><div className="section-label mb-2"><GlossaryTerm term="HARDWARE">Hardware</GlossaryTerm></div><Tags items={data.stack.hardware}/></div>
          )}
          {data.stack.frameworks.some(i => i.confidence !== "unknown" && i.value?.toLowerCase() !== "unknown") && (
            <div><div className="section-label mb-2"><GlossaryTerm term="FRAMEWORKS">Frameworks</GlossaryTerm></div><Tags items={data.stack.frameworks}/></div>
          )}
          {data.stack.apis.some(i => i.confidence !== "unknown" && i.value?.toLowerCase() !== "unknown") && (
            <div><div className="section-label mb-2">APIs</div><Tags items={data.stack.apis}/></div>
          )}
        </div>
      </div>

      {/* Tradeoffs */}
      <div className="card p-6">
        <div className="font-display font-semibold text-text mb-4"><GlossaryTerm term="TRADE-OFFS">Trade-offs</GlossaryTerm></div>
        <div className="space-y-3">
          {data.tradeoffs.map((t,i)=>(
            <div key={i} className="flex gap-3 p-3 rounded-2xl bg-surface border border-border">
              <div className="w-1 self-stretch rounded-full bg-accent shrink-0"/>
              <div>
                <div className="text-sm font-semibold text-text">{t.label}</div>
                <p className="text-sm text-text-dim mt-0.5 leading-relaxed">{t.description}</p>
                <span className="inline-block mt-1.5 text-xs font-mono text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">{t.dimension}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Infrastructure Diagram */}
      {data.infraDiagram && data.infraDiagram.length > 0 && (
        <InfraDiagram layers={data.infraDiagram} featureName={data.featureName} sources={data.sources as { title: string; url: string; type: "official" | "article" | "analysis" | string }[]} />
      )}

      {/* PM Insights */}
      <div className="card p-6">
        <div className="font-display font-semibold text-text mb-4">What a PM should know</div>
        <ul className="space-y-3">
          {data.pmInsights.map((ins,i)=>(
            <li key={i} className="flex gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0">
              <span className="text-accent font-mono text-xs shrink-0 mt-1">→</span>
              <p className="text-base text-text-dim leading-relaxed">{ins}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Product impact */}
      <div className="card p-6">
        <div className="font-display font-semibold text-text mb-4">Product Impact</div>
        <div className="grid md:grid-cols-2 gap-3 mb-4">
          {([["USER SEGMENT",data.productImpact.userSegment],["ADOPTION SIGNAL",data.productImpact.adoptionSignal],["RETENTION IMPACT",data.productImpact.retentionImpact],["CHURN IMPACT",data.productImpact.churnImpact]] as [string,string][]).map(([l,v])=>(
            <div key={l} className="bg-surface border border-border rounded-2xl p-4"><div className="section-label mb-1">{l}</div><span className="text-sm text-text">{v}</span></div>
          ))}
        </div>
        {data.productImpact.successMetrics.length > 0 && (
          <div><div className="section-label mb-2">Success Metrics</div>
            <ul className="space-y-1">{data.productImpact.successMetrics.map((m,i)=><li key={i} className="flex items-center gap-2 text-sm text-text-dim"><span className="text-accent text-xs">→</span>{m}</li>)}</ul>
          </div>
        )}
      </div>

      {/* Sources */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="font-display font-semibold text-text">Sources</div>
          <span className="text-xs font-mono text-subtle">{data.sources.length} sources</span>
        </div>
        <p className="text-xs text-subtle font-mono mb-4">Confidence labels reflect confirmed vs inferred.</p>
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {data.sources.map((s,i)=>(
            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-surface border border-border rounded-2xl hover:border-accent/40 transition-colors group">
              <span className={`text-xs font-mono px-2 py-0.5 rounded-full border shrink-0 ${s.type==="official"?"badge-confirmed":s.type==="article"?"badge-inferred":"badge-unknown"}`}>{s.type}</span>
              <span className="text-sm text-text-dim group-hover:text-text transition-colors flex-1 truncate">{s.title||s.url}</span>
              <ExternalLink size={12} className="text-subtle shrink-0"/>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
