// Thin wrapper - entry point for modular job details viewer
// Imports and initializes the JobDetailsApp controller

import { JobDetailsApp } from './job-details/app.js';

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Initializing modular job details viewer...');
  
  const app = new JobDetailsApp();
  await app.init();
  
  // Store app instance globally for debugging (optional)
  window.__jobDetailsApp = app;
});
