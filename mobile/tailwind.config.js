/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Cork board surface
        cork: "#8B6D47",
        // Cream note-card paper
        background: "#8B6D47",   // screens sit on cork
        card: "#FFFDE7",         // note-card cream
        foreground: "#2C1810",   // dark ink
        // Interactions
        primary: "#B91C1C",
        "primary-foreground": "#FFFFFF",
        // Surfaces
        muted: "#C8A77D",
        "muted-foreground": "#6B4A2C",
        border: "#B8914B",
        // Destructive
        destructive: "#7F1D1D",
        "destructive-foreground": "#FFFFFF",
        // Tab accents
        "tab-brass": "#D4A853",
        "tab-wood": "#1A0E06",
      },
      fontFamily: {
        typewriter: ["SpecialElite_400Regular"],
      },
    },
  },
  plugins: [],
};
