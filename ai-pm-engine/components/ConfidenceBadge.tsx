"use client";
import type { Confidence } from "@/lib/types";
const S: Record<Confidence, string> = { confirmed:"badge-confirmed", inferred:"badge-inferred", unknown:"badge-unknown" };
const D: Record<Confidence, string> = { confirmed:"bg-confirmed", inferred:"bg-inferred", unknown:"bg-gray-500" };
export function ConfidenceBadge({ level }: { level: Confidence }) {
  return <span className={S[level]}><span className={`w-1.5 h-1.5 rounded-full ${D[level]}`}/>{level}</span>;
}
