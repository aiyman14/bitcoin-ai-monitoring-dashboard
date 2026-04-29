import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(210 20% 98%)",
        foreground: "hsl(222 47% 11%)",
        muted: "hsl(215 16% 47%)",
        border: "hsl(214 32% 91%)"
      }
    }
  },
  plugins: []
};

export default config;
