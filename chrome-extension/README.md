# Job Board Copy-Paste - Chrome Extension

A Chrome extension that helps you extract and save job posting data from any job board. Think of it as an "enhanced copy-paste" tool for your job search.

## Features

- **Universal Extraction**: Works on any job board (LinkedIn, Indeed, Glassdoor, etc.)
- **Manual Control**: You choose what to extract - no automatic scraping
- **Smart Detection**: Intelligently finds job title, company, salary, location, and more
- **LLM-Enhanced Extraction** (Optional): Use a local LLM to accurately extract responsibilities and requirements
- **Edit Before Saving**: Review and modify extracted data before saving
- **Local Storage**: All data stored locally in your browser
- **Export Options**: Export to JSON or CSV for use in spreadsheets
- **Job Viewer**: Built-in viewer to browse and search your saved jobs

## Installation

1. **Download the Extension**
   - Clone or download this repository
   - Navigate to the `chrome-extension` folder

2. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the `chrome-extension` folder

3. **Add Icons (Optional)**
   - The extension will work without icons, but Chrome will show a warning
   - You can add your own icon files (16x16, 48x48, 128x128 PNG) to the `icons/` folder
   - Or remove the icon references from `manifest.json`

## Optional: LLM-Enhanced Extraction with LM Studio

For much better extraction quality across all job boards, you can use a local LLM via LM Studio.

### Two Extraction Modes

**Basic Mode (Default):**
- Uses DOM selectors to find specific HTML elements
- Fast but fragile - breaks when job boards change their HTML structure
- Inconsistent results across different sites
- Description field often contains unorganized text

**LLM Mode (Recommended):**
- Sends the job posting text to a local LLM for intelligent parsing
- Extracts ALL fields: title, company, location, salary, job type, etc.
- Creates clean, organized descriptions (not raw HTML dumps)
- Intelligently separates responsibilities from requirements
- Works consistently across ANY job board
- Much more accurate and reliable

### Why Use LLM Extraction?
- **Privacy-first**: Everything runs on your machine, no data sent to cloud
- **Free**: No API costs or usage limits
- **Optional**: Falls back to basic extraction if LLM fails

### Setup Instructions

