/**
 * Cloudinary utilities for the shared library:
 *
 * - `uploadLibrary`       — upload a built IIFE file to Cloudinary `/shared/`
 * - `getLibraryCdnPath`   — get the CDN URL for a versioned library
 * - `sharedLibCdnPlugin`  — Vite plugin that swaps local imports for CDN in production
 *
 * Import via alias (configured in each app's vite config / tsconfig):
 *   import { uploadLibrary } from '@aspire-template/shared-utils/cloudinary'
 */
export { uploadLibrary } from './uploadLibrary.js'
export { getLibraryCdnPath } from './getLibraryCdnPath.js'
export { sharedLibCdnPlugin } from './viteExternalPlugin.js'
export type { CloudinaryConfig, LibraryUploadOptions } from './uploadLibrary.js'
export type { SharedLibEntry, SharedLibCdnOptions } from './viteExternalPlugin.js'
