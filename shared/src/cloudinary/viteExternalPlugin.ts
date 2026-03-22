import type { Plugin } from 'vite'
import { getLibraryCdnPath } from './getLibraryCdnPath.js'
import type { CloudinaryConfig } from './types.js'

export interface SharedLibEntry {
  /** Module name matching the IIFE output file, e.g. `'Date'` */
  name: string
  /** Semver string matching `shared/package.json` version, e.g. `'0.0.1'` */
  version: string
  /**
   * The global variable name that the IIFE build exposes on `window`.
   * Must match the `name` used in `shared/vite.config.ts`.
   * e.g. `'AspireShared_Date'`
   */
  globalVar: string
  /**
   * The import specifier used inside the app, e.g.
   * `'@aspire-template/shared-utils/Date'`
   */
  importPath: string
}

export interface SharedLibCdnOptions {
  /** Cloudinary cloud name, e.g. `'my-cloud'` */
  cloudName: string
  /** List of shared libraries to load from CDN in production */
  libraries: SharedLibEntry[]
}

/**
 * Vite plugin that — **in production builds only** — marks shared libraries
 * as external and injects `<script>` tags pointing to Cloudinary CDN URLs.
 *
 * In development (vite dev / vite serve) the plugin is inactive and the
 * imports are resolved normally via path aliases in `vite.config.ts`.
 *
 * ### Usage
 * ```ts
 * // vite.config.ts
 * import { sharedLibCdnPlugin } from '@aspire-template/shared-utils/cloudinary'
 *
 * export default defineConfig({
 *   plugins: [
 *     sharedLibCdnPlugin({
 *       cloudName: 'my-cloud',
 *       libraries: [{
 *         name: 'Date',
 *         version: '0.0.1',
 *         globalVar: 'AspireShared_Date',
 *         importPath: '@aspire-template/shared-utils/Date',
 *       }],
 *     }),
 *   ],
 * })
 * ```
 */
export function sharedLibCdnPlugin(options: SharedLibCdnOptions): Plugin {
  const { cloudName, libraries } = options

  return {
    name: 'shared-lib-cdn',
    apply: 'build', // only active during production builds

    config(_cfg, { command }) {
      if (command !== 'build') return

      const external: string[] = libraries.map((lib) => lib.importPath)
      const globals: Record<string, string> = {}
      for (const lib of libraries) {
        globals[lib.importPath] = lib.globalVar
      }

      return {
        build: {
          rollupOptions: {
            external,
            output: { globals },
          },
        },
      }
    },

    transformIndexHtml(html: string): string {
      const scriptTags = libraries
        .map((lib) => {
          const cdnUrl = getLibraryCdnPath({ cloudName }, lib.name, lib.version)
          return `    <script src="${cdnUrl}"></script>`
        })
        .join('\n')
      return html.replace('<head>', `<head>\n${scriptTags}`)
    },
  }
}
