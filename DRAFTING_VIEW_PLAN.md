# Drafting View Feature Plan

## Overview
Add a Drafting state view that provides a lightweight markdown text editor for creating tailored resumes and cover letters. The view integrates with the existing state-based navigation system and supports LLM-powered content synthesis.

## Implementation Status
🚧 **PLANNED** - Not yet started

---

## Design Decisions

### 1. Storage Schema: Dynamic Document Keys

**Structure:**
```javascript
{
  // Existing job fields...
  documents: {
    [documentKey: string]: {
      title: string,       // User-editable document title
      text: string,        // Markdown content
      lastEdited: string,  // ISO 8601 timestamp
      order: number        // Tab display order (0, 1, 2, ...)
    }
  }
}
```

**Default Documents:**
```javascript
documents: {
  tailoredResume: {
    title: "Software Engineer Resume - Google Inc.",
    text: "",
    lastEdited: null,
    order: 0
  },
  coverLetter: {
    title: "Cover Letter - Software Engineer at Google Inc.",
    text: "",
    lastEdited: null,
    order: 1
  }
}
```

**Why Dynamic Keys?**
- ✅ **Fast access**: O(1) lookup via `job.documents[key]`
- ✅ **Extensible**: Easy to add custom document types in future
- ✅ **Performance**: Critical for auto-save (runs every 3-5 seconds)
- ✅ **Flexible ordering**: Use `order` field for tab sorting
- ✅ **Aligns with codebase patterns**: Consistent with existing object-based configs

### 2. Tab System: Robust & Extensible

**Configuration-Driven Tabs:**
```javascript
// In DraftingView class
this.defaultDocuments = {
  tailoredResume: {
    label: 'Resume/CV',
    order: 0,
    defaultTitle: (job) => `${job.jobTitle} Resume - ${job.company}`,
    placeholder: 'Write your tailored resume here...'
  },
  coverLetter: {
    label: 'Cover Letter',
    order: 1,
    defaultTitle: (job) => `Cover Letter - ${job.jobTitle} at ${job.company}`,
    placeholder: 'Write your cover letter here...'
  }
};
```

**Features:**
- Dynamic tab rendering from `Object.keys(job.documents)`
- Sorted by `order` field
- Editable document titles (inline input above editor)
- State preservation when switching tabs
- Warn on unsaved changes (optional)

### 3. LLM Configuration: Centralized

**Add to config.js:**
```javascript
// LLM configuration for different tasks
export const llmConfig = {
  // Data extraction LLM (for job data extraction from web pages)
  extraction: {
    defaultModel: 'NuExtract-2.0-2B',
    alternativeModels: ['NuExtract-2.0-8B'],
    endpoint: 'http://localhost:1234/v1/chat/completions',
    description: 'Optimized for structured data extraction from job postings'
  },
  
  // Document synthesis LLM (for resume/cover letter generation)
  synthesis: {
    defaultModel: 'Llama-3.1-8B-Instruct',
    alternativeModels: ['Mistral-7B-Instruct', 'Qwen-2.5-7B-Instruct'],
    endpoint: 'http://localhost:1234/v1/chat/completions',
    description: 'Optimized for creative writing and document generation',
    maxTokens: 2000,
    temperature: 0.7
  }
};
```

**Why Separate Configs?**
- Different models excel at different tasks
- Extraction needs precision → NuExtract
- Synthesis needs creativity → Llama/Mistral
- Users can configure per use case

### 4. LLM Synthesis Modal (Phase 5) - **UPDATED v2.0**

**Design Philosophy:**
- User edits **prompt template with placeholders** (e.g., `{masterResume}`, `{jobTitle}`)
- Data values are edited in job fields (researching-view), not in the modal
- Custom templates saved globally in `chrome.storage.local.customPrompts`
- Fast iteration: edit template → generate → review → adjust → regenerate

**Modal UI Features:**
```
┌─────────────────────────────────────────┐
│ ✨ Synthesize Resume/CV with LLM     [×]│
├─────────────────────────────────────────┤
│ ⚠️ Warning (if existing content)        │
│                                          │
│ Prompt Template:      [Reset to Default]│
│ ┌─────────────────────────────────────┐ │
│ │ **Role:** You are an expert...     │ │
│ │                                     │ │
│ │ **Task:** Synthesize a NEW...      │ │
│ │                                     │ │
│ │ **Inputs:**                         │ │
│ │ [Master Resume]{masterResume}       │ │
│ │ [Job Title]{jobTitle}               │ │
│ │ [Company]{company}                  │ │
│ │ [Requirements]{requirements}        │ │
│ │ ...                                 │ │
│ └─────────────────────────────────────┘ │
│                                          │
├─────────────────────────────────────────┤
│ [Model: llama3.1 ▼]  [Cancel] [Generate]│
└─────────────────────────────────────────┘
```

