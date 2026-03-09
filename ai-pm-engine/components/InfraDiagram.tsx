"use client";
import { useState } from "react";

interface DiagramNode {
  name: string;
  detail: string;
  children?: DiagramNode[];
}
interface DiagramLayer {
  layer: string;
  description: string;
  components: DiagramNode[];
}

const LAYER_COLORS = [
  { line: "#6366F1", badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" },
  { line: "#8B5CF6", badge: "bg-violet-500/10 text-violet-400 border-violet-500/30" },
  { line: "#06B6D4", badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" },
  { line: "#10B981", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  { line: "#F59E0B", badge: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  { line: "#EF4444", badge: "bg-red-500/10 text-red-400 border-red-500/30" },
];

function TreeNode({ node, depth, lineColor, isLast }: {
  node: DiagramNode;
  depth: number;
  lineColor: string;
  isLast: boolean;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="relative">
      {/* Row */}
      <div
        className={`flex items-start gap-2 py-1 group ${hasChildren ? "cursor-pointer" : ""}`}
        onClick={() => hasChildren && setOpen(o => !o)}
      >
        {/* Tree connector lines rendered via left border on parent */}
        <div className="flex items-center shrink-0 mt-[7px]">
          <div className="w-2 h-2 rounded-full border-2 shrink-0"
            style={{ borderColor: lineColor, background: depth === 0 ? lineColor : "transparent" }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${depth === 0 ? "text-text" : "text-text-dim"}`}>
              {node.name}
            </span>
            {hasChildren && (
              <span className="text-xs font-mono shrink-0 transition-transform duration-200"
                style={{ color: lineColor, display: "inline-block", transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>
                ▶
              </span>
            )}
          </div>
          {node.detail && (
            <p className="text-xs text-subtle leading-relaxed mt-0.5 font-mono">{node.detail}</p>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && open && (
        <div className="ml-[7px] pl-4 border-l border-dashed"
          style={{ borderColor: `${lineColor}50` }}>
          {node.children!.map((child, i) => (
            <TreeNode
              key={i}
              node={child}
              depth={depth + 1}
              lineColor={lineColor}
              isLast={i === node.children!.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function InfraDiagram({ layers, featureName, sources }: {
  layers: DiagramLayer[];
  featureName: string;
  sources?: { title: string; url: string; type: "official" | "article" | "analysis" | string }[];
}) {
  const [allOpen, setAllOpen] = useState(true);

  if (!layers || layers.length === 0) return null;

  // Count total nodes
  const totalNodes = layers.reduce((acc, l) => {
    const countNodes = (nodes: DiagramNode[]): number =>
      nodes.reduce((a, n) => a + 1 + (n.children ? countNodes(n.children) : 0), 0);
    return acc + countNodes(l.components);
  }, 0);

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
        <div>
          <div className="font-display font-semibold text-text text-lg">
            Full Infrastructure Diagram
          </div>
          <p className="text-xs text-subtle font-mono mt-0.5">
            {featureName} · {layers.length} layers · {totalNodes} components
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAllOpen(true)}
            className="text-xs font-mono px-3 py-1 rounded-lg border border-border text-subtle hover:text-text transition-colors">
            Expand all
          </button>
          <button
            onClick={() => setAllOpen(false)}
            className="text-xs font-mono px-3 py-1 rounded-lg border border-border text-subtle hover:text-text transition-colors">
            Collapse all
          </button>
        </div>
      </div>

      {/* Flow bar */}
      <div className="flex items-center gap-1.5 mb-5 flex-wrap">
        {layers.map((layer, i) => {
          const color = LAYER_COLORS[i % LAYER_COLORS.length];
          return (
            <div key={i} className="flex items-center gap-1.5">
              <span className={`text-xs font-mono px-2.5 py-0.5 rounded-full border ${color.badge}`}>
                {layer.layer}
              </span>
              {i < layers.length - 1 && (
                <span className="text-border text-xs font-mono">→</span>
              )}
            </div>
          );
        })}
      </div>

      {/* The tree diagram */}
      <div className="rounded-2xl border border-border bg-surface/50 p-5 font-mono">


        <LayerTree layers={layers} allOpen={allOpen} />
      </div>

      {/* Sources used */}
      {sources && sources.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-xs font-mono text-subtle mb-2">Sources used to build this diagram:</div>
          <div className="flex flex-wrap gap-2">
            {sources.slice(0, 6).map((s, i) => (
              <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                className="text-xs font-mono text-accent hover:underline truncate max-w-[200px]"
                title={s.title}>
                [{i + 1}] {s.title.slice(0, 40)}{s.title.length > 40 ? "…" : ""}
              </a>
            ))}
          </div>
          <p className="text-xs text-subtle font-mono mt-2">
            Components marked with * are inferred from public knowledge · confirmed components sourced directly from above
          </p>
        </div>
      )}
    </div>
  );
}

function LayerTree({ layers, allOpen }: { layers: DiagramLayer[]; allOpen: boolean }) {
  return (
    <div className="space-y-0">
      {layers.map((layer, li) => {
        const color = LAYER_COLORS[li % LAYER_COLORS.length];
        const isLastLayer = li === layers.length - 1;
        return (
          <LayerRow
            key={li}
            layer={layer}
            color={color}
            isLast={isLastLayer}
            forceOpen={allOpen}
          />
        );
      })}
    </div>
  );
}

function LayerRow({ layer, color, isLast, forceOpen }: {
  layer: DiagramLayer;
  color: typeof LAYER_COLORS[0];
  isLast: boolean;
  forceOpen: boolean;
}) {
  const [open, setOpen] = useState(true);

  // Sync with forceOpen
  const isOpen = forceOpen !== undefined ? forceOpen : open;

  return (
    <div className="relative">
      {/* Layer header row - mimics the top-level tree line */}
      <div className="flex items-start gap-0">
        {/* Vertical line segment + horizontal branch */}
        <div className="flex flex-col items-center shrink-0" style={{ width: 16 }}>
          <div className="w-px flex-1" style={{ background: `${color.line}60`, minHeight: 8 }} />
          {!isLast && <div className="w-px flex-1" style={{ background: `${color.line}60` }} />}
        </div>
        <div className="flex items-center shrink-0 mt-2" style={{ width: 12 }}>
          <div className="h-px w-full" style={{ background: `${color.line}60` }} />
        </div>

        {/* Layer name */}
        <div
          className="flex-1 flex items-center gap-2 cursor-pointer py-1.5 group"
          onClick={() => setOpen(o => !o)}
        >
          <span className="text-sm font-bold" style={{ color: color.line }}>
            {layer.layer}
          </span>
          <span className="text-xs text-subtle">- {layer.description}</span>
          <span className="text-xs font-mono ml-auto shrink-0 transition-transform duration-200"
            style={{ color: color.line, display: "inline-block", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}>
            ▶
          </span>
        </div>
      </div>

      {/* Components tree */}
      {isOpen && (
        <div className="ml-7 pl-3 border-l border-dashed mb-2"
          style={{ borderColor: `${color.line}40` }}>
          {layer.components.map((comp, ci) => (
            <TreeNode
              key={ci}
              node={comp}
              depth={0}
              lineColor={color.line}
              isLast={ci === layer.components.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
