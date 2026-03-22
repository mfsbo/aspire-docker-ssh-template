# Developer Guide

This guide covers everything you need to create, run, test, and deploy apps and shared
libraries in this Aspire Docker SSH template.

---

## Table of Contents

1. [Repository Structure](#repository-structure)
2. [Creating a New App](#creating-a-new-app)
3. [Creating a Shared Library](#creating-a-shared-library)
4. [Adding a New App to Aspire](#adding-a-new-app-to-aspire)
5. [Running Everything Locally](#running-everything-locally)
6. [Library Development & Testing](#library-development--testing)
7. [Deployment](#deployment)

---

## Repository Structure

```
aspire-docker-ssh-template/
├── apphost.cs            # Aspire host — registers all apps and services
├── apphost.settings.json # Toggle HTTPS/Let's Encrypt
├── frontend/             # Astro app (served at /)
├── vue-app/              # Vue 3 + Vite 8 app (served at /vue-app/)
├── shared/               # Shared TypeScript utility libraries
│   ├── src/
│   │   ├── Date/         # Date formatting utilities
│   │   └── cloudinary/   # CDN upload helpers & Vite plugin
│   └── Tests/
│       └── Date/         # Vitest unit tests (mirrors src/ structure)
├── deploy/               # Cloudinary asset upload & HTML rewrite scripts
└── dev.md                # This file
```

---

## Creating a New App

### 1. Scaffold with Vite

```bash
npm create vite@latest my-new-app -- --template vue-ts
# or: react-ts, svelte-ts, etc.
```

### 2. Add required scripts to `package.json`

```json
{
  "name": "my-new-app",
  "version": "0.0.1",
  "engines": { "node": ">=25.0.0" },
  "scripts": {
    "generate:app-info": "tsx scripts/appMetadataGenerator.ts",
    "prebuild": "npm run generate:app-info",
    "dev": "npm run generate:app-info && vite",
    "build": "vite build"
  },
  "devDependencies": {
    "tsx": "^4.21.0"
  }
}
```

### 3. Copy `scripts/appMetadataGenerator.ts` from an existing app

The generator reads `package.json` → writes `src/app-info.ts` with `appName`, `version`,
and `buildTime` (ISO string). `src/app-info.ts` is gitignored — it is re-generated on
every build.

### 4. Add the Vite metadata plugin to `vite.config.ts`

```typescript
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

export default defineConfig({
  resolve: {
    alias: {
      '@aspire-template/shared-utils': resolve(__dirname, '../shared/src'),
    },
  },
  plugins: [appMetadataPlugin(), /* other plugins */],
})
```

### 5. Add TypeScript path alias to `tsconfig.json`

```json
{
  "compilerOptions": {
    "paths": {
      "@aspire-template/shared-utils/*": ["../shared/src/*"]
    }
  }
}
```

### 6. Create a footer component

```typescript
// src/components/AppFooter.vue (Vue example)
import { formatBuildDate, getBuildYear } from '@aspire-template/shared-utils/Date'
import APP_INFO from '../app-info'

const buildDate = formatBuildDate(new Date(APP_INFO.buildTime))
const year      = getBuildYear(new Date(APP_INFO.buildTime))
```

### 7. Gitignore the generated file

Add to the app's `.gitignore`:
```
src/app-info.ts
```

---

## Creating a Shared Library

All shared libraries live under `shared/src/{LibraryName}/`.

### 1. Create a new module folder

```
shared/src/
└── MyModule/
    ├── myHelper.ts    # Individual function file
    ├── index.ts       # Barrel — exports everything public
```

### 2. Implement your functions with strict types

```typescript
// shared/src/MyModule/myHelper.ts

/**
 * @param input - A number (TypeScript will error if you pass the wrong type)
 * @returns Transformed output
 */
export function myHelper(input: number): string {
  return `Result: ${input}`
}
```

### 3. Export from the barrel file

```typescript
// shared/src/MyModule/index.ts
export { myHelper } from './myHelper.js'
```

### 4. Add a build entry in `shared/vite.config.ts`

```typescript
entry: {
  Date:     resolve(__dirname, 'src/Date/index.ts'),
  MyModule: resolve(__dirname, 'src/MyModule/index.ts'),  // ← add this line
},
```

### 5. Export from `shared/src/index.ts`

```typescript
export * from './MyModule/index.js'
```

### 6. Register the sub-path export in `shared/package.json`

```json
{
  "exports": {
    "./Date":     "./src/Date/index.ts",
    "./MyModule": "./src/MyModule/index.ts"
  }
}
```

### 7. Write tests in `Tests/MyModule/`

```
shared/Tests/
└── MyModule/
    └── myHelper.test.ts
```

```typescript
import { describe, it, expect } from 'vitest'
import { myHelper } from '../../src/MyModule/myHelper'

describe('myHelper', () => {
  it('returns the correct string for a known input', () => {
    expect(myHelper(42)).toBe('Result: 42')
  })
})
```

---

## Adding a New App to Aspire

Edit `apphost.cs` to register the app with the Aspire host:

```csharp
// Register the new Vite app
var myNewApp = builder.AddViteApp("my-new-app", "my-new-app");

// For production: serve via YARP or handle separately
if (builder.ExecutionContext.IsPublishMode)
{
    // Option A: serve as a separate static-file resource
    var yarp = builder.AddYarp("site")
           .PublishWithStaticFiles(vite)          // main app at /
           .PublishWithStaticFiles(myNewApp, ...); // or use YARP routing

    // Option B: deploy independently via the Cloudinary pipeline (see Deployment section)
}
```

The new app will appear in the Aspire dashboard and be started automatically when you
run the host.

---

## Running Everything Locally

### Prerequisites

- [Aspire CLI](https://aspire.dev/docs/get-started) installed
- Docker Desktop running
- Node.js 24+ (Node 25+ recommended)

### Start the Aspire host (all apps)

```bash
# From the repo root — starts the host and all registered apps
aspire run
# or
dotnet run --project apphost.cs
```

The Aspire dashboard will open at `http://localhost:15296` (or the URL shown in output).
Individual apps are accessible via YARP at `http://localhost:PORT/`.

### Run the Astro frontend independently

```bash
cd frontend
npm install
npm run dev    # starts dev server at http://localhost:4321
npm run build  # production build → dist/
npm run preview
```

### Run the Vue app independently

```bash
cd vue-app
npm install
npm run dev    # starts dev server at http://localhost:5173
npm run build  # production build → dist/
npm run preview
```

### Run with HTTPS (Let's Encrypt)

1. Set `"EnableHttps": true` in `apphost.settings.json`
2. Provide the required parameters when prompted:
   - `domain` — your public domain name
   - `letsencrypt-email` — your email for ACME registration
3. Run `aspire run` — Certbot will obtain a certificate on first start

---

## Library Development & Testing

### Running tests

```bash
cd shared
npm install
npm test           # run all tests once
npm run test:watch # watch mode (re-runs on file change)
npm run coverage   # generate coverage report
```

### Building the library

```bash
cd shared
npm run build
# Produces:
#   dist/Date.0.0.1.js       — ESM module
#   dist/Date.0.0.1.min.js   — IIFE (minified, for CDN)
```

### Watching for changes during development

```bash
cd shared
npm run dev   # vite build --watch — rebuilds on every save
```

### Adding a new library entry point

See [Creating a Shared Library](#creating-a-shared-library) above.

---

## Deployment

### Overview

The deployment strategy uses **Cloudinary** for static assets (JS/CSS) and
**SSH + Docker Compose** for HTML files and the server infrastructure.

```
Build → Upload JS/CSS to Cloudinary → Rewrite HTML to use CDN URLs → SSH deploy HTML
```

### Step 1 — Configure Cloudinary credentials

```bash
cd deploy
node --import tsx/esm cloudinaryConfig.ts
# → creates deploy/cloudinary.config.json with placeholder values
# Edit the file and fill in cloudName, apiKey, apiSecret
```

`deploy/cloudinary.config.json` is gitignored — never commit credentials.

### Step 2 — Build apps

```bash
cd frontend && npm run build
cd ../vue-app && npm run build
```

### Step 3 — Upload app assets (JS/CSS) to Cloudinary

```bash
# From repo root
node --import tsx/esm deploy/cloudinaryHelper.ts upload frontend 0.0.1 frontend/dist
node --import tsx/esm deploy/cloudinaryHelper.ts upload vue-app  0.0.1 vue-app/dist
```

Assets are uploaded to:
- `frontend/v0.0.1/{appName}.{version}.{hash}.min.js`
- `vue-app/v0.0.1/{appName}.{version}.{hash}.min.css`

**If an asset already exists the upload will error** — bump the version in the app's
`package.json` instead of overwriting.

### Step 4 — Rewrite HTML to use CDN URLs

```bash
node --import tsx/esm deploy/cloudinaryHelper.ts replace frontend/dist/index.html frontend 0.0.1
node --import tsx/esm deploy/cloudinaryHelper.ts replace vue-app/dist/index.html  vue-app  0.0.1
```

The `index.html` files are updated in-place to reference Cloudinary CDN URLs.

### Step 5 — Upload shared library to Cloudinary

Build the shared library, then upload the IIFE bundle:

```bash
cd shared && npm run build
```

Then use the `uploadLibrary` function from `@aspire-template/shared-utils/cloudinary`
in a deployment script (see `shared/src/cloudinary/uploadLibrary.ts` for the API):

```typescript
import { uploadLibrary } from '../shared/src/cloudinary/index.ts'
import { loadCloudinaryConfig } from './cloudinaryConfig.js'

const cfg = loadCloudinaryConfig()
await uploadLibrary(cfg, {
  libraryName: 'Date',
  version: '0.0.1',
  builtFilePath: './shared/dist/Date.0.0.1.min.js',
})
// → uploads to: shared/Date.0.0.1.min
// CDN URL: https://res.cloudinary.com/{cloudName}/raw/upload/shared/Date.0.0.1.min.js
```

### Step 6 — SSH deploy to server

Use the Aspire CLI to deploy via Docker Compose over SSH:

```bash
# Interactive deployment
aspire deploy

# Or generate a GitHub Actions workflow for CI/CD
aspire do gh-action-dcenv
```

The YARP reverse proxy serves `index.html` and static assets on the server. Since
JS/CSS are now served from Cloudinary, only the HTML files need to be deployed.

### List CDN assets

```bash
node --import tsx/esm deploy/cloudinaryHelper.ts list frontend 0.0.1
node --import tsx/esm deploy/cloudinaryHelper.ts list vue-app  0.0.1
```

### Using the CDN plugin in Vite (optional production optimisation)

To load the shared library from CDN instead of bundling it, add the plugin to
the app's `vite.config.ts`:

```typescript
import { sharedLibCdnPlugin } from '@aspire-template/shared-utils/cloudinary'

export default defineConfig({
  plugins: [
    sharedLibCdnPlugin({
      cloudName: 'my-cloud',
      libraries: [{
        name: 'Date',
        version: '0.0.1',
        globalVar: 'AspireShared_Date',
        importPath: '@aspire-template/shared-utils/Date',
      }],
    }),
  ],
})
```

In dev mode this plugin is inactive — Vite resolves the import from the local
TypeScript source via path alias. In production builds the import is marked as
external and a `<script src="CDN_URL">` tag is injected automatically.
