# State-Based Panel Navigation - Implementation Plan

## Overview
State-based navigation where each application status has its own panel view. Users navigate between states using left/right buttons that change the job status and slide to the appropriate panel.

## State Machine

```
Saved → Drafting → Applied → Screening → Interviewing → Offer → Accepted/Rejected/Withdrawn
```

**Navigation Rules:**
- Forward (→): Slides new panel in from right
- Backward (←): Requires confirmation, slides panel in from left
- Buttons only show valid transitions
- Status dropdown deprecated (will be removed in Phase 6)

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
async function navigateToState(jobIndex, newStatus, direction) {
  const job = allJobs[jobIndex];
  const oldStatus = job.application_status || 'Saved';
  
  // Check if moving backwards
  const isBackward = getStatusOrder(newStatus) < getStatusOrder(oldStatus);
  
  if (isBackward) {
    if (!confirm(`Move back to '${newStatus}'? This may discard progress.`)) {
      return;
    }
  }
  
  // CRITICAL: Set animation flag BEFORE storage save
  isAnimating = true;
  
  // Update status and save (triggers storage listener)
  job.application_status = newStatus;
  await chrome.storage.local.set({ jobs: allJobs });
  
  // Animate panel transition
  slideToPanel(newStatus, direction);
}
```

**Race Condition Prevention:**
The storage change listener is modified to check `isAnimating` flag:
```javascript
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.jobs) {
    if (isAnimating) {
      // Queue reload until animation completes
      pendingReload = true;
    } else {
      loadJobs();
    }
  }
});
```

This ensures animations complete smoothly without DOM interruption while still processing external changes after the animation.

### Slide Animation (Two-Panel Approach)
```javascript
function slideToPanel(status, direction) {
  const panel = document.getElementById('detailPanel');
  
  // Get new panel content
  const newContent = getJobDetailHTML(currentJobIndex, status);
  
  // Create wrapper with old and new panels
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position: relative; width: 100%; height: 100%; overflow: hidden;';
  
  // Old panel (current content)
  const oldPanel = document.createElement('div');
  oldPanel.innerHTML = panel.innerHTML;
  oldPanel.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; transition: transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1);';
  
  // New panel (offscreen)
  const newPanel = document.createElement('div');
  newPanel.innerHTML = newContent;
  newPanel.style.cssText = `position: absolute; top: 0; left: 0; width: 100%; transform: translateX(${direction === 'forward' ? '100%' : '-100%'}); transition: transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1);`;
  
  wrapper.appendChild(oldPanel);
  wrapper.appendChild(newPanel);
  panel.innerHTML = '';
  panel.appendChild(wrapper);
  
  // Trigger animation
  setTimeout(() => {
    const slideAmount = direction === 'forward' ? '-100%' : '100%';
    oldPanel.style.transform = `translateX(${slideAmount})`;
    newPanel.style.transform = 'translateX(0)';
  }, 50);
  
  // Clean up after animation
  setTimeout(() => {
    panel.innerHTML = newContent;
    isAnimating = false; // Allow storage listener to process queued reloads
    if (pendingReload) {
      pendingReload = false;
      loadJobs();
    }
  }, 450);
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

## Animation Implementation

**Method:** Inline CSS transitions with two-panel approach (not CSS keyframe animations)
- Old panel and new panel positioned absolutely in wrapper
- Both panels use `transition: transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)`
- Animate via `transform: translateX()` changes
- 50ms delay before triggering, 450ms total duration

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

### Phase 4: Slide Animations ✅ COMPLETE
- [x] Add CSS animation classes
- [x] Implement `slideToPanel()` function
- [x] Test slide-left for forward navigation
- [x] Test slide-right for backward navigation
- [x] Ensure smooth transitions
- [x] Fix storage change listener race condition

**Critical Issue Fixed:** Storage change listener was interrupting animations by re-rendering the DOM mid-transition. Solution: Added animation state management with `isAnimating` and `pendingReload` flags to queue storage updates until after animation completes (450ms). This prevents race conditions while ensuring no data loss from external changes.

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