**Storage Schema:**
```javascript
{
  customPrompts: {
    resume: string | null,      // null = use default from config.js
    coverLetter: string | null  // null = use default from config.js
  }
}
```

**Modal Components:**

1. **Modal Title**
   - Dynamic title includes document type: `"✨ Synthesize ${documentLabel} with LLM"`
   - Examples: "✨ Synthesize Resume/CV with LLM", "✨ Synthesize Cover Letter with LLM"

2. **Existing Content Warning** (if applicable)
   - Shows only if document has existing content
   - Warning: "⚠️ It looks like you already began writing this document. The LLM will use this as a draft to expand upon."

3. **Prompt Template Editor**
   - Large textarea (~250px height) showing prompt template
   - Contains placeholders: `{masterResume}`, `{jobTitle}`, `{company}`, etc.
   - User edits the template structure, not the data values
   - Auto-loads custom template from storage or falls back to config default
   - Editable by user for quick experimentation

4. **Reset to Default Button**
   - Located next to "Prompt Template:" label
   - On click: Confirms, then clears custom prompt and reloads config default
   - Confirmation message: "Reset to default prompt? This will discard your custom template."
   - Sets `customPrompts[documentType] = null` in storage

5. **Model Selector** (Footer - Left Side)
   - Dropdown: Choose from available models loaded in LM Studio
   - Fetches models from `/v1/models` endpoint on modal open
   - Default: `llmConfig.synthesis.defaultModel` if available
   - Shows warning if no models are loaded: "⚠️ No models loaded in LM Studio. Please load a model first."

6. **Action Buttons** (Footer - Right Side)
   - **Cancel**: Close modal, discard changes
   - **Generate**: Save template → fill placeholders → send to LLM
     - Auto-saves edited template to `chrome.storage.local.customPrompts[documentType]`
     - Replaces placeholders with actual data from job fields
     - Sends filled prompt to LLM API
     - Shows loading state: "⏳ Generating..."

**Removed Components (from v1.0):**
- ❌ Document selector dropdown (pre-selected based on active tab)
- ❌ Data checklist section (user already knows what data they have)
- ❌ Recommendations section (simplified UX)
- ❌ Action selection radio buttons (auto-detects generate vs refine based on existing content)
- ❌ Privacy notice (removed clutter, users trust local LLM)

**Key Behaviors:**

1. **On Modal Open:**
   - Load custom template from storage or fall back to config default
   - Detect if document has existing content (for warning)
   - Fetch available models from LM Studio API
   - Pre-populate template textarea

2. **On Generate Click:**
   - Save edited template to `chrome.storage.local.customPrompts[documentType]`
   - Fetch context data (master resume, job fields)
   - Replace placeholders in template with actual values
   - Send filled prompt to LLM API
   - Insert generated content into document editor
   - Close modal

3. **On Reset Click:**
   - Show confirmation dialog
   - If confirmed: Set `customPrompts[documentType] = null`
   - Reload default template from `config.js`
   - Update textarea with default template

