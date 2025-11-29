# Sir Hires - Privacy-First Job Search Assistant

> **Job search is painful. Make it delightful.**

A cross-browser web extension with job data extraction, application lifecycle tracking, and LLM super powers.

## Philosophy

- 🔒 **Privacy-first**: All data stays on your device, forever
- 💻 **Local-first**: No backend servers or databases required
- 🤖 **Bring your own LLM**: Use your local LLM for intelligent analysis
- 📤 **Export freedom**: Your data in JSON anytime
- 🚫 **No tracking**: We don't collect, store, or transmit your data

## Version 0.4.0 - UI Modernization & Theme System

**Major UI overhaul with shadcn/ui components and theme customization:**

- **Theme System**:
  - 4 knight-themed color palettes (Sir Hires, Sir Lancelot, Sir Gawain, Sir Yvain)
  - Light/Dark/System mode toggle with cross-tab synchronization
  - Status-colored job cards with visual progress feedback

- **UI Framework Migration**:
  - Complete migration to shadcn/ui + Tailwind CSS
  - Lucide React icons replacing custom SVG implementations
  - Native HTML Popover API for dropdowns

- **Enhanced Job Management**:
  - Job Selector Panel with search, status filtering, and sorting
  - Icon-based filter/sort controls (calendar, building, document icons)
  - Status Filter Dots component for togglable status filtering

- **Profile & Document Improvements**:
  - Resume text extraction - LLM-powered conversion to MarkdownDB format
  - Autofix validation buttons for profile warnings
  - Document synthesis with inline streaming and tone selection
  - New Document Modal for creating documents from templates

- **Architecture Improvements**:
  - Unified optimistic store replacing useJobState/useJobStorage/useJobHandlers
  - Immediate-save pattern preventing focus loss and data overwrite
  - Cross-tab sync with intelligent merging and echo cancellation
  - 100% TypeScript type safety (eliminated all 'any' types)

- **LLM Integration**:
  - Model dropdown fetching available models from LLM server
  - Auto-detect provider type (local vs cloud) from URL
  - API key support for cloud providers (OpenAI, Anthropic)

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

### 1. Install the extension

Download the latest release from [GitHub Releases](https://github.com/chriskevini/sir-hires/releases).

**Chrome/Edge:**

- Download `sir-hires-chrome.zip` and extract it
- Open `chrome://extensions/` (or `edge://extensions/`)
- Enable "Developer mode"
- Click "Load unpacked"
- Select the extracted folder

**Firefox:**

- Download `sir-hires-firefox.zip` and extract it
- Open `about:debugging#/runtime/this-firefox`
- Click "Load Temporary Add-on"
- Select any file in the extracted folder

### 2. Pin the extension

- Click the puzzle piece icon in your browser toolbar
- Find "Sir Hires" and click the pin icon
- The knight icon should now appear in your toolbar

### 3. Connect an AI provider

Sir Hires requires an AI provider for intelligent features like job extraction and document synthesis.

**Option A: LM Studio (Recommended - Free & Private)**

- Download from [lmstudio.ai](https://lmstudio.ai/)
- Install a model (we recommend `qwen/qwen3-4b-2507`)
- Start the local server (default: `http://localhost:1234`)

**Option B: Cloud Providers**

You can also use OpenAI, Anthropic, or other OpenAI-compatible APIs.

**Configure your provider:**

- Right-click the Sir Hires icon in your toolbar
- Select "LLM Settings"
- Enter your endpoint URL (and API key for cloud providers)
- Click "Connect" to verify the connection

### 4. Set up your profile

- Right-click the Sir Hires icon and select "Edit Profile"
- Paste your resume text and click "Extract" to parse it
- Review and fix any validation warnings
- Your profile will be used to generate tailored documents

### 5. Start tracking jobs

- Navigate to any job posting (LinkedIn, Indeed, Greenhouse, etc.)
- Right-click anywhere on the page and select "Extract Job to Sir Hires"
- The sidepanel will open with the extracted job details
- Track your progress through the application lifecycle

**Tip:** Click the Sir Hires icon to open the sidepanel, where you can browse saved jobs and click the Extract button to capture the current page.

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
- ✅ UI modernization with shadcn/ui + Tailwind CSS (v0.4.0)
- ✅ Theme system with multiple color palettes (v0.4.0)
- ✅ Profile extraction and validation (v0.4.0)
- ✅ Better loading screens with status messages (v0.4.0)
- ✅ Toggleable job selector with animation (v0.4.0)

**Planned:**

- UX improvements:
  - Speed up LLM data extraction
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
