// Brand palette — deep navy luxury system.
// See README "Design system" for usage rules.

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
        navy: {
          950: "#04111F",
          900: "#071A33",
          850: "#0A2140",
          800: "#0B2342",
          700: "#163D6B",
          600: "#2D5F91",
          500: "#3D72A8",
          400: "#6E93BE",
          300: "#A3BBD4",
          200: "#CBD9E8",
          100: "#E4EBF3",
          50: "#F2F6FA",
        },
        gold: {
          DEFAULT: "#C9A45C",
          soft: "#E0C27A",
          deep: "#A9863F",
          faint: "#F3EAD3",
        },
        ink: {
          DEFAULT: "#0A1728",
          secondary: "#5B6878",
          muted: "#8995A5",
        },
        surface: "#F7F9FC",
        success: "#16845B",
        danger: "#C94B4B",
        warning: "#C58A28",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(7, 26, 51, 0.04), 0 4px 16px rgba(7, 26, 51, 0.06)",
        lift: "0 2px 4px rgba(7, 26, 51, 0.06), 0 12px 32px rgba(7, 26, 51, 0.12)",
        gold: "0 1px 2px rgba(169, 134, 63, 0.25), 0 8px 24px rgba(201, 164, 92, 0.28)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      animation: {
        "fade-in": "fadeIn 200ms ease-out",
        "slide-up": "slideUp 220ms ease-out",
        "slide-down": "slideDown 220ms ease-out",
        "scale-in": "scaleIn 180ms ease-out",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        slideDown: { "0%": { opacity: "0", transform: "translateY(-8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        scaleIn: { "0%": { opacity: "0", transform: "scale(0.97)" }, "100%": { opacity: "1", transform: "scale(1)" } },
      },
    },
  },
  plugins: [],
};
