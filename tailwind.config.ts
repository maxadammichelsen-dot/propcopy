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
        // Core palette — all mapped to CSS variables
        bg:               "var(--bg)",
        ink:              "var(--ink)",
        "ink-2":          "var(--ink-2)",
        "ink-3":          "var(--ink-3)",
        mute:             "var(--mute)",
        "mute-2":         "var(--mute-2)",
        line:             "var(--line)",
        "line-2":         "var(--line-2)",
        tint:             "var(--tint)",
        "tint-2":         "var(--tint-2)",
        accent:           "var(--accent)",
        "accent-tint":    "var(--accent-tint)",
        "accent-tint-2":  "var(--accent-tint-2)",
        ok:               "var(--ok)",
        "ok-tint":        "var(--ok-tint)",
        // Brand vars for BrandProvider compatibility
        brand: {
          primary:   "var(--brand-primary)",
          light:     "var(--brand-primary-light)",
          dim:       "var(--brand-primary-dim)",
          secondary: "var(--brand-secondary)",
        },
      },
      fontFamily: {
        sans:    ["Geist", "system-ui", "-apple-system", "sans-serif"],
        mono:    ["Geist Mono", "ui-monospace", "monospace"],
        display: ["Geist", "system-ui", "-apple-system", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1", letterSpacing: "0.02em" }],
        // Exact pixel values from design file
        "hero":       ["108px", { lineHeight: "0.9",  letterSpacing: "-0.04em"  }],
        "today-h":    ["44px",  { lineHeight: "1",    letterSpacing: "-0.028em" }],
        "doc-idx":    ["32px",  { lineHeight: "1",    letterSpacing: "-0.02em"  }],
        "kpi-value":  ["16px",  { lineHeight: "1",    letterSpacing: "-0.02em"  }],
        "tod-title":  ["18px",  { lineHeight: "1.3",  letterSpacing: "-0.015em" }],
        "doc-addr":   ["15px",  { lineHeight: "1.3",  letterSpacing: "-0.01em"  }],
        "sb-n":       ["64px",  { lineHeight: "0.95", letterSpacing: "-0.03em"  }],
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter:  "-0.03em",
        tight:    "-0.02em",
        snug:     "-0.01em",
        normal:   "-0.005em",
      },
      lineHeight: {
        display: "1.2",
      },
      borderRadius: {
        sm:  "var(--radius-sm)",
        DEFAULT: "var(--radius)",
        lg:  "var(--radius-lg)",
      },
      spacing: {
        // Exact pixel spacing from design file
        "hero-top":  "72px",
        "hero-x":    "48px",
        "hero-bot":  "56px",
        "today-top": "48px",
        "today-bot": "56px",
        "kpi-px":    "32px",
      },
      borderColor: {
        DEFAULT: "var(--line)",
      },
    },
  },
  plugins: [],
};

export default config;
