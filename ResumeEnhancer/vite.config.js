import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      // see src/stubs/mediapipeFaceDetectionStub.js sir — @tensorflow-models/face-detection's
      // dead 'mediapipe' runtime import path otherwise hard-fails the production build
      '@mediapipe/face_detection': fileURLToPath(new URL('./src/stubs/mediapipeFaceDetectionStub.js', import.meta.url)),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Resumify — Beat the ATS',
        short_name: 'Resumify',
        description: 'AI-powered ATS resume reviewer — upload your resume, paste the job description, get an honest score with line-by-line fixes.',
        theme_color: '#000814',
        background_color: '#000814',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // the backend lives on a separate origin (see VITE_MAIN_BACKEND_URL) sir, so Workbox's
        // default same-origin runtime caching never touches API calls — nothing extra needed here.
      },
    }),
  ],
})
