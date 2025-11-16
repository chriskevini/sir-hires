# State-Based Panel Navigation - Implementation Plan

## Overview
Refactor viewer to use state-based navigation where each application status has its own panel view. Users navigate between states using left/right buttons that change the job status and slide to the appropriate panel.

## State Machine

### Status Progression & Panel Views

```
Saved → Drafting → Applied → Screening → Interviewing → Offer → Accepted/Rejected/Withdrawn
  ↓         ↓         ↓          ↓             ↓           ↓              ↓
Job Data  Cover    WIP        WIP           WIP         WIP            WIP
 Panel    Letter
          Panel
```

### State Definitions

| Status | Panel Content | Left Button | Right Button(s) |
|--------|--------------|-------------|----------------|
| **Saved** | Job Data (fields, notes, narrative) | None | "Draft" → Drafting |
| **Drafting** | Cover Letter (generation/editing) | "Saved" → Saved | "Applied" → Applied |
| **Applied** | WIP placeholder | "Drafting" → Drafting | "Screening" → Screening |
| **Screening** | WIP placeholder | "Applied" → Applied | "Interviewing" → Interviewing |
| **Interviewing** | WIP placeholder | "Screening" → Screening | "Offer" → Offer |
| **Offer** | WIP placeholder | "Interviewing" → Interviewing | "Accepted" → Accepted<br>"Rejected" → Rejected |
| **Accepted** | WIP placeholder | "Offer" → Offer (confirm) | None |
| **Rejected** | WIP placeholder | "Offer" → Offer (confirm) | None |
| **Withdrawn** | WIP placeholder | Previous state (confirm) | None |

### Navigation Rules

1. **Forward navigation** (→): Changes status and slides new panel in from right
2. **Backward navigation** (←): Requires confirmation, changes status, slides panel in from left
3. **Only show buttons for valid transitions** (e.g., no left button on Saved state)
4. **Status dropdown is deprecated** - navigation buttons are the primary way to change status

## UI Architecture

### Single Panel Container
- No multi-panel sliding setup
- Content switches based on `job.application_status`
- Only one panel visible at a time
- Panel has left/right padding to make room for navigation buttons

### Navigation Buttons
- **Position:** Vertically centered on left/right edges, part of panel layout
- **Design:** Simple round buttons (~80px) with arrow icons (← or →)
- **Label:** Shows destination state (e.g., "Draft", "Applied", "Saved")
- **Visibility:** Only shown for valid state transitions
- **Status dots:** Removed for now (will be reworked later)

### Animation
- **Slide left:** When moving forward (new content slides in from right)
- **Slide right:** When moving backward (new content slides in from left)
- **No fades or pop-ins:** Pure slide transitions

### Layout Structure
```
┌─────────────────────────────────────────────┐
│                                             │
│  [←]        PANEL CONTENT           [→]     │
│  Back                              Next     │
│  Button                           Button    │
│                                             │
└─────────────────────────────────────────────┘
```

- Content area has left/right padding/margin to avoid button overlap
- Buttons are part of the panel (not floating/fixed)
- Buttons can be influenced by panel contents in the future

## Panel Content by State

### 1. Saved State (Job Data Panel)
- All existing job fields (title, company, location, salary, etc.)
- Job metadata (posted date, deadline)
- Text sections (about_job, about_company, responsibilities, requirements)
- Notes textarea
- Narrative Strategy textarea
- Job actions (view posting, delete)

### 2. Drafting State (Cover Letter Panel)
- Cover letter generation/display area
- Streaming indicator during generation
- Copy to clipboard button
- Edit capability (future)
- Regenerate button (future)

### 3. Applied+ States (WIP Panels)
- Simple "WIP" placeholder
- Future: Status-specific features (interview notes, offer details, etc.)

## Key Implementation Details

### Status Change Logic
```javascript
function navigateToState(jobIndex, newStatus, direction) {
  const job = allJobs[jobIndex];
  const oldStatus = job.application_status || 'Saved';
  
  // Check if moving backwards
  const isBackward = getStatusOrder(newStatus) < getStatusOrder(oldStatus);
  
  if (isBackward) {
    if (!confirm(`Move back to '${newStatus}'? This may discard progress.`)) {
      return;
    }
  }
  
  // Update status
  job.application_status = newStatus;
  await saveJob(job);
  
  // Animate panel transition
  slideToPanel(newStatus, direction);
}
```

### Slide Animation
```javascript
function slideToPanel(status, direction) {
  const panel = document.getElementById('detailPanel');
  
  // Add exit animation class
  panel.classList.add(direction === 'forward' ? 'slide-out-left' : 'slide-out-right');
  
  // Wait for exit animation
  setTimeout(() => {
    // Update content
    renderPanelForStatus(status);
    
    // Add enter animation class
    panel.classList.remove('slide-out-left', 'slide-out-right');
    panel.classList.add(direction === 'forward' ? 'slide-in-right' : 'slide-in-left');
    
    // Clean up animation classes
    setTimeout(() => {
      panel.classList.remove('slide-in-left', 'slide-in-right');
    }, 400);
  }, 400);
}
```

