import type { Config } from "tailwindcss";

const hsl = (v: string) => `hsl(var(${v}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: hsl("--bg"),
        "bg-subtle": hsl("--bg-subtle"),
        surface: hsl("--surface"),
        "surface-raised": hsl("--surface-raised"),
        border: hsl("--border"),
        "border-strong": hsl("--border-strong"),
        fg: hsl("--fg"),
        "fg-muted": hsl("--fg-muted"),
        "fg-subtle": hsl("--fg-subtle"),
        primary: {
          DEFAULT: hsl("--primary"),
          strong: hsl("--primary-strong"),
          soft: hsl("--primary-soft"),
          fg: hsl("--primary-fg"),
        },
        accent: {
          DEFAULT: hsl("--accent"),
          soft: hsl("--accent-soft"),
        },
        success: { DEFAULT: hsl("--success"), soft: hsl("--success-soft") },
        warning: { DEFAULT: hsl("--warning"), soft: hsl("--warning-soft") },
        danger: { DEFAULT: hsl("--danger"), soft: hsl("--danger-soft") },
        ring: hsl("--ring"),
        chart: {
          1: hsl("--chart-1"),
          2: hsl("--chart-2"),
          3: hsl("--chart-3"),
          4: hsl("--chart-4"),
          5: hsl("--chart-5"),
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "step--2": "var(--step--2)",
        "step--1": "var(--step--1)",
        "step-0": "var(--step-0)",
        "step-1": "var(--step-1)",
        "step-2": "var(--step-2)",
        "step-3": "var(--step-3)",
        "step-4": "var(--step-4)",
        "step-5": "var(--step-5)",
        hero: ["var(--step-hero)", { lineHeight: "0.95", letterSpacing: "-0.035em" }],
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        lg: "var(--radius)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 10px)",
      },
      boxShadow: {
        soft: "0 1px 2px hsl(var(--shadow-color) / 0.06), 0 4px 12px hsl(var(--shadow-color) / 0.05)",
        raised:
          "0 2px 4px hsl(var(--shadow-color) / 0.07), 0 12px 28px hsl(var(--shadow-color) / 0.09)",
        glow: "0 0 0 1px hsl(var(--primary) / 0.25), 0 8px 32px hsl(var(--primary) / 0.18)",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        "out-quart": "cubic-bezier(0.25, 1, 0.5, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      maxWidth: { shell: "84rem" },
    },
  },
  plugins: [],
};

export default config;
