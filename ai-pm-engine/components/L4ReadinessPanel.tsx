"use client";
import { useState } from "react";
import { assessL4Profile, inferProfileFromSimulatorUsage } from "@/lib/l4signals";
import type { L4Signal } from "@/lib/types";

interface Props {
  engagementData: {
    changedVariables: number;
    exploredFailureModes: boolean;
    readThirtyDayPlan: boolean;
    engagedWithCost: boolean;
    engagedWithLatency: boolean;
    featureTypeSelected: boolean;
    usedArchTool: boolean;
    readPMQuestions: boolean;
  };
}

const VERDICT_STYLE: Record<string, string> = {
  "strong hire": "text-confirmed bg-confirmed/5 border-confirmed/20",
  "hire":        "text-confirmed bg-confirmed/5 border-confirmed/15",
  "borderline":  "text-inferred bg-inferred/5 border-inferred/20",
  "no hire":     "text-danger bg-danger/5 border-danger/20",
};

function ScoreBar({ signal, index }: { signal: L4Signal; index: number }) {
  const [open, setOpen] = useState(false);
  const color = signal.score >= 75 ? "#22C55E" : signal.score >= 55 ? "#F59E0B" : "#EF4444";
  return (
    <div className="space-y-2">
      <button onClick={() => setOpen(!open)} className="w-full text-left">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-text">{signal.dimension}</span>
          <span className="text-sm font-bold font-mono" style={{color}}>{signal.score}</span>
        </div>
        <div className="h-2 bg-border rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700 ease-out" style={{width:`${signal.score}%`,background:color,transitionDelay:`${index*80}ms`}}/>
        </div>
      </button>
      {open && (
        <div className="pl-0 pt-1 space-y-2 animate-fade-in">
          <p className="text-xs text-text-dim leading-relaxed">{signal.evidence}</p>
          <div className="bg-surface border border-border rounded-xl p-3">
            <div className="text-xs font-mono text-subtle mb-1">Gap / Action</div>
            <p className="text-xs text-text-dim">{signal.gap}</p>
          </div>
          <div className="bg-accent/5 border border-accent/20 rounded-xl p-3">
            <div className="text-xs font-mono text-accent mb-1">Interview question this maps to</div>
            <p className="text-xs text-text-dim italic">&ldquo;{signal.question}&rdquo;</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function L4ReadinessPanel({ engagementData }: Props) {
  const [expanded, setExpanded] = useState(false);
  const profile  = inferProfileFromSimulatorUsage(engagementData);
  const assessment = assessL4Profile(profile);

  return (
    <div className="card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="section-label mb-1">Google L4 PM Readiness</div>
          <p className="text-xs text-subtle font-mono">Based on how you engaged with the system trade-offs above</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-3xl font-display font-bold gradient-text">{assessment.overallReadiness}</div>
            <div className="text-xs text-subtle font-mono">/ 100</div>
          </div>
          <div className={`text-xs font-mono px-3 py-1.5 rounded-xl border font-semibold ${VERDICT_STYLE[assessment.hiringVerdict]}`}>
            {assessment.hiringVerdict}
          </div>
        </div>
      </div>

      {/* Verdict */}
      <div className="bg-surface border border-border rounded-2xl p-4">
        <div className="text-xs font-mono text-subtle mb-1">Hiring manager read</div>
        <p className="text-sm text-text-dim leading-relaxed">{assessment.verdictReason}</p>
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          <div><span className="text-xs text-subtle">Top strength: </span><span className="text-xs text-confirmed font-mono">{assessment.topStrength}</span></div>
          <div><span className="text-xs text-subtle">Top gap: </span><span className="text-xs text-inferred font-mono">{assessment.topGap}</span></div>
        </div>
      </div>

      {/* Signal bars */}
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-text">8 L4 Dimensions</span>
          <span className="text-xs text-accent font-mono">{expanded?"Hide details ↑":"Show details ↓"}</span>
        </div>
        <div className="space-y-3">
          {assessment.signals.slice(0,expanded?8:3).map((s, i) => <ScoreBar key={s.dimension} signal={s} index={i}/>)}
        </div>
      </button>

      {/* Interview prep */}
      {expanded && (
        <div className="space-y-3 animate-fade-in">
          <div className="section-label pt-2">Google PM Interview Questions You Should Prepare</div>
          {assessment.interviewQuestions.map((q, i) => (
            <div key={i} className="bg-surface border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-lg">{q.category}</span>
              </div>
              <p className="text-sm font-medium text-text mb-2">&ldquo;{q.question}&rdquo;</p>
              <div className="bg-ink border border-border rounded-xl p-3">
                <div className="text-xs font-mono text-subtle mb-1">What they&apos;re really evaluating</div>
                <p className="text-xs text-text-dim leading-relaxed">{q.whatTheyReallyWant}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-subtle font-mono text-center pt-2">
        Scores update as you explore the simulator - the more deeply you engage, the more accurate the signal.
      </p>
    </div>
  );
}
