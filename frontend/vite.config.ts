import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

export default defineConfig(({ mode }) => {
  // Load every variable (no prefix filter) so GA_MEASUREMENT_ID can be passed to the client.
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  return {
    define: {
      __GA_MEASUREMENT_ID__: JSON.stringify(env.GA_MEASUREMENT_ID ?? ''),
    },
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      port: 5173,
      proxy: {
        '/api': 'http://localhost:8000',
        '/media': 'http://localhost:8000',
      },
    },
  }
})
