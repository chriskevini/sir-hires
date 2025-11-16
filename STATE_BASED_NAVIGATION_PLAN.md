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
- **Position:** Fixed at bottom of viewport, above progress bar (not part of scrollable content)
- **Design:** Round buttons (~80px) with arrow icons (← or →), color-coded to destination state
- **Label:** Shows destination state (e.g., "Draft", "Applied", "Saved") with matching color
- **Visibility:** Only shown for valid state transitions
- **Color mapping:** Uses `getProgressConfig()` to determine destination state color
- **Layout:** 
  - Wrapper positioned at `bottom: 60px` (above 40px progress bar + 20px gap)
  - Buttons use CSS custom property `var(--nav-color)` set dynamically
  - Labels inherit same color for consistent visual preview

### Animation
- **Slide left:** When moving forward (new content slides in from right)
- **Slide right:** When moving backward (new content slides in from left)
- **No fades or pop-ins:** Pure slide transitions

### Layout Structure
```
┌─────────────────────────────────────────────┐
│         SCROLLABLE PANEL CONTENT            │
│                                             │
│         (job details, cover letter,         │
│          or WIP content)                    │
│                                             │
│─────────────────────────────────────────────│ ← Fixed position boundary
│  [←]                               [→] [→]  │ ← Nav buttons (60px from bottom)
│  Back                          Next  Next   │
├─────────────────────────────────────────────┤
│████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░│ ← Progress bar (40px, bottom: 0)
└─────────────────────────────────────────────┘
```

- Content area has `padding-bottom: 60px` to prevent overlap with nav buttons
- Navigation buttons fixed at `bottom: 60px`, positioned above progress bar
- Progress bar fixed at `bottom: 0`, always visible (40px height)
- Buttons positioned outside scrollable content (siblings to `#detailPanel`)
- Multiple right buttons supported (e.g., Offer → Accepted/Rejected)

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
  
  // Clean up after animation - CRITICAL: Use removeProperty()
  setTimeout(() => {
    // Remove inline styles to let CSS rules apply
    panel.style.removeProperty('position');
    panel.style.removeProperty('overflow');
    panel.style.removeProperty('padding');
    panel.innerHTML = newContent;
    
    isAnimating = false; // Allow storage listener to process queued reloads
    if (pendingReload) {
      pendingReload = false;
      loadJobs();
    }
  }, 450);
}
```

**CRITICAL:** After animation cleanup, use `style.removeProperty()` instead of setting to empty string. Setting `style.padding = ''` creates an inline style that overrides CSS rules, even though the value is empty. Using `removeProperty()` completely removes the inline style, allowing CSS rules to apply correctly.

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

### Phase 5: Progress Bar ✅ COMPLETE
- [x] Add progress bar CSS to `viewer.html`
- [x] Add `getProgressConfig()` helper function to `viewer.js`
- [x] Add progress bar HTML structure (static, fixed at bottom)
- [x] Add `updateProgressBar()` function to handle animation control
- [x] Adjust `#detailPanel` layout for fixed bottom bar
- [x] Integrate progress bar updates in `navigateToState()` and `renderJobDetail()`
- [x] Test all status transitions
- [x] Verify animation synchronization with panel slides
- [x] Test edge cases (Saved state with 0% fill, terminal states at 100%)
- [x] Fix animation control: animate on state transitions, instant on job switch

**Design Specification:**
- Fixed at bottom of detail panel, always visible
- Horizontal filled bar showing current status name (left-justified text)
- Fill percentage and color mapped to status:
  - Saved: 0%, light gray (#e0e0e0)
  - Drafting: 20%, green (#4caf50)
  - Applied: 40%, blue (#2196f3)
  - Screening: 60%, purple (#9c27b0)
  - Interviewing: 80%, orange (#ff9800)
  - Offer/Accepted/Rejected/Withdrawn: 100%, red (#f44336)
- Smooth transition animations (0.4s cubic-bezier, synchronized with panel slides)
- Width transition for fill, color fade for background

### Phase 6: Polish & Testing ✅ COMPLETE
- [x] Remove status dropdown from job data panel
- [x] Add color-coded navigation buttons (match destination state colors)
- [x] Extend color scheme to navigation button labels
- [x] Reposition navigation buttons above progress bar (fixed position)
- [x] Fix animation padding issue (CSS property removal)
- [x] Test all state transitions
- [x] Test backward confirmation dialogs
- [x] Test Offer state with two right buttons
- [x] Test terminal state navigation
- [x] Verify no content overlap with buttons

**Critical Issue Fixed:** Animation padding bug where content padding would disappear after slide animations. Root cause: Setting inline `style.padding = ''` overrides CSS rules (empty string still counts as an inline style). Solution: Use `style.removeProperty('padding')` to remove inline styles entirely, allowing CSS rules to apply correctly.

**Navigation Button Enhancement:** 
- Buttons now color-coded to match their destination state
- Uses CSS custom properties (`--nav-color`) set via JavaScript from `getProgressConfig()`
- Both button backgrounds and labels inherit the destination color
- Provides clear visual preview of where navigation will take you

**Layout Refinement:**
- Navigation buttons moved outside scrollable content area
- Fixed position at bottom of viewport, above progress bar
- Consistent spacing: 60px padding-bottom on panel, 40px progress bar height
- Nav buttons positioned at `bottom: 60px` to sit above progress bar
- Content no longer overlaps or hides buttons during scroll

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
**Status:** ✅ COMPLETE - All phases finished and tested
**Total Implementation Time:** ~4-5 hours across 6 phases

## Post-Implementation Insights

### Key Learnings

1. **CSS vs Inline Styles:** Setting `style.property = ''` doesn't remove the inline style—it sets it to an empty value that still overrides CSS. Always use `style.removeProperty('property')` to truly remove inline styles and let CSS rules apply.

2. **Animation State Management:** Race conditions between storage listeners and animations require careful flag management (`isAnimating`, `pendingReload`) to prevent DOM interruptions mid-transition.

3. **Color-Coded Navigation:** Using CSS custom properties (`--nav-color`) for dynamic theming provides flexible styling while keeping color logic centralized in JavaScript.

4. **Fixed vs Scrollable Layout:** Separating fixed UI elements (nav buttons, progress bar) from scrollable content prevents overlap issues and maintains consistent visual hierarchy.

5. **Two-Panel Animation:** Creating temporary animation panels with matching padding ensures smooth transitions without visual "jumping" or size changes.

### Architecture Benefits

- **Maintainable:** Status-to-panel mapping is explicit and easy to extend
- **Performant:** Inline CSS transitions are smooth, no reflow during animations
- **Extensible:** Adding new states requires minimal code changes
- **User-Friendly:** Color coding and spatial navigation provide clear mental model

### Future Enhancements

- Add status-specific features to WIP panels (Screening, Interviewing, etc.)
- Implement panel-specific actions (e.g., schedule interview, log feedback)
- Consider adding subtle micro-animations for button interactions
- Explore keyboard shortcuts for navigation (arrow keys)
