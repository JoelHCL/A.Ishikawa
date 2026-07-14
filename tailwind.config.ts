import type { Config } from "tailwindcss";
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        wax:  { DEFAULT: "#B9750F", bg: "#FBEFD6" },
        ok:   { DEFAULT: "#0F6E56", bg: "#E4F4EE" },
        sup:  { DEFAULT: "#A32D2D", bg: "#FBEBEB" },
        head: { DEFAULT: "#B23A1E", bg: "#FAE7E0" },
      },
    },
  },
  plugins: [],
};
export default config;
