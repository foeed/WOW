/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        space: ['Space Grotesk', 'sans-serif'],
      },
      keyframes: {
        wowLoader: {
          '0%, 100%': { transform: 'scale(0.96)', opacity: '0.78' },
          '50%': { transform: 'scale(1.04)', opacity: '1' },
        },
        wowPulse: {
          '0%, 100%': { textShadow: '0 0 18px rgba(187, 93, 255, 0.6)' },
          '50%': { textShadow: '0 0 34px rgba(255, 69, 222, 0.82)' },
        },
      },
      animation: {
        'wow-loader': 'wowLoader 1s ease-in-out infinite',
        'wow-pulse': 'wowPulse 2.6s ease-in-out infinite',
      },
      colors: {
        wow: {
          bg: '#06030f',
          panel: '#121623',
          panel2: '#181d2d',
          border: '#2d3650',
          muted: '#93a3bb',
          text: '#e8f0ff',
          green: '#2ed409',
          cyan: '#45f8ff',
          purple: '#bb5dff',
          pink: '#ff45de',
          red: '#ff0048',
        },
      },
    },
  },
  plugins: [],
};
