import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        aegent: {
          bg: "#f2efe8",
          surface: "#ffffff",
          card: "#ffffff",
          border: "#d8d2c8",
          accent: "#1f3dff",
          "accent-dim": "#1f3dff1a",
          highlight: "#e23c2f",
          cream: "#f7f4ee",
          warning: "#c45c12",
          danger: "#e23c2f",
          text: "#111217",
          muted: "#5c5a55",
          dim: "#8a8680",
          ink: "#111217",
        },
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
        display: ["var(--font-syne)", "system-ui", "sans-serif"],
        mono: ["var(--font-ibm)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
