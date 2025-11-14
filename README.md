# sir-hires - Privacy-First Job Search Assistant

> **Your data. Your tools. Your control.**

A Chrome extension that helps you extract and manage job posting data from any job board. Completely local, private, and under your control.

## Philosophy

- 🔒 **Privacy-first**: All data stays on your device, forever
- 💻 **Local-first**: No backend servers or databases required
- 🤖 **Bring your own LLM**: Use your local LLM for intelligent analysis
- 📤 **Export freedom**: Your data in JSON/CSV anytime
- 🚫 **No tracking**: We don't collect, store, or transmit your data

## What is sir-hires?

sir-hires is a Chrome extension that turns any job board into your personal job database. Extract job postings from LinkedIn, Indeed, Glassdoor, or any other job site - all stored locally in your browser.

**Key Features:**
- Universal extraction from any job board
- Optional LLM-enhanced extraction (using LM Studio)
- Local storage - no servers, no accounts
- Built-in job viewer with sidebar navigation, search, filtering, and sorting
- Application lifecycle tracking with status history
- Date tracking (posted date and application deadline)
- Notes for each job posting
- Export to JSON or CSV anytime

## Quick Start

1. **Install the extension:**
   - Clone this repository
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `chrome-extension` folder

2. **Use it:**
   - Navigate to any job posting
   - Click the extension icon
   - Click "Extract Job Data"
   - Review and save!

## Documentation

See [chrome-extension/README.md](chrome-extension/README.md) for detailed documentation, including:
- Installation instructions
- How to set up LLM-enhanced extraction with LM Studio
- Supported job boards
- Troubleshooting guide
- Development guide

## Architecture

```
Job Boards (LinkedIn, Indeed, etc.)
    ↓ [User browses and clicks extension]
Chrome Extension (data extraction)
    ↓
Browser Local Storage (chrome.storage.local)
    ↓
Job Viewer (browsing, search, filtering)
    ↓
Optional: Local LLM via LM Studio (enhanced extraction & insights)
```

**No servers. No databases. No data leaves your device.**

## Project Structure

```
sir-hires/
├── chrome-extension/       # Main Chrome extension
│   ├── manifest.json      # Extension configuration
│   ├── content.js         # Job data extraction logic
│   ├── popup.html/js      # Extension popup UI
│   ├── viewer.html/js     # Job viewer interface
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
- ✅ Export to JSON/CSV
- ✅ LLM-enhanced extraction (optional, via LM Studio)
- ✅ Application lifecycle tracking (Saved → Applied → Screening → Interviewing → Offer → Accepted/Rejected/Withdrawn)
- ✅ Status history tracking
- ✅ Date tracking (posted date and application deadline)
- ✅ Notes for each job posting

- LLM-powered features:
  - Job-resume fit analysis
  - Resume tailoring suggestions
  - Cover letter generation
  - Company research and insights
  - Interview prep questions and answers
  - Skills gap identification
  - Job comparison tool

## Contributing

This is an early-stage project. If you'd like to contribute:
1. Open an issue to discuss your idea
2. Fork the repository
3. Make your changes
4. Submit a pull request

## License

MIT License - This is a personal productivity tool. Use responsibly and in accordance with job board terms of service.

## Privacy & Legal

- **100% Local**: No data is sent to any server, ever
- **Manual Operation**: You control what gets extracted and when
- **Personal Use**: Designed as a personal productivity tool
- **Respects ToS**: Functions as an enhanced copy-paste, not automated scraping
- **Open Source**: Inspect the code yourself

---

**Built for job seekers who value privacy and control over their data.**
