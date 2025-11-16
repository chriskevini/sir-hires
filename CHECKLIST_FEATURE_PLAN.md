# Checklist Component Feature Plan

## Overview
Add a collapsible checklist component that sits above the right navigation button in the job details view. Users can track their progress through status-specific tasks.

## Implementation Status
✅ **COMPLETED** - Feature fully implemented as of v0.2.1

## Design Decisions

### 1. Templates
- **Different templates per status**: Each application status (Researching, Drafting, Awaiting Review, etc.) has its own checklist template
- **Copy on creation**: Checklist is initialized when job is first created/extracted from the template for that status
- **Status-specific persistence**: Each status has its own independent checklist array that persists when switching statuses

### 2. Storage
- **Per-job instances**: Each job has its own checklist instance (can be customized per-job)
- **Global UI state**: Expanded/collapsed state is global across all jobs (not per-job)
- **Per-status arrays**: Checklist data organized by status, allowing independent checklists for each stage
- **Schema version**: v0.2.1 (dataVersion: 3) with migration support from v0.2.0

### 3. Visual Design
- **Position**: Float above the right navigation button (bottom-right of detail panel)
- **Minimized state**: Fixed 3 dots (•••) in a vertical column with color preview of next status
- **Expanded state**: Right-aligned dropdown panel with bullet list
- **Toggle**: Click on 3-dot expander to expand/collapse
- **Color coding**: Checked items (●) and expander dots use next status's color for visual progress indication
- **Always visible**: Shows even when empty (0 items) for consistency

### 4. Interaction
- **Bullet points**: Start unfilled (○), click anywhere on item row to toggle filled (●)
- **Persistence**: Checked state saved to storage immediately
- **Smooth animations**: 
  - Expand animation: Vertical dropdown with scale effect
  - Collapse animation: Reverse vertical collapse
  - Transform origin: bottom-right (anchored to expander dots)
- **In-place updates**: When already expanded, item checks update without re-triggering animation

## Storage Schema

### Current Implementation (v0.2.1, dataVersion: 3)

#### Job Object Structure
```javascript
{
  // ... existing job fields ...
  checklist: {
    Researching: [
      { 
        id: string,           // unique ID (format: "item_<timestamp>_<random>")
        text: string,         // checklist item text
        checked: boolean,     // completion state
        order: number         // display order
      }
    ],
    Drafting: [...],
    'Awaiting Review': [...],
    Interviewing: [...],
    Deciding: [...],
    Accepted: [...],
    Rejected: [...],
    Withdrawn: [...]
  }
}
```

#### Global UI Preference
```javascript
{
  checklistExpanded: boolean  // Global state for expanded/collapsed UI
}
```

### Migration History
- **v0.2.0 → v0.2.1** (dataVersion: 2 → 3): Refactored from `{ items: [] }` to per-status arrays
  - Preserves existing checked items during migration
  - Distributes items to appropriate status arrays based on job's current status
  - Adds empty arrays for all other statuses

### Checklist Templates

Defined in `chrome-extension/job-details/config.js` as `checklistTemplates`:
```javascript
export const checklistTemplates = {
  'Researching': [
    { text: 'Review job description thoroughly', order: 0 },
    { text: 'Research company culture and values', order: 1 },
    { text: 'Check salary range and benefits', order: 2 },
    { text: 'Review requirements vs. qualifications', order: 3 },
    { text: 'Note application deadline', order: 4 }
  ],
  'Drafting': [
    { text: 'Tailor resume for this position', order: 0 },
    { text: 'Draft cover letter', order: 1 },
    { text: 'Prepare required documents', order: 2 },
    { text: 'Review application for errors', order: 3 }
  ],
  'Awaiting Review': [
    { text: 'Confirm application submitted', order: 0 },
    { text: 'Note expected response timeline', order: 1 },
    { text: 'Follow up if needed', order: 2 }
  ],
  'Interviewing': [
    { text: 'Research interviewer backgrounds', order: 0 },
    { text: 'Prepare STAR responses', order: 1 },
    { text: 'Prepare questions to ask', order: 2 },
    { text: 'Send thank you notes', order: 3 }
  ],
  'Deciding': [
    { text: 'Review offer details', order: 0 },
    { text: 'Negotiate if appropriate', order: 1 },
    { text: 'Compare with other offers', order: 2 },
    { text: 'Make final decision', order: 3 }
  ],
  'Accepted': [
    { text: 'Sign offer letter', order: 0 },
    { text: 'Complete onboarding paperwork', order: 1 },
    { text: 'Notify other applications', order: 2 }
  ],
  'Rejected': [
    { text: 'Request feedback if appropriate', order: 0 },
    { text: 'Update notes with learnings', order: 1 }
  ],
  'Withdrawn': [
    { text: 'Send withdrawal notification', order: 0 },
    { text: 'Document reason for withdrawal', order: 1 }
  ]
};
```

