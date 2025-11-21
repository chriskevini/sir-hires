# AGENTS.md: WXT + React Development Guide

## 1. Introduction
**WXT** (Web Extension Tools) is a next-generation framework for building cross-browser web extensions. This project utilizes **React** for all UI elements.

**Core Philosophy:**
* **Write Once, Run Everywhere:** Use the `browser` global (polyfill) instead of `chrome`.
* **File-System Routing:** The `entrypoints/` directory dictates the extension structure.
* **React-First:** All UI logic resides in React Functional Components (`.tsx`).
* **Manifest V3 Default:** The project targets MV3 by default.

## 2. Project Structure
The project follows the standard WXT directory layout. We use the **"Folder per Entrypoint"** pattern for UI pages to keep React files organized.

```text
my-extension/
├── .wxt/                   # [DO NOT TOUCH] Generated types and config
├── .output/                # [DO NOT TOUCH] Build artifacts
├── assets/                 # Static assets (processed by Vite)
├── public/                 # Public assets (copied as-is)
├── src/                    # Source code root (configure in wxt.config.ts)
│   ├── components/         # Shared React Components
│   │   ├── ui/             # Generic UI kit (buttons, inputs)
│   │   └── features/       # Feature-specific components
│   ├── hooks/              # Custom React Hooks
│   ├── utils/              # Shared utility functions
│   ├── assets/             # Source-specific assets (images, styles)
│   ├── entrypoints/        # VITAL: Maps directly to manifest.json
│   │   ├── background.ts   # Background script (Service Worker)
│   │   ├── content.ts      # Content scripts (Headless)
│   │   ├── popup/          # Popup UI Entrypoint
│   │   │   ├── index.html  # Entry HTML
│   │   │   ├── main.tsx    # Mounts React Root
│   │   │   └── App.tsx     # Main Popup Component
│   │   └── options/        # Options UI Entrypoint
│   │   │   ├── index.html
│   │   │   ├── main.tsx
│   │   │   └── App.tsx
├── wxt.config.ts           # WXT Configuration
├── package.json
├── tsconfig.json
└── .gitignore
```

### Critical Rules for `entrypoints/`
* **UI Entrypoints:** For React pages (Popup, Options), always use a directory: `entrypoints/<name>/`.
    * Must contain an `index.html` (the entrypoint).
    * Must contain a `main.tsx` (to mount the React app).
* **No Shared Code:** **NEVER** put shared components, utils, or styles inside `entrypoints/`. WXT treats *every* file in this directory as a separate entrypoint. Move shared code to `src/components/` or `src/hooks/`.

## 3. Best Practices & Conventions

### React & Coding Style
* **Language:** TypeScript (`.ts`, `.tsx`) is mandatory.
* **Components:** Use Functional Components with Hooks.
* **Styling:** Import CSS/SCSS modules or Tailwind classes directly in `.tsx` files.
* **Browser API:** Always use the `browser` global (e.g., `browser.runtime.sendMessage`). **Do not use `chrome.*`.**

### State Management
* **Persistence:** Use **`@wxt-dev/storage`** for persisting data.
* **React Integration:** Create a hook to consume storage reactively if needed, or use `useEffect` to sync state on mount.
    ```typescript
    // src/utils/storage.ts
    import { storage } from 'wxt/storage';

    export const themeItem = storage.defineItem<string>('local:theme', {
      defaultValue: 'light',
    });

    // Example usage in React component
    // const theme = await themeItem.getValue();
    ```

### Content Script UIs (React)
To inject a React App into a webpage using Shadow DOM (isolated styles):
1.  Define the content script with `export default defineContentScript`.
2.  Set `cssInjectionMode: 'ui'` (Crucial for Shadow DOM).
3.  Use `createShadowRootUi`.
4.  Mount the React root inside the `onMount` callback.

```typescript
// src/entrypoints/overlay.content.tsx
import ReactDOM from 'react-dom/client';
import OverlayApp from '@/components/features/OverlayApp';
// Import styles so WXT bundles them for injection
import './overlay.css'; 

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui', // REQUIRED for Shadow Root
  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'react-overlay',
      position: 'inline',
      onMount: (container) => {
        const root = ReactDOM.createRoot(container);
        root.render(<OverlayApp />);
        return root;
      },
      onRemove: (root) => {
        root?.unmount();
      },
    });
    ui.mount();
  },
});
```

### Configuration (`wxt.config.ts`)
* **Modules:** Use `@wxt-dev/module-react` for auto-configuration.
* **Manifest:** Define permissions and other manifest settings here. MV3 is the default target.
    ```typescript
    // wxt.config.ts
    import { defineConfig } from 'wxt';

    export default defineConfig({
      srcDir: 'src',
      modules: ['@wxt-dev/module-react'],
      manifest: {
        permissions: ['storage', 'tabs'],
        action: {
          default_title: 'My Extension',
        },
      },
    });
    ```

## 4. Workflow & CI/CD

### Development
* **Start Dev Server:** `wxt` (or `npm run dev`).
* **Target Browsers:** `wxt -b firefox` or `wxt -b chrome`.
* **Mocking:** Use `@webext-core/fake-browser` for logic testing.

### Testing (Vitest + React Testing Library)
1.  **Unit Tests:** Use `vitest` for logic/utils.
2.  **Component Tests:** Use `@testing-library/react` for UI components.
    ```typescript
    // Example Component Test
    import { render, screen } from '@testing-library/react';
    import MyComponent from './MyComponent';

    test('renders button', () => {
      render(<MyComponent />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
    ```

### Deployment (GitHub Actions)
Use `wxt submit` for automated publishing.

**`.github/workflows/publish.yml` Snippet:**
```yaml
      - run: pnpm install
      - run: pnpm build
      - name: Submit
        run: pnpm wxt submit --chrome-zip .output/*-chrome.zip --firefox-zip .output/*-firefox.zip
        env:
          # Secrets configuration...
```

## 5. Agent Guidelines (Instructions for AI)

When generating code for this project, strictly adhere to these rules:

1.  **React Structure:**
    * UI Entrypoints must use the folder pattern: `entrypoints/<name>/index.html` + `main.tsx`.
    * Mounting logic goes in `main.tsx`. Component logic goes in `App.tsx`.
    * Reusable UI goes in `src/components/`.

2.  **File Placement:**
    * **Background:** `src/entrypoints/background.ts`
    * **Content Script:** `src/entrypoints/<name>.content.ts` (or `.tsx` if it has UI).
    * **Utils:** `src/utils/`.

3.  **Code Patterns:**
    * **WRAP** background script logic in `defineBackground`.
    * **WRAP** content script logic in `defineContentScript`.
    * **ALWAYS** use `export default` for entrypoint definitions.
    * **ALWAYS** use `browser.*` API, never `chrome.*`.
    * **USE** React Functional Components.

4.  **Debugging:**
    * If "RollupError" occurs, check if shared React components were accidentally placed inside `entrypoints/`. Move them to `components/`.
    * Ensure `cssInjectionMode: 'ui'` is set if using `createShadowRootUi`.
