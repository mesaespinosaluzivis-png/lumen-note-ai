/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        graphite: {
          900: "#0b0e14",
          800: "#161b22",
          700: "#21262d",
          600: "#30363d",
          500: "#8b949e",
          400: "#c9d1d9"
        },
        neon: {
          cyan: "#00d4ff",
          purple: "#bf00ff",
          green: "#39ff14"
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"]
      },
      boxShadow: {
        "neon-cyan": "0 0 15px rgba(0, 212, 255, 0.2)",
        "neon-purple": "0 0 15px rgba(191, 0, 255, 0.2)"
      }
    }
  },
  plugins: []
};


