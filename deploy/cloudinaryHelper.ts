/**
 * cloudinaryHelper.ts
 *
 * Uploads static assets (JS/CSS) from an app's dist folder to Cloudinary and
 * provides utilities to obtain CDN URLs and rewrite HTML files so they
 * reference Cloudinary-hosted assets instead of local ones.
 *
 * Asset naming convention:
 *   {appName}.{version}.{hash}.min.{ext}
 *   e.g.  vue-app.0.0.1.B5CP7VjB.min.js
 *
 * Cloudinary folder structure:
 *   {appName}/v{version}/{filename}
 *   e.g.  vue-app/v0.0.1/vue-app.0.0.1.B5CP7VjB.min.js
 *
 * Usage:
 *   node --import tsx/esm deploy/cloudinaryHelper.ts upload <appName> <version> <distPath>
 *   node --import tsx/esm deploy/cloudinaryHelper.ts replace <htmlFile> <appName> <version>
 *   node --import tsx/esm deploy/cloudinaryHelper.ts list   <appName> <version>
 */

import { createHash } from 'crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve, extname, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadCloudinaryConfig, type CloudinaryConfig } from './cloudinaryConfig.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Asset name builder
// ---------------------------------------------------------------------------

/**
 * Derive the canonical asset name for a dist file.
 *
 * Vite output files look like: index-B5CP7VjB.js  /  index-BDisK3Xr.css
 * We map them to:              vue-app.0.0.1.B5CP7VjB.min.js
 */
function buildAssetName(appName: string, version: string, filename: string): string {
  const ext = extname(filename).slice(1); // 'js' | 'css'
  const nameWithoutExt = basename(filename, extname(filename));

  // Extract hash portion (everything after the last '-')
  const parts = nameWithoutExt.split('-');
  const hash = parts.length > 1 ? parts[parts.length - 1] : nameWithoutExt;

  const hashSuffix = hash ? `.${hash}` : '';

  // All Vite production builds are minified
  return `${appName}.${version}${hashSuffix}.min.${ext}`;
}

/**
 * Cloudinary public_id (path without extension) for an asset.
 */
function buildPublicId(appName: string, version: string, assetName: string): string {
  const nameWithoutExt = assetName.slice(0, assetName.lastIndexOf('.'));
  return `${appName}/v${version}/${nameWithoutExt}`;
}

// ---------------------------------------------------------------------------
// Cloudinary REST API helpers (uses Node built-ins — no SDK required)
// ---------------------------------------------------------------------------

function signParams(params: Record<string, string>, apiSecret: string): string {
  const sorted = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return createHash('sha256').update(sorted + apiSecret).digest('hex');
}

async function checkAssetExists(cfg: CloudinaryConfig, publicId: string): Promise<boolean> {
  const url = `https://res.cloudinary.com/${cfg.cloudName}/raw/upload/${publicId}`;
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

async function uploadFile(
  cfg: CloudinaryConfig,
  filePath: string,
  publicId: string,
): Promise<string> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const params: Record<string, string> = { public_id: publicId, timestamp };
  const signature = signParams(params, cfg.apiSecret);

  const formData = new FormData();
  formData.append('file', new Blob([readFileSync(filePath)]));
  formData.append('api_key', cfg.apiKey);
  formData.append('timestamp', timestamp);
  formData.append('public_id', publicId);
  formData.append('signature', signature);
  formData.append('resource_type', 'raw');

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cfg.cloudName}/raw/upload`;
  const res = await fetch(uploadUrl, { method: 'POST', body: formData });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[cloudinaryHelper] Upload failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as { secure_url: string };
  return json.secure_url;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface UploadResult {
  originalFile: string;
  assetName: string;
  publicId: string;
  secureUrl: string;
}

/**
 * Upload all JS and CSS files from `distPath` to Cloudinary.
 * Throws if a file with the same public_id already exists on Cloudinary (no overwrite).
 */
export async function uploadStaticAssets(
  appName: string,
  version: string,
  distPath: string,
): Promise<UploadResult[]> {
  const cfg = loadCloudinaryConfig();
  const absDistPath = resolve(__dirname, '..', distPath);

  if (!existsSync(absDistPath)) {
    throw new Error(`[cloudinaryHelper] dist folder not found: ${absDistPath}`);
  }

  const assetFiles = collectAssets(absDistPath);

  if (assetFiles.length === 0) {
    console.warn('[cloudinaryHelper] No JS/CSS assets found in', absDistPath);
    return [];
  }

  const results: UploadResult[] = [];

  for (const filePath of assetFiles) {
    const filename = basename(filePath);
    const assetName = buildAssetName(appName, version, filename);
    const publicId = buildPublicId(appName, version, assetName);

    const existsOnCdn = await checkAssetExists(cfg, publicId);
    if (existsOnCdn) {
      throw new Error(
        `[cloudinaryHelper] ❌  Asset already exists on Cloudinary: ${publicId}\n` +
          `  Do NOT replace existing versioned assets. Bump the version in package.json instead.`,
      );
    }

    console.log(`[cloudinaryHelper] Uploading  ${filename}  →  ${publicId}…`);
    const secureUrl = await uploadFile(cfg, filePath, publicId);
    results.push({ originalFile: filePath, assetName, publicId, secureUrl });
    console.log(`[cloudinaryHelper] ✅  ${secureUrl}`);
  }

  return results;
}

/**
 * Return all Cloudinary assets (JS/CSS) for a given app + version.
 * Uses the Cloudinary Admin API (list resources by prefix).
 */
export async function getCdnAssets(
  appName: string,
  version: string,
): Promise<{ publicId: string; secureUrl: string; ext: string }[]> {
  const cfg = loadCloudinaryConfig();
  const prefix = `${appName}/v${version}/`;

  const auth = Buffer.from(`${cfg.apiKey}:${cfg.apiSecret}`).toString('base64');
  const url =
    `https://api.cloudinary.com/v1_1/${cfg.cloudName}/resources/raw` +
    `?type=upload&prefix=${encodeURIComponent(prefix)}&max_results=200`;

  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });

  if (!res.ok) {
    throw new Error(
      `[cloudinaryHelper] Failed to list CDN assets (${res.status}): ${await res.text()}`,
    );
  }

  const json = (await res.json()) as {
    resources: { public_id: string; secure_url: string; format: string }[];
  };

  return json.resources.map((r) => ({
    publicId: r.public_id,
    secureUrl: r.secure_url,
    ext: r.format,
  }));
}

