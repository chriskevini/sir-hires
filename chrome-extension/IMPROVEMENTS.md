# Recent Improvements

## LLM-Powered Full Extraction (Latest Update)

### Major Change: LLM Now Handles ALL Fields

When LLM mode is enabled, the extension now uses the LLM to extract **all fields**, not just responsibilities/requirements. This is a significant improvement over the previous DOM-based approach.

### Why This Is Better

**Old Approach (DOM-based):**
- Relies on fragile CSS selectors that break when sites change
- Different selectors needed for each job board
- Description field often messy and unorganized
- Inconsistent results across platforms
- Required constant maintenance

**New Approach (LLM-based when enabled):**
- Sends job posting text to local LLM
- LLM intelligently extracts ALL fields using natural language understanding
- Works universally across ANY job board
- Clean, organized descriptions (not raw HTML text dumps)
- Accurate field separation
- Much more robust and maintainable

### How It Works

1. **LLM Disabled (Default)**: Uses DOM selectors (old behavior)
2. **LLM Enabled**: 
   - Extracts up to 10,000 characters of text from the job posting
   - Sends to local LLM with structured prompt
   - LLM returns JSON with all fields properly extracted
   - If LLM fails, automatically falls back to DOM extraction

### What Gets Sent to LLM

- The visible text content from the job posting (max 10,000 characters)
- NOT the HTML structure, CSS, or page metadata
- Sent to `localhost:1234` (your local LM Studio instance)
- Never sent over the internet

### Extracted Fields by LLM

All fields are extracted intelligently:
- **job_title**: Position name
- **company**: Company name
- **location**: Location or "Remote"
- **salary**: Salary range if mentioned
- **job_type**: Full-time, Part-time, Contract, etc.
- **posted_date**: When posted
- **description**: Clean, organized summary (2-3 paragraphs, not a raw dump)
- **responsibilities**: What you'll do in the role
- **requirements**: Qualifications, skills, experience needed

### Technical Details
- Uses OpenAI-compatible API format (LM Studio)
- Very low temperature (0.2) for consistent, accurate extraction
- Max 2000 tokens for comprehensive extraction
- Robust JSON parsing (handles markdown code blocks)
- Error handling with automatic fallback

## LLM-Enhanced Extraction (Previous Update - Superseded)

**Note**: This approach has been superseded by the full LLM extraction above.

### Old Features (when LLM mode was partial)
- **Optional LLM Integration**: Use a local LLM (via LM Studio) to intelligently extract responsibilities and requirements
- **Privacy-first**: All LLM processing happens locally on your machine
- **Automatic fallback**: If LLM fails or is disabled, uses basic DOM-based extraction
- **Settings UI**: Easy toggle to enable/disable LLM, configure endpoint, and test connection
- **Smart activation**: LLM only runs when responsibilities/requirements aren't found with basic extraction

### How It Works
1. Extension first tries basic DOM-based extraction (fast, no dependencies)
2. If responsibilities/requirements are missing and LLM is enabled, it sends the description to the local LLM
3. LLM analyzes the job description and intelligently separates responsibilities from requirements
4. If LLM fails (not running, error, etc.), falls back to basic extraction
5. User always gets results, even if LLM isn't available

### LM Studio Setup
- Download from [lmstudio.ai](https://lmstudio.ai/)
- Load a model (Llama 3.2 3B, Phi-3 Mini, or Mistral 7B recommended)
- Start the local server (default: `http://localhost:1234`)
- Enable in extension settings and test connection

### Technical Details
- Uses OpenAI-compatible API format
- Low temperature (0.3) for consistent extraction
- Max 1000 tokens to keep responses concise
- JSON output format for structured data
- Robust error handling and timeout management

## Enhanced Data Extraction (Previous Update)

### New Features
- **Separate Responsibilities & Requirements fields**: The extension now intelligently extracts and separates job responsibilities from requirements/qualifications
- **Improved salary extraction**: Better regex patterns to capture full salary ranges (e.g., "$100,000 - $150,000 per year")
- **Better company name detection**: Added more selectors for LinkedIn, Indeed, and other major job boards
- **Enhanced location detection**: More robust location extraction with better validation

### Extraction Improvements

#### Company Name
- Added LinkedIn-specific selectors (`.job-details-jobs-unified-top-card__company-name`, etc.)
- Added Indeed-specific selectors (`[data-company-name="true"]`, etc.)
- Cleans up common prefixes like "at" or "@"
- Removes extraneous information after pipe characters

#### Location
- Added LinkedIn and Indeed-specific selectors
- Better validation (checks for commas, state codes, ZIP codes, "remote", "hybrid")
- Cleans up formatting (removes leading bullets and pipes)

#### Salary
- Enhanced regex patterns for better range capture (e.g., "$100k - $150k", "$50-$75/hour")
- Supports various formats: full numbers, shortened (k), hourly/yearly
- Searches in priority order (specific elements first, then pattern matching)
- Only searches top portion of page to avoid false matches

#### Responsibilities & Requirements
- Automatically identifies section headings (e.g., "What you'll do", "Requirements", "Qualifications")
- Extracts content following these headings
- Separates into two distinct fields for better organization
- Limits content length to keep data manageable

### CSV Export
Updated CSV export to include the new fields:
- Description
- Responsibilities  
- Requirements

### Testing Recommendations

Test the extraction on:
- LinkedIn job postings
- Indeed job postings
- Glassdoor
- Company career pages (Greenhouse, Lever, Workday)

If extraction still fails on specific sites:
1. Open browser DevTools (F12)
2. Inspect the job posting elements
3. Note the class names and structure
4. Update the selectors in `content.js`

### Future Enhancements (Optional)

Consider adding:
- **Cloud LLM support**: Add option to use OpenAI/Anthropic APIs for users who prefer cloud
- **Model selection**: Allow choosing different models in LM Studio
- **Confidence scoring**: Show how confident the extraction was
- **Site-specific extractors**: Add dedicated logic for major job boards
- **Extraction quality feedback**: Let users rate extraction quality to improve prompts
- **Manual field mapping**: Let users teach the extension where to find data on specific sites
