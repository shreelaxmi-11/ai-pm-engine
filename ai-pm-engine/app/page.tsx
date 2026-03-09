"use client";
import { useState, useRef, useCallback } from "react";
import { SearchBar } from "@/components/SearchBar";
import { FeatureDashboard } from "@/components/FeatureDashboard";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ArchDecisionTool } from "@/components/ArchDecisionTool";
import { AISystemSimulator } from "@/components/AISystemSimulator";
import type { FeatureAnalysis } from "@/lib/types";

type Mode = "simulate" | "explore" | "decide";

export default function Home() {
  const [mode, setMode]         = useState<Mode>("explore");
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<FeatureAnalysis|null>(null);
  const [error, setError]       = useState<string|null>(null);
  const [activeQuery, setActive]= useState("");
  const [step, setStep]         = useState(0);
  const [statusMsg, setStatus]  = useState("");

  // L4 engagement tracking
  const engagement = useRef({
    changedVariables: 0,
    exploredFailureModes: false,
    readThirtyDayPlan: false,
    engagedWithCost: false,
    engagedWithLatency: false,
    featureTypeSelected: false,
    usedArchTool: false,
    readPMQuestions: false,
  });
  const [engagementSnap, setEngagementSnap] = useState({ ...engagement.current });

  const trackEngagement = useCallback((key: string) => {
    const e = engagement.current;
    if (key === "featureType") e.featureTypeSelected = true;
    else if (key === "costPer1k" || key === "trafficScale") e.engagedWithCost = true;
    else if (key === "latencyMs" || key === "latencyRequirement") e.engagedWithLatency = true;
    else if (key === "thirtyDayPlan") e.readThirtyDayPlan = true;
    else if (key === "failureModes") e.exploredFailureModes = true;
    else { e.changedVariables++; }
    setEngagementSnap({ ...e });
  }, []);

  async function handleSearch(query: string) {
    setLoading(true); setError(null); setResult(null);
    setActive(query); setStep(1); setStatus("Searching web for public sources…");
    try {
      const res = await fetch("/api/analyze", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({query}) });
      if (!res.ok) { const d=await res.json(); setError(d.error||"Something went wrong"); setLoading(false); return; }
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, {stream:true});
        const parts = buf.split("\n\n"); buf = parts.pop()||"";
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          try {
            const { event, data } = JSON.parse(part.slice(6));
            if (event==="status")   { setStep(data.step); setStatus(data.message); }
            if (event==="error")    { setError(data.message); setLoading(false); return; }
            if (event==="complete") {
              setResult(data); setLoading(false);
              setTimeout(()=>document.getElementById("results")?.scrollIntoView({behavior:"smooth"}),100);
            }
          } catch { /* skip */ }
        }
      }
    } catch { setError("Failed to connect. Please try again."); setLoading(false); }
  }

  const switchMode = (m: Mode) => { setMode(m); setResult(null); setError(null); setLoading(false); };

  return (
    <main className="min-h-screen bg-ink">
      <div className="fixed inset-0 bg-hero-glow pointer-events-none"/>
      <div className="fixed inset-0 bg-grid bg-grid pointer-events-none"/>

      <div className="relative max-w-5xl mx-auto px-4 pb-24">

        {/* Nav */}
        <nav className="flex items-center justify-between py-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shadow-glow-sm">
              <span className="text-white text-xs font-bold font-mono">AI</span>
            </div>
            <span className="font-display font-semibold text-text text-sm">AI PM Engine</span>
          </div>
          <a href="https://www.linkedin.com/in/shreelaxmi-ganesh/" target="_blank" rel="noopener noreferrer"
            className="text-xs text-subtle hover:text-text transition-colors font-mono flex items-center gap-1.5 border border-border hover:border-accent/30 px-3 py-1.5 rounded-xl">
            Shreelaxmi Ganesh ↗
          </a>
        </nav>

        {/* Hero */}
        <div className="pt-12 pb-10 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-accent bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"/>
            AI System Simulator · RAG Feature Explorer · Architecture Engine
          </div>

          <h1 className="font-display font-bold leading-tight mb-4">
            <span className="gradient-text text-5xl md:text-6xl block">Every AI feature is</span>
            <span className="gradient-text text-5xl md:text-6xl block">a system of trade-offs.</span>
          </h1>
          <p className="text-text-dim text-lg max-w-xl mx-auto leading-relaxed mb-8">
            Simulate how AI systems behave. Explore real features through RAG. Design architectures with a 30-day PM plan.
          </p>

          {/* Mode switcher */}
          <div className="flex justify-center mb-8">
            <div className="flex p-1 bg-panel border border-border rounded-2xl gap-1">
              {([["explore","🔍 Feature Explorer"],["simulate","⚡ Simulator"],["decide","◆ Architecture"]] as [Mode,string][]).map(([m,l])=>(
                <button key={m} onClick={()=>switchMode(m)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${mode===m?"bg-accent text-white shadow-glow-sm":"text-subtle hover:text-text"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {mode==="explore" && (
            <div className="space-y-3">
              <div className="text-center px-2">
                <p className="text-base text-text-dim leading-relaxed max-w-2xl mx-auto">Search any AI product feature - like Google Lens or Samsung Transcript Assist. In 30 seconds you get a full breakdown: what model powers it, how fast it is, what it costs to run, and what trade-offs the team had to make. Think of it as an X-ray for any AI product.</p>
              </div>
              <SearchBar onSearch={handleSearch} loading={loading}/>
            </div>
          )}
          {(mode==="simulate" || mode==="decide") && null}
        </div>

        {/* ── Simulator mode ──────────────────────────────────────────────── */}
        {mode==="simulate" && (
          <div className="space-y-4">
            <div className="text-center px-2">
              <p className="text-base text-text-dim leading-relaxed max-w-2xl mx-auto">Pick any AI feature type - voice assistant, code generation, image generation - then adjust the sliders for model size, data volume, and where it runs. Watch how speed, cost, quality, and failure risk change in real time. Think of it as a flight simulator for AI product decisions - experiment freely before anything is built.</p>
            </div>
            <div className="card p-6">
              <AISystemSimulator onEngagement={trackEngagement}/>
            </div>
          </div>
        )}

        {/* ── Feature Explorer mode ────────────────────────────────────────── */}
        {mode==="explore" && (
          <div id="results">
            {loading && <LoadingSkeleton query={activeQuery} currentStep={step} statusMessage={statusMsg}/>}
            {error && (
              <div className="card p-6 border-danger/20 bg-danger/5">
                <div className="flex items-start gap-3">
                  <span className="text-danger mt-0.5">✕</span>
                  <div>
                    <p className="text-sm font-semibold text-danger mb-1">Analysis failed</p>
                    <p className="text-sm text-text-dim">{error}</p>
                    {error.includes("API keys") && (
                      <div className="mt-4 p-3 bg-surface rounded-2xl border border-border font-mono text-xs space-y-1">
                        <p className="text-subtle mb-1.5">Add in Vercel → Settings → Environment Variables:</p>
                        <p className="text-accent">TAVILY_API_KEY=tvly-…</p>
                        <p className="text-accent">OPENAI_API_KEY=sk-…</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {result && !loading && (
              <div className="animate-fade-up">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-xs text-subtle font-mono">Results for <span className="text-text">&quot;{activeQuery}&quot;</span></span>
                  <button onClick={()=>{setResult(null);setError(null);}} className="text-xs text-subtle hover:text-text font-mono border border-border rounded-xl px-3 py-1.5 hover:border-accent/30 transition-colors">← New search</button>
                </div>
                <FeatureDashboard data={result}/>
              </div>
            )}
            {!result && !loading && !error && (
              <div className="mt-8 space-y-4">
                <div className="text-center section-label mb-4">How it works</div>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    {step:"01",icon:"🔍",title:"Search a feature",desc:"Type any AI product feature - ChatGPT Voice, GitHub Copilot, Google Lens, or anything you're curious about."},
                    {step:"02",icon:"🌐",title:"Live web research",desc:"We pull from public sources in real time - engineering blogs, product announcements, technical teardowns."},
                    {step:"03",icon:"📊",title:"Structured breakdown",desc:"See the model, stack, performance trade-offs, and PM-relevant signals - all grounded in real public sources."},
                  ].map(s=>(
                    <div key={s.step} className="card p-5">
                      <div className="flex items-center gap-3 mb-3"><span className="text-xl">{s.icon}</span><span className="text-xs font-mono text-accent">{s.step}</span></div>
                      <h3 className="font-display font-semibold text-text mb-2">{s.title}</h3>
                      <p className="text-base text-text-dim leading-relaxed">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Architecture Decision mode ───────────────────────────────────── */}
        {mode==="decide" && (
          <div className="space-y-4">
            <div className="text-center px-2">
              <p className="text-base text-text-dim leading-relaxed max-w-2xl mx-auto">Not sure what AI architecture is right for what you&apos;re building? Answer 5 quick questions - what the feature does, how fast it needs to respond, how sensitive the data is, your team size, and your budget. You&apos;ll get a concrete recommendation, a breakdown of risks to watch for, and a 30-day plan to move from idea to shipped. Think of it as a technical co-founder in your pocket.</p>
            </div>
            <ArchDecisionTool
              onUsed={()=>{ engagement.current.usedArchTool=true; setEngagementSnap({...engagement.current}); trackEngagement("failureModes"); }}
            />
          </div>
        )}

        {/* ── Built By ─────────────────────────────────────────────────────── */}
        <div className="mt-24 rounded-2xl overflow-hidden border border-border">
          {/* Top accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-accent via-purple-500 to-cyan-500" />
          <div className="p-8 bg-panel">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                <span className="text-xl font-bold accent-text">SG</span>
              </div>
              {/* Text */}
              <div className="flex-1">
                <div className="section-label mb-2">Built by</div>
                <h3 className="font-display text-2xl font-bold text-text mb-1">Shreelaxmi Ganesh</h3>
                <a href="mailto:shreelaxmiganesh2001@gmail.com" className="text-sm font-mono text-subtle hover:text-accent transition-colors mb-2 block">
                  shreelaxmiganesh2001@gmail.com
                </a>
                <p className="text-base text-text-dim leading-relaxed max-w-xl">
                  Product manager with experience shipping on-device AI and GenAI features at Samsung. I built this to help product teams reason through AI system trade-offs like model choice, latency, cost, and user experience.
                </p>
              </div>
              {/* LinkedIn on the right */}
              <a href="https://www.linkedin.com/in/shreelaxmi-ganesh/" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-accent hover:bg-accent-dim text-white text-sm font-medium px-5 py-2.5 rounded-2xl transition-all shadow-glow-sm shrink-0 self-start">
                Connect on LinkedIn ↗
              </a>
            </div>
            {/* Tech stack - styled as tags not a grid */}
            <div className="mt-6 pt-6 border-t border-border flex flex-wrap gap-2">
              {[["⚡","Next.js"],["🎨","Tailwind"],["📊","Recharts"],["🔍","Tavily API"],["🧠","Claude Sonnet"],["☁️","Vercel Edge"],["🐙","GitHub"],["💻","VS Code"]].map(([icon,v])=>(
                <span key={v} className="inline-flex items-center gap-1.5 text-xs font-mono text-text-dim bg-surface border border-border px-3 py-1.5 rounded-full">{icon} {v}</span>
              ))}
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
