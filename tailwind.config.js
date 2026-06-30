/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "ui-rounded",
          "Hiragino Maru Gothic ProN",
          "Quicksand",
          "Nunito",
          "system-ui",
          "sans-serif",
        ],
      },
      keyframes: {
        "float-in": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pop: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.3)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "float-in": "float-in 0.5s cubic-bezier(.34,1.56,.64,1) both",
        pop: "pop 0.3s cubic-bezier(.34,1.56,.64,1)",
      },
    },
  },
  plugins: [],
};
