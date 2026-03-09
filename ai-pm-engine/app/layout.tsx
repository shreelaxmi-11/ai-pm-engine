import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "AI PM Engine — Understand & Simulate Any AI Feature",
  description: "Search any AI feature or simulate AI system trade-offs. Built by Shreelaxmi Ganesh, AI PM.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
