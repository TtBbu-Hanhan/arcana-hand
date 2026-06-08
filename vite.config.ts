import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // 👈 核心修復：把昨天被誤刪的 Tailwind 重新請回來！

// https://vitejs.dev/config/
export default defineConfig({
  base: '/arcana-hand/',
  plugins: [react(), tailwindcss()], // 👈 核心修復：確保兩個插件都在運行
  server: {
    proxy: {
      // 🔮 靈眸專屬跨域代理通道
      '/lmu-api': {
        target: 'https://api.lmuai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/lmu-api/, '')
      }
    }
  }
})