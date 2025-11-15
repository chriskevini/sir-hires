# Side Panel Implementation Sprints

## Overview
Implementing a persistent side panel for Sir Hires that tracks a "job in focus" across tabs and browser sessions.

## Core Requirements
- Single "job in focus" tracked globally
- Persistent across tabs and browser sessions
- Extracting a new job automatically sets it as the focus
- Empty state guides new users
- All fields editable with visual indicators
- Keyboard shortcut: Ctrl+Shift+H (Cmd+Shift+H on Mac)

---

## Sprint 1: Basic Side Panel Structure (1-2 hours)

### Tasks
- [ ] Update `manifest.json`:
  - Add `"sidePanel"` permission
  - Add `"side_panel": { "default_path": "sidepanel.html" }`
  - Add keyboard shortcut command for Ctrl+Shift+H
- [ ] Create `sidepanel.html`:
  - Header with extension name/icon
  - Empty state with welcome message
  - Instructions including keyboard shortcut (Ctrl+Shift+H)
  - Instructions for pinning extension
  - Prominent "Extract Job Data" button
  - Placeholder for job details section
  - Footer with "View All Jobs" link
- [ ] Create `sidepanel.js`:
  - Load job in focus from storage
  - Display empty state or job details
  - Basic structure for handling extract button
- [ ] Create `styles/sidepanel.css`:
  - Consistent with existing popup.css
  - Empty state styling with helpful icons
  - Prominent extract button styling
- [ ] Update `background.js`:
  - Enable side panel for all tabs on install
  - Set panel behavior to open on action click
  - Auto-open on first install
  - Add keyboard shortcut handler for Ctrl+Shift+H

