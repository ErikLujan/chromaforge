import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000, 
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'zustand'],
          supabase: ['@supabase/supabase-js'],
          pdf: ['jspdf', 'html2canvas'],
          utils: ['lucide-react', 'dompurify', 'colord']
        }
      }
    }
  }
})