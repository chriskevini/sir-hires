// Jest setup file for Chrome extension testing
import { jest } from '@jest/globals';

// Mock Chrome API
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
    },
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
    },
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
    },
    getURL: jest.fn((path) => `chrome-extension://fake-id/${path}`),
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
    create: jest.fn(),
  },
  sidePanel: {
    open: jest.fn(),
    setOptions: jest.fn(),
  },
};

// Mock window.location if needed
if (typeof window !== 'undefined' && !window.location) {
  Object.defineProperty(window, 'location', {
    value: {
      hostname: 'example.com',
      href: 'https://example.com',
      pathname: '/',
    },
    writable: true,
  });
}
