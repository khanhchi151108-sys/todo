export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gameBg: "#1a1a2e",
        gameCard: "#16213e",
        gamePrimary: "#e94560",
        gameSecondary: "#0f3460",
        gameText: "#e2e2e2",
        gameExp: "#4cd137",
        gameGold: "#fbc531",
        gameEasy: "#00a8ff",
        gameMedium: "#f39c12",
        gameHard: "#c23616",
      },
      fontFamily: {
        rpg: ['"Press Start 2P"', 'cursive'],
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
