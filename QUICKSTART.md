# Quick Start Guide for Developers

Get up and running with Sir Hires development in 5 minutes!

## Prerequisites

- Node.js 18.x or 20.x
- Chrome browser
- Git

## Setup (First Time)

```bash
# 1. Clone and install
git clone https://github.com/chriskevini/sir-hires.git
cd sir-hires
npm install

# 2. Run checks to ensure everything works
npm run check
```

Expected output:
- ✅ Linter: 0 errors, ~15 warnings (acceptable)
- ✅ Tests: All 17 tests passing

## Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder
5. The Sir Hires icon should appear in your toolbar

## Development Workflow

### Making Changes

```bash
# 1. Create a feature branch
git checkout -b feature/your-feature-name

# 2. Make your changes to the code
# Edit files in chrome-extension/

# 3. Test your changes
npm test

# 4. Lint your code
npm run lint
npm run lint:fix  # Auto-fix issues

# 5. Format your code
npm run format

# 6. Reload extension in Chrome
# Go to chrome://extensions/ and click the refresh icon
```

### Testing the Extension

After making changes:

1. **Reload Extension**
   - Navigate to `chrome://extensions/`
   - Find Sir Hires
   - Click the refresh/reload icon

2. **Test on a Job Board**
   - Go to LinkedIn, Indeed, or Glassdoor
   - Open a job posting
   - Click the Sir Hires extension icon
   - Click "Extract Job Data"
   - Verify your changes work

3. **Debug**
   - **Popup**: Right-click extension icon → "Inspect popup"
   - **Content script**: Open DevTools on job page → Console
   - **Background**: `chrome://extensions/` → "Inspect views: background page"

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Common Commands

```bash
npm test              # Run tests
npm run lint          # Check code with ESLint
npm run lint:fix      # Auto-fix linting issues
npm run format        # Format code with Prettier
npm run format:check  # Check formatting without changes
npm run check         # Run lint + test (quick validation)
```

## Project Structure

Key files you'll work with:

```
chrome-extension/
├── content.js           # Job extraction logic
├── popup.js            # Extension popup
├── job-details/        # Main app (modular)
│   ├── app.js         # Application controller
│   ├── state-manager.js
│   ├── storage.js
│   └── views/         # Different app views
├── utils/             # Utility modules
│   ├── job-parser.js
│   ├── llm-client.js
│   └── ...
└── manifest.json      # Extension config
```

## LM Studio Setup (Optional)

For LLM-enhanced extraction:

1. Download [LM Studio](https://lmstudio.ai/)
2. Install recommended models:
   - `nuextract-2.0-4b-i1@q4_k_m`
   - `qwen/qwen3-4b-2507`
3. Start the server (click "Shell" icon)
4. Default: `http://localhost:1234`

## Submitting Changes

```bash
# 1. Ensure all checks pass
npm run check

# 2. Commit your changes
git add .
git commit -m "feat: your change description"

# 3. Push to your fork
git push origin feature/your-feature-name

# 4. Open a Pull Request on GitHub
```

## Getting Help

- Read [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines
- Check [tests/README.md](./tests/README.md) for testing patterns
- Open an issue if you're stuck
- Check console logs in Chrome DevTools

## Common Issues

### Extension Not Loading
- Make sure you selected the `chrome-extension` folder, not the root
- Check for syntax errors in the console

### Tests Failing
- Make sure you ran `npm install`
- Check Node.js version: `node --version` (should be 18.x or 20.x)

### Linting Errors
- Run `npm run lint:fix` to auto-fix most issues
- Check `.eslintrc.json` for rules

### Chrome Extension Not Updating
- Click the refresh icon in `chrome://extensions/`
- Close and reopen the popup/sidepanel
- Hard refresh the job board page (Ctrl+Shift+R)

## Tips

1. **Use watch mode** when developing: `npm run test:watch`
2. **Check console logs** in all contexts (popup, content, background)
3. **Test on multiple job boards** (LinkedIn, Indeed, Glassdoor)
4. **Format before committing**: `npm run format`
5. **Read existing code** to understand patterns

## Next Steps

- Read [CONTRIBUTING.md](./CONTRIBUTING.md) for comprehensive guidelines
- Check [AGENTS.md](./AGENTS.md) for detailed architecture notes
- Explore the `chrome-extension/job-details/` folder for the modular architecture
- Look at existing tests in `tests/` for examples

Happy coding! 🚀
