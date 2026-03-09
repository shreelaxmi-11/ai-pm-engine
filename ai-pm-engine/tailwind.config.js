/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Syne'", "sans-serif"],
        body: ["'DM Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        ink: "#07070D",
        surface: "#0D0D18",
        panel: "#11111E",
        border: "#1A1A2E",
        accent: "#6366F1",
        "accent-dim": "#4F46E5",
        subtle: "#6666AA",
        text: "#EDEDF5",
        "text-dim": "#9090B8",
        confirmed: "#22C55E",
        inferred: "#F59E0B",
        danger: "#EF4444",
      },
      boxShadow: {
        glow: "0 0 40px rgba(99,102,241,0.18)",
        "glow-sm": "0 0 16px rgba(99,102,241,0.12)",
      },
      backgroundImage: {
        "hero-glow": "radial-gradient(ellipse 90% 55% at 50% -8%, rgba(99,102,241,0.22) 0%, transparent 68%)",
        "grid": "linear-gradient(rgba(99,102,241,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.035) 1px, transparent 1px)",
      },
      backgroundSize: { grid: "44px 44px" },
      keyframes: {
        fadeUp:  { "0%": { opacity:"0", transform:"translateY(16px)" }, "100%": { opacity:"1", transform:"translateY(0)" } },
        fadeIn:  { "0%": { opacity:"0" }, "100%": { opacity:"1" } },
        shimmer: { "0%": { backgroundPosition:"-400% 0" }, "100%": { backgroundPosition:"400% 0" } },
      },
      animation: {
        "fade-up": "fadeUp 0.5s ease forwards",
        "fade-in": "fadeIn 0.35s ease forwards",
        shimmer:   "shimmer 2s infinite linear",
      },
    },
  },
  plugins: [],
};
