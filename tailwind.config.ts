import type { Config } from "tailwindcss";

/**
 * Design tokens for the Vodett admin panel.
 *
 * `dental` is the shared Vodett brand green (primary 600 = #15B396), matching
 * dental-web / dental-patient so every Vodett surface reads as one product.
 * `admin` is kept as an alias of the same ramp so any legacy `admin-*` class
 * still renders on-brand during/after the migration — no orphaned indigo.
 */
const brand = {
  50: "#EAF8F4",
  100: "#CBEFE7",
  200: "#9CE0D2",
  300: "#66CFBB",
  400: "#31C3A8",
  500: "#1BC0A0",
  600: "#15B396",
  700: "#118F79",
  800: "#0C6B5A",
  900: "#094F44",
  DEFAULT: "#15B396",
} as const;

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-mulish)", "system-ui", "sans-serif"],
      },
      colors: {
        dental: brand,
        admin: brand,
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "fade-in-up": "fade-in-up 0.25s ease-out",
        shimmer: "shimmer 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
