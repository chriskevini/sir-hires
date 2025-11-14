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

### Storage Schema
Jobs are stored as objects with these fields:
```javascript
{
  job_title: string,
  company: string,
  location: string,
  salary: string,
  job_type: string,
  remote_type: string,
  posted_date: string,
  deadline: string,
  application_status: string,
  status_history: array,
  url: string,
  source: string,
  raw_description: string,
  about_job: string,
  about_company: string,
  responsibilities: string,
  requirements: string,
  updated_at: timestamp
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

When adding or removing fields from the job data schema, you MUST update ALL of the following locations to keep them in sync:

1. **`content.js` - DOM Extraction (`extractJobData()` function, ~line 5-21)**
   - Initialize the field in the `data` object
   - Call the appropriate finder function (e.g., `data.deadline = findDeadline()`)

2. **`content.js` - LLM Extraction Template (`extractAllFieldsWithLLM()`, ~line 753-766)**
   - Add the field to `extractionTemplate` object with appropriate type annotation
   - Use NuExtract type system: "verbatim-string", "string", ["enum", "values"], etc.

3. **`content.js` - LLM Return Object (`extractAllFieldsWithLLM()`, ~line 833-849)**
   - Add the field to the return object: `field_name: extracted.field_name || ''`

4. **`popup.html` - Form Fields (~line 50-130)**
   - Add HTML input/textarea for the field with appropriate id

5. **`popup.js` - Form Population (`populateForm()`, ~line 123-139)**
   - Add line to populate: `document.getElementById('fieldId').value = data.field_name || '';`

6. **`popup.js` - Save Data (`saveJobData()`, ~line 226-249)**
   - Add line to save: `field_name: document.getElementById('fieldId').value.trim(),`

7. **`popup.js` - CSV Export (`exportCSV()`, ~line 374-396)**
   - Add field to CSV headers array
   - Add field to CSV rows mapping

8. **`viewer.html` - Display (~line varies)**
   - Add display element for the field if needed

9. **`viewer.js` - Job Card/Display (~line varies)**
   - Add logic to display the field if needed

10. **`AGENTS.md` - Storage Schema Documentation (~line 76-93)**
    - Update the schema documentation to reflect the new field

**Example**: When adding a `deadline` field, search the codebase for `posted_date` and add `deadline` in similar locations.

**Verification**: After changes, test with BOTH DOM and LLM extraction modes to ensure the field is captured, displayed, saved, and exported correctly.

## Key Files

- `manifest.json` - Extension configuration and permissions
- `content.js` - Job extraction logic (runs on web pages)
- `popup.js` - Popup UI logic (save, export, settings)
- `viewer.js` - Job viewer logic (display, search, filter)
- `background.js` - Background service worker (minimal)

## Debugging Tips

- Check console logs in all contexts (popup, content, background)
- Use `chrome.storage.local.get()` to inspect stored data
- Test extraction on simple job boards first (Indeed is usually easiest)
- If LLM extraction fails, check LM Studio server is running
- Use `debug-storage.html` to inspect storage directly
