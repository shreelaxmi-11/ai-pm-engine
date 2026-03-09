"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

const GLOSSARY: Record<string, string> = {
  "CONTEXT WINDOW":   "How much text the AI can process at once - like its short-term memory. For chat models this is measured in tokens (128K = ~100,000 words). For vision models it's image/scene-based. For writing tools like Grammarly it's document-level, meaning it reads your whole document at once.",
  "MODEL NAME":       "The specific AI model doing the work. Like knowing if a car has a Toyota or BMW engine - it tells you the capability, speed, and cost.",
  "FINE-TUNED":       "Whether the base model was further trained on specific data. Like hiring a generalist and then training them specifically for your industry.",
  "DEPLOYMENT":       "Where the AI actually runs - on your device (faster, private, no internet needed) or in the cloud (more powerful, always up to date).",
  "INFERENCE":        "The moment the AI generates a response. Training teaches the model; inference is when it actually does the job.",
  "LATENCY":          "How long you wait before getting a response. Under 300ms feels instant. Over 1 second feels slow. Voice assistants need under 500ms to feel natural.",
  "QUALITY":          "How accurate or useful the output is. Measured differently per use case - word error rate for voice, accuracy % for vision, user acceptance rate for code.",
  "COST":             "What it costs to run the feature per user or per 1,000 requests. This is a key PM decision - cheap models scale easily, expensive ones need usage limits.",
  "PRIVACY":          "What happens to user data. On-device means nothing leaves your phone. Cloud means data is sent to a server - important for regulated industries.",
  "RELIABILITY":      "How often the feature works correctly without failing. 99.9% uptime means ~8 hours of downtime per year. Consumer apps rarely publish SLAs.",
  "HARDWARE":         "The physical chips powering the AI. GPUs (like NVIDIA H100) are the workhorses. TPUs are Google's custom chips. NPUs are on-device AI processors.",
  "FRAMEWORKS":       "The software tools used to build and run the model. PyTorch and TensorFlow are the most common - like choosing React vs Angular for frontend work.",
  "VECTOR DB":        "A database that stores AI embeddings - numerical representations of meaning. Used for search, recommendations, and retrieval-augmented generation (RAG).",
  "ORCHESTRATION":    "The layer that coordinates multiple AI calls, tools, and steps. Think of it as the project manager that routes work between models and services.",
  "MODEL & INFERENCE":"How the AI model is structured and how it generates responses. Covers what model is used, how big its memory is, and where it runs.",
  "PERFORMANCE":      "Real-world metrics for how the feature behaves at scale - speed, accuracy, cost per request, and data handling.",
  "TRADE-OFFS":       "Every AI system involves tough choices - speed vs accuracy, cost vs quality, privacy vs capability. These are the decisions the team had to make.",
};

export function GlossaryTerm({ term, children }: { term: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const def = GLOSSARY[term.toUpperCase()];
  if (!def) return <>{children}</>;

  const updatePos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      top: rect.top + window.scrollY - 8,
      left: Math.min(rect.left + window.scrollX, window.innerWidth - 300),
    });
  }, []);

  useEffect(() => {
    if (open) updatePos();
  }, [open, updatePos]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const tooltip = open && typeof document !== "undefined" ? createPortal(
    <span
      style={{ position: "absolute", top: pos.top, left: pos.left, transform: "translateY(-100%)", zIndex: 9999 }}
      className="w-72 p-3 rounded-xl text-sm leading-relaxed bg-panel border border-accent/20 text-text-dim shadow-xl pointer-events-none"
    >
      <span className="block text-xs font-mono text-accent mb-1 uppercase tracking-wider">{term}</span>
      {def}
    </span>,
    document.body
  ) : null;

  return (
    <span ref={triggerRef} className="relative inline-block">
      <span
        className="border-b border-dashed border-accent/50 cursor-help hover:border-accent transition-colors"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(v => !v)}
      >
        {children}
      </span>
      {tooltip}
    </span>
  );
}
