# Drafting View Feature Plan

## Overview
Add a Drafting state view that provides a lightweight markdown text editor for creating tailored resumes and cover letters. The view integrates with the existing state-based navigation system and supports LLM-powered content synthesis.

## Implementation Status
✅ **v1.0 COMPLETED** - Single-pass system with XML streaming (Dec 2024)  
🔄 **v2.0 IN PROGRESS** - Pivoting to two-pass system (Analysis + Synthesis)

---

## Version History

### v1.0 (Completed - December 2024)
**Implementation:** Single-pass document synthesis with XML-based streaming protocol

**Key Features:**
- ✅ Tabbed document editor (Resume/CV, Cover Letter)
- ✅ Hybrid auto-save (blur + 5-second interval)
- ✅ Real-time word count and save indicators
- ✅ XML-based streaming with thinking model support (`<thinking>` tags)
- ✅ User-controlled thinking panel (collapsible, persistent state)
- ✅ Template-based generation (default templates with AI instructions)
- ✅ Data availability checklist (9 input fields)
- ✅ Configurable max tokens (100-32000 range)
- ✅ Dynamic model selection from LM Studio

**Architecture:**
- System prompt in `config.js` (universal, document-agnostic)
- User prompt built JIT with available data fields
- Single-pass generation: Analysis + Content Selection + Synthesis in one call
- Template replacement on first stream delta

**Problems Identified:**
- ❌ **Instruction overload** for small/medium models (7B-14B parameter range)
- ❌ Single prompt tries to do too much: analyze job, select content, format output, follow rules
- ❌ Models struggle with complex constraints (verbatim bullets, strict formatting, page limits)
- ❌ Large context window usage (master resume + job data + rules + examples)

**Commits:** 19 commits, +4377 lines
- Core implementation: `drafting-view.js` (1190 lines), `synthesis-modal.js` (738 lines)
- Streaming fixes: null documentKey bug, template replacement, thinking panel
- Configuration: System prompt, default templates, LLM config

---

### v2.0 (Planned - Two-Pass System)
**Goal:** Reduce cognitive load on models by splitting synthesis into two focused passes

---

---

## Two-Pass System Architecture (v2.0)

### Problem Statement
The v1.0 single-pass system overloads small/medium models (7B-14B parameters) with too many responsibilities:
1. **Analysis**: Understand job requirements and identify gaps
2. **Content Selection**: Choose relevant achievements from master resume
3. **Prioritization**: Rank content by relevance and impact
4. **Formatting**: Apply document-specific rules (verbatim bullets, page limits)
5. **Synthesis**: Generate cohesive, polished output

Result: Models struggle with constraint adherence, produce inconsistent output, or fail to follow complex rules.

### Solution: Two-Pass System
Split synthesis into two focused phases with different models and goals:

#### **Pass 1: Analysis (Researching View)**
**Location:** Researching View (new "AI Insights" section)  
**Model:** Small analytical model (3B-7B, e.g., Qwen-2.5-3B-Instruct, Phi-3-mini)  
**Goal:** Help user identify gaps and prepare for drafting

**Tasks:**
1. **Gap Analysis**: Compare master resume to job requirements
   - Missing skills, experiences, or qualifications
   - Weak areas that need strengthening
   - Overqualified areas that can be de-emphasized

2. **Content Prioritization**: Rank master resume achievements by relevance
   - Top 10-15 most relevant bullet points for this job
   - Suggested order/grouping for maximum impact
   - Content to exclude (irrelevant or space-constrained)

