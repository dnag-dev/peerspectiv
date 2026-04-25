import type { Config } from "tailwindcss";

/**
 * PULSE design system. Light canvas, cobalt-led, modern SaaS.
 * All colors come from CSS custom properties in app/globals.css.
 *
 * Legacy `authority`, `warning`, `info`, `brand`, `ai` palettes are kept
 * as aliases so any in-flight code keeps compiling. Do not add new usage.
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
        sans: ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["var(--font-mono)", "SF Mono", "Menlo", "monospace"],
        // Legacy alias — `display` no longer exists in Pulse. Mapped to sans
        // so any stragglers degrade gracefully.
        display: ["var(--font-sans)", "-apple-system", "sans-serif"],
        serif:   ["var(--font-sans)", "-apple-system", "sans-serif"],
      },
      colors: {
        cobalt: {
          50:  "var(--cobalt-50)",
          100: "var(--cobalt-100)",
          200: "var(--cobalt-200)",
          400: "var(--cobalt-400)",
          500: "var(--cobalt-500)",
          600: "var(--cobalt-600)",
          700: "var(--cobalt-700)",
          800: "var(--cobalt-800)",
          900: "var(--cobalt-900)",
          950: "var(--cobalt-950)",
        },
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
          // Aliases for shades referenced by legacy code
          200: "var(--mint-100)",
          400: "var(--mint-500)",
          500: "var(--mint-500)",
          600: "var(--mint-600)",
          700: "var(--mint-700)",
        },
        amber: {
          50:  "var(--amber-50)",
          100: "var(--amber-100)",
          500: "var(--amber-500)",
          600: "var(--amber-600)",
          700: "var(--amber-700)",
        },
        critical: {
          50:  "var(--critical-50)",
          100: "var(--critical-100)",
          500: "var(--critical-500)",
          600: "var(--critical-600)",
          700: "var(--critical-700)",
        },
        // Legacy aliases
        authority: {
          500: "var(--cobalt-500)",
          700: "var(--cobalt-700)",
          800: "var(--cobalt-800)",
          900: "var(--cobalt-900)",
        },
        warning: {
          100: "var(--amber-100)",
          600: "var(--amber-600)",
          700: "var(--amber-700)",
        },
        info: {
          100: "var(--cobalt-100)",
          600: "var(--cobalt-600)",
        },
        paper: {
          DEFAULT:  "var(--paper-surface)",
          canvas:   "var(--paper-canvas)",
          surface:  "var(--paper-surface)",
          elevated: "var(--paper-elevated)",
        },
        brand: {
          navy: "var(--cobalt-900)",
          blue: "var(--cobalt-600)",
          teal: "var(--mint-600)",
        },
        ai: {
          purple:        "var(--cobalt-600)",
          "purple-light": "var(--cobalt-100)",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "cobalt-hero":
          "linear-gradient(135deg, var(--cobalt-500) 0%, var(--cobalt-700) 100%)",
        "cobalt-soft":
          "linear-gradient(135deg, var(--cobalt-50) 0%, var(--cobalt-100) 100%)",
      },
      boxShadow: {
        sm:    "var(--shadow-sm)",
        DEFAULT: "var(--shadow-sm)",
        md:    "var(--shadow-md)",
        lg:    "var(--shadow-lg)",
        modal: "var(--shadow-modal)",
      },
      borderRadius: {
        sm:      "var(--radius-sm)",
        DEFAULT: "var(--radius)",
        md:      "var(--radius)",
        lg:      "var(--radius-lg)",
        xl:      "var(--radius-xl)",
        pill:    "var(--radius-pill)",
        full:    "9999px",
      },
    },
  },
  plugins: [],
};
export default config;
