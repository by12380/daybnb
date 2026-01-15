/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
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
        surface: "#f8fafc",
        ink: "#0f172a",
        muted: "#64748b",
        panel: "#ffffff",
        border: "#e2e8f0",
      },
    },
  },
  plugins: [],
};
