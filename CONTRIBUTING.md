# Contributing to Sir Hires

Thank you for your interest in contributing to Sir Hires! This guide will help you get started with development and contribution.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Architecture Overview](#architecture-overview)

## Code of Conduct

This project aims to be welcoming and inclusive. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- Chrome browser
- Basic knowledge of JavaScript, HTML, CSS
- Understanding of Chrome Extensions (helpful but not required)

### First Time Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/sir-hires.git
   cd sir-hires
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Load Extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `chrome-extension` folder

4. **Set up LM Studio (Optional but recommended)**
   - Download from [lmstudio.ai](https://lmstudio.ai/)
   - Install recommended models: `nuextract-2.0-4b` and `qwen/qwen3-4b-2507`
   - Start the local server (default: `http://localhost:1234`)

## Development Setup

### Installing Development Tools

The project uses modern JavaScript tooling for code quality and testing:

```bash
# Install all dependencies
npm install

# Run linter
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Format code
npm run format

# Check formatting without changes
npm run format:check

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run all checks (lint + format + test)
npm run check
```

## Project Structure

```
sir-hires/
├── chrome-extension/          # Main Chrome extension code
│   ├── manifest.json         # Extension configuration
│   ├── content.js            # Content script (job extraction)
│   ├── popup.html/js         # Extension popup UI
│   ├── sidepanel.html/js     # Side panel interface
│   ├── job-details.html      # Job viewer entry point
│   ├── job-details/          # Modular viewer (v0.2.0+)
│   │   ├── app.js           # Main application controller
│   │   ├── state-manager.js  # Centralized state management
│   │   ├── storage.js        # Storage operations
│   │   ├── job-service.js    # Business logic
│   │   ├── navigation.js     # Progress bar & navigation
│   │   ├── sidebar.js        # Job list sidebar
│   │   ├── main-view.js      # View coordinator
│   │   ├── components/       # Reusable UI components
│   │   └── views/            # State-specific views
│   ├── utils/                # Utility modules
│   │   ├── job-parser.js     # MarkdownDB job template parser
│   │   ├── job-validator.js  # Job data validation
│   │   ├── profile-parser.js # Profile template parser
│   │   ├── profile-validator.js
│   │   └── llm-client.js     # LM Studio integration
│   └── styles/               # CSS stylesheets
├── docs/                      # Documentation
├── tests/                     # Test files (unit and integration)
├── README.md                  # User-facing documentation
├── AGENTS.md                  # Agent development guidelines
└── CONTRIBUTING.md            # This file
```

## Development Workflow

### Testing Changes

After making code changes:

1. **Reload Extension**
   - Go to `chrome://extensions/`
   - Click the refresh icon on the Sir Hires extension
   - Test your changes on a job board page

2. **Debug**
   - **Popup**: Right-click extension icon → "Inspect popup"
   - **Content script**: Open DevTools on job board page → Console tab
   - **Background**: `chrome://extensions/` → "Inspect views: background page"
   - **Side panel**: Right-click in side panel → "Inspect"

3. **Test on Multiple Job Boards**
   - LinkedIn
   - Indeed
   - Glassdoor
   - At least one other board

### Branch Strategy

- `main` - Production-ready code
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `refactor/*` - Code refactoring
- `docs/*` - Documentation updates

### Git Commit Policy

**CRITICAL**: Never commit changes without user testing first.

When making code changes:
1. Make the changes
2. Inform the user that changes are complete
3. Wait for the user to test
4. Only commit after user explicitly asks you to commit

## Coding Standards

### JavaScript Style Guide

We use ESLint and Prettier to enforce consistent code style:

- **Modern ES6+ syntax**
- **No semicolons** (enforced by Prettier)
- **Single quotes** for strings
- **2 spaces** for indentation
- **Descriptive variable names**

### Naming Conventions

- **JavaScript**: Use `camelCase` for variables, functions, and object properties
  ```javascript
  const jobTitle = "Software Engineer"
  function extractJobData() { ... }
  const userSettings = { enableLlm: true }
  ```

- **HTML/CSS**: Use `kebab-case` for IDs and classes
  ```html
  <div id="job-details" class="main-container">
  ```

- **Constants**: Use `UPPER_SNAKE_CASE` for true constants
  ```javascript
  const MAX_RETRY_ATTEMPTS = 3
  const API_ENDPOINT = "http://localhost:1234"
  ```

### File Organization

- **Imports**: Group by type (third-party, then local)
- **Functions**: Declare functions before use when possible
- **Comments**: Document complex logic and unusual patterns
- **Modules**: Keep files focused on a single responsibility

### Privacy-First Principles

**ALWAYS** maintain privacy-first principles:
- Never send data to external servers
- All data stored in `chrome.storage.local`
- No tracking or analytics
- User controls all data operations
- Export functionality must work offline

## Testing Guidelines

### Writing Tests

We use Jest for unit testing:

```javascript
// Example test structure
describe('extractJobData', () => {
  it('should extract job title from LinkedIn', () => {
    // Arrange
    const mockHtml = '<h1>Software Engineer</h1>'
    
    // Act
    const result = extractJobTitle(mockHtml)
    
    // Assert
    expect(result).toBe('Software Engineer')
  })
})
```

### Test Coverage Goals

- **Critical functions**: 80%+ coverage
- **UI components**: Test key interactions
- **Edge cases**: Handle failures gracefully
- **Multiple job boards**: Test extraction on various sites

### Testing Checklist

Before submitting a PR:
- [ ] All tests pass (`npm test`)
- [ ] New code has tests
- [ ] Tested manually on at least 3 job boards
- [ ] Verified data saves to local storage
- [ ] Tested export functionality (JSON)
- [ ] Tested with LLM enabled and disabled
- [ ] No console errors in any context

## Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

**Examples:**
```
feat(extraction): add support for ZipRecruiter job boards

fix(popup): resolve issue with LLM connection test

docs(readme): update installation instructions

refactor(content): split extraction logic into modules
```

## Pull Request Process

### Before Submitting

1. **Run All Checks**
   ```bash
   npm run check
   ```

2. **Test Thoroughly**
   - Load extension in Chrome
   - Test on multiple job boards
   - Verify all features work

3. **Update Documentation**
   - Update README.md if user-facing changes
   - Update AGENTS.md if development changes
   - Add inline code comments for complex logic

### PR Template

When creating a PR, include:

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested on LinkedIn
- [ ] Tested on Indeed
- [ ] Tested on Glassdoor
- [ ] Tested with LLM enabled
- [ ] Tested with LLM disabled
- [ ] All tests pass

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests added/updated
- [ ] All tests pass
```

### Review Process

1. **Automated Checks**: Linting, formatting, tests must pass
2. **Code Review**: At least one maintainer review required
3. **Testing**: Reviewer will test changes manually
4. **Merge**: Squash and merge after approval

## Architecture Overview

### Modular Design (v0.2.0+)

The job details viewer uses a modular architecture:

- **State Management**: Centralized state in `StateManager`
- **Storage Layer**: Abstracted in `StorageService`
- **Business Logic**: Isolated in `JobService`
- **View Layer**: State-based views with clear separation
- **Components**: Reusable UI components

### Data Flow

```
User Action
    ↓
Event Handler (app.js)
    ↓
Service Layer (job-service.js)
    ↓
Storage Layer (storage.js)
    ↓
State Update (state-manager.js)
    ↓
View Render (views/)
```

### Adding New Features

1. **Identify the appropriate layer**
   - Storage? → `storage.js`
   - Business logic? → `job-service.js`
   - UI component? → `components/`
   - View logic? → `views/`

2. **Follow existing patterns**
   - Use ES6 modules
   - Export classes/functions
   - Import dependencies explicitly

3. **Update relevant files**
   - Add to appropriate module
   - Update `app.js` if new event handlers needed
   - Update schema in `AGENTS.md` if storage changes

### Storage Schema

See [AGENTS.md](./AGENTS.md) for detailed storage schema documentation.

Key points:
- Job data uses MarkdownDB format in `content` field
- All dates in ISO 8601 format
- Status history tracked automatically
- Documents stored per-job in `documents` object

## Common Tasks

### Adding Support for a New Job Board

1. Open a job posting on that site
2. Inspect the HTML structure
3. Update extraction functions in `content.js`:
   - `findJobTitle()`
   - `findCompany()`
   - `findLocation()`
   - etc.
4. Test extraction on multiple postings
5. Document in README.md

### Improving Extraction Accuracy

1. Test on problematic job board
2. Identify which fields are failing
3. Add site-specific selectors in `content.js`
4. Consider using LLM extraction for difficult sites
5. Test on multiple postings

### Adding New View State

1. Create view class in `job-details/views/`
2. Extend `BaseView` class
3. Implement `render()` method
4. Add to view registry in `main-view.js`
5. Update navigation if needed

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for architectural questions
- Check existing issues and docs first

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
