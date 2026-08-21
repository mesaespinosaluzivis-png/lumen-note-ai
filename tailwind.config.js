export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        graphite: {
          50: "#f4f5f7",
          100: "#e6e8ec",
          200: "#cdd1d8",
          300: "#aeb4bf",
          400: "#8d95a3",
          500: "#6f7785",
          600: "#565e6c",
          700: "#3d4451",
          800: "#292f3a",
          900: "#0b0e14"
        },
        neon: {
          cyan: "#00d4ff",
          pink: "#ff4fa3"
        }
      },
      boxShadow: {
        "neon-cyan": "0 0 20px rgba(0, 212, 255, 0.25)"
      }
    }
  },
  plugins: []
};