## Implementation Summary

### Completed Tasks

1. ✅ **config.js**: Added checklist templates
   - Templates for all 8 statuses (Researching, Drafting, Awaiting Review, Interviewing, Deciding, Accepted, Rejected, Withdrawn)
   - Export as `checklistTemplates` constant

2. ✅ **components/checklist.js**: Created ChecklistComponent class
   - Extends BaseView for lifecycle management
   - Methods: `render()`, `renderExpander()`, `renderExpandedDropdown()`, `update()`, `updateItemStates()`, `attachListeners()`
   - Callbacks: `setOnToggleExpand()`, `setOnToggleItem()`
   - Dynamic color calculation based on next status in progression
   - Smart update logic to prevent unnecessary animation triggers

3. ✅ **storage.js**: Added checklist utilities
   - `initializeChecklistForJob(status)` - creates per-status checklist arrays from templates
   - `getChecklistExpanded()` / `setChecklistExpanded()` - global UI state management
   - Proper initialization with unique IDs for each item

4. ✅ **popup.js**: Initialize checklist when creating new jobs
   - Convert to ES6 module to import config
   - Call `initializeChecklistForJob()` on job save
   - Copy templates for all statuses, not just current one

5. ✅ **main-view.js**: Integrated checklist rendering
   - Pass through to view-specific rendering (ResearchingView handles it)
   - Positioned above right nav button via CSS

6. ✅ **researching-view.js**: Implemented checklist in view
   - Method: `renderChecklist(job, index, isExpanded)` 
   - Creates ChecklistComponent instance
   - Sets up callbacks for toggle events
   - Renders into checklist container

7. ✅ **job-details.html**: Added CSS styles
   - Minimized state: `.checklist-expander` with 3 vertical dots
   - Expanded state: `.checklist-dropdown` with animated expansion
   - Animations: `@keyframes expandVertical` and `collapseVertical`
   - Transform origin: bottom-right for proper anchoring
   - Item styles: `.checklist-item`, `.checklist-bullet`, `.checklist-text`
   - Right-aligned layout with proper spacing

8. ✅ **app.js**: Added event handlers
   - `handleChecklistToggleExpand()` - saves global expanded state
   - `handleChecklistToggleItem()` - toggles item checked state and saves to storage
   - Loads `checklistExpanded` state on initialization
   - Re-renders checklist after updates

9. ✅ **migration.js**: Added v2→v3 migration
   - Converts old `{ items: [] }` format to per-status arrays
   - Preserves existing checked items
   - Initializes empty arrays for all statuses
   - Handles missing checklist gracefully

10. ✅ **AGENTS.md**: Updated documentation
    - Added `checklist` field to job schema
    - Added `checklistExpanded` global preference
    - Added migration notes

### Key Implementation Details

**Component Architecture**:
- ChecklistComponent is self-contained (rendering + event handling)
- Uses callback pattern for event communication to parent
- Smart update logic distinguishes between expand/collapse transitions vs. item updates

**Animation System**:
- CSS keyframe animations for smooth expand/collapse
- `transform-origin: bottom-right` keeps animation anchored to expander
- In-place updates (`updateItemStates()`) prevent re-triggering animations when just toggling items
- Collapse animation waits for completion before re-rendering (300ms timeout)

**Color System**:
- Expander dots show preview of next status color
- Checked bullets (●) use next status color
- Unchecked bullets (○) remain neutral gray
- Colors pulled from `progressConfig` in config.js

**Storage Pattern**:
- Per-status arrays allow independent checklists for each application stage
- Global UI preference for expanded/collapsed state (not per-job)
- Immediate persistence on any state change
- Migration ensures backward compatibility

## CSS Structure (Implemented)

```css
/* Container positioning */
.checklist-container {
  position: absolute;
  right: 24px;
  bottom: 160px;
  z-index: 15;
}

/* Minimized state - 3 vertical dots (always visible) */
.checklist-expander {
  /* Positioned at bottom-right */
  /* Clickable to toggle expand/collapse */
}

.checklist-dots {
  /* 3 dots styled with next status color */
}

/* Expanded state - dropdown panel */
.checklist-dropdown {
  /* Right-aligned panel above expander */
  /* Animated expansion with expandVertical keyframes */
}

.checklist-dropdown.expanded {
  animation: expandVertical 0.3s cubic-bezier(0.4, 0.0, 0.2, 1) forwards;
  transform-origin: bottom right;
}

.checklist-dropdown.collapsing {
  animation: collapseVertical 0.3s cubic-bezier(0.4, 0.0, 0.2, 1) forwards;
  transform-origin: bottom right;
}

/* Items list */
.checklist-items {
  /* Scrollable list (max 300px height) */
  /* Right-aligned content */
}

/* Individual item */
.checklist-item {
  /* Right-aligned row with text + bullet */
  /* Clickable to toggle checked state */
}

.checklist-text {
  /* Item label */
}

.checklist-bullet {
  /* Unfilled (○) or filled (●) circle */
  /* Checked state uses next status color */
}
```

