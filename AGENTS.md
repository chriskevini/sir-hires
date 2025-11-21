# Agent Guidelines for sir-hires

## Project Overview
Privacy-first job search assistant built as a Chrome extension. All data stays local on the user's device.

**Architecture:**
- Chrome extension (Manifest V3)
- Local storage via chrome.storage.local API
- Optional: LM Studio integration for LLM-enhanced extraction
- No backend, no servers, no databases

## Project Structure
```
sir-hires/
├── chrome-extension/       # Main Chrome extension
│   ├── manifest.json      # Extension configuration
│   ├── content.js         # Job extraction logic (runs on job board pages)
│   ├── popup.html/js      # Extension popup interface
│   ├── viewer.html/js     # Job viewer page
│   ├── background.js      # Background service worker
│   └── styles/            # CSS styles
└── README.md              # Project documentation
```

## Development Workflow

### CRITICAL: Git Commit Policy
**NEVER commit changes without user testing first.**

When making code changes:
1. Make the changes
2. Inform the user that changes are complete (no instructions needed)
3. Wait for the user to test
4. Only commit after user explicitly asks you to commit

The user will test the changes and ask you to commit when ready.

### CRITICAL: Merge Policy
**NEVER merge branches directly. ALWAYS create a Pull Request instead.**

When a feature branch is ready:
1. Switch back to the feature branch (if on main)
2. Create a Pull Request using `gh pr create`
3. Review the PR details with the user
4. The user will merge the PR via GitHub UI when ready

Do NOT use `git merge` to merge feature branches into main.

### Testing the Extension
1. Load the extension in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `chrome-extension` folder

2. Test changes:
   - Make code changes
   - Go to `chrome://extensions/`
   - Click the refresh icon on the extension
   - Test on a job board page

3. Debug:
   - Popup: Right-click extension icon → "Inspect popup"
   - Content script: Open DevTools on job board page → Console
   - Background: `chrome://extensions/` → "Inspect views: background page"

### Code Style Guidelines
- **JavaScript**: Use modern ES6+ syntax
- **Naming conventions**: 
  - Use **camelCase** for all JavaScript variables, functions, and object properties
  - Use **kebab-case** for HTML element IDs and CSS classes
  - Never mix naming conventions within JavaScript code
- **Storage**: All data goes to `chrome.storage.local`
- **Privacy**: Never send data to external servers
- **Error handling**: Always handle extraction failures gracefully
- **Comments**: Document extraction logic and unusual patterns

### Adding New Features
1. Consider: Does this feature maintain privacy-first principles?
2. Test on multiple job boards (LinkedIn, Indeed, Glassdoor)
3. Ensure graceful degradation (features should fail safely)
4. Update README.md with new functionality

### Extraction Logic (content.js)
- Uses DOM selectors and pattern matching
- Falls back to heuristics when specific selectors fail
- Optional: Enhanced with local LLM via LM Studio
- Always editable by user before saving

### Storage Schema (Version 0.2.0)

**Schema Versions:**
- **v0.1.0**: Initial schema with old status names (Saved, Applied, Screening, Offer)
- **v0.2.0**: New status names (Researching, Awaiting Review, Deciding) + modular architecture

