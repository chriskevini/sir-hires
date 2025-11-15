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

## Sprint 4: Full Job Details + Inline Editing (1 hour)

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
- [ ] Create full job details display in `sidepanel.html`
- [ ] Add pencil icons to all fields
- [ ] Implement inline editing for all fields:
  - Text fields: job title, company, location, salary, etc.
  - Date fields: posted date, deadline
  - Select fields: status, remote type
  - Textareas: about job, company, responsibilities, requirements, notes, strategy
- [ ] Add visual feedback:
  - Hover: Highlight field, show pencil icon
  - Editing: Change border, show checkmark
  - Saving: Brief spinner
  - Saved: Green checkmark "Saved ✓" for 2 seconds
- [ ] Implement auto-save on blur (reuse viewer.js patterns)
- [ ] Make layout scrollable for full content

### All Editable Fields
- Job title, company, location, salary
- Job type, remote type
- Posted date, deadline
- Application status
- URL, source
- About job, about company
- Responsibilities, requirements
- Notes, narrative strategy

---

## Sprint 5: Multi-Tab Sync (30 min)

### Tasks
- [ ] Add storage change listener in `sidepanel.js`:
  ```javascript
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.jobInFocus || changes.jobs) {
        loadJobInFocus();
      }
    }
  });
  ```
- [ ] Test: Open multiple tabs, edit in one, verify others update
- [ ] Handle edge cases:
  - Focused job deleted in another tab
  - Multiple simultaneous edits

---

## Sprint 6: Quick Actions (30 min)

### Tasks
- [ ] Add action buttons to side panel footer:
  - **"View All Jobs"** → Opens viewer.html in new tab
  - **"Edit Master Resume"** → Opens resume.html in new tab
- [ ] Optional: Add "Change Focus" feature
  - Opens viewer.html with instruction: "Click any job to focus"
  - Clicking a job in viewer sets it as `jobInFocus`
- [ ] Test all navigation flows

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
- [ ] Changes sync across tabs
- [ ] Multiple tabs stay in sync
- [ ] Handle job deletion gracefully

### Sprint 6
- [ ] "View All Jobs" button works
- [ ] "Edit Master Resume" button works
- [ ] All navigation flows work correctly

---

## Status

- [x] Sprint 1: Basic Side Panel Structure ✓
- [x] Sprint 2: Extraction Integration ✓
- [x] Sprint 3: Job in Focus Logic ✓
- [ ] Sprint 4: Full Job Details + Inline Editing
- [ ] Sprint 5: Multi-Tab Sync
- [ ] Sprint 6: Quick Actions
