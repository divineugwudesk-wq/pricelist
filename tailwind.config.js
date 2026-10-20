// PRICELIST design tokens.
//
// Rule of thumb used throughout the app:
//   - `navy` is the brand ramp. It is reserved for primary actions, links,
//     active states and dark brand surfaces. It is not a surface colour.
//   - `neutral` is the interface ramp. It carries almost every surface,
//     border and divider in the product.
//   - `gold` is the single accent. It marks the wordmark, featured items
//     and the recommended plan. It is never used for a primary button.
//
// Keep the ramps short and the usage rules narrow. If a colour is not in
// this file, it does not belong in the product.

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand — deep navy.
        navy: {
          950: "#06121F",
          900: "#0B2136",
          850: "#0E2A44",
          800: "#123252",
          700: "#1B4A73",
          600: "#2A6797",
          500: "#3C82B4",
          400: "#77A3C6",
          300: "#AEC6DA",
          200: "#D3DFE9",
          100: "#E6EDF3",
          50: "#F2F6FA",
        },
        // Interface — warm, low-chroma neutrals.
        neutral: {
          50: "#FAFAF9",
          100: "#F4F4F2",
          200: "#E7E6E2",
          300: "#D5D4CE",
          400: "#A9A8A0",
          500: "#7C7B73",
          600: "#5A5952",
          700: "#403F3A",
          800: "#2A2A26",
          900: "#1A1A17",
        },
        // Accent — used sparingly.
        gold: {
          DEFAULT: "#C9A45C",
          soft: "#E0C27A",
          deep: "#8A6A2C", // text-safe on light surfaces
          faint: "#F5EEDD",
        },
        ink: {
          DEFAULT: "#1A1A17",
          secondary: "#5C5B54",
          muted: "#85847C",
        },
        surface: "#F6F6F4",
        success: { DEFAULT: "#167A55", soft: "#E5F2EC" },
        danger: { DEFAULT: "#B23B3B", soft: "#F8E9E9" },
        warning: { DEFAULT: "#A87315", soft: "#FAF0DC" },
        whatsapp: "#075E54",
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        heading: [
          "var(--font-heading)",
          "Manrope",
          "var(--font-sans)",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        serif: [
          "var(--font-serif)",
          "Source Serif 4",
          "Georgia",
          "Cambria",
          "Times New Roman",
          "serif",
        ],
      },
      fontSize: {
        // Semantic scale. Prefer these over arbitrary pixel sizes.
        micro: ["11px", { lineHeight: "1rem" }],
        caption: ["13px", { lineHeight: "1.3rem" }],
        body: ["14px", { lineHeight: "1.45rem" }],
        lead: ["16px", { lineHeight: "1.6rem" }],
        title: ["15px", { lineHeight: "1.35rem" }],
        headline: ["26px", { lineHeight: "2rem", letterSpacing: "-0.015em" }],
        display: ["38px", { lineHeight: "2.5rem", letterSpacing: "-0.02em" }],
        hero: ["34px", { lineHeight: "2.2rem", letterSpacing: "-0.02em" }],
      },
      boxShadow: {
        // Two levels only: resting surfaces and floating surfaces.
        soft: "0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.05)",
        lift: "0 10px 28px -8px rgba(16, 24, 40, 0.16), 0 2px 6px rgba(16, 24, 40, 0.06)",
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "10px",
        xl: "12px",
        "2xl": "16px",
        "3xl": "20px",
      },
      animation: {
        "fade-in": "fadeIn 140ms ease-out",
        "slide-up": "slideUp 160ms ease-out",
        "slide-down": "slideDown 160ms ease-out",
        "scale-in": "scaleIn 140ms ease-out",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.98)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
