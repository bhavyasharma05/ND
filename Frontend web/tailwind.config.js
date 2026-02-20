/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#2fc6b7",
        "primary-dark": "#25a094", 
        "background-light": "#f6f8f8", // Using theme config default
        "background-dark": "#131f1e",
        "ocean-light": "#F4FAFF", // Adding specific requested tint as a custom color
      },
      fontFamily: {
        "display": ["Inter", "sans-serif"]
      },
      borderRadius: {"DEFAULT": "0.5rem", "lg": "1rem", "xl": "1.5rem", "full": "9999px"},
    },
  },
  plugins: [],
}
