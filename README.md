# Sir Hires - Privacy-First Job Search Assistant

> **Job search is painful. Make it delightful.**

A cross-browser web extension with job data extraction, application lifecycle tracking, and LLM super powers.

## Philosophy

- 🔒 **Privacy-first**: All data stays on your device, forever
- 💻 **Local-first**: No backend servers or databases required
- 🤖 **Bring your own LLM**: Use your local LLM for intelligent analysis
- 📤 **Export freedom**: Your data in JSON anytime
- 🚫 **No tracking**: We don't collect, store, or transmit your data

## Screenshots

<img width="1910" height="956" alt="screenshot-2026-03-11_14-06-20" src="https://github.com/user-attachments/assets/a555bddd-28a0-43af-a99e-06e66cc95cd6" />
<img width="1909" height="957" alt="screenshot-2026-03-11_14-05-14" src="https://github.com/user-attachments/assets/478ed97f-697f-4913-87d6-9d4347c404c9" />
<img width="1911" height="955" alt="screenshot-2026-03-11_14-03-48" src="https://github.com/user-attachments/assets/b224daca-0955-4a28-b530-90dc29254f0f" />
<img width="1905" height="955" alt="screenshot-2026-03-11_14-01-12" src="https://github.com/user-attachments/assets/af059e07-0f73-48c0-932c-6635434c42da" />


## Version 0.3.0 - WXT Framework Migration

**Complete architectural modernization with WXT framework:**

- **WXT Framework**: Modern build system for cross-browser extensions
  - Manifest V3 by default
  - File-system routing for entrypoints
  - React + TypeScript + Hot Module Replacement
  - Built-in type safety with auto-generated types

- **Modern Architecture**:
  - React functional components with hooks
  - Type-safe storage with `@wxt-dev/storage`
  - MarkdownDB templates for structured data
  - Event-driven state management (hybrid approach)
  - Component-based CSS architecture

- **Development Experience**:
  - ESLint + Prettier with pre-commit hooks
  - Automated code quality enforcement
  - CI/CD validation with GitHub Actions
  - Fast development with `wxt` dev server

- **Application Features** (from v0.2.0):
  - Application lifecycle tracking with intuitive status names
  - Sidepanel with context-aware views
  - Markdown editor for resumes and cover letters
  - LLM-powered document synthesis via LM Studio
  - Export to Markdown and PDF formats
  - Backup and restore functionality

## Quick Start

### 0. Set up LM Studio

