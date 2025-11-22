import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: 'src',
  outDir: '.output',
  manifest: {
    name: 'Sir Hires',
    version: '0.2.0',
    description: 'Privacy-first job search assistant. Extract and manage job postings locally - no servers, no tracking.',
    permissions: [
      'activeTab',
      'storage',
      'scripting',
      'downloads',
      'sidePanel'
    ],
    host_permissions: [
      'http://localhost:*/*',
      'http://127.0.0.1:*/*'
    ]
  }
});
