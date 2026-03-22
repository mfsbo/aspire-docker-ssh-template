// @ts-check
import { defineConfig } from 'astro/config';
import { execSync } from 'child_process';

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
    plugins: [appMetadataPlugin()],
  },
});

