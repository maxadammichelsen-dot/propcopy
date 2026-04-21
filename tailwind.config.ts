import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:           "var(--bg)",
        ink:          "var(--ink)",
        "ink-2":      "var(--ink-2)",
        mute:         "var(--mute)",
        "mute-2":     "var(--mute-2)",
        line:         "var(--line)",
        "line-2":     "var(--line-2)",
        tint:         "var(--tint)",
        accent:       "var(--accent)",
        "accent-tint":"var(--accent-tint)",
        // keep brand vars for BrandProvider compatibility
        brand: {
          primary:    "var(--brand-primary)",
          light:      "var(--brand-primary-light)",
          dim:        "var(--brand-primary-dim)",
          secondary:  "var(--brand-secondary)",
        },
      },
      fontFamily: {
        display: ["Instrument Serif", "Georgia", "serif"],
        sans:    ["Geist", "system-ui", "sans-serif"],
        mono:    ["Geist Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1", letterSpacing: "0.02em" }],
        "display-sm":  ["2.75rem",  { lineHeight: "0.96", letterSpacing: "-0.032em" }],
        "display-md":  ["3.5rem",   { lineHeight: "0.96", letterSpacing: "-0.035em" }],
        "display-lg":  ["5.5rem",   { lineHeight: "0.92", letterSpacing: "-0.038em" }],
        "display-xl":  ["6.75rem",  { lineHeight: "0.9",  letterSpacing: "-0.04em"  }],
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter:  "-0.025em",
        tight:    "-0.015em",
        snug:     "-0.01em",
        normal:   "-0.005em",
      },
      lineHeight: {
        display: "0.92",
      },
      borderColor: {
        DEFAULT: "var(--line)",
      },
    },
  },
  plugins: [],
};

export default config;
