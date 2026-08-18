/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#f8fafc',
        surface: '#ffffff',
        foreground: '#0f172a',
        muted: '#64748b',
        border: '#e2e8f0',
        'background-dark': '#0F0F10',
        'surface-dark': '#171718',
        'foreground-dark': '#F5F5F5',
        'muted-dark': '#A1A1AA',
        'border-dark': '#2A2A2C',
        slate: {
          700: '#2A2A2C',
          800: '#1E1E20',
          900: '#171718',
          950: '#0F0F10',
        },
      },
    },
  },
  plugins: [],
}
