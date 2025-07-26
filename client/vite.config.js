import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    allowedHosts: ['18ae92c8dcb6.ngrok-free.app', '.ngrok-free.app'],
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    sourcemap: true,
    target: 'es2015', // Better Safari compatibility
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  // Ensure service worker is served from root
  publicDir: 'public',
  base: '/',
  // Safari-specific optimizations
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios'],
  },
  // Add Safari-specific headers
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },
}); 