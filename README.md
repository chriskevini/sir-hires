# Sir Hires - Privacy-First Job Search Assistant

> **Job search is painful. Make it delightful.**

A Chrome extension / webapp with job data extraction, application lifecycle tracking, and many LLM powers.

## Philosophy

- 🔒 **Privacy-first**: All data stays on your device, forever
- 💻 **Local-first**: No backend servers or databases required
- 🤖 **Bring your own LLM**: Use your local LLM for intelligent analysis
- 📤 **Export freedom**: Your data in JSON anytime
- 🚫 **No tracking**: We don't collect, store, or transmit your data

## Version 0.2.0 - What's New

**Major refactor to modular architecture with improved application lifecycle tracking:**

- **New Status Names**: Updated to reflect real-world job search workflow
  - `Researching` - Exploring job posting and company
  - `Drafting` - Writing cover letter and tailoring resume
  - `Awaiting Review` - Application submitted, waiting for response
  - `Interviewing` - Active interview process
  - `Deciding` - Evaluating offer or making final decision
  - `Accepted` / `Rejected` / `Withdrawn` - Terminal states

- **Automatic Data Migration**: Existing data automatically upgraded from v0.1.0 to v0.2.0
  - Old status names seamlessly converted to new names
  - No manual intervention required

- **Modular Architecture**: Refactored from monolithic (1,421 lines) to organized ES6 modules
  - State management, storage, rendering, and business logic separated
  - State-based view system for easier feature development
  - Consistent naming conventions (camelCase for JS, kebab-case for HTML/CSS)

- **Enhanced Sidepanel**: Automatically shows the most relevant information for every stage of the application process.

- **Drafting View**: Dedicated markdown editor for creating tailored resumes and cover letters
  - Tabbed editor for Resume/CV and Cover Letter documents
  - Auto-save with visual indicators (saves every 5 seconds + on blur)
  - Real-time word count tracking
  - LLM-powered document synthesis via LM Studio
    - XML-based streaming protocol with thinking model support
    - User-controlled thinking panel (collapsible, shows AI reasoning)
    - Configurable max tokens (100-32000 range)
    - Dynamic model selection
  - Export to Markdown (.md) and PDF formats
  - Template-based generation with default document templates
  - Data availability checklist (9 input fields) ensures quality synthesis

## Quick Start

0. Set up LM Studio:
   - Download from [lmstudio.ai](https://lmstudio.ai/)
   - Install and launch LM Studio
   - Click the 🔍 icon
   - Install qwen/qwen3-4b-2507 and nuextract-2.0-4b-i1@q4_k_m
   - Click the "Shell" icon 
   - Start the server

1. **Install the extension:**
   - Clone this repository
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `chrome-extension` folder

2. **Use it:**
   - Navigate to any job posting
   - Click the extension icon
   - Click "Extract Job Data"
   - Review data
   - Click "Manage" to open the web app

## Documentation

See [chrome-extension/README.md](chrome-extension/README.md) for detailed documentation, including:
- Installation instructions
- How to set up LLM-enhanced extraction with LM Studio
- Supported job boards
- Troubleshooting guide
- Development guide

## Data Flow

```
Job Boards (LinkedIn, Indeed, etc.)
    ↓ [User browses and clicks extension]
Chrome Extension (data extraction)
    ↓
Browser Local Storage (chrome.storage.local)
    ↓
Webapp (browsing, search, filtering)
    ↓
Local LLM via LM Studio (enhanced extraction & insights)
```

**No servers. No databases. No data leaves your device.**

## Project Structure

```
sir-hires/
├── chrome-extension/      # Main Chrome extension
│   ├── manifest.json      # Extension configuration
│   ├── content.js         # Job data extraction logic
│   ├── popup.html/js      # Extension popup UI
│   ├── sidepanel.html/js  # Side panel interface (job in focus)
│   ├── job-details.html   # Job viewer interface
│   ├── job-details/       # Modular viewer components (v0.2.0)
│   │   ├── app.js         # Main application controller
│   │   ├── state-manager.js    # State management
│   │   ├── storage.js     # Storage operations
│   │   ├── job-service.js # Business logic
│   │   ├── navigation.js  # Progress bar & navigation
│   │   ├── sidebar.js     # Job list sidebar
│   │   ├── main-view.js   # View coordinator
│   │   └── views/         # State-specific views
│   └── background.js      # Background service worker
├── README.md              # This file
└── AGENTS.md              # Development guidelines
```

## Roadmap

- ✅ Universal job extraction from any job board
- ✅ Local storage with chrome.storage.local
- ✅ Job viewer with sidebar + detail panel layout
- ✅ Search and filtering (by source, status)
- ✅ Sorting (by date, deadline, company, title)
- ✅ Export to JSON
- ✅ Backup and restore (full data export/import)
- ✅ LLM-enhanced extraction via LM Studio
- ✅ Application lifecycle tracking
- ✅ Status history tracking
- ✅ Date tracking (posted date and application deadline)
- ✅ Notes for each job posting
- ✅ Fully automatic backup migration 
- ✅ Modular architecture
- ✅ Drafting view with markdown editor
- ✅ LLM-powered document synthesis (cover letters, tailored resumes)
- ✅ Document export (Markdown, PDF)

- UX improvements:
  - Speed up LLM data extraction
  - Show better loading screen during data extraction
  - togglable job selector
  - Interactive merging of data when restoring backup
  - LLM-Free Workflow (manual data extraction and document drafting)

- LLM-powered features:
  - Job-resume fit analysis (Gap analysis and content prioritization)
  - Skills gap identification
  - Company research and insights
  - Interview prep questions and answers
  - Job comparison tool

## Development

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run tests:**
   ```bash
   npm test                 # Run all tests
   npm run test:watch       # Run tests in watch mode
   npm run test:coverage    # Generate coverage report
   ```

3. **Lint and format code:**
   ```bash
   npm run lint            # Check for linting errors
   npm run lint:fix        # Auto-fix linting errors
   npm run format          # Format code with Prettier
   npm run format:check    # Check formatting without changes
   ```

4. **Load extension in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `chrome-extension` folder

### Testing

The project uses **Jest** for unit testing and **ESLint/Prettier** for code quality.

- Tests are located in `chrome-extension/__tests__/`
- Run `npm test` to execute all tests
- Aim for >80% coverage on utility modules
- See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed testing guidelines

### Code Quality

We enforce consistent code style using:
- **ESLint**: JavaScript linting
- **Prettier**: Code formatting
- **Jest**: Unit testing

Run `npm run lint:fix && npm run format` before committing to ensure code quality.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on:

- Setting up your development environment
- Project architecture and design patterns
- Coding standards and best practices
- Writing tests
- Submitting pull requests

**Quick start:**
1. Read [CONTRIBUTING.md](CONTRIBUTING.md)
2. Open an issue to discuss your idea
3. Fork the repository
4. Create a feature branch
5. Make your changes with tests
6. Submit a pull request

## License

MIT License - This is a personal productivity tool. Use responsibly and in accordance with job board terms of service.

## Privacy & Legal

- **100% Local**: No data is sent to any server, ever
- **Manual Operation**: You control what gets extracted and when
- **Personal Use**: Designed as a personal productivity tool
- **Respects ToS**: Functions as an enhanced copy-paste, not automated scraping
- **Open Source**: Inspect the code yourself
