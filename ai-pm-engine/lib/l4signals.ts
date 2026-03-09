import type { L4Signal } from "./types";

// The 8 dimensions Google L4 PM hiring actually evaluates
// Based on Google's PM interview rubric and publicly known evaluation criteria

export interface L4Assessment {
  overallReadiness: number; // 0-100
  signals: L4Signal[];
  topStrength: string;
  topGap: string;
  hiringVerdict: "strong hire" | "hire" | "borderline" | "no hire";
  verdictReason: string;
  interviewQuestions: { category: string; question: string; whatTheyReallyWant: string }[];
}

export interface L4InputProfile {
  // What the candidate demonstrates through the tool
  systemsThinkingDepth: number;   // 0-100: Did they explore failure modes, scale, trade-offs?
  quantitativeReasoning: number;  // 0-100: Did they engage with cost, latency, quality numbers?
  userEmpathy: number;            // 0-100: Did they anchor decisions to user problems?
  ambiguityHandling: number;      // 0-100: Did they make decisions with incomplete info?
  crossFunctional: number;        // 0-100: Did they think about eng/design/data tradeoffs?
  strategicThinking: number;      // 0-100: Did they think about long-term implications?
  executionClarity: number;       // 0-100: Did they produce a concrete action plan?
  aiDomainDepth: number;          // 0-100: Did they show real AI systems knowledge?
}