### Button Visibility
```javascript
function getNavigationButtons(status) {
  const buttons = { left: null, right: [] };
  
  switch(status) {
    case 'Saved':
      buttons.right = [{ label: 'Draft', target: 'Drafting' }];
      break;
    case 'Drafting':
      buttons.left = { label: 'Saved', target: 'Saved' };
      buttons.right = [{ label: 'Applied', target: 'Applied' }];
      break;
    case 'Offer':
      buttons.left = { label: 'Interviewing', target: 'Interviewing' };
      buttons.right = [
        { label: 'Accepted', target: 'Accepted' },
        { label: 'Rejected', target: 'Rejected' }
      ];
      break;
    // ... etc
  }
  
  return buttons;
}
```

## CSS Animation Classes

```css
/* Slide animations */
@keyframes slideOutLeft {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(-100%); opacity: 0; }
}

@keyframes slideOutRight {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(100%); opacity: 0; }
}

@keyframes slideInLeft {
  from { transform: translateX(-100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.slide-out-left { animation: slideOutLeft 0.4s cubic-bezier(0.4, 0.0, 0.2, 1); }
.slide-out-right { animation: slideOutRight 0.4s cubic-bezier(0.4, 0.0, 0.2, 1); }
.slide-in-left { animation: slideInLeft 0.4s cubic-bezier(0.4, 0.0, 0.2, 1); }
.slide-in-right { animation: slideInRight 0.4s cubic-bezier(0.4, 0.0, 0.2, 1); }
```

## Implementation Checklist

### Phase 1: Core State Machine ✅ COMPLETE
- [x] Define status order array
- [x] Implement `navigateToState()` function
- [x] Implement `getNavigationButtons()` function
- [x] Add backward navigation confirmation

### Phase 2: Panel Rendering ✅ COMPLETE
- [x] Refactor `renderJobDetail()` to route based on status
- [x] Create `renderJobDataPanel()` (move existing code)
- [x] Create `renderCoverLetterPanel()` (new)
- [x] Create `renderWIPPanel()` (placeholder)

### Phase 3: Navigation Buttons ✅ COMPLETE
- [x] Create button HTML structure
- [x] Add button CSS (round, arrow icon, label)
- [x] Position buttons with padding to avoid content overlap
- [x] Implement button click handlers
- [x] Connect to `navigateToState()`

### Phase 4: Slide Animations
- [ ] Add CSS animation classes
- [ ] Implement `slideToPanel()` function
- [ ] Test slide-left for forward navigation
- [ ] Test slide-right for backward navigation
- [ ] Ensure smooth transitions

### Phase 5: Cover Letter Integration
- [ ] Move existing cover letter HTML to `renderCoverLetterPanel()`
- [ ] Hook up generation logic to Drafting state entry
- [ ] Test streaming display
- [ ] Add copy button
- [ ] Test navigation to/from cover letter

### Phase 6: Polish & Testing
- [ ] Remove status dropdown from job data panel
- [ ] Test all state transitions
- [ ] Test backward confirmation dialogs
- [ ] Test Offer state with two right buttons
- [ ] Test terminal state navigation
- [ ] Verify no content overlap with buttons

## Files to Modify

1. **viewer.html** - Add animation CSS classes, update button styles
2. **viewer.js** - Refactor rendering logic, add state machine, navigation handlers
3. **AGENTS.md** - Update agent guidelines with new navigation pattern

## Design Decisions & Rationale

### Why State-Based Over Sliding Panels?
- **Simpler mental model:** Status = Panel (1:1 mapping)
- **Easier to extend:** Adding new status states just means new panels
- **No complex width calculations:** No need to juggle viewport math
- **Better for mobile:** Single panel easier to adapt to small screens

### Why Deprecate Status Dropdown?
- **Buttons are clearer:** Visual progression path
- **Prevents confusion:** Can't jump randomly to wrong state
- **Enforces confirmation:** Backward navigation always prompts user
- **Better UX:** Explicit actions instead of dropdown selection

### Why Slide Animations?
- **Spatial awareness:** Users understand left/right as previous/next
- **Visual continuity:** Content flows naturally
- **No jarring transitions:** Smooth, professional feel
- **Reinforces progression:** Rightward motion = forward progress

### Why Simple Round Buttons?
- **Focus on content:** Buttons don't dominate the UI
- **Room to evolve:** Status dots can be added back later
- **Clean aesthetic:** Matches modern design trends
- **Functional simplicity:** Arrow + label = clear affordance

---

**Branch:** `feature/state-based-navigation`
**Status:** Ready to implement
**Estimated effort:** 2-3 hours for core functionality, 1-2 hours for polish