- Download from [lmstudio.ai](https://lmstudio.ai/)
- Install and launch LM Studio
- Click the 🔍 icon
- Install `qwen/qwen3-4b-2507` (or any compatible model)
- Click the "Server" tab
- Start the server (default: http://localhost:1234)

### 1. Install the extension

**Chrome/Edge:**

```bash
npm install
npm run build
```

- Open `chrome://extensions/` (or `edge://extensions/`)
- Enable "Developer mode"
- Click "Load unpacked"
- Select `.output/chrome-mv3` directory

**Firefox:**

```bash
npm install
npm run build:firefox
```

- Open `about:debugging#/runtime/this-firefox`
- Click "Load Temporary Add-on"
- Select any file in `.output/firefox-mv3` directory

### 2. Use it

- Navigate to any job posting (LinkedIn, Indeed, etc.)
- Click the extension icon in toolbar
- Click "Extract Job Data" to capture job details
- View and manage jobs in the sidepanel
- Track application progress with lifecycle statuses

## Development

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
npm run validate         # Run lint + format checks
```

### Pre-commit Hooks

This project uses **Husky + lint-staged** for automated code quality:

- Auto-runs on every commit (checks only staged files)
- Runs ESLint + Prettier automatically
- Blocks commits with linting errors
- Auto-formats code before committing

**Bypass (emergency only):** `git commit --no-verify`

### Project Structure

```
sir-hires/
├── .github/
│   └── workflows/
│       └── lint.yml           # CI/CD validation
├── .husky/                    # Git hooks (pre-commit)
├── docs/                      # Documentation
│   ├── QUICK_REFERENCE.md     # Component/hook lookup
│   ├── COMPONENTS_REFERENCE.md
│   ├── HOOKS_REFERENCE.md
│   ├── MARKDOWN_DB_REFERENCE.md
│   └── refactors/             # Migration history
├── public/
│   └── icons/                 # Extension icons
├── src/
│   ├── components/            # Shared React components
│   │   ├── ui/                # Generic UI components
│   │   └── features/          # Feature-specific components
│   ├── entrypoints/           # Extension entrypoints (WXT routing)
│   │   ├── background.ts      # Background service worker
│   │   ├── content.ts         # Content script
│   │   ├── popup/             # Extension popup
│   │   ├── sidepanel/         # Sidepanel (job viewer)
│   │   ├── job-details/       # Job details page
│   │   └── profile/           # Profile editor page
│   ├── hooks/                 # Custom React hooks
│   ├── utils/                 # Shared utilities
│   └── config.ts              # Global configuration
├── wxt.config.ts              # WXT configuration
├── package.json
├── tsconfig.json
├── eslint.config.js
├── .prettierrc
├── AGENTS.md                  # Development guide
└── README.md                  # This file
```

### Architecture Guidelines

See **[AGENTS.md](./AGENTS.md)** for comprehensive development guidelines, including:

- WXT framework patterns and best practices
- Component and hook reuse (consult docs before creating new ones!)
- Event-driven architecture (hybrid approach)
- MarkdownDB storage patterns
- Code quality standards (ESLint + Prettier)
- Testing and CI/CD workflows

## Data Flow

```
Job Boards (LinkedIn, Indeed, etc.)
    ↓ [User browses and clicks extension]
Browser Extension (data extraction)
    ↓
Browser Local Storage (chrome.storage.local / browser.storage.local)
    ↓
Sidepanel/Job Details Page (browsing, editing, tracking)
    ↓
Local LLM via LM Studio (document synthesis & insights)
```

**No servers. No databases. No data leaves your device.**

## Roadmap

**Completed:**

- ✅ Universal job extraction from any job board
- ✅ Local storage with browser.storage API
- ✅ Job viewer with sidebar + detail panel layout
- ✅ Search and filtering (by source, status)
- ✅ Sorting (by date, deadline, company, title)
- ✅ Export to JSON (backup and restore)
- ✅ LLM-enhanced extraction via LM Studio
- ✅ Application lifecycle tracking with status history
- ✅ Date tracking (posted date and application deadline)
- ✅ Notes for each job posting
- ✅ Modular architecture with React + TypeScript
- ✅ Drafting view with markdown editor
- ✅ LLM-powered document synthesis (cover letters, tailored resumes)
- ✅ Document export (Markdown, PDF)
- ✅ WXT framework migration (v0.3.0)

**Planned:**

- UX improvements:
  - Speed up LLM data extraction
  - Better loading screens during extraction
  - Toggleable job selector
  - Interactive merge when restoring backups
  - LLM-free workflow (manual data entry)

- LLM-powered features:
  - Job-resume fit analysis
  - Skills gap identification
  - Company research and insights
  - Interview prep questions
  - Job comparison tool

## Contributing

We welcome contributions from the community! Whether you're fixing bugs, adding features, or improving documentation, your help is appreciated.

### Quick Start for Contributors

1. **Read the [Contributing Guide](CONTRIBUTING.md)** - Comprehensive guidelines for development setup, code style, and PR process
2. **Review the [Code of Conduct](CODE_OF_CONDUCT.md)** - Community standards and expectations
3. **Check [open issues](https://github.com/chriskevini/sir-hires/issues)** - Look for `good first issue` or `help wanted` labels
4. **Join discussions** - Ask questions or share ideas in [GitHub Discussions](https://github.com/chriskevini/sir-hires/discussions)

### Ways to Contribute

- 🐛 **Report bugs** using our [bug report template](.github/ISSUE_TEMPLATE/bug_report.yml)
- ✨ **Suggest features** using our [feature request template](.github/ISSUE_TEMPLATE/feature_request.yml)
- 📝 **Improve documentation** - Fix typos, clarify instructions, add examples
- 🔧 **Submit code** - Fix bugs, implement features, refactor code
- 🧪 **Test** - Try the extension on different browsers and job boards
- 💬 **Help others** - Answer questions in issues and discussions

### Development Setup

```bash
git clone https://github.com/YOUR-USERNAME/sir-hires.git
cd sir-hires
npm install
npm run dev  # Start development server
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed setup instructions and development guidelines.

## License

MIT License - See [LICENSE](LICENSE) file for details.

This is a personal productivity tool. Use responsibly and in accordance with job board terms of service.

## Privacy & Legal

- **100% Local**: No data is sent to any server, ever
- **Manual Operation**: You control what gets extracted and when
- **Personal Use**: Designed as a personal productivity tool
- **Respects ToS**: Functions as an enhanced copy-paste, not automated scraping
- **Open Source**: Inspect the code yourself
