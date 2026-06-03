import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/arcana-hand/', // 👈 核心：在这里加上这行，注意后面有逗号
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
  },
})
