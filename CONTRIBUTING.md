# Contributing to Sir Hires

Thank you for your interest in contributing to Sir Hires! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Architecture](#project-architecture)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Submitting Changes](#submitting-changes)
- [Privacy and Security](#privacy-and-security)

## Code of Conduct

- **Be respectful**: Treat all contributors with respect and professionalism
- **Be constructive**: Provide helpful feedback and suggestions
- **Be collaborative**: Work together to improve the project
- **Respect privacy**: Never compromise user data or privacy principles

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/sir-hires.git
   cd sir-hires
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Load the extension** in Chrome (see [Development Setup](#development-setup))

## Development Setup

### Prerequisites

- Node.js 16+ and npm
- Google Chrome browser
- LM Studio (optional, for LLM features)

### Loading the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder from this repository

### Reloading After Changes

After making code changes:
1. Go to `chrome://extensions/`
2. Click the refresh icon on the Sir Hires extension
3. Test your changes on a job board page

### Debugging

- **Popup**: Right-click extension icon → "Inspect popup"
- **Content script**: Open DevTools on job board page → Console tab
- **Background script**: `chrome://extensions/` → "Inspect views: background page"
- **Side panel**: Right-click in side panel → "Inspect"

## Project Architecture

### Directory Structure

```
sir-hires/
├── chrome-extension/           # Chrome extension source code
│   ├── manifest.json          # Extension configuration (Manifest V3)
│   ├── content.js             # Job extraction (runs on job boards)
│   ├── popup.html/js          # Extension popup interface
│   ├── sidepanel.html/js      # Side panel (job in focus)
│   ├── job-details.html       # Job viewer interface
│   ├── job-details/           # Modular viewer components
│   │   ├── app.js            # Main application controller
│   │   ├── state-manager.js  # State management
│   │   ├── storage.js        # Storage operations
│   │   ├── job-service.js    # Business logic
│   │   ├── navigation.js     # Progress bar & navigation
│   │   ├── sidebar.js        # Job list sidebar
│   │   ├── main-view.js      # View coordinator
│   │   ├── views/            # State-specific views
│   │   └── components/       # Reusable UI components
│   ├── utils/                # Utility modules
│   │   ├── job-parser.js     # Job template parser
│   │   ├── job-validator.js  # Job data validator
│   │   ├── profile-parser.js # Profile template parser
│   │   ├── profile-validator.js
│   │   └── llm-client.js     # LM Studio integration
│   └── styles/               # CSS stylesheets
├── AGENTS.md                 # AI agent guidelines
├── README.md                 # Project documentation
└── CONTRIBUTING.md           # This file
```

### Key Concepts

- **Privacy-first**: All data stays local (chrome.storage.local)
- **No backend**: Pure client-side Chrome extension
- **Modular architecture**: ES6 modules with separation of concerns
- **State-based views**: Different views for each application status
- **Optional LLM**: Local LLM integration via LM Studio (opt-in)

## Coding Standards

### JavaScript Style

#### Naming Conventions

- **Variables, functions, object properties**: `camelCase`
  ```javascript
  const jobTitle = 'Software Engineer';
  function extractJobData() { ... }
  ```
- **HTML element IDs**: `kebab-case`
  ```html
  <input id="job-title" />
  ```
- **CSS classes**: `kebab-case`
  ```css
  .job-card { ... }
  ```
- **Constants**: `UPPER_SNAKE_CASE` (when truly constant)
  ```javascript
  const MAX_RETRIES = 3;
  ```

#### Modern JavaScript

- Use ES6+ syntax (const/let, arrow functions, template literals)
- Use async/await for asynchronous operations
- Prefer destructuring and spread operators
- Use Array methods (map, filter, reduce) over loops when appropriate

#### Code Organization

- One module per file with clear responsibilities
- Keep functions small and focused (single responsibility)
- Extract reusable logic into utility functions
- Use JSDoc comments for public APIs

### HTML & CSS

- Use semantic HTML5 elements
- Keep inline styles minimal (prefer CSS classes)
- Use BEM-like naming for complex components
- Ensure responsive design principles

### Chrome Extension Best Practices

- Use Manifest V3 APIs
- Handle all chrome.storage operations with proper error handling
- Never send user data to external servers
- Gracefully handle extraction failures
- Test on multiple job boards

### Error Handling

Always handle errors gracefully:

```javascript
try {
  const data = await chrome.storage.local.get('jobs');
  // ... process data
} catch (error) {
  console.error('Failed to load jobs:', error);
  // Show user-friendly error message
}
```

## Testing Guidelines

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linter
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format
```

### Writing Tests

- **Location**: Place tests in `__tests__` directories or `*.test.js` files
- **Coverage**: Aim for high coverage of utility functions and business logic
- **Structure**: Use describe/it blocks with clear descriptions
- **Mocking**: Mock Chrome APIs and external dependencies

Example test:

```javascript
describe('job-parser', () => {
  it('should parse job title correctly', () => {
    const template = '<JOB>\nTITLE: Software Engineer\n</JOB>';
    const parsed = parseJobTemplate(template);
    expect(parsed.topLevelFields.TITLE).toBe('Software Engineer');
  });
});
```

### Test Strategy

- **Unit tests**: Test individual functions and modules
- **Integration tests**: Test component interactions
- **Manual testing**: Test in actual Chrome browser with real job boards

### Supported Job Boards for Testing

Test extraction on at least:
- LinkedIn
- Indeed
- One additional board (Glassdoor, Monster, etc.)

## Submitting Changes

### Before Submitting

1. **Lint your code**: `npm run lint`
2. **Format your code**: `npm run format`
3. **Run tests**: `npm test`
4. **Test manually** in Chrome with multiple job boards
5. **Update documentation** if needed

### Pull Request Process

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following coding standards

3. **Commit with clear messages**:
   ```bash
   git commit -m "Add job extraction for Glassdoor"
   ```

4. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Open a Pull Request** on GitHub with:
   - Clear description of changes
   - Link to any related issues
   - Screenshots (if UI changes)
   - Test results

### Commit Message Format

```
<type>: <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Example:
```
feat: Add support for Glassdoor job extraction

- Add selectors for Glassdoor job boards
- Extract job title, company, location
- Handle edge cases for remote positions

Closes #123
```

## Privacy and Security

### Privacy Requirements

- **Never send data externally**: All data must stay on the user's device
- **No tracking**: Do not collect analytics or telemetry
- **No accounts**: No user accounts or authentication
- **Local storage only**: Use `chrome.storage.local` API exclusively
- **LLM is optional**: LLM features must be opt-in with local LM Studio only

### Security Guidelines

- **No credentials in code**: Use environment variables for any secrets (though none should be needed)
- **Validate user input**: Sanitize all user-provided data
- **Content Security Policy**: Follow Chrome extension CSP guidelines
- **Permissions**: Request minimal permissions necessary
- **Dependencies**: Keep dependencies minimal and audit for vulnerabilities

### Code Review Checklist

Before submitting, verify:
- [ ] No data leaves the user's device
- [ ] No external API calls (except localhost LM Studio)
- [ ] All storage uses `chrome.storage.local`
- [ ] Error messages don't leak sensitive information
- [ ] User has full control over their data

## Common Tasks

### Adding Support for a New Job Board

1. Navigate to a job posting on the target site
2. Inspect HTML structure in DevTools
3. Update extraction functions in `content.js`:
   - `findJobTitle()`
   - `findCompany()`
   - `findLocation()`
   - etc.
4. Test on multiple postings
5. Document in README.md
6. Add tests if possible

### Adding New Data Fields

1. Update storage schema in `AGENTS.md`
2. Add extraction logic in `content.js`
3. Update markdown generator (`generateJobContent()`)
4. Update popup form in `popup.html` and `popup.js`
5. Update viewer display in job-details views
6. Update CSV export logic
7. Add tests for new field

### Improving Extraction Accuracy

1. Test on problematic job board
2. Identify failing fields
3. Add site-specific selectors or patterns
4. Consider LLM extraction for difficult sites
5. Test on multiple postings
6. Document changes

## Questions?

- Open an issue for bugs or feature requests
- Check existing issues for answers
- Review `AGENTS.md` for detailed development guidelines

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
