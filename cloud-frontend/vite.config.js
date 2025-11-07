import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Proxies any request starting with /api
      '/api': {
        // Change this to your Express server's URL
        target: 'http://localhost:3000', 
        changeOrigin: true,
        // Optional: if your routes don't start with /api, 
        // you might need to rewrite:
        // rewrite: (path) => path.replace(/^\/api/, '') 
      },
    }
  }

})