Jobs are stored as objects with these fields:
```javascript
{
  id: string (unique job ID, format: job_<timestamp>_<random>),
  jobTitle: string,
  company: string,
  location: string,
  salary: string,
  jobType: string,
  remoteType: string,
  postedDate: string (YYYY-MM-DD format, local timezone),
  deadline: string (YYYY-MM-DD format, local timezone),
  applicationStatus: string (v0.2.0: Researching|Drafting|Awaiting Review|Interviewing|Deciding|Accepted|Rejected|Withdrawn),
  statusHistory: array of {status: string, date: ISO 8601 timestamp},
  checklist: {
    Researching: array of {id: string, text: string, checked: boolean, order: number},
    Drafting: array of {id: string, text: string, checked: boolean, order: number},
    'Awaiting Review': array of {id: string, text: string, checked: boolean, order: number},
    Interviewing: array of {id: string, text: string, checked: boolean, order: number},
    Deciding: array of {id: string, text: string, checked: boolean, order: number},
    Accepted: array of {id: string, text: string, checked: boolean, order: number},
    Rejected: array of {id: string, text: string, checked: boolean, order: number},
    Withdrawn: array of {id: string, text: string, checked: boolean, order: number}
  },
  url: string,
  source: string,
  content: string (NEW: markdown-formatted job template - primary data source for ResearchingView),
  rawDescription: string (legacy: kept for backward compatibility),
  aboutJob: string (legacy: kept for backward compatibility),
  aboutCompany: string (legacy: kept for backward compatibility),
  responsibilities: string (legacy: kept for backward compatibility),
  requirements: string (legacy: kept for backward compatibility),
  updatedAt: string (ISO 8601 timestamp with time),
  targetedResume: string (future: per-job tailored resume),
  documents: {
    [documentKey: string]: {
      title: string,       // User-editable document title
      text: string,        // Markdown content
      lastEdited: string,  // ISO 8601 timestamp
      order: number        // Tab display order (0, 1, 2, ...)
    }
  }
}
```

**Important Notes on Schema Evolution:**
- **v0.2.0+**: The `content` field is the primary data source for job information, formatted as a MarkdownDB template (see `utils/job-parser.js`)
- **Legacy fields** (`rawDescription`, `aboutJob`, `aboutCompany`, `responsibilities`, `requirements`): These are still populated during extraction for backward compatibility but are NOT displayed in the UI
- **Removed fields** (`notes`, `narrativeStrategy`): No longer extracted or stored; user notes now go in the markdown `content` field
- **Migration**: Old jobs without `content` field will show a migration prompt in ResearchingView

Master resume is stored separately:
```javascript
{
  masterResume: {
    content: string (markdown-formatted text),
    updatedAt: string (ISO 8601 timestamp)
  }
}
```

Version tracking:
```javascript
{
  dataVersion: number (current: 2 for v0.2.0)
}
```

Job in focus (for side panel):
```javascript
{
  jobInFocus: string (job ID of currently focused job)
}
```

Checklist UI preference (global):
```javascript
{
  checklistExpanded: boolean (default: false, controls whether checklist UI is expanded or collapsed)
}
```

## Build/Test Commands
- **No build step**: Pure JavaScript, HTML, CSS
- **Testing**: Manual testing in Chrome with Developer mode
- **Reload**: Refresh extension in `chrome://extensions/` after changes

## LM Studio Integration
- Optional feature for enhanced extraction
- Uses local HTTP API: `http://localhost:1234/v1/chat/completions`
- Recommended models: NuExtract-2.0-2B or NuExtract-2.0-8B
- Falls back to basic extraction if LLM unavailable

## Philosophy & Constraints
- **Privacy-first**: No data leaves the device, ever
- **Local-first**: No backend, no accounts, no tracking
- **User control**: Manual extraction, editable data, export freedom
- **Universal**: Works on any job board
- **Optional enhancement**: LLM features are opt-in only

## Future Enhancements (Planned)
- Application lifecycle tracking
- Notes and tags
- Date tracking
- LLM-powered insights:
  - Job-resume fit analysis
  - Resume tailoring suggestions
  - Cover letter generation
  - Company research and insights
  - Interview prep questions and answers
  - Skills gap identification
- Better search and filtering
- Analytics dashboard

## Testing Checklist
When making changes, test on:
- [ ] LinkedIn job postings
- [ ] Indeed job postings
- [ ] At least one other job board (Glassdoor, Monster, etc.)
- [ ] Verify data saves to local storage
- [ ] Verify export (JSON/CSV) works
- [ ] Test with LLM enabled and disabled

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

### Adding New Data Fields
1. Update storage schema documentation
2. Add extraction logic in `content.js`
3. Update popup form in `popup.html` and `popup.js`
4. Update viewer display in `viewer.html` and `viewer.js`
5. Update export logic for CSV format

### CRITICAL: Schema Synchronization

**As of v0.2.0**, the job data model uses a **markdown `content` field** as the primary data source. When making extraction changes:

