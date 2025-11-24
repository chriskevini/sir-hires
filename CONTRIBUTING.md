# Contributing to Sir Hires

First off, thank you for considering contributing to Sir Hires! It's people like you that make Sir Hires such a great tool for job seekers.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [What Should I Know Before I Get Started?](#what-should-i-know-before-i-get-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Code Style Guidelines](#code-style-guidelines)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Getting Help](#getting-help)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior by opening an issue.

## What Should I Know Before I Get Started?

### Project Architecture

Sir Hires is a privacy-first web extension built with:

- **WXT Framework**: Modern build system for cross-browser extensions (Manifest V3)
- **React + TypeScript**: For UI components
- **Local Storage**: All data stays on your device
- **LM Studio Integration**: For optional LLM-powered features

### Key Principles

- **Privacy-first**: Never send user data to external servers
- **Local-first**: No backend dependencies
- **Minimal changes**: Make surgical, precise modifications
- **Code quality**: Follow ESLint and Prettier standards (enforced automatically)

### Essential Reading

Before contributing, please read:

- [AGENTS.md](AGENTS.md) - Comprehensive development guidelines
- [README.md](README.md) - Project overview and setup
- [docs/QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md) - Component and hook lookup
- [docs/COMPONENTS_REFERENCE.md](docs/COMPONENTS_REFERENCE.md) - Detailed component documentation
- [docs/HOOKS_REFERENCE.md](docs/HOOKS_REFERENCE.md) - Custom hooks documentation

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (screenshots, code snippets)
- **Describe the behavior you observed** and what you expected
- **Include your environment details** (browser, OS, extension version)

Use the bug report template when creating issues.

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the proposed feature
- **Explain why this enhancement would be useful** to most users
- **List any similar features** in other tools, if applicable
- **Include mockups or examples**, if possible

Use the feature request template when creating issues.

### Your First Code Contribution

Unsure where to begin? You can start by looking through issues labeled:

- `good first issue` - Issues that should only require a few lines of code
- `help wanted` - Issues that may require more involvement

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following our code style guidelines
3. **Test your changes** thoroughly
4. **Update documentation** if needed
5. **Ensure the code passes** linting and formatting checks
6. **Submit a pull request** with a clear description

## Development Setup

### Prerequisites