### Empty State Content
```
┌─────────────────────────────────┐
│  📋 Sir Hires                   │
├─────────────────────────────────┤
│                                  │
│  👋 Welcome to Sir Hires!        │
│                                  │
│  To get started:                 │
│  1. Navigate to a job listing    │
│  2. Click "Extract Job Data"     │
│     below                        │
│  3. Review and save              │
│                                  │
│  💡 Tips:                        │
│  • Press Ctrl+Shift+H to toggle  │
│    this panel anytime            │
│  • Pin this extension for quick  │
│    access (click pin icon ➡️)   │
│                                  │
│  Works on LinkedIn, Indeed,      │
│  Glassdoor, and more!            │
│                                  │
│  ┌───────────────────────────┐  │
│  │  Extract Job Data         │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

---

## Sprint 2: Extraction Integration (1 hour)

### Tasks
- [x] Update `sidepanel.js`:
  - Extract button sends message to content script
  - Reuse existing extraction logic from popup.js
  - Show inline form in side panel
  - After save, set as job in focus
  - Show success message with edit options
  - Update extract button to be subtle when job exists
- [x] Verify `content.js` works with side panel (should already work)

### Extract Button Styling
- **Empty state:** Large, prominent, centered
- **With job:** Small, subtle, top-right corner

---

## Sprint 3: Job in Focus Logic (30 min) ✓ COMPLETE

### Storage Schema Addition
```javascript
{
  jobInFocus: string | null,           // ID of currently focused job
  jobs: { [id: string]: JobData },    // MIGRATED from array to object format
  // existing fields...
}
```

### Tasks
- [x] Update storage schema from array to object format:
  - `jobs: []` → `jobs: { [id]: job }`
  - All jobs now have unique IDs
  - Side panel already implemented with object format
- [x] Update `popup.js`:
  - Migrated to object-based storage
  - Added `generateJobId()` function
  - After saving job, sets it as `jobInFocus`
  - Updated `checkDuplicateJob()` for object storage
  - Updated `updateJobCount()` for object storage
  - Updated `viewAllJobs()` for object storage
- [x] Update `viewer.js`:
  - Converts object storage to array on load (backward compatibility)
  - Converts array back to object on save
  - All save operations updated (delete, status, notes, narrative)
- [x] Update `sidepanel.js`:
  - On extraction/save: Set `jobInFocus` to new job's ID ✓ (already done)
  - On load: Fetch `jobInFocus` ID and display job ✓ (already done)
  - Handle case where focused job no longer exists ✓ (already done)

### Logic Flow
1. **On extraction/save:** Save job → Set `jobInFocus` → Update display ✓
2. **On side panel load:** Fetch `jobInFocus` → Load job data → Display ✓
3. **On storage change:** Update display if `jobInFocus` changes ✓

---

## Sprint 4: Full Job Details + Inline Editing (1 hour) ✓ COMPLETE

### Job Details Layout
```
┌─────────────────────────────────┐
│ Extract Job Data  ⟳             │ ← Smaller, subtle
├─────────────────────────────────┤
│  ✏️ Senior Software Engineer    │ ← All fields have
│  ✏️ at Acme Corp                │   pencil icons
│  ✏️ 📍 Remote                   │
│  ✏️ 💰 $150K-180K               │
│  ✏️ 🏢 Full-time • Hybrid       │
│  ✏️ 🗓️ Posted: 11/10/2025      │
│  ✏️ ⏰ Deadline: 12/31/2025     │
│  ✏️ 🔗 [Job URL]                │
│  ✏️ 📊 Status: Applied          │
├─────────────────────────────────┤
│  ✏️ About the Job               │
│  [Full text, click to edit]     │
│                                  │
│  ✏️ About the Company            │
│  [Full text, click to edit]     │
│                                  │
│  ✏️ Responsibilities            │
│  [Full text, click to edit]     │
│                                  │
│  ✏️ Requirements                │
│  [Full text, click to edit]     │
│                                  │
│  ✏️ Notes                       │
│  [Click to edit...]             │
│                                  │
│  ✏️ Narrative Strategy          │
│  [Click to edit...]             │
├─────────────────────────────────┤
│  [View All Jobs]                 │
│  [Edit Master Resume]            │
└─────────────────────────────────┘
```

### Tasks
- [x] Create full job details display in `sidepanel.html`
- [x] Add pencil icons to all fields
- [x] Implement inline editing for all fields:
  - Text fields: job title, company, location, salary, etc.
  - Date fields: posted date, deadline
  - Select fields: status, remote type
  - Textareas: about job, company, responsibilities, requirements, notes, strategy
- [x] Add visual feedback:
  - Hover: Highlight field, show pencil icon
  - Editing: Change border, show checkmark
  - Saving: Brief spinner (💾)
  - Saved: Green checkmark "✓" for 2 seconds
- [x] Implement auto-save on blur (reuse viewer.js patterns)
- [x] Make layout scrollable for full content

### All Editable Fields
- Job title, company, location, salary
- Job type, remote type
- Posted date, deadline
- Application status
- URL, source
- About job, about company
- Responsibilities, requirements
- Notes, narrative strategy

### Implementation Details
- **contenteditable fields**: Job title, company name, and all text sections (about job, company, responsibilities, requirements, notes, narrative strategy)
- **Meta items**: Click to edit → converts to appropriate input (text input, date input, or select dropdown)
- **Auto-save**: All fields save on blur with visual feedback (💾 saving → ✓ saved)
- **Visual states**: Hover shows edit icon, editing shows blue border, saved shows green checkmark
- **Keyboard support**: Enter key saves single-line fields, sections support multi-line editing

---

## Sprint 5: Multi-Tab Sync (30 min) ✓ COMPLETE

### Tasks
- [x] Add storage change listener in `sidepanel.js`:
  ```javascript
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.jobInFocus || changes.jobs) {
        loadJobInFocus();
      }
    }
  });
  ```
- [x] Test: Open multiple tabs, edit in one, verify others update
- [x] Handle edge cases:
  - Focused job deleted in another tab → Shows empty state
  - Multiple simultaneous edits → Always reloads latest data
  - User currently editing → Defers reload until edit completes
  - User in edit form → Skips reload to avoid interrupting

### Implementation Details
- **Storage listener**: Monitors `jobInFocus` and `jobs` changes (already implemented in Sprint 2)
- **Smart reload**: Checks if user is actively editing before reloading
  - If editing inline field: Defers reload until blur event
  - If in edit form: Skips reload entirely
- **Edge case handling**: 
  - Job deletion detected by checking if `!jobs[jobInFocusId]` → shows empty state
  - All updates trigger reload to ensure latest data is displayed
- **User experience**: Prevents jarring interruptions while user is typing or editing

---

## Sprint 6: Quick Actions (30 min) ✓ COMPLETE

### Tasks
- [x] Add action buttons to side panel footer:
  - **"View All Jobs"** → Opens viewer.html in new tab ✓ (already implemented)
  - **"Edit Master Resume"** → Opens resume.html in new tab ✓ (already implemented)
- [x] Optional: Add "Change Focus" feature
  - Clicking a job in viewer sets it as `jobInFocus` ✓
  - Visual indicator (📌 pin icon) shows which job is in focus ✓
  - Multi-tab sync updates focus indicator in real-time ✓
- [x] Test all navigation flows

### Implementation Details
- **Footer buttons**: Already implemented in sidepanel.html (lines 160-163) and sidepanel.js (lines 24-31)
- **Change Focus**: 
  - Clicking any job card in viewer.js sets it as `jobInFocus` in storage
  - Visual indicator: Gold left border + 📌 pin icon on focused job card
  - Storage listener updates focus indicator when changed in another tab
- **Navigation flows**: All working correctly
  - Side panel → View All Jobs → Viewer
  - Side panel → Edit Master Resume → Resume editor
  - Viewer → Click job → Sets as focus → Side panel updates

---

## Technical Notes

### Storage Keys
```javascript
{
  jobInFocus: string | null,           // ID of job currently in focus
  jobs: { [id: string]: JobData },    // Existing job storage
  masterResume: { ... },               // Existing
  llmSettings: { ... },                // Existing
}
```

### Side Panel Behavior
- Opens via toolbar icon click
- Opens via Ctrl+Shift+H (Cmd+Shift+H on Mac)
- Auto-opens on first install
- Always enabled (works on any site)
- Persists across tab switches
- Doesn't close when navigating

### Code Reuse
- **Extraction:** Reuse `content.js` extraction logic
- **Inline editing:** Copy patterns from `viewer.js`
- **Storage:** Use existing `chrome.storage.local` patterns
- **Styling:** Extend existing `popup.css` patterns

---

## Testing Checklist

### Sprint 1
- [ ] Side panel opens via toolbar icon
- [ ] Side panel opens via Ctrl+Shift+H
- [ ] Empty state displays correctly
- [ ] Welcome message shows keyboard shortcut
- [ ] Welcome message shows pin instructions

### Sprint 2
- [ ] Extract button triggers extraction
- [ ] Extraction works from side panel
- [ ] Form populates with job data
- [ ] Save creates new job
- [ ] Extract button becomes subtle after job exists

### Sprint 3
- [ ] New job becomes job in focus
- [ ] Job in focus persists on page reload
- [ ] Job in focus persists across browser restart
- [ ] Side panel shows correct job in all tabs

### Sprint 4
- [ ] All fields display correctly
- [ ] Pencil icons appear on all fields
- [ ] Click to edit works for all fields
- [ ] Auto-save works on blur
- [ ] Visual feedback shows for edits
- [ ] Layout is scrollable

### Sprint 5
- [x] Changes sync across tabs
- [x] Multiple tabs stay in sync
- [x] Handle job deletion gracefully
- [x] Don't interrupt user while editing

### Sprint 6
- [x] "View All Jobs" button works ✓
- [x] "Edit Master Resume" button works ✓
- [x] All navigation flows work correctly ✓
- [x] Clicking job in viewer sets it as focus ✓
- [x] Visual indicator shows focused job ✓
- [x] Multi-tab sync updates focus indicator ✓

---

## Status

- [x] Sprint 1: Basic Side Panel Structure ✓
- [x] Sprint 2: Extraction Integration ✓
- [x] Sprint 3: Job in Focus Logic ✓
- [x] Sprint 4: Full Job Details + Inline Editing ✓
- [x] Sprint 5: Multi-Tab Sync ✓
- [x] Sprint 6: Quick Actions ✓

**ALL SPRINTS COMPLETE!** 🎉

The side panel feature is now fully functional with:
- ✅ Job extraction and saving
- ✅ Inline editing with auto-save
- ✅ Multi-tab sync with smart reload
- ✅ Quick navigation to viewer and resume editor
- ✅ Ability to change focus from viewer with visual indicator
- ✅ Persistent job-in-focus across tabs and browser sessions

---

## Sprint 7: Popup Redesign - Separation of Concerns (2-3 hours)

### Overview
Simplify the popup to be a launcher/extractor only. All editing happens in the side panel. Make LLM extraction the default.

### Design Philosophy
- **Popup**: Quick actions only - extract and navigate
- **Side Panel**: Full editing interface
- **Separation**: Popup extracts → Side panel edits

### New Popup Flow
```
┌─────────────────────────────────┐
│  📋 Sir Hires            ⚙️     │ ← Settings cog
├─────────────────────────────────┤
│                                  │
│  ┌───────────────────────────┐  │
│  │  Extract Job Data         │  │ ← Main action
│  └───────────────────────────┘  │
│                                  │
│  ┌───────────────────────────┐  │
│  │  Open Side Panel          │  │ ← Direct access
│  └───────────────────────────┘  │
│                                  │
│  💡 Tip: Press Ctrl+Shift+H     │
│     to toggle the side panel    │
│                                  │
│  📊 Saved Jobs: 12              │ ← Status info
└─────────────────────────────────┘
```

### Settings Panel (Hidden by Default)
```
┌─────────────────────────────────┐
│  ⚙️ Settings                     │
├─────────────────────────────────┤
│                                  │
│  ☑ Use LLM for extraction       │ ← Default: ON
│     (Recommended)                │
│                                  │
│  LLM Endpoint:                   │
│  [http://localhost:1234/v1/...]  │
│                                  │
│  Model:                          │
│  [NuExtract-2.0]                │
│                                  │
│  [Test Connection]               │
│                                  │
│  [Save Settings]                 │
└─────────────────────────────────┘
```

### Tasks

#### 1. Update `popup.html` (30 min)
- [x] Remove all form fields (job title, company, location, etc.)
- [x] Remove "Save Job" and "Cancel" buttons
- [x] Keep settings section but move "Use LLM" checkbox into it
- [x] Simplify to 2 main buttons:
  - "Extract Job Data" (prominent, primary action)
  - "Open Side Panel" (secondary style)
- [x] Add keyboard shortcut tip (Ctrl+Shift+H)
- [x] Keep job count display
- [x] Remove duplicate warning badge (not needed in simple view)

#### 2. Update `popup.js` (1 hour)
- [x] Remove `populateForm()` function
- [x] Remove `saveJobData()` function
- [x] Remove `cancelEdit()` function
- [x] Remove `showDataSection()` / `hideDataSection()` functions
- [x] Remove `checkCurrentPageDuplicate()` function
- [x] Update `extractJobData()`:
  - Extract job data (keep existing logic)
  - Immediately save to storage with `jobInFocus` set
  - Open side panel automatically if not already open
  - Show toast: "Job extracted! Opening side panel..."
  - Close popup after extraction (let user edit in side panel)
- [x] Add `openSidePanel()` function:
  ```javascript
  async function openSidePanel() {
    const window = await chrome.windows.getCurrent();
    await chrome.sidePanel.open({ windowId: window.id });
  }
  ```
- [x] Update `loadSettings()`: Keep existing
- [x] Update `saveSettings()`: Keep existing, set LLM default to true
- [x] Update settings to default LLM to ON

#### 3. Update `popup.css` (15 min)
- [x] Remove form field styles (no longer needed)
- [x] Simplify layout for 2-button interface
- [x] Make "Extract Job Data" button more prominent
- [x] Style "Open Side Panel" as secondary button
- [x] Clean up unused styles

#### 4. Update `sidepanel.html` (15 min)
- [x] Remove "Extract Job Data" button from all states:
  - Remove from empty state
  - Remove from subtle button (when job exists)
  - Remove from edit form
- [x] Keep all editing functionality
- [x] Keep footer buttons (View All Jobs, Edit Master Resume)

#### 5. Update `sidepanel.js` (30 min)
- [x] Remove `extractJobData()` function (no longer needed)
- [x] Remove extract button event listeners
- [x] Keep all other functionality:
  - Display job in focus
  - Inline editing
  - Save changes
  - Multi-tab sync
  - Footer actions
- [x] Simplify empty state message:
  ```
  👋 Welcome to Sir Hires!
  
  To get started:
  1. Click the extension icon
  2. Navigate to a job posting
  3. Click "Extract Job Data"
  
  The job will appear here for editing.
  
  💡 Tip: Press Ctrl+Shift+H to toggle
     this panel anytime
  ```

#### 6. Update `sidepanel.css` (10 min) ✓
- [x] Remove extract button styles (no longer needed)
- [x] Clean up unused edit form styles
- [x] Keep all editing UI styles

#### 7. Set LLM as Default (10 min) ✓
- [x] Update default settings object in `popup.js`:
  ```javascript
  const llmSettings = result.llmSettings || {
    enabled: true,  // Changed from false to true
    endpoint: 'http://localhost:1234/v1/chat/completions',
    model: 'NuExtract-2.0'
  };
  ```
- [x] Update `background.js` initialization (if needed)

### Implementation Strategy

**Phase 1: Popup Simplification (1 hour)**
1. Update popup.html - remove form fields
2. Update popup.js - remove form logic, implement auto-save + auto-open
3. Update popup.css - simplify styles

**Phase 2: Side Panel Cleanup (45 min)**
4. Update sidepanel.html - remove extract button
5. Update sidepanel.js - remove extraction logic
6. Update sidepanel.css - clean up styles

**Phase 3: Defaults & Testing (30 min)**
7. Set LLM as default
8. Test full flow: Extract → Auto-save → Auto-open → Edit
9. Test settings panel
10. Test keyboard shortcuts

### User Flow After Sprint 7

1. **User clicks extension icon** → Popup opens
2. **User on job posting, clicks "Extract Job Data"**:
   - Popup extracts job data (using LLM by default)
   - Job is immediately saved to storage
   - Job is set as `jobInFocus`
   - Side panel auto-opens (if not already open)
   - Popup closes (or stays open for next extraction)
   - User sees job in side panel, ready to edit
3. **User clicks "Open Side Panel"**:
   - Side panel opens
   - Shows current job in focus (if any)
   - Shows empty state with instructions (if none)
4. **User edits fields in side panel**:
   - All fields are inline-editable
   - Auto-saves on blur
   - Visual feedback (💾 → ✓)

### Benefits

✅ **Clearer separation**: Popup = extract, Side panel = edit
✅ **Faster workflow**: Extract → Auto-open → Edit (no extra clicks)
✅ **Less confusion**: One interface for editing (side panel only)
✅ **Better defaults**: LLM extraction ON by default
✅ **Simpler popup**: Fewer buttons, clearer purpose
✅ **More accessible**: Direct "Open Side Panel" button

### Testing Checklist

- [ ] Popup shows only 2 buttons + settings cog
- [ ] Settings panel has "Use LLM" checkbox (default: ON)
- [ ] Extract button works and auto-saves job
- [ ] Extract button auto-opens side panel
- [ ] Extracted job appears in side panel immediately
- [ ] Side panel has no extract button
- [ ] Side panel inline editing still works
- [ ] "Open Side Panel" button works
- [ ] Ctrl+Shift+H keyboard shortcut works
- [ ] Job count displays correctly
- [ ] LLM is used by default for extraction
- [ ] Settings can disable LLM if desired
- [ ] Multi-tab sync still works
- [ ] All footer buttons in side panel still work

### Edge Cases to Handle

- [ ] **Extract when side panel already open**: Just update the job in focus
- [ ] **Extract when user editing in side panel**: Show warning or save current edits first
- [ ] **Side panel fails to open**: Show error message in popup
- [ ] **LLM extraction fails**: Fall back to DOM extraction (existing behavior)
- [ ] **No job boards open**: Disable extract button or show helpful message

---

## Status Update

- [x] Sprint 1: Basic Side Panel Structure ✓
- [x] Sprint 2: Extraction Integration ✓
- [x] Sprint 3: Job in Focus Logic ✓
- [x] Sprint 4: Full Job Details + Inline Editing ✓
- [x] Sprint 5: Multi-Tab Sync ✓
- [x] Sprint 6: Quick Actions ✓
- [x] Sprint 7: Popup Redesign - Separation of Concerns ✓

**Current Focus:** Simplifying popup to launcher-only, moving all editing to side panel, making LLM default.

