// ── Feature analysis (RAG) ────────────────────────────────────────────────────
export type Confidence = "confirmed" | "inferred" | "unknown";
export interface CF { value: string; confidence: Confidence }

export interface FeatureAnalysis {
  id: string; featureName: string; company: string; category: string;
  emoji: string; tagline: string; userProblem: string; summary: string;
  overallConfidence: "high" | "medium" | "low";
  model: { name: CF; provider: CF; type: CF; contextWindow: CF; finetuned: CF };
  performance: { latency: CF; quality: CF; cost: CF; privacy: CF; reliability: CF };
  stack: { hardware: CF[]; frameworks: CF[]; apis: CF[]; vectorDB: CF; orchestration: CF; deployment: CF };
  optimizations: string[];
  tradeoffs: { label: string; description: string; dimension: string }[];
  productImpact: { adoptionSignal: string; retentionImpact: string; churnImpact: string; userSegment: string; successMetrics: string[] };
  pmInsights: string[];
  infraDiagram: { layer: string; description: string; components: { name: string; detail: string; children?: { name: string; detail: string }[] }[] }[];
  sources: { title: string; url: string; type: "official" | "article" | "analysis" }[];
  generatedAt: string;
}

// ── Simulator ─────────────────────────────────────────────────────────────────
export type FeatureType = "meeting-summarization" | "voice-assistant" | "code-generation" | "search-qa" | "image-generation" | "content-rewrite" | "recommendation" | "custom";

export interface SimInputs {
  featureType: FeatureType;
  modelSize: "small" | "medium" | "large";
  contextLength: "1k" | "4k" | "16k" | "100k";
  deployment: "on-device" | "hybrid" | "cloud";
  trafficScale: "prototype" | "startup" | "growth" | "enterprise";
  latencyRequirement: "real-time" | "interactive" | "async";
  privacyRequirement: "high" | "medium" | "low";
  optimization: "none" | "basic" | "aggressive";
}

export interface SimOutputs {
  latencyMs: number;
  latencyGrade: string;
  costPer1k: number;
  costGrade: string;
  quality: number;
  privacy: number;
  failureRisk: number;
  computeLoad: number;
  insight: string;
  warnings: string[];
  recommendedArchitecture: string;
  tradeoffExplanation: string;
  thirtyDayPlan: { week: string; action: string; why: string; deliverable: string; success: string }[];
}

// ── Architecture Decision ─────────────────────────────────────────────────────
export type ConfidenceScore = "strong" | "moderate" | "situational";
export interface ArchDecision { label: string; value: string; rationale: string; confidence: ConfidenceScore; alternatives?: string[] }
export interface TradeoffLine { gain: string; cost: string; severity: "low" | "medium" | "high" }
export interface FailureMode { name: string; likelihood: "low" | "medium" | "high"; mitigation: string }
export interface ThirtyDayAction { week: string; lever: string; title: string; description: string; deliverable: string; success: string }

export interface ArchRec {
  title: string; tagline: string; summary: string;
  pattern: ArchDecision; modelClass: ArchDecision; retrieval: ArchDecision;
  deployment: ArchDecision; optimization: ArchDecision; observability: ArchDecision;
  tradeoffs: TradeoffLine[]; failureModes: FailureMode[];
  thirtyDayPlan: ThirtyDayAction[]; pmQuestions: string[];
  complexity: "low"|"medium"|"high"; costLevel: "low"|"medium"|"high"; latencyClass: string;
}

export interface DecisionInputs {
  useCase: string;
  latencyRequirement: "real-time" | "interactive" | "async";
  privacyRequirement: "high" | "medium" | "low";
  scaleLevel: "prototype" | "startup" | "growth" | "enterprise";
  budget: "low" | "medium" | "high";
  dataFreshness: "static" | "periodic" | "live";
  customization: "none" | "light" | "heavy";
  outputType: "text" | "code" | "structured" | "multimodal";
}

// ── L4 PM Signals ─────────────────────────────────────────────────────────────
export interface L4Signal {
  dimension: string;
  score: number; // 0-100
  evidence: string;
  gap: string;
  question: string; // the interview question this maps to
}
