# Workflow Setup Guide

## Workflows

### 1. Adzuna Job Scraper
Automatically fetches jobs from Adzuna API and stores them in Google Sheets.

### 2. Fetch Full Job Description
Webhook-triggered workflow that fetches full job descriptions on-demand from the frontend.

---

## Adzuna Job Scraper Workflow

**Architecture:** Simple and elegant - leverages n8n's native Merge node v3.2 deduplication.

**Key Feature:** Uses Merge node `keepNonMatches` mode for automatic duplicate filtering - no custom JavaScript needed!

---

## How It Works

1. **Fetches jobs** from Adzuna API (50 results)
2. **Transforms** to clean format (outputs 50 job items)
3. **Reads existing jobs** from Google Sheet
4. **Merges with deduplication** - Merge node v3.2 automatically filters out existing jobs by comparing `job_id` fields
5. **Checks for new jobs** - only continues if there are new jobs to add
6. **Appends new jobs** - never overwrites existing rows

**Architecture:**
```
API → Transform → Merge (keepNonMatches) → If → Append
                     ↑
                Read Jobs
```

**Benefits:**
- ✅ No duplicates (native n8n deduplication)
- ✅ Status/notes preserved (append-only)
- ✅ Simple architecture (5 nodes)
- ✅ Handles empty sheets gracefully
- ✅ No custom filtering code required

---

## Prerequisites

1. **Adzuna API Credentials**
   - Sign up at https://developer.adzuna.com/
   - Get your `app_id` and `app_key`
   - Free tier: 1000 API calls/month

2. **Google Sheet Setup**
   - Create a new Google Sheet named "Job Listings"
   - Add these column headers in Sheet1 (row 1):
     ```
     job_id | title | company | location | salary_min | salary_max | salary_display | description | url | posted_date | scraped_date | category | contract_type | status | full_description
     ```
   - **Important:** 
     - Column names must match exactly (case-sensitive)
     - The workflow uses auto-mapping, so headers are required
     - `status`: Job workflow status. Values:
       - `new` - Default for newly scraped jobs (not yet reviewed)
       - `interested` - Jobs you want to pursue (triggers full description fetch)
       - `not_interested` - Jobs you've reviewed but don't want to pursue
       - Future: `applied`, `interviewing`, `rejected`, `offer`
     - `full_description`: Empty by default - automatically populated when status = 'interested'

---

## Import Instructions

1. **Import Workflow**
   - Open your n8n instance (VPS)
   - Click "Import from File"
   - Upload `workflows/adzuna-job-scraper.json`

2. **Configure Adzuna Credentials**
   - Go to **Credentials** in n8n
   - Click **"+ Add Credential"**
   - Search for **"HTTP Request"** → Select **"Custom Auth"**
   - Name it: **"Adzuna API"**
   - Set **Auth Type**: "Custom Auth"
   - **JSON**:
   ```json
   {
     "qs": {
       "app_id": "your_adzuna_app_id",
       "app_key": "your_adzuna_app_key"
     }
   }
   ```
   - Click **"Save"**

3. **Configure Google Sheets (2 nodes)**
   - Click on **"Read Existing Jobs"** node
     - Add Google Sheets OAuth2 credentials
     - Select your "Job Listings" spreadsheet
     - Select "Sheet1"
   
   - Click on **"Append New Jobs"** node
     - Use same credentials
     - Select same spreadsheet and sheet
     - Mapping mode: "Map Automatically" (default)
     - This will auto-match your sheet column headers

4. **Customize Search Parameters**
   - Click "Adzuna API" node
   - Modify query parameters:
     - `what`: Job title/keywords (default: "software developer")
     - `where`: Location (default: "Vancouver")
     - `results_per_page`: Number of results (default: 50, max: 50)
     - URL country code: `/ca/` for Canada (or `/us/`, `/gb/`, etc.)

---

## Running the Workflow

**Manual Test:**
- Click "Execute Workflow" to test
- Check your Google Sheet for new jobs
- Re-run it - should detect duplicates and skip them

**Scheduled:**
- Toggle "Active" to enable
- Runs every 6 hours by default
- Edit "Schedule Trigger" node to change frequency

---

## Technical Details

**Merge Node Deduplication:**
- Uses Merge node v3.2 with `mode: "combine"` and `joinMode: "keepNonMatches"`
- Compares `job_id` field between new jobs (input 1) and existing jobs (input 2)
- Only outputs jobs where `job_id` doesn't exist in existing data
- Native n8n functionality - no custom code required

