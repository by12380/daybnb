/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#2563eb",
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
        accent: {
          DEFAULT: "#ff8a3d",
          100: "#ffedd5",
          500: "#ff8a3d",
        },
        // Theme-aware semantic colors (driven by CSS variables in `src/styles/index.css`)
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        panel: "rgb(var(--color-panel) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",

        // Optional explicit dark palette (usable as `dark:*` overrides)
        "dark-navy": "#0a1628",
        "dark-surface": "#0f1d32",
        "dark-panel": "#162236",
        "dark-border": "#1e3a5f",
        "dark-ink": "#e2e8f0",
        "dark-muted": "#94a3b8",
      },
      backgroundImage: {
        "gradient-text": "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)",
        "gradient-text-dark": "linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #f472b6 100%)",
        "gradient-brand": "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
        "gradient-accent": "linear-gradient(135deg, #ff8a3d 0%, #f472b6 100%)",
      },
    },
  },
  plugins: [],
};