**Prompt Replacement Logic:**
```javascript
buildPrompt(template, context) {
  const replacements = {
    masterResume: context.masterResume || 'Not provided',
    jobTitle: context.jobTitle || 'Not provided',
    company: context.company || 'Not provided',
    aboutJob: context.aboutJob || 'Not provided',
    aboutCompany: context.aboutCompany || 'Not provided',
    requirements: context.requirements || 'Not provided',
    responsibilities: context.responsibilities || 'Not provided',
    narrativeStrategy: context.narrativeStrategy || 'Not provided',
    currentDraft: context.currentDraft || ''
  };
  
  let prompt = template;
  for (const [key, value] of Object.entries(replacements)) {
    prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  
  return prompt;
}

---

## Element Hierarchy

```
drafting-view (rendered in detail panel by main-view)
│
├── .job-card (container, consistent with researching-view)
│   │
│   └── .detail-panel-content
│       │
│       ├── .job-header (minimal, just title/company for context)
│       │   ├── .job-title
│       │   ├── .company
│       │   └── .badge (source link if available)
│       │
│       └── .drafting-editor-container (main editing area)
│           │
│           ├── .editor-topbar
│           │   │
│           │   ├── .tab-container (left side)
│           │   │   ├── button.tab-btn.active[data-tab="tailoredResume"]
│           │   │   │   └── "Resume/CV"
│           │   │   └── button.tab-btn[data-tab="coverLetter"]
│           │   │       └── "Cover Letter"
│           │   │
│           │   └── .editor-actions (right side)
│           │       │
│           │       ├── button.btn-synthesize#synthesizeBtn
│           │       │   └── "✨ Synthesize with LLM"
│           │       │
│           │       └── .dropdown-container.export-dropdown
│           │           ├── button.btn-dropdown#exportDropdownBtn
│           │           │   └── "📥 Export ▼"
│           │           └── .dropdown-menu.hidden#exportDropdownMenu
│           │               ├── button.dropdown-item[data-export="md"]
│           │               │   └── "📄 Export as Markdown (.md)"
│           │               └── button.dropdown-item[data-export="pdf"]
│           │                   └── "📑 Export as PDF (.pdf)"
│           │
│           ├── .editor-wrapper (contains the actual editor)
│           │   │
│           │   ├── .editor-content.active[data-content="tailoredResume"]
│           │   │   ├── input.document-title-input[data-field="tailoredResume-title"]
│           │   │   │   └── [editable title]
│           │   │   └── textarea.document-editor[data-field="tailoredResume-text"]
│           │   │       └── [markdown content]
│           │   │
│           │   └── .editor-content.hidden[data-content="coverLetter"]
│           │       ├── input.document-title-input[data-field="coverLetter-title"]
│           │       │   └── [editable title]
│           │       └── textarea.document-editor[data-field="coverLetter-text"]
│           │           └── [markdown content]
│           │
│           └── .editor-footer (optional: status, word count, etc.)
│               ├── .editor-status
│               │   └── span.save-indicator "Auto-saved 2 minutes ago"
│               └── .editor-meta
│                   └── span.word-count "250 words"
```

---

## Visual Layout (ASCII)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Software Engineer @ Google Inc.            [LinkedIn] ┃
┠────────────────────────────────────────────────────────┨
┃                                                        ┃
┃  [Resume/CV] [Cover Letter]     ✨ Synth  📥 Export ▼ ┃
┃  ▔▔▔▔▔▔▔▔▔▔                                           ┃
┃                                                        ┃
┃  Software Engineer Resume - Google Inc.               ┃
┃  ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔       ┃
┃ ╔════════════════════════════════════════════════════╗ ┃
┃ ║ # Your Name                                        ║ ┃
┃ ║ email@example.com | linkedin.com/in/yourprofile   ║ ┃
┃ ║                                                    ║ ┃
┃ ║ ## Summary                                         ║ ┃
┃ ║ Experienced software engineer specializing in...  ║ ┃
┃ ║                                                    ║ ┃
┃ ║ ## Experience                                      ║ ┃
┃ ║ ### Senior Developer | Company | 2020-Present     ║ ┃
┃ ║ - Led development of scalable microservices...    ║ ┃
┃ ║ - Improved system performance by 40%...           ║ ┃
┃ ║                                                    ║ ┃
┃ ╚════════════════════════════════════════════════════╝ ┃
┃                                                        ┃
┃  Auto-saved 2 minutes ago                  250 words  ┃
┃                                                        ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## Implementation Phases

### **Phase 1: Storage Schema** (Foundation)
**Goal:** Extend the job data model to support draft documents

#### Tasks:
1. **Add documents object to job schema**
   - Define structure in AGENTS.md
   - Default keys: `tailoredResume`, `coverLetter`
   - Each document: `{ title, text, lastEdited, order }`

2. **Create storage utility functions** (storage.js)
   ```javascript
   // Initialize empty documents for a job
   initializeDocuments(job)
   
   // Get document by key (with defaults)
   getDocument(job, documentKey)
   
   // Save document
   saveDocument(jobId, documentKey, { title, text })
   
   // Get sorted document keys
   getDocumentKeys(job)
   ```

3. **Update AGENTS.md**
   - Add `documents` field to job schema
   - Document structure and conventions
   - Add to schema synchronization checklist

**Files Modified:**
- `chrome-extension/job-details/storage.js`
- `AGENTS.md`

---

### **Phase 2: UI Structure** (Scaffolding)
**Goal:** Create the basic drafting view component and integrate it

#### Tasks:
1. **Add CSS styles to job-details.html**
   - `.drafting-editor-container` - Main container
   - `.editor-topbar` - Horizontal bar with tabs + actions
   - `.tab-container`, `.tab-btn`, `.tab-btn.active` - Tab styles
   - `.editor-actions` - Action buttons container
   - `.btn-synthesize` - Synthesize button style (purple theme)
   - `.dropdown-container`, `.dropdown-menu`, `.dropdown-item` - Dropdown
   - `.editor-wrapper`, `.editor-content` - Editor panels
   - `.document-title-input` - Inline title editor
   - `.document-editor` - Textarea (monospace font)
   - `.editor-footer`, `.editor-status`, `.editor-meta` - Footer

2. **Create DraftingView class** (views/drafting-view.js)
   ```javascript
   export class DraftingView extends BaseView {
     constructor() {
       super();
       this.defaultDocuments = { /* config */ };
       this.activeTab = 'tailoredResume';
       this.autoSaveInterval = null;
       this.unsavedChanges = {};
     }
     
     render(job, index) { /* ... */ }
     attachListeners(container, job, index, isExpanded) { /* ... */ }
     cleanup() { /* ... */ }
     
     // Tab management
     getDocumentKeys(job) { /* ... */ }
     getDocument(job, key) { /* ... */ }
     switchTab(newTabKey) { /* ... */ }
     
     // Rendering helpers
     renderTabs(job) { /* ... */ }
     renderEditors(job) { /* ... */ }
     renderTopbar(job) { /* ... */ }
   }
   ```

3. **Register DraftingView in main-view.js**
   ```javascript
   import { DraftingView } from './views/drafting-view.js';
   
   this.views = {
     'Researching': new ResearchingView(),
     'Drafting': new DraftingView(),  // ← Add this
     // ... other views
   };
   ```

**Files Created:**
- `chrome-extension/job-details/views/drafting-view.js`

**Files Modified:**
- `chrome-extension/job-details.html` (CSS)
- `chrome-extension/job-details/main-view.js`

---

### **Phase 3: Core Features** (Essential Functionality)
**Goal:** Implement the main editing workflow

#### Tasks:
1. **Implement tab switching**
   - Click tab button → switch active tab
   - Update `.active` class on tabs
   - Show/hide corresponding `.editor-content`
   - Preserve content in hidden editors
   - Update export dropdown document selection

2. **Implement auto-save functionality**
   - Start interval on view mount (every 3-5 seconds)
   - Check for changes in title and text
   - Save to `job.documents[activeTab]`
   - Update `lastEdited` timestamp
   - Show save indicator in footer
   - Clear interval on view cleanup

3. **Implement export dropdown**
   - Click trigger → toggle `.hidden` on menu
   - Click outside → close menu
   - Click menu item → trigger export action
   - Pattern similar to markdown guide in resume.html

4. **Implement editable document titles**
   - Input field above each editor
   - Auto-save title changes
   - Use default title if empty

**Files Modified:**
- `chrome-extension/job-details/views/drafting-view.js`
- `chrome-extension/job-details/app.js` (event handlers)

---

### **Phase 4: Export Functionality** (Output)
**Goal:** Enable users to export their drafted documents

#### Tasks:
1. **Implement Export as Markdown**
   - Get active document content
   - Create blob with `text/markdown` type
   - Use document title for filename
   - Use `chrome.downloads.download()` API
   - Show success toast
   - Pattern: Similar to resume.js exportMarkdown()

2. **Research and implement Export as PDF**
   - **Option A**: jsPDF library
     - Pros: Full control, works offline
     - Cons: Need to bundle library, manual formatting
   
   - **Option B**: html2pdf.js
     - Pros: Converts HTML → PDF, easier styling
     - Cons: Need to convert markdown → HTML first
   
   - **Option C**: Browser print API
     - Pros: Native, no dependencies
     - Cons: User must click through print dialog, less control
   
   - **Recommended**: Start with Option C (print API) for MVP, add jsPDF later for one-click PDF

3. **Add export status feedback**
   - Show toast on successful export
   - Handle errors gracefully
   - Show filename in success message

**Files Modified:**
- `chrome-extension/job-details/views/drafting-view.js`
- `chrome-extension/manifest.json` (if adding libraries)

---

### **Phase 5: LLM Synthesis** (AI Enhancement)
**Goal:** Add AI-powered content generation with streaming support for thinking models

#### Tasks:
1. **Add llmConfig to config.js** ✅ **COMPLETED**
   ```javascript
   export const llmConfig = {
     extraction: { /* ... */ },
     synthesis: { /* ... */ }
   };
   ```

2. **Create synthesis modal component** ✅ **COMPLETED**
   - Modal overlay + dialog
   - Document selector dropdown
   - Model selector dropdown
   - Data checklist with status indicators
   - Recommendations section
   - Action selector (Generate/Refine radio buttons)
   - Privacy notice
   - Cancel + Generate buttons
   - Loading state with spinner
   
   **CSS classes:**
   - `.synthesis-modal-overlay`
   - `.synthesis-modal`
   - `.modal-header`, `.modal-body`, `.modal-footer`
   - `.data-checklist`, `.checklist-item`
   - `.checklist-status` (available/warning/missing)
   - `.recommendation-box`
   - `.privacy-notice`

3. **Implement data checklist logic** ✅ **COMPLETED**
   ```javascript
   checkDataAvailability(job, activeTab) {
     // Check master resume
     // Check job details (title, company, description, etc.)
     // Check narrative strategy
     // Check current draft
     // Return array of checklist items with status
     // Note: Show warnings only, do not block generation
   }
   
   generateRecommendations(checklistResults) {
     // If missing critical data → show warning (not error)
     // If missing narrative → suggest research
     // If missing details → suggest more context
     // User can still proceed with generation
   }
   ```

4. **Implement LLM API integration with streaming support** 🚧 **IN PROGRESS - v2.0 Streaming Update**
   
   **4.1 Non-Streaming Implementation** ✅ **COMPLETED**
   ```javascript
   async synthesizeDocument(documentKey, model, prompt) {
     // Test connection to LM Studio
     // Build prompt with context
     // Call LM Studio API (non-streaming)
     // Return generated content
     // Handle errors (connection failed, model not loaded, API errors)
   }
   ```
   
   **Connection Testing:**
   - Test connection to `http://localhost:1234` before synthesis
   - If connection fails: Show error modal with instructions
   - Error message: "Cannot connect to LM Studio. Please ensure LM Studio is running on http://localhost:1234"
   - Log detailed errors to console for debugging
   
   **Model Selection:**
   - Fetch available models from `/v1/models` endpoint
   - Display all available models in dropdown
   - Default to `llmConfig.synthesis.defaultModel` if available
   - If no models available: Show warning in modal
   
   **4.2 Streaming Implementation** 🚧 **PLANNED - v2.0 Update**
   
   **Problem:**
   - Thinking models (o1, o3, DeepSeek R1) include reasoning in `<think>` or `<thinking>` tags
   - Non-streaming returns full response including reasoning preamble
   - Token exhaustion risk with fixed 2000 token limit (reasoning can use 800-1500 tokens)
   - Users receive unusable documents filled with AI reasoning text
   
   **Solution: Streaming Detection + Cleaning**
   
   **New Method Signature:**
   ```javascript
   async synthesizeDocument(
     documentKey, 
     model, 
     prompt, 
     onThinkingUpdate,  // NEW: Callback for thinking stream updates
     onDocumentUpdate,  // NEW: Callback for document stream updates
     maxTokens = 2000   // NEW: Configurable token limit
   ) {
     // Returns: { content, thinkingContent, truncated, currentTokens }
   }
   ```
   
   **Key Features:**
   
   1. **Server-Sent Events (SSE)** - Stream content in real-time
      ```javascript
      const response = await fetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature: 0.7,
          stream: true  // ← Enable streaming
        })
      });
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      // Process SSE messages: "data: {...}\n"
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        // Parse SSE format and route content
      }
      ```
   
   2. **Dynamic Thinking Detection** - Detect patterns from actual response
      ```javascript
      // State machine for content routing
      let state = 'DETECTING';  // DETECTING → IN_THINKING_BLOCK → IN_DOCUMENT
      let buffer = '';
      let thinkingContent = '';
      let documentContent = '';
      
      function processChunk(chunk) {
        buffer += chunk;
        
        // Check first 500 chars for thinking patterns
        if (state === 'DETECTING' && buffer.length <= 500) {
          if (/<think>|<thinking>/i.test(buffer)) {
            state = 'IN_THINKING_BLOCK';
            console.log('[Synthesis] Thinking model detected');
          } else if (buffer.length === 500) {
            state = 'IN_DOCUMENT';  // Standard model
          }
        }
        
        // Route content based on state
        if (state === 'IN_THINKING_BLOCK') {
          if (/<\/think>|<\/thinking>/i.test(buffer)) {
            state = 'IN_DOCUMENT';
            // Extract thinking, start document
          }
          onThinkingUpdate(parseThinking(chunk));
        } else if (state === 'IN_DOCUMENT') {
          onDocumentUpdate(chunk);
        }
      }
      
      function parseThinking(rawThinking) {
        // Remove tags: <think>, </think>, <thinking>, </thinking>
        // Keep content for readability
        return rawThinking.replace(/<\/?think(ing)?>/gi, '').trim();
      }
      ```
   
   3. **Token Exhaustion Handling** - User retry with increased limit
      ```javascript
      // Check finish reason from SSE
      if (finishReason === 'length') {
        return {
          content: documentContent,
          thinkingContent: thinkingContent,
          truncated: true,
          currentTokens: maxTokens
        };
      }
      
      // In handleGenerate() - prompt user to retry
      if (result.truncated) {
        const retry = confirm(
          `⚠️ Response was truncated due to token limit (${result.currentTokens} tokens).\n\n` +
          `This often happens with thinking models that use reasoning before output.\n\n` +
          `Would you like to retry with ${result.currentTokens * 2} tokens?`
        );
        
        if (retry) {
          await this.synthesizeDocument(
            documentKey, model, prompt,
            onThinkingUpdate, onDocumentUpdate,
            result.currentTokens * 2  // Double tokens
          );
        }
      }
      ```
   
   4. **Thinking Stream UI** - Show reasoning in real-time
      ```
      ┌─────────────────────────────────────────┐
      │ Job Header                              │
      ├─────────────────────────────────────────┤
      │ [▼ AI Thinking Process]  ← Togglable   │
      │ ┌───────────────────────────────────┐   │
      │ │ Analyzing job requirements...     │   │
      │ │ Identifying relevant experiences  │   │
      │ │ Structuring narrative...          │   │
      │ └───────────────────────────────────┘   │
      ├─────────────────────────────────────────┤
      │ Tabs: [Resume] [Cover Letter]          │
      ├─────────────────────────────────────────┤
      │ Editor (streams document content)       │
      └─────────────────────────────────────────┘
      ```
      
      **UI Requirements:**
      - Togglable scrolling textbox between tabs and editor
      - Auto-scroll to bottom as thinking streams
      - Parse and remove `<think>` tags for readability
      - Show in real-time during generation
      - Hide when generation completes (no persistence)
      - Expand/collapse with ▼/▶ icon toggle
   
   5. **Real-Time Updates** - Stream to both thinking panel and editor
      ```javascript
      // In drafting-view.js
      this.synthesisModal.onGenerate = (jobIndex, documentKey, result) => {
        if (result.truncated) {
          // Handle token exhaustion (show retry dialog)
          return;
        }
        
        // Content is already in editor from streaming updates
        // Just update save indicator and word count
        this.updateSaveIndicator(container, 'saved');
        this.updateWordCount(container);
        this.showToast('Document generated successfully!', 'success');
      };
      ```
   
   **Implementation Files:**
   - `synthesis-modal.js` (~line 239-278) - Replace `synthesizeDocument()` with streaming
   - `synthesis-modal.js` (new methods) - Add `parseThinking()`, `processChunk()`, state machine
   - `synthesis-modal.js` (~line 527-578) - Update `handleGenerate()` with retry dialog
   - `drafting-view.js` (~line 80-88) - Add thinking stream panel HTML
   - `drafting-view.js` (~line 674-733) - Update synthesis listener with streaming callbacks
   - `drafting-view.js` (new methods) - Add `showThinkingPanel()`, `hideThinkingPanel()`, `updateThinkingStream()`
   - `styles/sidepanel.css` - Add thinking stream styles
   
   **Why Streaming Detection?**
   - ✅ **No model lists to maintain** - Detects thinking patterns from actual response
   - ✅ **Works with any thinking model** - o1, o3, DeepSeek R1, future models
   - ✅ **Graceful fallback** - Standard models work without changes
   - ✅ **Real-time feedback** - Users see thinking process as it happens
   - ✅ **Clean output** - Thinking tags removed from final document
   - ✅ **Dynamic token allocation** - Start with 2000, upgrade based on detection
   
   **Testing Strategy:**
   - Test with thinking models (DeepSeek R1, o1 if available)
   - Test with standard models (Llama-3.1, Mistral)
   - Test token exhaustion with small limits
   - Test retry dialog and token doubling
   - Test thinking panel toggle/collapse
   - Test edge cases: short responses, false positives, network interruption

