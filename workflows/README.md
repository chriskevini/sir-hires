# Workflow Setup Guide

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
     job_id | title | company | location | salary_min | salary_max | salary_display | description | url | posted_date | scraped_date | category | contract_type | status
     ```
   - **Important:** 
     - Column names must match exactly (case-sensitive)
     - The workflow uses auto-mapping, so headers are required

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

## See Also

- **INSIGHTS.md** - Technical learnings and architecture evolution
