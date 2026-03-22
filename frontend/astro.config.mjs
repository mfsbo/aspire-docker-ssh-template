// @ts-check
import { defineConfig } from 'astro/config';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function appMetadataPlugin() {
  return {
    name: 'app-metadata-generator',
    buildStart() {
      execSync('node --import tsx/esm scripts/appMetadataGenerator.ts', { stdio: 'inherit' });
    },
  };
}

// https://astro.build/config
export default defineConfig({
  vite: {
    resolve: {
      alias: {
        // Map the shared-utils package name to the TypeScript source so Vite
        // resolves imports directly without needing a separate build step.
        '@aspire-template/shared-utils': resolve(__dirname, '../shared/src'),
      },
    },
    plugins: [appMetadataPlugin()],
  },
});
