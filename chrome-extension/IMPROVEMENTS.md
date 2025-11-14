# Changelog & Roadmap

## Current Features (v1.0)

### ✅ Data Capture
- Universal job data extraction from any job board
- Optional LLM-powered extraction (NuExtract 2.0 recommended)
- DOM-based fallback extraction
- Editable form before saving
- Real-time extraction feedback

### ✅ Local Storage
- Chrome storage API for data persistence
- No backend, no servers
- Export to JSON/CSV
- Individual or bulk delete

### ✅ Job Viewer
- Search and filter saved jobs
- Filter by source (LinkedIn, Indeed, etc.)
- Expandable sections for long content
- Open original job postings
- Delete individual jobs

### ✅ LLM Integration
- Local LLM support (LM Studio/Ollama)
- Privacy-first: localhost-only, no cloud APIs
- Full field extraction with NuExtract
- Automatic fallback to DOM extraction
- Test connection feature

## Planned Enhancements (v2.0)

### 🎯 Application Lifecycle Tracking
- **Status Pipeline**: Saved → Applied → Interviewing → Offer → Accepted/Rejected
- **Date Tracking**: Applied date, interview dates, offer date, decision date
- **Notes**: Free-form notes per job
- **Tags**: Custom labels for organization
- **Priority**: Star/flag important jobs
- **Timeline View**: Visual representation of application progress

### 🤖 LLM-Powered Features (Local Only)
All powered by user's local LLM:
- **Job-Resume Fit Analysis**: Score how well a job matches your background
- **Cover Letter Generation**: Generate tailored cover letters
- **Interview Prep**: Generate likely interview questions
- **Skills Gap Analysis**: Identify skills to learn
- **Job Comparison**: Compare multiple jobs side-by-side
- **Salary Insights**: Analyze salary competitiveness (using local data)

### 📊 Analytics & Insights
- Application success rate tracking
- Time-to-response metrics
- Source effectiveness (which job boards work best)
- Interview conversion rates
- All computed locally, no external analytics

### 🔍 Enhanced Filtering & Search
- Advanced filters (salary range, date range, status, tags)
- Saved filter presets
- Full-text search across all fields
- Sort by multiple criteria
- Bulk operations (tag, delete, export filtered results)

### 📋 Better UX
- Drag-and-drop status changes
- Keyboard shortcuts
- Dark mode
- Customizable columns in viewer
- Quick actions menu
- Import jobs from JSON

## Technical Improvements

### Performance
- Indexed database for faster search (IndexedDB)
- Lazy loading for large job lists
- Virtual scrolling for performance
- Background sync for exports

### Data Management
- Duplicate detection
- Data versioning for safe upgrades
- Automatic backups (local)
- Import/merge from other sources

### Code Quality
- Better error handling
- Comprehensive logging (local only)
- Unit tests for extraction logic
- E2E tests for critical flows

## Not Planned (Out of Scope)

❌ Backend servers or databases  
❌ User accounts or cloud sync  
❌ Automated job scraping  
❌ Cloud LLM APIs (user provides local LLM)  
❌ Mobile app (extension is desktop-only by design)  
❌ Team collaboration features  
❌ Paid features or monetization  

## Philosophy

We remain committed to:
- **Privacy-first**: No data collection, ever
- **Local-first**: Works offline, no servers needed
- **User ownership**: Your data, your control
- **Open source**: Transparent and auditable
- **No tracking**: No analytics, no telemetry

---

## Historical Changes

### LLM-Powered Full Extraction (Dec 2024)

**Major Change**: LLM now extracts ALL fields, not just responsibilities/requirements.

**Why This Is Better:**
- DOM-based extraction is fragile (breaks when sites change)
- Different selectors needed for each job board
- LLM understands natural language, works universally
- Clean, organized output instead of raw HTML dumps

**How It Works:**
1. Extract visible text from job posting (max 10,000 chars)
2. Send to local LLM with structured template (NuExtract format)
3. LLM returns JSON with all fields
4. Automatic fallback to DOM extraction if LLM fails

**Technical Details:**
- Uses NuExtract 2.0 for best extraction quality
- Temperature 0.0 for consistent results
- OpenAI-compatible API (LM Studio/Ollama)
- 60-second timeout with error recovery
