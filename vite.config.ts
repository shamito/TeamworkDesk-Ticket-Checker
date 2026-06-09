import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    define: {
      __TEAMWORK_BASE_URL__: JSON.stringify(`https://${env.TEAMWORK_DOMAIN || 'itmooti.teamwork.com'}`),
    },
    server: {
      proxy: {
        '/desk/api': {
          target: `https://${env.TEAMWORK_DOMAIN || 'itmooti.teamwork.com'}`,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              const apiKey = env.TEAMWORK_API_KEY
              if (apiKey) {
                proxyReq.setHeader('Authorization', `Bearer ${apiKey}`)
              }
              proxyReq.setHeader('Accept', 'application/json')
              proxyReq.setHeader('Content-Type', 'application/json')
            })
          },
        },
      },
    },
  }
})