5. **Design prompts for resume and cover letter**
   
   **Note**: Prompts will be refined by user after initial implementation. Use placeholder prompts for Phase 5.
   
   **Resume Prompt:**
   ```
    You are a professional career counselor specializing in crafting high-impact resumes.
  Your task is to analyze the provided Job Listing, extract relevant achievements from the Master Resume and follow the Applicant's Narrative Strategy instructions.
  Synthesize a resume by copying bullet points from the Master Resume verbatim.
  The final output must match the formatting of the master resume with only relevant sections. 

  INPUTS
  [Master Resume]{masterResume}
  [Job Title]{jobTitle}
  [Company]{company}
  [Responsibilities]{responsibilities}
  [Requirements]{requirements}
  [About the job]{aboutJob}
  [About the company]{aboutCompany}
  [Narrative Strategy]{narrativeStrategy}
  [Current Draft]{currentDraft}

  Synthesize now.
   ```
   
   **Cover Letter Prompt:**
   ```
    You are a professional career counselor specializing in crafting high-impact cover letters.
  Your task is to analyze the provided Job Listing, extract relevant achievements from the Master Resume, and strictly follow the Applicant's Narrative Strategy instructions.
  Synthesize a cohesive, tailored, and intriguing cover letter addressed to a Hiring Manager. Do not include any placeholder text (e.g., [Hiring Manager Name]).
  The final output must be only the cover letter, formatted professionally.

  INPUTS
  [Master Resume]{masterResume}
  [Job Title]{jobTitle}
  [Company]{company}
  [Responsibilities]{responsibilities}
  [Requirements]{requirements}
  [About the job]{aboutJob}
  [About the company]{aboutCompany}
  [Narrative Strategy]{narrativeStrategy}
  [Current Draft]{currentDraft}

  Synthesize now.
   ```

