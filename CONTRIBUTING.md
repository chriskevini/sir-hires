# Contributing to Sir Hires

Thank you for your interest in contributing to Sir Hires! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Project Architecture](#project-architecture)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

Please be respectful and constructive in all interactions. We strive to maintain a welcoming and inclusive environment for all contributors.

## Getting Started

### Prerequisites

- Node.js (v20 or higher)
- npm (v10 or higher)
- A Chromium-based browser (Chrome, Edge, Brave, etc.)
- Basic knowledge of JavaScript, HTML, and CSS
- Familiarity with Chrome Extension APIs (helpful but not required)

### Installation

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/sir-hires.git
   cd sir-hires
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Load the extension in Chrome:**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `chrome-extension` folder from this repository

4. **Test the extension:**
   - Navigate to a job posting (e.g., LinkedIn, Indeed)
   - Click the Sir Hires extension icon
   - Try extracting job data

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Your Changes

- Write clean, maintainable code
- Follow the coding standards (see below)
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run unit tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Check test coverage
npm run test:coverage

# Lint your code
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format your code
npm run format

# Check formatting without changes
npm run format:check
```

### 4. Test in the Browser

After making changes:
1. Go to `chrome://extensions/`
2. Click the refresh icon on the Sir Hires extension card
3. Test your changes on actual job board pages
4. Check the browser console for errors (F12 → Console)

**Debugging Tips:**
- **Popup**: Right-click extension icon → "Inspect popup"
- **Content Script**: Open DevTools on job board page → Console tab
- **Background Script**: Go to `chrome://extensions/` → Click "Inspect views: background page"
- **Side Panel**: Right-click in side panel → "Inspect"

### 5. Commit Your Changes

```bash
git add .
git commit -m "feat: add new feature" # Use conventional commits
```

**Conventional Commit Format:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### 6. Push and Create a Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub.

## Project Architecture

### Directory Structure

```
sir-hires/
├── chrome-extension/           # Main Chrome extension code
│   ├── manifest.json          # Extension configuration
│   ├── content.js             # Content script (job extraction)
│   ├── popup.html/js          # Extension popup UI
│   ├── sidepanel.html/js      # Side panel interface
│   ├── profile.html/js        # Master resume editor
│   ├── background.js          # Background service worker
│   ├── job-details.html       # Job viewer HTML shell
│   ├── job-details/           # Modular job viewer (v0.2.0)
│   │   ├── app.js            # Main application controller
│   │   ├── state-manager.js  # Centralized state management
│   │   ├── storage.js        # Chrome storage operations
│   │   ├── job-service.js    # Business logic layer
│   │   ├── navigation.js     # Progress bar & navigation
│   │   ├── sidebar.js        # Job list sidebar
│   │   ├── main-view.js      # View coordinator
│   │   ├── base-view.js      # Base class for views
│   │   ├── components/       # Reusable UI components
│   │   └── views/            # State-specific views
│   │       ├── researching-view.js   # Job research phase
│   │       ├── drafting-view.js      # Document drafting phase
│   │       └── ...                   # Other status views
│   ├── utils/                # Shared utility modules
│   │   ├── job-parser.js     # MarkdownDB job template parser
│   │   ├── job-validator.js  # Job template validator
│   │   ├── llm-client.js     # LM Studio API client
│   │   └── ...
│   ├── styles/               # CSS stylesheets
│   └── __tests__/            # Unit tests
├── docs/                     # Additional documentation
├── .gitignore               # Git ignore rules
├── package.json             # Node.js dependencies and scripts
├── jest.config.js           # Jest test configuration
├── eslint.config.js         # ESLint linting configuration
├── .prettierrc              # Prettier formatting configuration
├── README.md                # Main project documentation
├── AGENTS.md                # AI agent development guidelines
└── CONTRIBUTING.md          # This file
```

### Architecture Patterns

**Modular Design (v0.2.0):**
- The `job-details/` folder demonstrates our modular architecture
- **Separation of Concerns**: State, storage, business logic, and UI are separated
- **State-Based Views**: Each application status has its own view module
- **Reusable Components**: Shared UI components in `components/`

**Future Modularization:**
- Other files (`content.js`, `popup.js`, `sidepanel.js`, `profile.js`) could benefit from similar modularization
- When refactoring, follow the patterns established in `job-details/`

**Data Flow:**
```
User Action → View → State Manager → Job Service → Storage → Chrome Storage API
                ↑                                      ↓
                └──────────── State Update ────────────┘
```

## Coding Standards

### JavaScript Style Guide

We use **ESLint** and **Prettier** to enforce consistent code style.

**Key conventions:**
- **Variables/Functions**: `camelCase` (e.g., `getUserData`, `jobTitle`)
- **HTML IDs**: `kebab-case` (e.g., `job-title`, `submit-button`)
- **CSS Classes**: `kebab-case` (e.g., `.job-card`, `.status-badge`)
- **Constants**: `SCREAMING_SNAKE_CASE` (e.g., `MAX_RETRIES`, `API_URL`)
- **Semicolons**: Always use semicolons
- **Quotes**: Single quotes for strings (except in JSON)
- **Indentation**: 2 spaces (no tabs)

**Naming Best Practices:**
```javascript
// Good ✅
const userProfile = getUserProfile();
const jobTitle = document.getElementById('job-title');

// Bad ❌
const user_profile = getUserProfile();  // Don't use snake_case in JS
const JobTitle = document.getElementById('JobTitle');  // Don't use PascalCase for IDs
```

### Code Quality

**Always:**
- Write clear, self-documenting code
- Add comments for complex logic
- Use meaningful variable and function names
- Handle errors gracefully
- Validate user input
- Test edge cases

**Never:**
- Commit secrets, API keys, or sensitive data
- Use `eval()` or other dangerous functions
- Modify working code unnecessarily
- Remove or comment out tests
- Introduce security vulnerabilities

### Privacy & Security

Sir Hires is **privacy-first**:
- All data stays on the user's device
- Never send data to external servers (except user's local LLM)
- Use `chrome.storage.local` for all data storage
- Respect user privacy at all times

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Writing Tests

We use **Jest** for unit testing. Tests are located in `chrome-extension/__tests__/`.

**Test file naming:**
- Unit tests: `filename.test.js`
- Place tests in `__tests__/` directory

**Example test:**
```javascript
import { parseJobTemplate } from '../utils/job-parser.js';

describe('parseJobTemplate', () => {
  test('should parse a valid job template', () => {
    const template = `<JOB>
TITLE: Engineer
COMPANY: TechCo`;
    
    const result = parseJobTemplate(template);
    
    expect(result.type).toBe('JOB');
    expect(result.topLevelFields.TITLE).toBe('Engineer');
  });
});
```

**What to test:**
- Utility functions (parsers, validators, helpers)
- Business logic (job service, state management)
- Edge cases and error handling

**What not to test:**
- Chrome API calls (we mock these)
- DOM manipulation (better tested manually in browser)
- Complex UI interactions (better tested manually)

### Test Coverage Goals

- Aim for >80% coverage on utility modules
- Focus on testing business logic and data transformations
- Don't sacrifice code quality for coverage metrics

## Pull Request Process

### Before Submitting

1. **Ensure all tests pass:**
   ```bash
   npm test
   ```

2. **Lint your code:**
   ```bash
   npm run lint:fix
   ```

3. **Format your code:**
   ```bash
   npm run format
   ```

4. **Test manually in the browser:**
   - Test on multiple job boards (LinkedIn, Indeed, etc.)
   - Verify your changes don't break existing functionality
   - Check browser console for errors

5. **Update documentation:**
   - Update README.md if you changed user-facing features
   - Update AGENTS.md if you changed development workflows
   - Add JSDoc comments to new functions

### Pull Request Template

When creating a PR, please include:

**Title:**
```
feat: add support for new job board
```

**Description:**
```markdown
## What does this PR do?

Brief description of the changes.

## Why is this change needed?

Explain the problem this solves or the feature it adds.

## How was this tested?

- [ ] Unit tests added/updated
- [ ] Tested manually on LinkedIn
- [ ] Tested manually on Indeed
- [ ] Tested in Chrome
- [ ] No console errors

## Screenshots (if applicable)

[Add screenshots of UI changes]

## Checklist

- [ ] Tests pass (`npm test`)
- [ ] Linter passes (`npm run lint`)
- [ ] Code is formatted (`npm run format`)
- [ ] Documentation updated
- [ ] No breaking changes (or documented if necessary)
```

### Review Process

1. Maintainers will review your PR within a few days
2. Address any feedback or requested changes
3. Once approved, a maintainer will merge your PR

## Reporting Issues

### Bug Reports

When reporting a bug, please include:

1. **Description**: Clear description of the bug
2. **Steps to Reproduce**:
   - Go to '...'
   - Click on '...'
   - See error
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Environment**:
   - Browser: Chrome 120.0.6099.109
   - Extension Version: 0.2.0
   - Operating System: Windows 11
6. **Screenshots**: If applicable
7. **Console Logs**: Any errors from browser console (F12)

### Feature Requests

When suggesting a feature:

1. **Description**: Clear description of the feature
2. **Use Case**: Why is this feature needed?
3. **Proposed Solution**: How should it work?
4. **Alternatives Considered**: Other approaches you've thought about
5. **Privacy Impact**: Does this affect user privacy? How?

## Additional Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [ESLint Documentation](https://eslint.org/docs/latest/)
- [Prettier Documentation](https://prettier.io/docs/en/)

## Questions?

If you have questions, feel free to:
- Open an issue on GitHub
- Check existing issues and discussions
- Review the documentation in `/docs`

## Thank You!

Thank you for contributing to Sir Hires! Your efforts help make job searching better for everyone. 🎉
