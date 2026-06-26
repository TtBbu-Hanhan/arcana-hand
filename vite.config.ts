import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
// 部署到 Vercel 根目录，base 为 '/'（不再是 GitHub Pages 的子目录）。
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
})
