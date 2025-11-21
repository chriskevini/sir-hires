# Development Quick Reference

## Initial Setup

```bash
# Clone the repository
git clone https://github.com/chriskevini/sir-hires.git
cd sir-hires

# Install dependencies
npm install

# Load extension in Chrome
# 1. Go to chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the chrome-extension/ folder
```

## Daily Development Workflow

```bash
# Before starting work
git pull origin main

# Create a feature branch
git checkout -b feature/your-feature-name

# Make your changes...

# Run linting
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Format code
npm run format

# Run tests
npm test

# Run all checks (recommended before committing)
npm run validate

# Commit your changes
git add .
git commit -m "feat: your feature description"

# Push and create PR
git push origin feature/your-feature-name
```

## NPM Scripts Reference

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests with Jest |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Check code style with ESLint |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check if code is formatted |
| `npm run validate` | Run all checks (lint + format + test) |

## Testing the Extension

After making changes:

1. **Reload the extension:**
   - Go to `chrome://extensions/`
   - Click the refresh icon on Sir Hires

2. **Test on a job board:**
   - Navigate to LinkedIn, Indeed, or another job board
   - Click the extension icon
   - Test your changes

3. **Debug:**
   - **Popup**: Right-click extension icon → "Inspect popup"
   - **Content script**: DevTools on job page → Console
   - **Background**: `chrome://extensions/` → "Inspect views"

## Common Tasks

### Adding a New Feature

1. Write tests first (or alongside code)
2. Implement the feature
3. Run `npm run validate`
4. Test manually in Chrome
5. Update documentation if needed
6. Submit PR

### Fixing a Bug

1. Write a failing test that reproduces the bug
2. Fix the bug
3. Verify the test passes
4. Run `npm run validate`
5. Test manually in Chrome
6. Submit PR

### Improving Code Quality

```bash
# Fix all auto-fixable linting issues
npm run lint:fix

# Format all code
npm run format

# Check test coverage
npm run test:coverage
```

### Adding Tests

1. Create test file: `__tests__/your-module.test.js`
2. Import the module: `import { func } from '../your-module.js';`
3. Write tests using Jest syntax
4. Run `npm test` to verify

See [chrome-extension/__tests__/README.md](chrome-extension/__tests__/README.md) for testing guide.

### Debugging Failed Tests

```bash
# Run specific test file
npm test job-parser.test.js

# Run tests matching a pattern
npm test -- -t "should parse"

# Run with verbose output
npm test -- --verbose
```

## Code Style Guide

### Naming Conventions

- **JavaScript variables/functions**: `camelCase`
- **HTML element IDs**: `kebab-case`
- **CSS classes**: `kebab-case`
- **Constants**: `UPPER_SNAKE_CASE`

### Example

```javascript
// Good
const jobTitle = 'Software Engineer';
function extractJobData() { ... }
const MAX_RETRIES = 3;

// In HTML
<div id="job-title" class="job-card">

// Bad
const job_title = 'Engineer';  // Use camelCase
const JobTitle = 'Engineer';   // Use camelCase for variables
```

## Project Structure

```
sir-hires/
├── chrome-extension/      # Extension source code
│   ├── manifest.json     # Extension config
│   ├── content.js        # Job extraction
│   ├── popup.js/html     # Extension popup
│   ├── job-details/      # Job viewer app
│   │   ├── app.js        # Main controller
│   │   ├── views/        # State-specific views
│   │   └── components/   # Reusable components
│   └── utils/            # Utility modules
│       ├── job-parser.js
│       ├── job-validator.js
│       └── __tests__/    # Unit tests
├── CONTRIBUTING.md       # Contribution guidelines
├── DEVELOPMENT.md        # This file
└── README.md            # Project overview
```

## Troubleshooting

### Tests Fail with "Cannot use import statement"

This happens if Jest isn't configured for ES modules. Ensure:
- `package.json` has `"type": "module"`
- Tests run with `NODE_OPTIONS=--experimental-vm-modules`

### ESLint Reports "module is not defined"

Fixed in `eslint.config.js` by adding Node.js globals. Some files use both CommonJS and ES6 exports for compatibility.

### Extension Doesn't Update After Changes

1. Go to `chrome://extensions/`
2. Click refresh icon on Sir Hires
3. If popup is open, close and reopen it
4. Reload the page you're testing on

### Formatting Changes Everything

This is expected for the first run. The codebase predates these tools. See [.eslintrc.migration.md](.eslintrc.migration.md) for details.

## Resources

- [CONTRIBUTING.md](CONTRIBUTING.md) - Full contribution guidelines
- [Testing Guide](chrome-extension/__tests__/README.md) - Testing best practices
- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/mv3/)
- [Jest Documentation](https://jestjs.io/)
- [ESLint Documentation](https://eslint.org/)

## Getting Help

- Check existing [issues](https://github.com/chriskevini/sir-hires/issues)
- Open a new issue for bugs or questions
- See [AGENTS.md](AGENTS.md) for detailed development guidelines