**Step 1: Install LM Studio**
1. Download from [lmstudio.ai](https://lmstudio.ai/)
2. Install the application
3. Launch LM Studio

**Step 2: Download a Model**
1. In LM Studio, click the search icon (magnifying glass)
2. Recommended models (pick one):
   - **NuExtract-2.0-2B** (RECOMMENDED) - Specialized for extraction, works great (2GB RAM)
   - **NuExtract-2.0-8B** - Best quality extraction, needs more RAM (8GB)
   - **Llama 3.2 3B** - General purpose, fast (4GB RAM)
   - **Phi-3 Mini** - Very fast, lightweight (2GB RAM)
   - **Mistral 7B** - Better quality, needs more RAM (8GB)
3. Click download on your chosen model
4. Wait for download to complete

**Why NuExtract?** NuExtract models are specifically trained for structured information extraction tasks and follow a template-based approach that produces more accurate results than general-purpose LLMs. Learn more: [NuExtract 2.0](https://huggingface.co/numind/NuExtract-2.0-8B)

**Step 3: Load the Model**
1. Go to the "Local Server" tab in LM Studio (left sidebar)
2. Select your downloaded model from the dropdown
3. Click "Start Server"
4. Default endpoint: `http://localhost:1234/v1/chat/completions`

**Step 4: Configure Extension**
1. Open the extension popup
2. Click the settings gear icon ⚙️
3. Check "Use LLM for better extraction"
4. Endpoint should already be set to: `http://localhost:1234/v1/chat/completions`
5. Leave "Model Name" empty (uses whatever model you loaded in LM Studio)
6. Click "Test Connection" to verify it's working
7. Click "Save Settings"

**Step 5: Extract Job Data**
- Now when you extract job data with LLM enabled:
  - Extension sends the job posting text to your local LLM
  - LLM intelligently extracts ALL fields (title, company, salary, description, etc.)
  - You get clean, well-organized data
  - A green "✓" message indicates LLM was used
- If LLM is disabled or fails, it falls back to basic DOM extraction

### Troubleshooting LLM Extraction

**"Connection failed" when testing**
- Make sure LM Studio is running
- Make sure you clicked "Start Server" in LM Studio
- Check the endpoint URL is correct: `http://localhost:1234/v1/chat/completions`
- Try restarting LM Studio

**LLM extraction is slow**
- This is normal - LLMs take time to process
- Faster if you use a smaller model (Phi-3 Mini or Llama 3.2 3B)
- First extraction after loading model is slowest

**Want to disable LLM extraction?**
- Simply uncheck "Use LLM for better extraction" in settings
- Extension works fine without it

## How to Use

### Extracting Job Data

1. **Navigate to a job posting** on any job board (LinkedIn, Indeed, etc.)
2. **Click the extension icon** in your Chrome toolbar
3. **Click "Extract Job Data"** button
4. The extension will automatically extract:
   - Job title
   - Company name
   - Location
   - Salary (if available)
   - Job type (Full-time, Contract, etc.)
   - Posted date
   - Job description
   - Responsibilities (enhanced with LLM if enabled)
   - Requirements (enhanced with LLM if enabled)
   - URL
5. **Review and edit** the extracted data in the popup form
6. **Click "Save Job"** to save it to your local collection

### Viewing Saved Jobs

1. Click the extension icon
2. Click "View All Jobs" to open the job viewer in a new tab
3. Browse, search, and filter your saved jobs
4. Click "View Job Posting" to open the original job page
5. Delete jobs you're no longer interested in

### Exporting Data

1. Click the extension icon
2. Choose export format:
   - **Export JSON**: For backup or programmatic use
   - **Export CSV**: For use in Excel, Google Sheets, etc.
3. Choose where to save the file

### Managing Data

- **Clear All**: Remove all saved jobs (with confirmation)
- All data is stored locally in your browser using Chrome's storage API

## Supported Job Boards

The extension works on any website, but is optimized for common job boards:

- LinkedIn
- Indeed
- Glassdoor
- Monster
- ZipRecruiter
- Dice
- Stack Overflow Jobs
- Greenhouse
- Lever
- Workday
- And many more...

## Data Fields Extracted

- Job Title
- Company Name
- Location
- Salary Range
- Job Type (Full-time, Contract, etc.)
- Posted Date
- Job Description
- Responsibilities (what you'll do in the role)
- Requirements (qualifications, skills, experience)
- Source URL
- Job Board Name
- Extraction Timestamp

## Privacy & Legal

- **All data stays local**: No data is sent to any server
- **Manual operation only**: You control what gets extracted
- **Personal use**: Designed as a personal productivity tool
- **Respects ToS**: Functions as an enhanced copy-paste, not automated scraping
- **No automation**: You must be viewing the page and manually trigger extraction

## Tips for Best Results

1. **Wait for page to load**: Make sure the job posting is fully loaded before extracting
2. **Review extracted data**: Always check the extracted data before saving
3. **Edit as needed**: The form is fully editable - fix any extraction errors
4. **One at a time**: Extract one job posting at a time for best results
5. **Regular exports**: Export your data periodically as a backup

## Troubleshooting

### "Failed to extract job data"
- Make sure you're on an actual job posting page (not search results)
- Wait for the page to fully load before clicking extract
- Some job boards use dynamic loading - try scrolling to load all content first

### Missing or incorrect data
- The extension uses intelligent pattern matching, but may not be perfect
- Simply edit the fields in the popup before saving
- If a field is consistently wrong, you can update the extraction logic in `content.js`

### Extension icon not showing
- Make sure the extension is enabled in `chrome://extensions/`
- Try reloading the extension
- Check that you loaded the correct folder

## Development

### File Structure
```
chrome-extension/
├── manifest.json          # Extension configuration
├── content.js            # Content script for data extraction
├── popup.html            # Popup UI
├── popup.js              # Popup logic
├── viewer.html           # Job viewer page
├── background.js         # Background service worker
├── styles/
│   └── popup.css         # Popup styles
└── icons/               # Extension icons (16x16, 48x48, 128x128)
```

### Customizing Extraction Logic

The extraction logic is in `content.js`. You can customize it to:
- Add support for specific job boards
- Extract additional fields
- Improve pattern matching for your use case

Look for functions like:
- `findJobTitle()` - Extracts job title
- `findCompany()` - Extracts company name
- `findSalary()` - Extracts salary information
- etc.

### Adding New Features

Some ideas for enhancement:
- Google Sheets integration
- Duplicate detection
- Application status tracking
- Notes and ratings for each job
- Browser notifications for new jobs

## License

This is a personal productivity tool. Use responsibly and in accordance with job board terms of service.

## Support

For issues or questions, please open an issue in the repository.

## Troubleshooting

### "Could not establish connection" Error

This error occurs when the content script isn't loaded on the page. The updated extension now handles this automatically, but if you still see it:

**Solution 1: Refresh the page**
1. Reload the job posting page (F5 or Ctrl+R)
2. Click the extension icon again
3. Click "Extract Job Data"

**Solution 2: Reload the extension**
1. Go to `chrome://extensions/`
2. Find "Job Board Copy-Paste"
3. Click the refresh/reload icon
4. Go back to the job posting
5. Refresh the page
6. Try extracting again

**Solution 3: Check the page URL**
- The extension cannot run on Chrome internal pages (`chrome://`, `chrome-extension://`)
- Make sure you're on an actual job board website

### Extraction Returns Empty Fields

If some fields are empty after extraction:

1. **This is normal** - not all job postings have all fields
2. **Manually fill them in** - all fields are editable before saving
3. **Site-specific issue** - some job boards use unusual layouts

To improve extraction for a specific site:
1. Open an issue with the site URL
2. Or modify `content.js` yourself with site-specific selectors

### Extension Not Appearing

1. Make sure Developer Mode is enabled in `chrome://extensions/`
2. Check that the extension is enabled (toggle should be blue/on)
3. Try clicking the puzzle piece icon in Chrome toolbar and pin the extension