3. **Strategy Recommendations**: Suggest narrative approach
   - Tone (technical, leadership, collaborative, innovative)
   - Focus areas (match job's top 3-5 requirements)
   - Red flags to address (career gaps, job hopping, overqualification)

**Output:**
- Stored in `job.aiInsights` (new field)
- Displayed as expandable section in Researching View
- User can review, edit, or regenerate
- Informs user's manual Narrative Strategy entry

**Benefits:**
- ✅ Small model can focus on pure analysis (no formatting constraints)
- ✅ User reviews insights before drafting (human-in-the-loop)
- ✅ Prepares user to write better Narrative Strategy
- ✅ No risk of model "creativity" ruining final document

---

#### **Pass 2: Synthesis (Drafting View)**
**Location:** Drafting View (existing synthesis modal)  
**Model:** Medium synthesis model (7B-14B, e.g., Llama-3.1-8B, Mistral-7B)  
**Goal:** Generate formatted document with strict constraints

**Tasks:**
1. **Structure**: Apply document template format exactly
2. **Formatting**: Follow document-specific rules (verbatim bullets for resume, synthesis for cover letter)
3. **Line Count**: Respect page limits and section balance

**Simplified Inputs:**
- Master Resume (filtered by Pass 1 analysis)
- Job fields (title, company, requirements)
- Narrative Strategy (informed by Pass 1 insights)
- Current Draft (template with rules)

**Constraints:**
- NO analysis or prioritization (already done in Pass 1)
- NO creative interpretation (follow user's Narrative Strategy)
- ONLY structural and formatting tasks

**Benefits:**
- ✅ Reduced prompt complexity (no analysis instructions)
- ✅ Model focuses on formatting and rule-following
- ✅ Smaller context window (pre-selected content)
- ✅ Higher quality output (simpler task = better adherence)

---

### Implementation Plan (v2.0)

#### Phase 1: Add AI Insights to Researching View
**Files to Modify:**
- `chrome-extension/job-details/views/researching-view.js` (add insights section)
- `chrome-extension/job-details/storage.js` (add `aiInsights` field)
- `chrome-extension/job-details/config.js` (add analysis prompt)
- `chrome-extension/job-details.html` (add insights CSS)

**New Schema:**
```javascript
{
  // Existing job fields...
  aiInsights: {
    gapAnalysis: string,        // Missing skills/experiences
    contentPriority: string[],  // Ranked bullet points from master resume
    strategyTips: string,       // Narrative approach suggestions
    generatedAt: string,        // ISO 8601 timestamp
    model: string               // Model used for analysis
  }
}
```

**UI Components:**
- Expandable "AI Insights" section (similar to checklist)
- "Generate Insights" button (calls analysis LLM)
- Editable text fields for each insight category
- "Refresh" button to regenerate

#### Phase 2: Simplify Drafting View Synthesis
**Files to Modify:**
- `chrome-extension/job-details/config.js` (simplify synthesis prompt)
- `chrome-extension/job-details/components/synthesis-modal.js` (update context builder)

**Prompt Simplification:**
- Remove analysis instructions (already in Pass 1)
- Remove content selection logic (pre-filtered by user)
- Focus ONLY on structure, formatting, and rule adherence

**Example New Prompt:**
```
You are a document formatter specialized in applying strict formatting rules.

Your task:
1. Read the [CURRENT DRAFT] to understand the required structure and rules
2. Use ONLY the provided content from [MASTER RESUME]
3. Apply formatting rules exactly as specified
4. Output ONLY the final formatted document

CONSTRAINTS:
- NO analysis or prioritization (content is pre-selected)
- NO creative additions (use provided content only)
- STRICTLY follow formatting rules in [CURRENT DRAFT]
```

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

### 4. LLM Synthesis Modal (Phase 5) - **UPDATED v3.0**

**Design Philosophy:**
- System prompt in `config.js` defines AI behavior and streaming protocol
- User sees **data availability checklist** (not editable prompt)
- Data values are edited in job fields (researching-view), not in the modal
- System prompt will be editable in future config page
- Fast iteration: generate → review → adjust data → regenerate

**Modal UI Features:**
```
┌─────────────────────────────────────────┐
│ ✨ Synthesize Resume/CV with LLM     [×]│
├─────────────────────────────────────────┤
│ Input Data:                              │
│ ✓ Master Resume                         │
│ ✓ Job Title                             │
│ ✓ Company                               │
│ ✓ About Job                             │
│ ○ About Company                         │
│ ✓ Responsibilities                      │
│ ✓ Requirements                          │
│ ○ Narrative Strategy                    │
│ ○ Current Draft                         │
│                                          │
│ ⚠️ Missing data detected. We recommend  │
│    doing more research before           │
│    synthesizing.                        │
│                                          │
├─────────────────────────────────────────┤
│ Max Tokens: [2000]                       │
│ [Model: llama3.1 ▼]  [Cancel] [Generate]│
└─────────────────────────────────────────┘
```

**Storage Schema:**
```javascript
// Custom prompts storage REMOVED
// System prompt in config.js (editable via future config page)
```

**Modal Components:**

1. **Modal Title**
   - Dynamic title includes document type: `"✨ Synthesize ${documentLabel} with LLM"`
   - Examples: "✨ Synthesize Resume/CV with LLM", "✨ Synthesize Cover Letter with LLM"

2. **Data Availability Checklist**
   - Shows all 9 input fields with status:
     - ✓ Filled bullet (green checkmark) for fields with data
     - ○ Empty bullet (gray circle) for missing fields
   - Fields displayed:
     - Master Resume
     - Job Title
     - Company
     - About Job
     - About Company
     - Responsibilities
     - Requirements
     - Narrative Strategy
     - Current Draft
   - Similar styling to checklist component (no expand/collapse)

3. **Missing Data Warning** (conditional)
   - Shows only if any fields are missing
   - Appears below checklist bullets
   - Message: "⚠️ Missing data detected. We recommend doing more research before synthesizing."
   - Non-blocking: user can still proceed with generation

4. **Max Tokens Input** (Footer - Left Side)
   - Number input field for token limit
   - Default: 2000
   - Range: 100-32000
   - Helps users handle thinking models that need more tokens

5. **Model Selector** (Footer - Center)
   - Dropdown: Choose from available models loaded in LM Studio
   - Fetches models from `/v1/models` endpoint on modal open
   - Default: `llmConfig.synthesis.defaultModel` if available
   - Shows warning if no models are loaded: "⚠️ No models loaded in LM Studio. Please load a model first."

6. **Action Buttons** (Footer - Right Side)
   - **Cancel**: Close modal
   - **Generate**: Build user prompt → send to LLM with system prompt
     - Builds JIT user prompt with only available data fields
     - Sends system + user messages to LLM API
     - Shows loading state: "⏳ Generating..."
     - Closes modal immediately, streams in background

**Removed Components (from v2.0):**
- ❌ Prompt template editor (now in config.js, editable via future config page)
- ❌ Reset to Default button (no custom prompts)
- ❌ Existing content warning (handled in system prompt)

**Key Behaviors:**

1. **On Modal Open:**
   - Fetch context data (master resume, job fields)
   - Check data availability for all 9 fields
   - Show checklist with ✓/○ status indicators
   - Show warning if any data missing
   - Fetch available models from LM Studio API

2. **On Generate Click:**
   - Validate max tokens (100-32000 range)
   - Build user prompt with only available fields
   - Send system + user messages to LLM API
   - Close modal immediately
   - Stream content to editor in background
   - Show thinking panel if thinking model detected

3. **User Prompt Builder:**
```javascript
buildUserPrompt(context) {
  let prompt = 'INPUTS\n';
  
  // Only add fields with data
  if (context.masterResume && context.masterResume !== 'Not provided') {
    prompt += `[MASTER RESUME]\n${context.masterResume}\n\n`;
  }
  if (context.jobTitle && context.jobTitle !== 'Not provided') {
    prompt += `[JOB TITLE]\n${context.jobTitle}\n\n`;
  }
  if (context.company && context.company !== 'Not provided') {
    prompt += `[COMPANY]\n${context.company}\n\n`;
  }
  // ... repeat for all fields
  
  prompt += 'Synthesize the document now, strictly following the STREAMING PROTOCOL.';
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
   
    **4.2 Streaming Implementation** ✅ **COMPLETED - v3.0 Update**
    
    **Problem:**
    - Thinking models (DeepSeek R1, QwQ, etc.) include reasoning in various tag formats
    - Non-streaming returns full response including reasoning preamble
    - Token exhaustion risk with fixed 2000 token limit (reasoning can use 800-1500 tokens)
    - Users receive unusable documents filled with AI reasoning text
    
    **Solution: XML-Based Streaming with System/User Prompt Split**
    
    **New Method Signature:**
    ```javascript
    async synthesizeDocument(
      documentKey, 
      model, 
      systemPrompt,      // NEW: System prompt from config.js
      userPrompt,        // NEW: JIT-generated user prompt
      onThinkingUpdate,  // Callback for thinking stream updates
      onDocumentUpdate,  // Callback for document stream updates
      maxTokens = 2000   // Configurable token limit
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
   
    2. **XML-Based Thinking Detection** - Support multiple tag variants
       ```javascript
       // State machine for content routing
       let state = 'DETECTING';  // DETECTING → IN_THINKING_BLOCK → IN_DOCUMENT
       let buffer = '';
       let thinkingContent = '';
       let documentContent = '';
       const DETECTION_WINDOW = 50;  // First 50 chars for pattern detection
       
       function processChunk(chunk) {
         buffer += chunk;
         
         // Check first 50 chars for thinking patterns
         if (state === 'DETECTING' && buffer.length <= DETECTION_WINDOW) {
           // Support multiple tag variants: <thinking>, <think>, <reasoning>
           if (/<thinking>|<think>|<reasoning>/i.test(buffer)) {
             state = 'IN_THINKING_BLOCK';
             console.log('[Synthesis] Thinking model detected');
           } else if (buffer.length >= DETECTION_WINDOW) {
             state = 'IN_DOCUMENT';  // Standard model
             // Send buffered content to document
             if (onDocumentUpdate) {
               onDocumentUpdate(buffer);
             }
             documentContent += buffer;
             buffer = '';
           }
         }
         
         // Route content based on state
         if (state === 'IN_THINKING_BLOCK') {
           // Check for closing tags (all variants)
           if (/<\/thinking>|<\/think>|<\/reasoning>/i.test(buffer)) {
             state = 'IN_DOCUMENT';
             // Extract thinking, start document
           }
           onThinkingUpdate(parseThinking(chunk));
         } else if (state === 'IN_DOCUMENT') {
           onDocumentUpdate(chunk);
         }
       }
       
       function parseThinking(rawThinking) {
         // Remove all tag variants
         return rawThinking
           .replace(/<\/?thinking>/gi, '')
           .replace(/<\/?think>/gi, '')
           .replace(/<\/?reasoning>/gi, '');
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
   
    **Why XML-Based Streaming?**
    - ✅ **No model lists to maintain** - Detects thinking patterns from actual response
    - ✅ **Works with any thinking model** - DeepSeek R1, QwQ, o1, o3, future models
    - ✅ **Supports multiple tag variants** - `<thinking>`, `<think>`, `<reasoning>`
    - ✅ **Graceful fallback** - Standard models work without changes
    - ✅ **Real-time feedback** - Users see thinking process as it happens
    - ✅ **Clean output** - All tag variants removed from final document
    - ✅ **Fast detection** - 50-char window for quick routing
    - ✅ **System/User split** - Clear separation of instructions and data
   
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
