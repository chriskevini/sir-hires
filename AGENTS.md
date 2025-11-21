# AGENTS.md: WXT Framework Development Guide

## 1. Introduction
**WXT** (Web Extension Tools) is a next-generation framework for building cross-browser web extensions (Chrome, Firefox, Edge, Safari). It relies on **Vite** for building, supports **HMR** (Hot Module Replacement), and uses a **file-based entrypoint** system to automatically generate the `manifest.json`.

**Core Philosophy:**
* **Write Once, Run Everywhere:** Use the `browser` global (polyfill) instead of `chrome`.
* **File-System Routing:** The `entrypoints/` directory dictates the extension structure.
* **Type Safety:** TypeScript is the default and recommended language.

## 2. Project Structure
The project must follow the standard WXT directory layout. Use the `src/` directory option to keep the root clean.

```text
my-extension/
├── .wxt/                   # [DO NOT TOUCH] Generated types and config
├── .output/                # [DO NOT TOUCH] Build artifacts
├── assets/                 # Static assets (processed by Vite)
├── public/                 # Public assets (copied as-is)
├── src/                    # Source code root (configure in wxt.config.ts)
│   ├── components/         # UI components (React/Vue/Svelte)
│   ├── composables/        # Vue composables (if using Vue)
│   ├── hooks/              # React hooks (if using React)
│   ├── utils/              # Shared utility functions
│   ├── entrypoints/        # VITAL: Maps directly to manifest.json
│   │   ├── background.ts   # Background script/Service Worker
│   │   ├── content.ts      # Content scripts
│   │   ├── popup.html      # Popup UI
│   │   └── options.html    # Options page
│   └── assets/             # Source-specific assets
├── wxt.config.ts           # WXT Configuration
├── package.json
├── tsconfig.json
└── .gitignore
```

### Critical Rules for `entrypoints/`
* **Flat Structure:** Entrypoints must be in the root of `entrypoints/` or in a direct subdirectory named `entrypoints/<name>/index.ts`.
* **No Shared Code:** **NEVER** put shared components, utils, or styles inside `entrypoints/` unless they are strictly local to that specific entrypoint. WXT treats *every* file in this directory as a separate entrypoint.
* **Naming Conventions:**
    * `background.ts` -> Background Script/Service Worker.
    * `popup.html` -> `action.default_popup`.
    * `options.html` -> `options_ui`.
    * `*.content.ts` -> Content Scripts.

## 3. Best Practices & Conventions

### Coding Style
* **Language:** TypeScript (`.ts`, `.tsx`) is mandatory.
* **Imports:** Use `#imports` for auto-imported features (if enabled) or explicit imports from `wxt/...`.
* **Browser API:** Always use the `browser` global (e.g., `browser.runtime.sendMessage`), which is polyfilled by WXT to ensure compatibility with Firefox and Chrome. **Do not use `chrome.*`.**
* **Async/Await:** Prefer `async/await` over callbacks for all asynchronous browser APIs.

### State Management
* **Persistence:** Use **`@wxt-dev/storage`** for persisting data. It offers a typed, async API that wraps `browser.storage`.
    ```typescript
    // src/utils/storage.ts
    import { storage } from 'wxt/storage';

    export const themeSettings = storage.defineItem<string>('local:theme', {
      defaultValue: 'light',
    });
    ```
* **Messaging:** Use `browser.tabs.sendMessage` or `browser.runtime.sendMessage` for communication. For complex flows, define typed message protocols in `utils/messages.ts`.

### Configuration (`wxt.config.ts`)
* **Manifest Generation:** Do not create a `manifest.json` manually. Define manifest properties in `wxt.config.ts` or within specific entrypoints.
    ```typescript
    // wxt.config.ts
    export default defineConfig({
      srcDir: 'src',
      manifest: {
        permissions: ['storage', 'tabs'],
      },
    });
    ```
* **Content Script Matches:** Define matches directly in the content script file using `defineContentScript`.
    ```typescript
    // src/entrypoints/content.ts
    export default defineContentScript({
      matches: ['*://*[.google.com/](https://.google.com/)*'],
      main() {
        // Logic here
      },
    });
    ```

## 4. Workflow & CI/CD

### Development
* **Start Dev Server:** `wxt` (or `npm run dev`). Automatically opens a browser instance.
* **Target Browsers:** `wxt -b firefox` or `wxt -b chrome`.
* **Mocking:** Use `@webext-core/fake-browser` for unit testing logic that interacts with browser APIs.

### Testing (Vitest)
WXT has first-class Vitest support.
1.  Install: `npm i -D vitest @wxt-dev/vitest-plugin`.
2.  Config (`vitest.config.ts`):
    ```typescript
    import { defineConfig } from 'vitest/config';
    import { WxtVitest } from 'wxt/testing/vitest-plugin';

    export default defineConfig({
      plugins: [WxtVitest()],
    });
    ```
3.  **Agent Instruction:** When writing tests, assume the `browser` global is mocked via the plugin.

### Deployment (GitHub Actions)
Use the `wxt submit` command to automate publishing.

**`.github/workflows/publish.yml` Example:**
```yaml
name: Publish Extension
on:
  release:
    types: [published]

jobs:
  submit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: pnpm install
      - run: pnpm build
      
      # Submits to Chrome Web Store and Firefox Add-ons
      - name: Submit to Stores
        run: pnpm wxt submit --chrome-zip .output/*-chrome.zip --firefox-zip .output/*-firefox.zip
        env:
          CHROME_EXTENSION_ID: ${{ secrets.CHROME_EXTENSION_ID }}
          CHROME_CLIENT_ID: ${{ secrets.CHROME_CLIENT_ID }}
          CHROME_CLIENT_SECRET: ${{ secrets.CHROME_CLIENT_SECRET }}
          CHROME_REFRESH_TOKEN: ${{ secrets.CHROME_REFRESH_TOKEN }}
          FIREFOX_EXTENSION_ID: ${{ secrets.FIREFOX_EXTENSION_ID }}
          FIREFOX_JWT_ISSUER: ${{ secrets.FIREFOX_JWT_ISSUER }}
          FIREFOX_JWT_SECRET: ${{ secrets.FIREFOX_JWT_SECRET }}
```

## 5. Agent Guidelines (Instructions for AI)

When generating code for this project, strictly adhere to these rules:

1.  **File Placement:**
    * If I ask for a **background script**, create/edit `src/entrypoints/background.ts`.
    * If I ask for a **content script**, create/edit `src/entrypoints/<name>.content.ts`.
    * If I ask for a **utility**, place it in `src/utils/`.
    * **NEVER** place helper files directly in `src/entrypoints/`.

2.  **Code Patterns:**
    * **WRAP** background script logic in `defineBackground(() => { ... })`.
    * **WRAP** content script logic in `defineContentScript({ ... })`.
    * **ALWAYS** use `browser.*` API, never `chrome.*`.
    * **USE** `defineItem` from `@wxt-dev/storage` for any local storage operations.

3.  **Debugging:**
    * If a build fails with "RollupError: Could not resolve...", check if a shared file was accidentally placed in `entrypoints/`.
    * If changes aren't reflecting, ensure the `wxt` dev server is running and HMR is active.

4.  **Refactoring:**
    * When moving code from a legacy extension to WXT, first identify the entrypoints, then move logic into `define*` wrappers, and finally replace `chrome` with `browser`.
