import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: 'src',
  outDir: '.output',
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Sir Hires',
    version: '0.3.0',
    description:
      'Privacy-first job search assistant. Extract and manage job postings locally - no servers, no tracking.',
    permissions: [
      'activeTab',
      'storage',
      'scripting',
      'downloads',
      'sidePanel',
      'contextMenus',
    ],
    host_permissions: ['http://localhost:*/*', 'http://127.0.0.1:*/*'],
    action: {
      default_title: 'Sir Hires - Open Sidepanel',
      default_icon: {
        16: 'icons/icon16.png',
        48: 'icons/icon48.png',
        128: 'icons/icon128.png',
      },
    },
    icons: {
      16: 'icons/icon16.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png',
    },
  },
});
