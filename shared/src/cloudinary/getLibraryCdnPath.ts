import type { CloudinaryConfig } from './types.js'

/**
 * Returns the Cloudinary CDN URL for a built shared library.
 *
 * The URL follows the naming convention:
 *   `https://res.cloudinary.com/{cloudName}/raw/upload/shared/{libraryName}.{version}.min.js`
 *
 * @param cfg  - Object containing at minimum `cloudName`
 * @param libraryName - Module name, e.g. `'Date'`
 * @param version     - Semver string, e.g. `'0.0.1'`
 * @returns Full Cloudinary CDN URL for the library file
 */
export function getLibraryCdnPath(
  cfg: Pick<CloudinaryConfig, 'cloudName'>,
  libraryName: string,
  version: string,
): string {
  return `https://res.cloudinary.com/${cfg.cloudName}/raw/upload/shared/${libraryName}.${version}.min.js`
}