- **Node.js 20+** and npm
- **Git**
- **A compatible browser** (Chrome, Edge, or Firefox)
- **LM Studio** (optional, for LLM features) - Download from [lmstudio.ai](https://lmstudio.ai/)

### Installation

1. Fork and clone the repository:

```bash
git clone https://github.com/YOUR-USERNAME/sir-hires.git
cd sir-hires
```

2. Install dependencies:

```bash
npm install
```

This will:

- Install all dependencies
- Set up Husky pre-commit hooks (automatic linting/formatting)
- Generate WXT types

3. Start the development server:

```bash
# For Chrome/Edge
npm run dev

# For Firefox
npm run dev:firefox
```

4. Load the extension in your browser:

**Chrome/Edge:**

- Open `chrome://extensions/` (or `edge://extensions/`)
- Enable "Developer mode"
- Click "Load unpacked"
- Select `.output/chrome-mv3` directory

**Firefox:**

- Open `about:debugging#/runtime/this-firefox`
- Click "Load Temporary Add-on"
- Select any file in `.output/firefox-mv3` directory

### Available Scripts

```bash
npm run dev              # Start dev server (Chrome, with HMR)
npm run dev:firefox      # Start dev server (Firefox)
npm run build            # Production build (Chrome)
npm run build:firefox    # Production build (Firefox)
npm run zip              # Create distribution zip (Chrome)
npm run zip:firefox      # Create distribution zip (Firefox)

npm run lint             # Check for linting errors
npm run lint:fix         # Auto-fix linting errors
npm run format           # Format all code with Prettier
npm run format:check     # Check if code is formatted
npm run validate         # Run lint + format checks
```

## Code Style Guidelines

### Automatic Enforcement

This project uses **Husky + lint-staged** for automated code quality:

- Runs automatically on every commit (checks only staged files)
- Runs ESLint + Prettier automatically
- Blocks commits with linting errors
- Auto-formats code before committing

**You don't need to manually run linting commands** - the pre-commit hook handles it!

### Manual Checks

If you want to check before committing:

```bash
npm run validate  # Run both lint and format checks
```

### TypeScript Guidelines

- Use TypeScript for all files (`.ts`, `.tsx`)
- Prefer explicit types over `any`
- Use interfaces for object shapes
- Use type aliases for unions and complex types

### React Guidelines

- Use **functional components** with hooks
- Use **React.memo()** for expensive components
- Keep components small and focused
- Extract reusable logic into custom hooks
- **Check existing components/hooks** before creating new ones (see docs/COMPONENTS_REFERENCE.md and docs/HOOKS_REFERENCE.md)

### File Structure

- **Shared components**: `src/components/`
- **Custom hooks**: `src/hooks/`
- **Utilities**: `src/utils/`
- **Entrypoints**: `src/entrypoints/` (for extension pages/scripts)
- **Never** put shared code in `entrypoints/` - WXT treats every file there as a separate entrypoint

### Component CSS Architecture

- **Page-level CSS**: Layout, typography, global styles
- **Component-level CSS**: Must be imported by the component itself
- Shared components must import their own CSS to work across all entrypoints

Example:

```typescript
// src/components/MyButton.tsx
import './MyButton.css'; // ✅ Component imports its own styles

export function MyButton({ children }: Props) {
  return <button className="my-button">{children}</button>;
}
```

### Browser API Usage

- **Always** use the `browser` global (polyfill)
- **Never** use `chrome.*` directly (for cross-browser compatibility)

```typescript
// ✅ Good
browser.runtime.sendMessage({ action: 'getData' });

// ❌ Bad
chrome.runtime.sendMessage({ action: 'getData' });
```

### Storage Patterns

- Use `@wxt-dev/storage` for data persistence
- Store raw MarkdownDB templates in `content` field
- Parse on-read with `useMemo` or context providers
- See [docs/MARKDOWN_DB_REFERENCE.md](docs/MARKDOWN_DB_REFERENCE.md) for details

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(sidepanel): add job filtering by status

Add dropdown to filter jobs by application status.
Includes search functionality and clear filter button.

Closes #123
```

```
fix(extraction): handle missing job description

Added null check for job description field.
Prevents crashes when extracting jobs without descriptions.
```

```
docs(contributing): add code style guidelines

Clarify TypeScript and React best practices.
Add examples for component structure.
```

## Pull Request Process

1. **Ensure your code follows** our style guidelines (pre-commit hooks help with this)
2. **Update documentation** for any new features or changes
3. **Test your changes** in both Chrome and Firefox (if UI changes)
4. **Write clear commit messages** following our commit message guidelines
5. **Fill out the pull request template** completely
6. **Link related issues** in your PR description (e.g., "Closes #123")
7. **Wait for review** - maintainers will review your PR and may request changes
8. **Address feedback** promptly and push updates
9. **Celebrate** when your PR is merged! 🎉

### PR Checklist

Before submitting, ensure:

- [ ] Code follows the project's style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Changes tested in at least one browser
- [ ] Commit messages follow conventions

## Testing

### Manual Testing

1. Load the extension in your browser (development mode)
2. Test your changes on real job board pages (LinkedIn, Indeed, etc.)
3. Check the browser console for errors
4. Test in both Chrome and Firefox (if making significant changes)

### Test Scenarios

When testing, consider:

- **Job extraction** from different job boards
- **State persistence** across browser sessions
- **UI responsiveness** on different screen sizes
- **Error handling** for network issues or invalid data
- **Privacy** - ensure no data leaks to external servers

### LLM Testing

If your changes involve LLM features:

1. Install and configure [LM Studio](https://lmstudio.ai/)
2. Start the local server with a compatible model
3. Test the feature with various inputs
4. Verify error handling when LM Studio is offline

## Getting Help

### Documentation

- Check [AGENTS.md](AGENTS.md) for development guidelines
- Review [docs/](docs/) for component and hook references
- Read existing issues for similar problems

### Ask Questions

- **GitHub Discussions**: For general questions and discussions
- **GitHub Issues**: For bug reports and feature requests
- **Code Comments**: Add comments to PRs for code-specific questions

### Debugging Tips

1. Check browser console for errors
2. Use `console.log()` liberally (remove before committing)
3. Use React DevTools for component debugging
4. Check WXT documentation: https://wxt.dev/
5. Review similar code in the existing codebase

## Recognition

Contributors will be recognized in:

- The project's README (coming soon)
- Release notes for significant contributions
- GitHub's contributors graph

Thank you for contributing to Sir Hires! Your efforts help make job searching a better experience for everyone. 🚀
