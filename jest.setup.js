// Jest setup file for mocking Chrome Extension APIs

// Create mock functions
const mockFn = () => {
  const fn = function() {};
  fn.mockReturnValue = () => fn;
  fn.mockResolvedValue = () => fn;
  return fn;
};

// Mock chrome.storage API
global.chrome = {
  storage: {
    local: {
      get: mockFn(),
      set: mockFn(),
      remove: mockFn(),
      clear: mockFn(),
    },
  },
  runtime: {
    sendMessage: mockFn(),
    onMessage: {
      addListener: mockFn(),
      removeListener: mockFn(),
    },
    getURL: (path) => `chrome-extension://test/${path}`,
  },
  tabs: {
    query: mockFn(),
    sendMessage: mockFn(),
    create: mockFn(),
  },
  sidePanel: {
    open: mockFn(),
    setOptions: mockFn(),
  },
};

// Mock window.location for content script tests
delete window.location;
window.location = {
  href: 'https://www.linkedin.com/jobs/view/123456',
  hostname: 'www.linkedin.com',
  pathname: '/jobs/view/123456',
  search: '',
  hash: '',
};