## Migration Notes

### Automatic Migration
- Jobs without checklist field automatically initialize on first load
- Migration from v0.2.0 to v0.2.1 handled by `migration.js`
- Preserves existing checked items when converting to new format
- Defaults to collapsed state (checklistExpanded: false)

### Manual Intervention
None required - all migrations are automatic.

## Animation System - Solution to Unwanted Animations

### Problem
When switching between jobs while checklist is expanded, the checklist would play the expand animation even though the user didn't click anything. This happened because the `.expanded` CSS class had a baked-in animation that triggered every time the class appeared in the DOM during re-renders.

### Solution: Animation Class Toggle Pattern
Implemented separation of display state from animation state:

**Display State** (`.expanded` class):
- Controls whether checklist is visible (expanded) or hidden (collapsed)
- Has NO animation property - appears in final state immediately
- Defined in `job-details.html` CSS

**Animation State** (`.expanding` / `.collapsing` classes):
- Controls when animations play (user-triggered only)
- Applied only during user interactions (clicking the expander)
- Removed after animation completes

### Implementation Details

**1. CSS Changes** (`chrome-extension/job-details.html`):
```css
/* Display state - no animation */
.checklist-dropdown.expanded {
  min-width: 280px;
  max-width: 320px;
  background-color: white;
  /* ... other styles ... */
  /* NO animation property */
}

/* Animation state - only applied during user interaction */
.checklist-dropdown.expanding {
  animation: expandVertical 0.3s cubic-bezier(0.4, 0.0, 0.2, 1) forwards;
}

.checklist-dropdown.collapsing {
  animation: collapseVertical 0.3s cubic-bezier(0.4, 0.0, 0.2, 1) forwards;
}
```

**2. Component Changes** (`chrome-extension/job-details/components/checklist.js`):

Added `animate` parameter to `update()` method:
```javascript
update(container, checklist, status, jobIndex, isExpanded = false, animate = false)
```

Three-branch logic:
1. **Collapse with animation** (`wasExpanded && !isExpanded && animate`):
   - Add `.collapsing` class
   - Wait for animation to complete
   - Then re-render

2. **Expand with animation** (`!wasExpanded && isExpanded && animate`):
   - Render with `.expanded` class
   - Set initial transform state (scaleY(0), opacity 0)
   - Add `.expanding` class with `requestAnimationFrame()`
   - Remove `.expanding` class after animation completes

3. **No animation** (all other cases):
   - Simply re-render with correct expanded state
   - No animation classes applied
   - Used for navigation, job switching, and item toggling

**3. View Changes** (`chrome-extension/job-details/views/researching-view.js`):

`renderChecklist()` method signature updated:
```javascript
renderChecklist(job, index, isExpanded = false, animate = false)
```

Passes `animate` parameter through to component's `update()` method.

**4. App Changes** (`chrome-extension/job-details/app.js`):

User-triggered toggle passes `animate = true`:
```javascript
handleChecklistToggleExpand(event) {
  // ...
  this.mainView.currentView.renderChecklist(job, index, isExpanded, true); // animate = true
}
```

All other renders pass `animate = false` (or omit it to use default):
- Job navigation/switching
- Item toggle updates
- Initial renders

### Files Modified
- `chrome-extension/job-details.html` (lines ~589-606) - Removed animation from `.expanded`, added `.expanding` class
- `chrome-extension/job-details/components/checklist.js` (lines ~117-180) - Added `animate` parameter and three-branch logic
- `chrome-extension/job-details/views/researching-view.js` (lines ~317-353, ~357-380) - Added `animate` parameter, removed duplicate code
- `chrome-extension/job-details/main-view.js` (lines ~91-125) - Updated WIP view's `renderChecklist()` helper
- `chrome-extension/job-details/app.js` (lines ~555-571) - Pass `animate = true` for user clicks only

### Result
✅ **User clicks expander**: Animation plays smoothly  
✅ **Switching between jobs**: No unwanted animation  
✅ **Toggling checklist items**: No animation (checklist stays open)  
✅ **Initial page load**: No animation