6. **Integrate modal with synthesize button**
   - Click synthesize → open modal
   - Pre-populate document selector with active tab
   - Run data availability check
   - Show recommendations
   - On "Generate" → call LLM API → insert content → close modal
   - On "Cancel" → close modal

7. **Add event handlers to app.js**
   ```javascript
   handleSynthesizeDocument(event) {
     // Open modal
     // Handle generate action
     // Update editor content
     // Show success/error
   }
   ```

**Files Created:**
- `chrome-extension/job-details/components/synthesis-modal.js` (separate component class) ✅ **COMPLETED**

**Files Modified:**
- `chrome-extension/job-details/config.js` ✅ **COMPLETED**
- `chrome-extension/job-details/views/drafting-view.js`
- `chrome-extension/job-details/app.js`
- `chrome-extension/job-details.html` (modal CSS)

**Implementation Updates (v2.0):**
- ✅ Simplified modal UI (removed document selector, data checklist, action radio buttons, privacy notice)
- ✅ Added prompt template editor with placeholder syntax
- ✅ Added custom prompt storage in `chrome.storage.local.customPrompts`
- ✅ Added "Reset to Default" button with confirmation
- ✅ Moved model selector to footer (left side)
- ✅ Auto-save template on "Generate" click (global scope)
- ✅ LLM auto-detects generate vs refine based on `{currentDraft}` value

