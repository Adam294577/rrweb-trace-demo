import vue from '@vitejs/plugin-vue'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  // 只取 API_PORT，不讀入其他後端設定
  const { API_PORT = '8787' } = loadEnv(mode, 'server', 'API_PORT')
  return {
    plugins: [vue()],
    server: { proxy: { '/api': `http://127.0.0.1:${API_PORT}` } },
    test: { environment: 'happy-dom', include: ['tests/**/*.test.ts'] },
  }
})
