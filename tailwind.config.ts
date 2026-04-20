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
        background: "var(--background)",
        foreground: "var(--foreground)",
        gold: {
          DEFAULT: "#b8965a",
          light: "#d4b07a",
          dark: "#8a6f3e",
        },
        surface: {
          DEFAULT: "#111111",
          elevated: "#1a1a1a",
          border: "#2a2a2a",
        },
      },
      fontFamily: {
        serif: ["Cormorant Garamond", "Georgia", "serif"],
        sans: ["DM Sans", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display": ["3.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
      },
    },
  },
  plugins: [],
};
export default config;