---

### **Phase 6: Testing & Polish** (Quality Assurance)
**Goal:** Ensure everything works together and is production-ready

#### Tasks:
1. **Test all features**
   - ✅ Tab switching preserves content
   - ✅ Auto-save works reliably
   - ✅ Export MD downloads correct file
   - ✅ Export PDF generates readable document
   - ✅ Synthesize button opens modal
   - ✅ Data checklist shows correct status
   - ✅ LLM synthesis generates content
   - ✅ Editable titles persist
   - ✅ Footer shows correct status and word count

2. **Add migration if needed**
   - Check if existing jobs need `documents` initialization
   - Add migration function to migration.js
   - Increment dataVersion if schema changed
   - Test migration with existing data

3. **Verify checklist integration**
   - Checklist renders in sidebar
   - Checklist uses Drafting template from config.js
   - Toggling items works
   - Expand/collapse works
   - Animations work correctly

4. **Cross-browser testing**
   - Test in Chrome (primary target)
   - Test responsive layout at different widths
   - Verify keyboard shortcuts work (Ctrl+S to save)

5. **Error handling**
   - ✅ LLM server not running → show friendly error (implemented in Phase 5)
   - ✅ LLM connection testing → detailed console logs (implemented in Phase 5)
   - Export fails → show error toast
   - Auto-save fails → retry or show warning
   - Empty content → disable certain actions

