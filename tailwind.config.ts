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
          50: "#FFF6F0",
          100: "#FFEADC",
          200: "#FFD3B8",
          300: "#FDB48C",
          400: "#FB9561",
          500: "#F97A3A",
          600: "#C84F14",
          700: "#A8420F",
          800: "#8A360C",
          900: "#6B2B0C",
          950: "#3B1A0A",
        },
        night: {
          DEFAULT: "#141824",
          soft: "#1D2130",
          line: "#2C3245",
        },
        ink: {
          DEFAULT: "#161A26",
          soft: "#3B4152",
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
