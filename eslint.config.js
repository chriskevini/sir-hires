import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  {
    ignores: [
      'dist/**',
      '.output/**',
      '.wxt/**',
      'node_modules/**',
      'src/entrypoints/profile/main.tsx', // Temporary: tsconfig project issue
    ],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Browser globals
        browser: 'readonly',
        chrome: 'readonly',
        console: 'readonly',
        document: 'readonly',
        window: 'readonly',
        HTMLElement: 'readonly',
        Element: 'readonly',
        Node: 'readonly',
        alert: 'readonly',
        requestAnimationFrame: 'readonly',
        localStorage: 'readonly',
        crypto: 'readonly',
        // Browser APIs
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // WXT auto-imports (these are provided by WXT)
        defineBackground: 'readonly',
        defineContentScript: 'readonly',
        // Node.js types
        NodeJS: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // React rules
      'react/react-in-jsx-scope': 'off', // Not needed in modern React
      'react/prop-types': 'off', // Using TypeScript instead
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // TypeScript rules
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',

      // General rules
      'no-unused-vars': 'off', // Disable base rule (use @typescript-eslint/no-unused-vars instead)
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    },
    settings: {
      react: { version: 'detect' },
    },
  },
];