6. **Accessibility**
   - Tab navigation works
   - ARIA labels on buttons
   - Modal can be closed with Escape key
   - Focus management in modal

7. **Documentation**
   - Update README.md with Drafting view features
   - Update AGENTS.md with implementation details
   - Add inline code comments for complex logic

**Files Modified:**
- `chrome-extension/job-details/migration.js` (if needed)
- `README.md`
- `AGENTS.md`

---

## Technical Implementation Details

### Auto-Save Pattern

```javascript
startAutoSave(job, index) {
  if (this.autoSaveInterval) {
    clearInterval(this.autoSaveInterval);
  }
  
  this.autoSaveInterval = setInterval(() => {
    const documentKeys = this.getDocumentKeys(job);
    let hasChanges = false;
    
    documentKeys.forEach(key => {
      const titleInput = document.querySelector(`[data-field="${key}-title"]`);
      const textArea = document.querySelector(`[data-field="${key}-text"]`);
      
      if (!titleInput || !textArea) return;
      
      const currentTitle = titleInput.value.trim();
      const currentText = textArea.value.trim();
      const savedDoc = job.documents?.[key];
      
      if (currentTitle !== savedDoc?.title || currentText !== savedDoc?.text) {
        this.saveDocument(index, key, {
          title: currentTitle,
          text: currentText
        });
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      this.updateSaveIndicator('Auto-saved');
    }
  }, 5000); // Every 5 seconds
}
```

### Tab Switching with State Preservation

```javascript
switchTab(newTabKey) {
  // Validate tab key
  if (!this.defaultDocuments[newTabKey] && !job.documents?.[newTabKey]) {
    console.error(`Invalid tab key: ${newTabKey}`);
    return;
  }
  
  // Update active tab
  const previousTab = this.activeTab;
  this.activeTab = newTabKey;
  
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.dataset.tab === newTabKey) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Update editor visibility
  document.querySelectorAll('.editor-content').forEach(editor => {
    if (editor.dataset.content === newTabKey) {
      editor.classList.remove('hidden');
      editor.classList.add('active');
      // Focus textarea
      const textarea = editor.querySelector('.document-editor');
      if (textarea) textarea.focus();
    } else {
      editor.classList.add('hidden');
      editor.classList.remove('active');
    }
  });
  
  // Update word count for new tab
  this.updateWordCount(newTabKey);
}
```

### Export Dropdown Toggle

