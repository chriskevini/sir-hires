import js from '@eslint/js';
import jestPlugin from 'eslint-plugin-jest';

export default [
  js.configs.recommended,
  {
    files: ['chrome-extension/**/*.js', '**/*.test.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        crypto: 'readonly',
        TextDecoder: 'readonly',
        TextEncoder: 'readonly',
        AbortController: 'readonly',
        CustomEvent: 'readonly',
        Event: 'readonly',
        
        // Chrome Extension APIs
        chrome: 'readonly',
        
        // Service Worker globals
        self: 'readonly',
        clients: 'readonly',
        
        // Node.js globals for tests
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly'
      }
    },
    rules: {
      // Possible errors
      'no-console': 'off', // We use console for debugging in extensions
      'no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      
      // Best practices
      'eqeqeq': ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-with': 'error',
      'prefer-const': 'warn',
      'no-var': 'warn',
      
      // Style
      'camelcase': ['warn', { properties: 'never' }],
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', { avoidEscape: true }],
    }
  },
  {
    files: ['**/*.test.js'],
    plugins: {
      jest: jestPlugin
    },
    languageOptions: {
      globals: {
        ...jestPlugin.environments.globals.globals,
        parseJobTemplate: 'readonly',
        validateJobTemplate: 'readonly',
        getValidationSummary: 'readonly',
        extractRequiredSkills: 'readonly',
        extractPreferredSkills: 'readonly',
        extractDescription: 'readonly',
        extractAboutCompany: 'readonly',
        parseProfileTemplate: 'readonly',
        validateProfileTemplate: 'readonly',
      }
    },
    rules: {
      ...jestPlugin.configs.recommended.rules,
      'jest/expect-expect': 'warn',
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
      'jest/valid-expect': 'error'
    }
  },
  {
    ignores: [
      'node_modules/',
      'coverage/',
      '*.min.js',
      'chrome-extension/icons/',
      '.git/'
    ]
  }
];
