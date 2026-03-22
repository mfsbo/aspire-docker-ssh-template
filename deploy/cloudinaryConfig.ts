/**
 * cloudinaryConfig.ts
 *
 * Manages Cloudinary credentials for the static-asset deployment pipeline.
 * Run with:  node --import tsx/esm deploy/cloudinaryConfig.ts
 *
 * On first run this file creates a `deploy/cloudinary.config.json` template
 * and instructs the user to fill it in before continuing.
 * On subsequent runs it validates the config and exports it for use by
 * cloudinaryHelper.ts.
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = resolve(__dirname, 'cloudinary.config.json');

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

const TEMPLATE: CloudinaryConfig = {
  cloudName: 'YOUR_CLOUD_NAME',
  apiKey: 'YOUR_API_KEY',
  apiSecret: 'YOUR_API_SECRET',
};

/**
 * Load and validate cloudinary.config.json.
 * Throws if the file does not exist or still contains placeholder values.
 */
export function loadCloudinaryConfig(): CloudinaryConfig {
  if (!existsSync(CONFIG_PATH)) {
    writeFileSync(CONFIG_PATH, JSON.stringify(TEMPLATE, null, 2) + '\n', 'utf-8');
    console.error(
      `\n[cloudinaryConfig] ⚠️  Config file created at:\n  ${CONFIG_PATH}\n\n` +
        `Please fill in your Cloudinary credentials (cloudName, apiKey, apiSecret)\n` +
        `and run the command again.\n`,
    );
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) as CloudinaryConfig;

  const placeholders = Object.entries(TEMPLATE) as [keyof CloudinaryConfig, string][];
  const missing = placeholders
    .filter(([key, placeholder]) => !raw[key] || raw[key] === placeholder)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.error(
      `\n[cloudinaryConfig] ⚠️  The following fields are still empty or contain placeholder values:\n` +
        missing.map((k) => `  • ${k}`).join('\n') +
        `\n\nEdit ${CONFIG_PATH} and run again.\n`,
    );
    process.exit(1);
  }

  return raw;
}

// When run directly, print the active config (masked secret).
if (
  process.argv[1] !== undefined &&
  resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])
) {
  const cfg = loadCloudinaryConfig();
  console.log('[cloudinaryConfig] ✅  Config loaded successfully.');
  console.log(`  cloudName : ${cfg.cloudName}`);
  console.log(`  apiKey    : ${cfg.apiKey}`);
  console.log(`  apiSecret : ${'*'.repeat(cfg.apiSecret.length)}`);
}