**Salary Sentinel Value:**
- Uses `-1` for missing salary data instead of `null`
- Required because Merge node fails with mixed types (number vs null)
- Easily identifiable as "no data" (salaries can't be negative)

**What happens:**
- First run: Adds all 50 jobs
- Second run: Only adds jobs that weren't there before
- Your status changes are never overwritten

---

## Fetch Full Job Description Workflow

**Purpose:** Webhook-triggered API that fetches and stores full job descriptions on-demand when called from the frontend.

**How It Works:**

1. **Frontend sends POST request** with `job_id` and `url`
2. **Validates input** - ensures required fields are present
3. **Fetches** the full job page from the provided URL
4. **Extracts** the job description from HTML
5. **Updates** the `full_description` column in Google Sheet (matches by `job_id`)
6. **Returns response** to frontend (success or error)

**Architecture:**
```
Frontend → Webhook → Validate → Fetch URL → Extract → Update Sheet → Response
```

**Setup:**

1. **Import Workflow**
   - Import `workflows/fetch-full-description.json`

2. **Configure Google Sheets**
   - Click on **"Update Sheet by Job ID"** node
   - Add Google Sheets OAuth2 credentials
   - Select your "Job Listings" spreadsheet
   - Select "Sheet1"
   - **Important:** Make sure "Matching Columns" is set to `job_id`

3. **Activate Workflow**
   - Toggle "Active" to enable
   - Copy the webhook URL (shown in the Webhook Trigger node)
   - Webhook path: `/webhook/fetch-job-description`

**Webhook Endpoint:**

**URL:** `https://your-n8n-instance.com/webhook/fetch-job-description`

**Method:** `POST`

**Request Body:**
```json
{
  "job_id": "12345",
  "url": "https://www.adzuna.ca/details/..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "job_id": "12345",
  "message": "Full description fetched and updated"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Missing required fields: job_id and url are required"
}
```

**Frontend Integration Example:**

```javascript
// When user clicks "Get Full Description" button
async function fetchFullDescription(jobId, url) {
  try {
    const response = await fetch('https://your-n8n-instance.com/webhook/fetch-job-description', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ job_id: jobId, url: url })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Full description fetched successfully');
      // Refresh job data from sheet or display success message
    } else {
      console.error('Error:', result.error);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
}
```

**Benefits:**
- ✅ **Instant trigger** - No polling delay
- ✅ **Efficient** - Only runs when user requests it
- ✅ **Better UX** - Immediate feedback to user
- ✅ **Reliable** - Direct API call with error handling

**Notes:**
- HTML parsing tries multiple strategies to find job descriptions
- Truncates at 45,000 characters (Google Sheets limit)
- Updates sheet by matching `job_id` column
- Returns structured JSON response for frontend handling

---

## Customization Ideas

- Change search keywords in `what` parameter
- Add multiple locations
- Filter by salary range in the Transform node
- Add email notifications on new jobs
- Chain with matching/filtering workflows
- Increase scraping frequency for hot markets

---

## Troubleshooting

**No results from API:**
- Check API credentials and search parameters
- Verify country code in URL matches your region
- Try broader search terms

**Sheet errors:**
- **"No columns found"**: Make sure your sheet has the header row with exact column names
- Verify column names match exactly (case-sensitive)
- Check OAuth credentials are valid
- Use "Map Automatically" mode in Append node (default)

**Duplicate detection not working:**
- Verify Merge node is v3.2 with `joinMode: "keepNonMatches"`
- Check that `job_id` values are actually unique
- Look at execution logs to see merge results
- If sheet is empty (first run), all jobs will be added

**Rate limits:**
- Free tier: 1000 calls/month
- Running every 6 hours = ~120 calls/month (safe)
- Each call fetches up to 50 jobs

---

## Agent-Friendly Workflow Management

**Insight:** AI agents can't directly edit n8n workflows in the UI, but we can circumvent this limitation by:

1. **Using n8n CLI** - n8n provides `export:workflow` and `import:workflow` commands
2. **Automating with scripts** - Shell scripts handle SSH, Docker exec, and file transfer
3. **Version control as bridge** - Workflows stored as JSON files agents can read/modify

**Available Scripts:**

### Pull Workflow from n8n
```bash
./workflows/copy-from-n8n.sh <workflow_id>
```
Exports a workflow from n8n and saves locally for version control.

### Push Workflow to n8n
```bash
./workflows/send-to-n8n.sh <workflow.json>
```
Imports a local workflow JSON into the n8n instance.

**Benefits:**
- ✅ **Agent collaboration** - AI can manage workflows programmatically
- ✅ **Version control** - All workflows tracked in git
- ✅ **Bidirectional sync** - Changes flow both ways (UI ↔ Code)
- ✅ **Testable** - Edit in UI, test, then pull to commit
- ✅ **Deployable** - Push tested JSON files back to n8n

**Workflow:**
1. Build/test in n8n UI
2. Agent runs `copy-from-n8n.sh` to pull changes
3. Agent reviews and commits to git
4. Later: Agent can push updates with `send-to-n8n.sh`

This approach makes n8n workflows **agent-manageable** despite the visual UI limitation.

---

## See Also

- **INSIGHTS.md** - Technical learnings and architecture evolution