export function assessL4Profile(profile: L4InputProfile): L4Assessment {
  const signals: L4Signal[] = [
    {
      dimension: "Systems Thinking",
      score: profile.systemsThinkingDepth,
      evidence: profile.systemsThinkingDepth > 75
        ? "Explored failure modes, scale constraints, and cascading trade-offs — not just the happy path."
        : profile.systemsThinkingDepth > 50
        ? "Considered trade-offs but didn't fully explore failure modes or second-order effects."
        : "Stayed at surface level — described what a feature does rather than how it behaves under stress.",
      gap: profile.systemsThinkingDepth > 75 ? "Strong — ensure you can articulate system design choices verbally, not just visually." : "Practice walking through what breaks first when scale 10x's. Think in failure modes, not features.",
      question: "Design the AI architecture for Google Assistant's on-device summarization at 1B+ users.",
    },
    {
      dimension: "Quantitative Reasoning",
      score: profile.quantitativeReasoning,
      evidence: profile.quantitativeReasoning > 75
        ? "Engaged meaningfully with latency thresholds, cost-per-request, and quality scores — not just directional."
        : profile.quantitativeReasoning > 50
        ? "Used numbers but didn't tie them to user impact or business decisions."
        : "Described outcomes qualitatively without anchoring to specific metrics or thresholds.",
      gap: profile.quantitativeReasoning > 75 ? "Strong — be ready to back estimates with reasoning, not memorized stats." : "Google L4s are expected to size everything. Practice saying '~$0.02/request at 10M DAU = $200K/month' before any decision.",
      question: "The AI feature costs 3x more than projected. Walk me through how you diagnose and fix it.",
    },
    {
      dimension: "User Empathy",
      score: profile.userEmpathy,
      evidence: profile.userEmpathy > 75
        ? "Consistently anchored technical decisions to user problems — latency threshold tied to engagement drop, not arbitrary."
        : profile.userEmpathy > 50
        ? "Mentioned user impact but it felt secondary to technical decisions."
        : "Technical choices were made in isolation — user impact was an afterthought.",
      gap: profile.userEmpathy > 75 ? "Strong — make sure to segment users (power vs. casual) in your answers." : "For every architecture decision, ask: what does this feel like to the user when it's slow, wrong, or private? Lead with that.",
      question: "How would you measure whether this AI feature is actually improving user outcomes vs. just being used?",
    },
    {
      dimension: "Handling Ambiguity",
      score: profile.ambiguityHandling,
      evidence: profile.ambiguityHandling > 75
        ? "Made confident decisions with incomplete information and stated assumptions explicitly."
        : profile.ambiguityHandling > 50
        ? "Made decisions but hedged excessively or waited for too much information."
        : "Struggled to decide without complete information — over-qualified every choice.",
      gap: profile.ambiguityHandling > 75 ? "Strong — practice stating trade-offs in one sentence, not paragraphs." : "Google L4 PMs are expected to make calls. State your assumption, make the decision, state what would change it. Three sentences.",
      question: "You have no data on how users will respond to this AI feature. How do you decide whether to launch?",
    },
    {
      dimension: "Cross-functional Depth",
      score: profile.crossFunctional,
      evidence: profile.crossFunctional > 75
        ? "Naturally incorporated engineering complexity, data requirements, and design constraints — not just the PM perspective."
        : profile.crossFunctional > 50
        ? "Considered engineering impact but didn't deeply engage with data pipeline or model training implications."
        : "Mostly thought from a PM perspective — didn't explore what this costs engineers or what data is needed.",
      gap: profile.crossFunctional > 75 ? "Strong — practice naming the specific eng/ML roles that would own each decision." : "Practice explaining your decisions from the perspective of: what does the ML engineer need to build this? What data is required?",
      question: "How would you work with your ML team to define the quality bar for this AI feature before launch?",
    },
    {
      dimension: "Strategic Thinking",
      score: profile.strategicThinking,
      evidence: profile.strategicThinking > 75
        ? "Connected feature decisions to long-term platform defensibility, moat, and competitive positioning."
        : profile.strategicThinking > 50
        ? "Thought about roadmap but mostly tactically — next quarter, not next 3 years."
        : "Focused almost entirely on immediate implementation — no long-term framing.",
      gap: profile.strategicThinking > 75 ? "Strong — be ready to connect your AI feature to Google's overall AI strategy." : "For every feature, ask: if this works, what does it unlock? What becomes possible in 3 years that isn't today?",
      question: "If this AI feature succeeds, how does it change Google's competitive position in 3 years?",
    },
    {
      dimension: "Execution Clarity",
      score: profile.executionClarity,
      evidence: profile.executionClarity > 75
        ? "Produced a concrete, sequenced action plan with specific deliverables and success metrics — not a vague roadmap."
        : profile.executionClarity > 50
        ? "Had a plan but deliverables were vague or sequencing wasn't justified."
        : "Plan felt like a list of activities rather than a prioritized sequence with clear success criteria.",
      gap: profile.executionClarity > 75 ? "Strong — practice articulating the single most important thing to learn in week 1." : "Google L4 PMs ship. Practice writing: 'By end of week 2, we will have X. We'll know it worked when Y.'",
      question: "Walk me through exactly what you'd do in your first 30 days on this AI feature.",
    },
    {
      dimension: "AI Domain Depth",
      score: profile.aiDomainDepth,
      evidence: profile.aiDomainDepth > 75
        ? "Demonstrated genuine understanding of RAG, latency-quality trade-offs, on-device vs. cloud, and model selection — not surface-level AI buzzwords."
        : profile.aiDomainDepth > 50
        ? "Knew the concepts but couldn't explain the engineering implications or make concrete model choices."
        : "Used AI terminology without demonstrating understanding of the underlying trade-offs.",
      gap: profile.aiDomainDepth > 75 ? "Strong — practice explaining these concepts without jargon to a non-technical stakeholder." : "You don't need to code, but you need to know: what is RAG and when does it fail? What is the latency cost of a 100K context window? Why does on-device hurt quality?",
      question: "Explain the trade-off between a large cloud model and a small on-device model to a VP who is not technical.",
    },
  ];

  const overallReadiness = Math.round(signals.reduce((sum, s) => sum + s.score, 0) / signals.length);
  const sorted = [...signals].sort((a, b) => b.score - a.score);
  const topStrength = sorted[0].dimension;
  const topGap = sorted[sorted.length - 1].dimension;

  let hiringVerdict: L4Assessment["hiringVerdict"];
  let verdictReason: string;
  if (overallReadiness >= 78) { hiringVerdict = "strong hire"; verdictReason = "Demonstrates systems thinking, quantitative grounding, and execution clarity at the L4 bar. Would contribute independently from day one."; }
  else if (overallReadiness >= 65) { hiringVerdict = "hire"; verdictReason = "Meets the L4 bar with clear strengths. Would benefit from mentorship on the lower-scoring dimensions but has the foundation to grow."; }
  else if (overallReadiness >= 52) { hiringVerdict = "borderline"; verdictReason = "Shows potential but has meaningful gaps in one or more critical L4 dimensions. Strong performance in the loop interviews could offset this."; }
  else { hiringVerdict = "no hire"; verdictReason = "Does not yet demonstrate the depth of systems thinking, quantitative reasoning, or execution clarity expected at L4. Recommend L3 or additional preparation."; }

  const interviewQuestions = [
    { category:"Product Design", question:"Design an AI meeting summarization feature for Google Meet. Walk me through your full decision process.", whatTheyReallyWant:"They want to see: user segmentation, latency/quality trade-offs, privacy decisions, measurement plan, and what you'd build first. Not just features." },
    { category:"Analytical", question:"The AI feature has a 15% hallucination rate in testing. Launch or delay?", whatTheyReallyWant:"They want a framework: severity of error type, user impact, mitigation options, measurable threshold for launch. Not a yes/no." },
    { category:"Strategy", question:"Google Assistant vs. ChatGPT — what is Google's AI moat and how does your feature contribute to it?", whatTheyReallyWant:"They want to see you connect a feature to platform-level strategy. User data, distribution, Android integration, on-device advantage." },
    { category:"Execution", question:"Your ML team says the model needs 6 more months. How do you respond?", whatTheyReallyWant:"They want to see cross-functional influence: do you align on the quality bar, scope down, ship a simpler version, or push back with data?" },
    { category:"Behavioral", question:"Tell me about a time you had to make a product decision with incomplete data.", whatTheyReallyWant:"They want: clear decision, stated assumptions, how you monitored outcome, what you'd change. Not a hero story — a thinking story." },
  ];

  return { overallReadiness, signals, topStrength, topGap, hiringVerdict, verdictReason, interviewQuestions };
}

