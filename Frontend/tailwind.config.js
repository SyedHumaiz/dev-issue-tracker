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
        'background-dark': '#111827',
        'surface-dark': '#1f2937',
        'foreground-dark': '#f8fafc',
        'muted-dark': '#94a3b8',
        'border-dark': '#334155',
      },
    },
  },
  plugins: [],
}