```javascript
attachExportDropdownListeners() {
  const dropdownBtn = document.getElementById('exportDropdownBtn');
  const dropdownMenu = document.getElementById('exportDropdownMenu');
  
  if (!dropdownBtn || !dropdownMenu) return;
  
  // Toggle dropdown
  const toggleHandler = (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('hidden');
  };
  this.trackListener(dropdownBtn, 'click', toggleHandler);
  
  // Close on outside click
  const outsideClickHandler = (e) => {
    if (!dropdownMenu.contains(e.target) && e.target !== dropdownBtn) {
      dropdownMenu.classList.add('hidden');
    }
  };
  this.trackListener(document, 'click', outsideClickHandler);
  
  // Export actions
  dropdownMenu.querySelectorAll('.dropdown-item').forEach(item => {
    const exportHandler = () => {
      const exportType = item.dataset.export;
      this.handleExport(exportType);
      dropdownMenu.classList.add('hidden');
    };
    this.trackListener(item, 'click', exportHandler);
  });
}
```

---

## CSS Style Guidelines

**Follow existing patterns from sidepanel.css:**
- Use `#1a73e8` for primary actions (blue)
- Use `#9c27b0` for LLM/AI actions (purple)
- Use `#f1f3f4` for backgrounds
- Use `border-radius: 4px` for buttons
- Use `transition: all 0.2s` for hover effects
- Use monospace font for editors: `'Courier New', Monaco, monospace`

**New color additions:**
```css
.btn-synthesize {
  background-color: #9c27b0; /* Purple for AI actions */
  color: white;
}

.btn-synthesize:hover {
  background-color: #7b1fa2;
}
```

---

## Migration Strategy

**Likely not needed**, but if required:

```javascript
// In migration.js
async function migrateToV0_2_2() {
  console.log('Migrating to v0.2.2 - Adding documents support');
  
  const result = await chrome.storage.local.get(['jobs']);
  const jobs = result.jobs || [];
  
  jobs.forEach(job => {
    if (!job.documents) {
      // Initialize empty documents
      job.documents = {
        tailoredResume: {
          title: `${job.jobTitle || 'Resume'} - ${job.company || 'Company'}`,
          text: '',
          lastEdited: null,
          order: 0
        },
        coverLetter: {
          title: `Cover Letter - ${job.jobTitle || 'Position'} at ${job.company || 'Company'}`,
          text: '',
          lastEdited: null,
          order: 1
        }
      };
    }
  });
  
  await chrome.storage.local.set({ 
    jobs,
    dataVersion: 4  // v0.2.2
  });
  
  console.log('Migration to v0.2.2 complete');
}
```

---

## Future Enhancements (Post-MVP)

1. **Custom Document Types**
   - UI to add/remove document tabs
   - User-defined document templates

2. **Document Templates**
   - Pre-built templates for different industries
   - User can save their own templates

3. **Rich Text Editor**
   - WYSIWYG markdown editor
   - Live preview pane
   - Formatting toolbar

4. **Version History**
   - Track document revisions
   - Restore previous versions
   - Compare versions side-by-side

5. **Collaborative Features**
   - Export to Google Docs
   - Share draft for feedback

6. **Enhanced LLM Features**
   - Multiple synthesis options (formal/casual tone)
   - Section-by-section generation
   - Inline suggestions/improvements
   - Grammar and style checking

7. **Export Options**
   - Export to DOCX
   - Export with custom styling/themes
   - ATS-optimized formatting

---

## Testing Checklist

Before marking implementation complete:

- [ ] Documents storage schema works correctly
- [ ] Tab switching preserves content
- [ ] Auto-save updates storage every 5 seconds
- [ ] Document titles are editable and persist
- [ ] Export MD downloads with correct filename
- [ ] Export PDF generates readable document
- [ ] Synthesize button opens modal
- [ ] Data checklist shows correct availability
- [ ] Recommendations appear for missing data
- [ ] LLM synthesis generates content (both resume and cover letter)
- [ ] Generated content appears in editor
- [ ] Word count updates correctly
- [ ] Save indicator shows correct status
- [ ] Checklist component renders in sidebar
- [ ] Navigation buttons work (Researching ← → Awaiting Review)
- [ ] View persists across navigation
- [ ] No console errors
- [ ] Clean up on view unmount (clear intervals, remove listeners)

---

## Known Limitations

1. **PDF Export**: Initial implementation may use browser print dialog (requires user interaction)
2. **LLM Dependency**: Requires LM Studio running locally
3. **No Offline Editing**: Auto-save requires storage API access
4. **Single Job Focus**: Cannot edit multiple jobs' documents simultaneously
5. **Basic Markdown**: No live preview or WYSIWYG editing in MVP

---

## Success Criteria

✅ User can navigate to Drafting state from Researching  
✅ User can switch between Resume and Cover Letter tabs  
✅ User can edit document title and content  
✅ Content auto-saves without user action  
✅ User can export documents as MD and PDF  
✅ User can generate/refine content with LLM  
✅ Modal shows what data will be sent to LLM  
✅ User receives recommendations if data is missing  
✅ All data stays local (privacy-first maintained)  
✅ Integration with existing navigation and checklist systems  

---

**Status:** Ready for implementation. Begin with Phase 1 when approved.
