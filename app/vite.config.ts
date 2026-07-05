import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The app is mounted under /app on romrx.io. Marketing static HTML lives at the root.
// Netlify serves the built assets from /app/dist under /app/*.
export default defineConfig({
  base: '/app/',
  plugins: [react()],
  server: { port: 3100 },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