**For fields that should be extracted into the markdown template:**
1. **`content.js` - DOM Extraction (`extractJobData()` function, ~line 5-21)**
   - Add the field to the `data` object
   - Call the appropriate finder function (e.g., `data.deadline = findDeadline()`)

2. **`content.js` - LLM Extraction Template (`extractAllFieldsWithLLM()`, ~line 840-853)**
   - Add the field to `extractionTemplate` object with NuExtract type annotation

3. **`content.js` - LLM Return Object (`extractAllFieldsWithLLM()`, ~line 927-945)**
   - Add the field to the return object: `fieldName: extracted.fieldName || ''`

4. **`content.js` - Markdown Generator (`generateJobContent()`, ~line 79-200)**
   - Add logic to format the field into the markdown template
   - Follow the MarkdownDB Job Template format (see `utils/job-parser.js`)

5. **`popup.html` - Form Fields (~line 50-130)**
   - Add HTML input/textarea for the field with appropriate id (use kebab-case for id)

6. **`popup.js` - Form Population (`populateForm()`, ~line 123-139)**
   - Add line to populate: `document.getElementById('field-id').value = data.fieldName || '';`

7. **`popup.js` - Save Data (`saveJobData()`, ~line 226-249)**
   - Add line to save: `fieldName: document.getElementById('field-id').value.trim(),`
   - **IMPORTANT**: Also regenerate the `content` field by calling `generateJobContent()`

8. **`popup.js` - CSV Export (`exportCSV()`, ~line 374-396)**
   - Add field to CSV headers array
   - Add field to CSV rows mapping

9. **`AGENTS.md` - Storage Schema Documentation (~line 96-140)**
   - Update the schema documentation to reflect the new field

**Notes:**
- The `content` field is auto-generated by `generateJobContent()` during extraction
- The `documents` field is initialized lazily in DraftingView and doesn't need extraction logic
- Legacy fields (`rawDescription`, `aboutJob`, etc.) are kept for backward compatibility but not displayed in UI

**Verification**: After changes, test with BOTH DOM and LLM extraction modes to ensure:
1. The field is extracted correctly
2. The markdown `content` field is generated with the new data
3. The ResearchingView editor displays the new field
4. The parser/validator recognizes the new field

## Key Files

- `manifest.json` - Extension configuration and permissions
- `content.js` - Job extraction logic (runs on web pages)
- `popup.js` - Popup UI logic (save, export, settings)
- `viewer.js` - Job viewer logic (display, search, filter)
- `sidepanel.js` - Side panel UI logic (job in focus, inline editing)
- `background.js` - Background service worker (minimal)

## Chrome API Limitations & Known Issues

### Side Panel Auto-Reopen (Not Possible)
**Attempted:** Automatically reopen the side panel when user navigates away from viewer.html  
**Result:** Not possible with current Chrome Extension APIs  
**Reason:** 
- `chrome.sidePanel.open()` requires a user gesture (click, keyboard shortcut, etc.)
- Navigation events (`beforeunload`, `visibilitychange`) are NOT user gestures
- No API exists to detect side panel close events or programmatically reopen without user action

**Workaround:** Users must manually reopen the side panel using:
- Extension icon click (if `openPanelOnActionClick` is enabled)
- Keyboard shortcut: `Ctrl+Shift+H` (Windows/Linux) or `Cmd+Shift+H` (Mac)
- Chrome's side panel menu

**Current Behavior:** 
- Side panel automatically closes when user clicks "View All Jobs" or "Edit Resume" buttons
- User must manually reopen side panel when returning from viewer/resume pages
- This is a Chrome API limitation, not a bug

## Debugging Tips

- Check console logs in all contexts (popup, content, background, side panel)
- Use `chrome.storage.local.get()` to inspect stored data
- Test extraction on simple job boards first (Indeed is usually easiest)
- If LLM extraction fails, check LM Studio server is running
- Use `debug-storage.html` to inspect storage directly
- Side panel can be inspected by right-clicking in the side panel and selecting "Inspect"
