import { defineConfig } from 'vite'
import { resolve } from 'path'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8')) as {
  version: string
}

/**
 * Shared utilities library — builds each module in src/ as a separate IIFE + ESM bundle.
 *
 * Output naming convention:
 *   IIFE (minified, for CDN):  {ModuleName}.{version}.min.js   e.g. Date.0.0.1.min.js
 *   ESM  (for bundler import): {ModuleName}.{version}.js        e.g. Date.0.0.1.js
 *
 * To add a new library module, create src/{ModuleName}/index.ts and add an entry below.
 */
export default defineConfig({
  test: {
    include: ['Tests/**/*.test.ts'],
    environment: 'node',
  },
  build: {
    lib: {
      // Add new module entries here as the library grows
      entry: {
        Date: resolve(__dirname, 'src/Date/index.ts'),
      },
      formats: ['es', 'iife'],
      // Global variable exposed by the IIFE build: window.AspireShared_Date
      name: 'AspireShared_Date',
      fileName: (format, entryName) =>
        format === 'iife'
          ? `${entryName}.${pkg.version}.min.js`
          : `${entryName}.${pkg.version}.js`,
    },
    outDir: 'dist',
    minify: true,
  },
})
