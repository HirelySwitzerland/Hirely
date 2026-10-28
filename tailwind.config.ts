import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        brand: {
          50: "#F5F4FE",
          100: "#ECE9FD",
          200: "#DAD4FB",
          300: "#BDB2F7",
          400: "#9A8AF0",
          500: "#7A68E6",
          600: "#5B4AD8",
          700: "#4A3ABD",
          800: "#3D3199",
          900: "#332B78",
          950: "#1F1A4A",
        },
        night: {
          DEFAULT: "#16142B",
          soft: "#211E3D",
          line: "#2E2A50",
        },
        ink: {
          DEFAULT: "#13112A",
          soft: "#3E3B57",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(16 24 40 / 0.04), 0 1px 3px 0 rgb(16 24 40 / 0.03)",
        pop: "0 12px 32px -8px rgb(16 24 40 / 0.18), 0 4px 8px -4px rgb(16 24 40 / 0.06)",
      },
      keyframes: {
        flow: { "0%": { transform: "translateX(-100%)" }, "100%": { transform: "translateX(400%)" } },
        fadeUp: { "0%": { opacity: "0", transform: "translateY(6px)" }, "100%": { opacity: "1", transform: "none" } },
        pulseDot: { "0%,100%": { opacity: "1" }, "50%": { opacity: ".35" } },
      },
      animation: {
        flow: "flow 2.4s ease-in-out infinite",
        fadeUp: "fadeUp .4s ease-out both",
        pulseDot: "pulseDot 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
