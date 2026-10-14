import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
      },
      colors: {
        canvas: "#fffffd",
        ink: "#1c1412",
        brand: {
          100: "#f3e8e6",
          200: "#e6c2bf",
          500: "#b36a64",
          700: "#774440",
        },
        nude: {
          300: "#d4b44a",
          500: "#b88917",
          700: "#6e530e",
        },
      },
    },
  },
  plugins: [],
};

export default config;
