import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { execSync } from 'child_process'
import { resolve } from 'path'

function appMetadataPlugin() {
  return {
    name: 'app-metadata-generator',
    buildStart() {
      execSync('node --import tsx/esm scripts/appMetadataGenerator.ts', { stdio: 'inherit' })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // In production the Vue app is deployed to /vue-app/ on the server.
  // Set base to './' so relative asset paths work from any deploy location.
  base: './',
  resolve: {
    alias: {
      // Map the shared-utils package name to the TypeScript source so Vite
      // resolves imports directly without needing a separate build step.
      '@aspire-template/shared-utils': resolve(__dirname, '../shared/src'),
    },
  },
  plugins: [appMetadataPlugin(), vue()],
})
