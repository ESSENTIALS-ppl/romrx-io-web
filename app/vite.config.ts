import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { guardSupabaseUrl } from './prodGuard'

// The app is mounted under /app on romrx.io. Marketing static HTML lives at the root.
// Netlify serves the built assets from /app/dist under /app/*.
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env }
  const g = guardSupabaseUrl(env.VITE_SUPABASE_URL, process.env.CONTEXT)
  if (g.blocked) {
    console.warn(`[prod-guard] CONTEXT=${process.env.CONTEXT ?? 'unset'}: prod Supabase blocked, VITE_SUPABASE_URL -> ${g.url}`)
  }
  return {
    base: '/app/',
    plugins: [react()],
    server: { port: 3100 },
    define: g.blocked ? { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(g.url) } : {},
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  }
})