// Infer L4 profile from how deeply a user engaged with the simulator
export function inferProfileFromSimulatorUsage(params: {
  changedVariables: number;
  exploredFailureModes: boolean;
  readThirtyDayPlan: boolean;
  engagedWithCost: boolean;
  engagedWithLatency: boolean;
  featureTypeSelected: boolean;
  usedArchTool: boolean;
  readPMQuestions: boolean;
}): L4InputProfile {
  const base = 45;
  return {
    systemsThinkingDepth:  Math.min(100, base + (params.exploredFailureModes ? 28 : 0) + (params.changedVariables > 4 ? 15 : params.changedVariables * 3) + (params.usedArchTool ? 10 : 0)),
    quantitativeReasoning: Math.min(100, base + (params.engagedWithCost ? 20 : 0) + (params.engagedWithLatency ? 20 : 0) + (params.changedVariables > 3 ? 10 : 0)),
    userEmpathy:           Math.min(100, base + (params.featureTypeSelected ? 15 : 0) + (params.readThirtyDayPlan ? 15 : 0) + (params.readPMQuestions ? 18 : 0)),
    ambiguityHandling:     Math.min(100, base + (params.usedArchTool ? 20 : 0) + (params.changedVariables > 5 ? 15 : 0) + (params.featureTypeSelected ? 10 : 0)),
    crossFunctional:       Math.min(100, base + (params.usedArchTool ? 25 : 0) + (params.exploredFailureModes ? 18 : 0) + (params.engagedWithCost ? 8 : 0)),
    strategicThinking:     Math.min(100, base + (params.readThirtyDayPlan ? 20 : 0) + (params.usedArchTool ? 15 : 0) + (params.readPMQuestions ? 12 : 0)),
    executionClarity:      Math.min(100, base + (params.readThirtyDayPlan ? 25 : 0) + (params.usedArchTool ? 15 : 0)),
    aiDomainDepth:         Math.min(100, base + (params.featureTypeSelected ? 12 : 0) + (params.changedVariables > 4 ? 15 : 0) + (params.exploredFailureModes ? 12 : 0) + (params.engagedWithLatency ? 12 : 0)),
  };
}
