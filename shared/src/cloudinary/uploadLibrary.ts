import { createHash } from 'crypto'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import type { CloudinaryConfig } from './types.js'

export type { CloudinaryConfig }

/**
 * Returns the canonical Cloudinary public_id for a shared library file.
 * Convention: `shared/{LibraryName}.{version}.min`  (no extension in public_id)
 */
function buildPublicId(libraryName: string, version: string): string {
  return `shared/${libraryName}.${version}.min`
}

function signParams(params: Record<string, string>, apiSecret: string): string {
  const sorted = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  return createHash('sha256').update(sorted + apiSecret).digest('hex')
}

async function checkLibraryExists(cfg: CloudinaryConfig, publicId: string): Promise<boolean> {
  const url = `https://res.cloudinary.com/${cfg.cloudName}/raw/upload/${publicId}.js`
  try {
    const res = await fetch(url, { method: 'HEAD' })
    return res.ok
  } catch {
    return false
  }
}

export interface LibraryUploadOptions {
  /** The module name, e.g. `'Date'` */
  libraryName: string
  /** Semver string matching the package.json version, e.g. `'0.0.1'` */
  version: string
  /** Absolute or relative path to the built `.min.js` IIFE file */
  builtFilePath: string
}

/**
 * Uploads a built shared library IIFE file to Cloudinary under `/shared/`.
 *
 * Naming convention: `shared/{libraryName}.{version}.min.js`
 *
 * Throws if the asset already exists — do not overwrite versioned libraries.
 *
 * @returns The Cloudinary `secure_url` of the uploaded file
 */
export async function uploadLibrary(
  cfg: CloudinaryConfig,
  options: LibraryUploadOptions,
): Promise<string> {
  const { libraryName, version, builtFilePath } = options
  const publicId = buildPublicId(libraryName, version)

  const exists = await checkLibraryExists(cfg, publicId)
  if (exists) {
    throw new Error(
      `[shared/cloudinary] ❌  Library already exists on Cloudinary: ${publicId}.js\n` +
        `  Do not overwrite versioned libraries. Bump the version in shared/package.json instead.`,
    )
  }

  const absPath = resolve(builtFilePath)
  const timestamp = String(Math.floor(Date.now() / 1000))
  const params: Record<string, string> = { public_id: publicId, timestamp }
  const signature = signParams(params, cfg.apiSecret)

  const formData = new FormData()
  formData.append('file', new Blob([readFileSync(absPath)]))
  formData.append('api_key', cfg.apiKey)
  formData.append('timestamp', timestamp)
  formData.append('public_id', publicId)
  formData.append('signature', signature)
  formData.append('resource_type', 'raw')

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cfg.cloudName}/raw/upload`
  const res = await fetch(uploadUrl, { method: 'POST', body: formData })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`[shared/cloudinary] Upload failed (${res.status}): ${body}`)
  }

  const json = (await res.json()) as { secure_url: string }
  console.log(`[shared/cloudinary] ✅  Uploaded → ${json.secure_url}`)
  return json.secure_url
}
