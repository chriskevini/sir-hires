# Checklist Component Feature Plan

## Overview
Add a collapsible checklist component that sits above the right navigation button in the job details view. Users can track their progress through status-specific tasks.

## Design Decisions

### 1. Templates
- **Different templates per status**: Each application status (Researching, Drafting, Awaiting Review, etc.) has its own checklist template
- **Copy on creation**: Checklist is initialized when job is first created/extracted from the template for that status

### 2. Storage
- **Per-job instances**: Each job has its own checklist instance (can be customized per-job)
- **Per-job state**: Each job remembers whether its checklist is expanded or collapsed
- **Template version tracking**: For future template updates

### 3. Visual Design
- **Position**: Float above the right navigation button (bottom-right of detail panel)
- **Minimized state**: Fixed 3 dots (•••) in a vertical column
- **Expanded state**: Right-aligned dropdown panel with bullet list
- **Toggle**: Click anywhere on component to expand/collapse

### 4. Interaction
- **Bullet points**: Start unfilled (○), click to toggle filled (●)
- **Persistence**: Checked state saved to storage immediately
- **Smooth animations**: Expand/collapse transitions

## Storage Schema

### Job Object Addition
```javascript
{
  // ... existing job fields ...
  checklist: {
    items: [
      { 
        id: string,           // unique ID for ordering/updates
        text: string,         // checklist item text
        checked: boolean,     // completion state
        order: number         // display order
      }
    ],
    isExpanded: boolean,      // UI state (per-job)
    templateVersion: string   // e.g., "v1" for future updates
  }
}
```

### Checklist Templates (in config.js)
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

## Implementation Tasks

1. **config.js**: Add checklist templates
2. **components/checklist.js**: Create ChecklistComponent class
   - Extends BaseView
   - Methods: render(), toggle(), updateItem(), attachListeners()
3. **storage.js**: Add checklist initialization utility
   - `initializeChecklistForJob(status)` - creates checklist from template
4. **popup.js**: Initialize checklist when creating new jobs
   - Copy template when job is extracted/saved
5. **main-view.js**: Integrate checklist rendering
   - Position above right nav button
6. **job-details.html**: Add CSS styles
   - Minimized state (3 dots)
   - Expanded state (dropdown panel)
   - Toggle animations
   - Checkbox styles (filled/unfilled circles)
7. **app.js**: Add event handler for checklist updates
   - Save checked state to storage
8. **AGENTS.md**: Update documentation with new schema

## CSS Structure
```css
.checklist-container {
  position: absolute;
  right: 24px;
  bottom: 160px; /* Above nav button */
  z-index: 15;
}

.checklist-minimized {
  /* 3 vertical dots */
}

.checklist-expanded {
  /* Dropdown panel with list */
}

.checklist-item {
  /* Individual checklist item */
}

.checklist-bullet {
  /* Unfilled/filled circle */
}
```

## Migration Considerations
- Existing jobs without checklist will need to initialize on first view
- Add migration code to handle missing checklist field
- Default to collapsed state for backward compatibility
