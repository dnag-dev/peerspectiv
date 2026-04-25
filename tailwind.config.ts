import type { Config } from "tailwindcss";

/**
 * Practitioner design system. All colors come from CSS custom properties
 * defined in app/globals.css so they can also be referenced by raw CSS,
 * inline styles, and SVG fills.
 *
 * The legacy `brand` and `ai` palettes are kept as aliases for any in-flight
 * code that hasn't migrated yet. Do not add new usage of those in new code.
 */
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans:    ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono:    ["var(--font-mono)", "SF Mono", "Menlo", "monospace"],
        // Legacy aliases
        serif:   ["var(--font-display)", "Georgia", "serif"],
      },
      colors: {
        ink: {
          50:  "var(--ink-50)",
          100: "var(--ink-100)",
          200: "var(--ink-200)",
          300: "var(--ink-300)",
          400: "var(--ink-400)",
          500: "var(--ink-500)",
          600: "var(--ink-600)",
          700: "var(--ink-700)",
          800: "var(--ink-800)",
          900: "var(--ink-900)",
          950: "var(--ink-950)",
        },
        mint: {
          50:  "var(--mint-50)",
          100: "var(--mint-100)",
          200: "var(--mint-200)",
          400: "var(--mint-400)",
          500: "var(--mint-500)",
          600: "var(--mint-600)",
          700: "var(--mint-700)",
        },
        authority: {
          500: "var(--authority-500)",
          700: "var(--authority-700)",
          800: "var(--authority-800)",
          900: "var(--authority-900)",
        },
        critical: {
          100: "var(--critical-100)",
          600: "var(--critical-600)",
          700: "var(--critical-700)",
        },
        warning: {
          100: "var(--warning-100)",
          600: "var(--warning-600)",
          700: "var(--warning-700)",
        },
        info: {
          100: "var(--info-100)",
          600: "var(--info-600)",
        },
        paper: "var(--paper)",
        // Legacy palette aliases — kept so existing screens compile until they're migrated.
        brand: {
          navy: "var(--authority-900)",
          blue: "var(--info-600)",
          teal: "var(--mint-600)",
        },
        ai: {
          purple:        "var(--mint-600)",
          "purple-light": "var(--mint-100)",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "mint-halo":
          "radial-gradient(circle at center, var(--mint-100), transparent 70%)",
      },
      boxShadow: {
        sm:    "var(--shadow-sm)",
        DEFAULT: "var(--shadow-sm)",
        md:    "var(--shadow-md)",
        lg:    "var(--shadow-lg)",
        modal: "var(--shadow-modal)",
      },
      borderRadius: {
        sm:    "var(--radius-sm)",
        DEFAULT: "var(--radius)",
        md:    "var(--radius)",
        lg:    "var(--radius-lg)",
        pill:  "var(--radius-pill)",
        full:  "9999px",
      },
    },
  },
  plugins: [],
};
export default config;
