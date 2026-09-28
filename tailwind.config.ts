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
          50: "#F1F4FE",
          100: "#E2E8FC",
          200: "#C6D1F8",
          300: "#9BAEF1",
          400: "#6B84E6",
          500: "#4562DA",
          600: "#2B4ACB",
          700: "#243CA6",
          800: "#223485",
          900: "#1F2E69",
          950: "#141C40",
        },
        ink: {
          DEFAULT: "#0E1320",
          soft: "#3B4352",
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