/**
 * Replace all local JS/CSS `<script src>` and `<link href>` references in an
 * HTML file with matching Cloudinary CDN URLs for the given app + version.
 * The HTML file is updated in-place.
 */
export async function replaceAssetsInHtml(
  htmlFilePath: string,
  appName: string,
  version: string,
): Promise<void> {
  if (!existsSync(htmlFilePath)) {
    throw new Error(`[cloudinaryHelper] HTML file not found: ${htmlFilePath}`);
  }

  const cdnAssets = await getCdnAssets(appName, version);

  if (cdnAssets.length === 0) {
    console.warn(
      `[cloudinaryHelper] No CDN assets found for ${appName} v${version}. ` +
        `Run 'upload' first.`,
    );
    return;
  }

  let html = readFileSync(htmlFilePath, 'utf-8');
  let replacements = 0;

  for (const asset of cdnAssets) {
    const ext = asset.ext.toLowerCase();
    if (ext !== 'js' && ext !== 'css') continue;

    // Match the asset's filename segment anywhere inside src/href
    const filename = asset.publicId.split('/').pop() ?? '';
    const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const scriptRe = new RegExp(`(src=["'])([^"']*${escaped}[^"']*)(["'])`, 'g');
    const linkRe = new RegExp(`(href=["'])([^"']*${escaped}[^"']*)(["'])`, 'g');

    html = html.replace(scriptRe, (_m, pre, _url, post) => {
      replacements++;
      return `${pre}${asset.secureUrl}${post}`;
    });
    html = html.replace(linkRe, (_m, pre, _url, post) => {
      replacements++;
      return `${pre}${asset.secureUrl}${post}`;
    });
  }

  writeFileSync(htmlFilePath, html, 'utf-8');
  console.log(
    `[cloudinaryHelper] ✅  Replaced ${replacements} asset reference(s) in ${htmlFilePath}`,
  );
}

// ---------------------------------------------------------------------------
// Utility: collect JS/CSS files recursively from a dist folder
// ---------------------------------------------------------------------------

function collectAssets(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectAssets(full));
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (ext === '.js' || ext === '.css') results.push(full);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const isMain =
  process.argv[1] !== undefined &&
  resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);

if (isMain) {
  const [, , command, ...rest] = process.argv;

  const usage =
    'Usage:\n' +
    '  node --import tsx/esm deploy/cloudinaryHelper.ts upload  <appName> <version> <distPath>\n' +
    '  node --import tsx/esm deploy/cloudinaryHelper.ts replace <htmlFile> <appName> <version>\n' +
    '  node --import tsx/esm deploy/cloudinaryHelper.ts list    <appName> <version>\n';

  if (command === 'upload') {
    const [appName, version, distPath] = rest;
    if (!appName || !version || !distPath) {
      console.error(usage);
      process.exit(1);
    }
    uploadStaticAssets(appName, version, distPath)
      .then((r) => console.log(`[cloudinaryHelper] ✅  Uploaded ${r.length} asset(s).`))
      .catch((e: Error) => { console.error(e.message); process.exit(1); });

  } else if (command === 'replace') {
    const [htmlFile, appName, version] = rest;
    if (!htmlFile || !appName || !version) {
      console.error(usage);
      process.exit(1);
    }
    replaceAssetsInHtml(htmlFile, appName, version)
      .catch((e: Error) => { console.error(e.message); process.exit(1); });

  } else if (command === 'list') {
    const [appName, version] = rest;
    if (!appName || !version) {
      console.error(usage);
      process.exit(1);
    }
    getCdnAssets(appName, version)
      .then((assets) => {
        if (assets.length === 0) {
          console.log('[cloudinaryHelper] No assets found.');
        } else {
          assets.forEach((a) => console.log(`  ${a.publicId}  →  ${a.secureUrl}`));
        }
      })
      .catch((e: Error) => { console.error(e.message); process.exit(1); });

  } else {
    console.error(usage);
    process.exit(1);
  }
}
