# Implementation Plan: Profile Extraction (Paste Mode)

## Overview

Add LLM-powered profile extraction that converts pasted resume text into MarkdownDB profile format.

**Branch:** `feature/profile-extraction-paste-mode`  
**Related Issue:** Required for #24 (Enhanced Extraction)

---

## Requirements (Confirmed)

### UX Flow

1. User pastes resume text directly into profile editor
2. User clicks "Extract from Resume" button
3. Confirmation dialog shows: "⚠️ LLM extraction may have errors. Save a backup first."
4. User confirms → LLM streams extracted profile into editor (replaces pasted content)
5. User cancels → Nothing happens, pasted content remains

### Behavior Details

- **Input Method:** Paste directly in editor (no modal for input)
- **Confirmation:** Modal dialog using existing `Modal` component
- **Content Replacement:** Always replace editor content (with warning)
- **Error Handling:** Revert to original content on error
- **Cancel Behavior:** Revert to original content on cancel
- **Scope:** Minimal MVP - no file upload, no merge mode

---

## Technical Design

### Architecture Pattern

Follows existing job extraction architecture:

- **Background coordination:** Multi-step async workflow (Rule 1 from AGENTS.md)
- **Event-driven streaming:** `profileExtractionStarted` → `profileExtractionChunk` → `profileExtractionComplete`
- **Reuse existing:** `LLMClient.streamCompletion()`, keepalive, retry logic

### Component Structure

```
src/entrypoints/profile/
├── App.tsx                              [MODIFY: ~40 lines added]
├── hooks/
│   └── useProfileExtraction.ts          [CREATE: ~50 lines]
src/utils/
├── profile-templates.ts                 [CREATE: ~370 lines]
src/entrypoints/
└── background.ts                        [MODIFY: ~150 lines added]
```

---

## Implementation Tasks

### 1. Create `useProfileExtraction` Hook

**File:** `src/entrypoints/profile/hooks/useProfileExtraction.ts`

**Purpose:** Listen to profile extraction events from background and trigger callbacks

**Interface:**

```typescript
export function useProfileExtraction(callbacks: {
  onExtractionStarted: () => void;
  onChunkReceived: (chunk: string) => void;
  onExtractionComplete: (fullContent: string) => void;
  onExtractionError: (error: string) => void;
  onExtractionCancelled: () => void;
}): void;
```

**Events to handle:**

- `profileExtractionStarted` - Background signals extraction started
- `profileExtractionChunk` - Background sends content chunk (append to editor)
- `profileExtractionComplete` - Background signals extraction done
- `profileExtractionError` - Background signals error occurred
- `profileExtractionCancelled` - Background signals user cancelled

**Size:** ~50 lines

---

### 2. Update Profile App.tsx

**File:** `src/entrypoints/profile/App.tsx`

**Changes:**

#### A. Add State (3 lines)

```typescript
const [isExtracting, setIsExtracting] = useState(false);
const [extractionError, setExtractionError] = useState<string | null>(null);
const [showConfirmDialog, setShowConfirmDialog] = useState(false);
const originalContentRef = useRef<string>(''); // Store original before extraction
```

#### B. Add Extraction Handlers (~40 lines)

```typescript
// Hook up extraction events
useProfileExtraction({
  onExtractionStarted: () => {
    setIsExtracting(true);
    setExtractionError(null);
    setStatusMessage('Extracting profile...');
    originalContentRef.current = content; // Store original
    setContent(''); // Clear editor
  },
  onChunkReceived: (chunk: string) => {
    setContent((prev) => prev + chunk); // Append chunk
  },
  onExtractionComplete: (fullContent: string) => {
    setContent(fullContent);
    setIsExtracting(false);
    setStatusMessage('Profile extracted successfully!');
    setTimeout(() => setStatusMessage(''), 3000);
  },
  onExtractionError: (error: string) => {
    setContent(originalContentRef.current); // REVERT to original
    setIsExtracting(false);
    setExtractionError(error);
    setStatusMessage('');
  },
  onExtractionCancelled: () => {
    setContent(originalContentRef.current); // REVERT to original
    setIsExtracting(false);
    setStatusMessage('Extraction cancelled');
    setTimeout(() => setStatusMessage(''), 3000);
  },
});

const handleExtractClick = () => {
  if (isExtracting) {
    handleCancelExtraction();
  } else {
    setShowConfirmDialog(true);
  }
};

const handleConfirmExtraction = async () => {
  setShowConfirmDialog(false);

  const pastedText = content.trim();
  if (!pastedText) {
    setExtractionError('Please paste resume text first');
    return;
  }

  try {
    const { llmSettingsStorage } = await import('@/utils/storage');
    const llmSettings = await llmSettingsStorage.getValue();

    const response = await browser.runtime.sendMessage({
      action: 'streamExtractProfile',
      rawText: pastedText,
      llmSettings: llmSettings,
    });

    if (!response.success) {
      throw new Error(response.error || 'Extraction failed');
    }
  } catch (error) {
    const err = error as Error;
    setExtractionError(err.message);
  }
};

const handleCancelExtraction = async () => {
  try {
    await browser.runtime.sendMessage({
      action: 'cancelProfileExtraction',
    });
  } catch (error) {
    console.error('Failed to cancel extraction:', error);
  }
};
```

#### C. Add UI Components (~30 lines)

**Footer button:**

```typescript
<button
  onClick={handleExtractClick}
  className={isExtracting ? 'btn-cancel' : 'btn-extract'}
  disabled={isExtracting && !content.trim()}
>
  {isExtracting ? '❌ Cancel Extraction' : '📋 Extract from Resume'}
</button>
```

**Confirmation dialog:**

```typescript
<Modal
  isOpen={showConfirmDialog}
  onClose={() => setShowConfirmDialog(false)}
  title="Confirm Extraction"
>
  <p>⚠️ LLM extraction may have errors. Save a backup first.</p>
  <div className="modal-actions">
    <button onClick={() => setShowConfirmDialog(false)}>Cancel</button>
    <button onClick={handleConfirmExtraction} className="btn-primary">
      Continue
    </button>
  </div>
</Modal>
```

**Error display:**

```typescript
{extractionError && (
  <div className="extraction-error">
    <strong>❌ Extraction Error:</strong> {extractionError}
  </div>
)}
```

**Total added to App.tsx:** ~80 lines

---

### 3. Create Profile Templates

**File:** `src/utils/profile-templates.ts`

**Purpose:** LLM extraction prompt with few-shot examples

**Structure:**

```typescript
export const PROFILE_EXTRACTION_PROMPT = `
You are a resume parser that extracts structured profile data.

Convert resume text into MarkdownDB profile format.

# Format Rules:
- Start with <PROFILE>
- Use KEY: value pairs (NAME, EMAIL, PHONE, etc.)
- Use # for sections (EDUCATION, EXPERIENCE)
- Use ## for entries (EDU_1, EXP_1)
- Use TYPE: PROFESSIONAL|PROJECT|VOLUNTEER for experience
- Use - for bullet lists

# Example Input:
[Resume text example]

# Example Output:
[MarkdownDB format example]

Now extract the following resume:
`;
```

**Size:** ~370 lines (includes 2-3 few-shot examples)

---

### 4. Update Background Script

**File:** `src/entrypoints/background.ts`

**Add Message Types:**

```typescript
interface StreamExtractProfileMessage extends BaseMessage {
  action: 'streamExtractProfile';
  rawText: string;
  llmSettings?: LLMSettings;
}

interface CancelProfileExtractionMessage extends BaseMessage {
  action: 'cancelProfileExtraction';
}

type RuntimeMessage =
  | GetJobsMessage
  | SaveJobMessage
  | StreamExtractJobMessage
  | StreamExtractProfileMessage  // ADD
  | CancelProfileExtractionMessage  // ADD
  | ...
```

**Add Handler (~150 lines):**

```typescript
if (request.action === 'streamExtractProfile') {
  const { rawText, llmSettings: userLlmSettings } = request;

  // Use user settings or fallback to config defaults
  const llmSettings: LLMSettings = userLlmSettings || {
    provider: 'lm-studio',
    model: llmConfig.extraction.model || llmConfig.model,
    apiEndpoint: llmConfig.endpoint,
    endpoint: llmConfig.endpoint,
    maxTokens: 2000,
    temperature: 0.3,
  };

  // Start keepalive
  startGlobalKeepAlive();

  // Acknowledge receipt
  sendResponse({ success: true, message: 'Profile extraction started' });

  // Start streaming in background
  (async () => {
    const streamId = 'profile-extraction';

    try {
      const llmClient = new LLMClient({
        endpoint: llmSettings.endpoint,
        modelsEndpoint: llmSettings.modelsEndpoint,
      });

      // Store in activeExtractions for cancellation
      activeExtractions.set(streamId, { llmClient, streamId });

      // Send started event
      await browser.runtime.sendMessage({
        action: 'profileExtractionStarted',
      });

      // Import profile extraction prompt
      const { PROFILE_EXTRACTION_PROMPT } = await import(
        '../utils/profile-templates'
      );

      // Stream completion
      const result = await llmClient.streamCompletion({
        streamId: streamId,
        model: llmSettings.model,
        systemPrompt: PROFILE_EXTRACTION_PROMPT.trim(),
        userPrompt: rawText,
        maxTokens: llmSettings.maxTokens || 2000,
        temperature: llmSettings.temperature || 0.3,
        onThinkingUpdate: (delta: string) => {
          console.info(
            '[Background] Thinking:',
            delta.substring(0, 50) + '...'
          );
        },
        onDocumentUpdate: (delta: string) => {
          // Send chunks to profile page
          browser.runtime
            .sendMessage({
              action: 'profileExtractionChunk',
              chunk: delta,
            })
            .catch((err) => {
              console.error('[Background] Failed to send chunk:', err);
            });
        },
      });

      // Check if cancelled
      if (result.cancelled) {
        await browser.runtime.sendMessage({
          action: 'profileExtractionCancelled',
        });
        return;
      }

      // Send completion
      await browser.runtime.sendMessage({
        action: 'profileExtractionComplete',
        fullContent: result.documentContent,
      });
    } catch (error) {
      console.error('[Background] Profile extraction failed:', error);
      const err = error as Error;
      await browser.runtime.sendMessage({
        action: 'profileExtractionError',
        error: err.message,
      });
    } finally {
      activeExtractions.delete(streamId);
      stopGlobalKeepAlive();
    }
  })();

  return true; // Keep message channel open
}

if (request.action === 'cancelProfileExtraction') {
  const streamId = 'profile-extraction';
  const extraction = activeExtractions.get(streamId);

  if (extraction) {
    extraction.llmClient.cancelStream(streamId);
    activeExtractions.delete(streamId);
    sendResponse({ success: true, message: 'Cancellation requested' });
  } else {
    sendResponse({ success: false, message: 'No active extraction found' });
  }

  return true;
}
```

**Size:** ~150 lines added

---

### 5. Add Styles

**File:** `src/entrypoints/profile/styles.css`

**Add extraction UI styles:**

```css
/* Extract button */
.btn-extract {
  background-color: #4caf50;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-extract:hover {
  background-color: #45a049;
}

.btn-extract:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

/* Cancel button */
.btn-cancel {
  background-color: #f44336;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-cancel:hover {
  background-color: #da190b;
}

/* Extraction error */
.extraction-error {
  padding: 12px;
  margin: 10px 20px;
  background-color: #fee;
  border: 1px solid #fcc;
  border-radius: 4px;
  color: #c00;
}

/* Modal actions */
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.modal-actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.modal-actions .btn-primary {
  background-color: #4caf50;
  color: white;
}

.modal-actions .btn-primary:hover {
  background-color: #45a049;
}
```

**Size:** ~30 lines

---

## Testing Checklist

### Manual Testing

- [ ] Extract from empty profile → content populated progressively
- [ ] Extract with existing content → confirmation shown, content replaced
- [ ] Cancel extraction mid-stream → content reverted to original
- [ ] LLM connection error → error message shown, content reverted
- [ ] Paste empty text and click extract → error shown "Please paste resume text first"
- [ ] Click cancel on confirmation dialog → nothing happens, content unchanged

### Browser Testing

- [ ] Tested in Chrome
- [ ] Tested in Firefox

---

## Code Size Summary

| File                      | Lines Added | Lines Modified | Purpose                    |
| ------------------------- | ----------- | -------------- | -------------------------- |
| `useProfileExtraction.ts` | 50          | 0 (new file)   | Extraction event hook      |
| `profile-templates.ts`    | 370         | 0 (new file)   | LLM extraction prompt      |
| `App.tsx`                 | 80          | 10             | Extraction UI and handlers |
| `background.ts`           | 150         | 5              | Background coordination    |
| `styles.css`              | 30          | 0              | Extraction UI styles       |
| **TOTAL**                 | **680**     | **15**         | **Minimal MVP**            |

**Note:** 370 lines are LLM prompt/examples. Core logic is ~310 lines.

---

## Out of Scope (Future PRs)

- ❌ File upload support (.pdf, .docx)
- ❌ Merge mode (intelligently combine with existing profile)
- ❌ LinkedIn profile scraping from active tab
- ❌ Multiple resume format support
- ❌ Profile comparison/diff view

See issue #24 for enhanced extraction features.

---

## Success Criteria

✅ User can paste resume text into editor  
✅ User can extract with confirmation dialog  
✅ LLM streams extraction progressively  
✅ Content reverts on error/cancel  
✅ Error messages shown clearly  
✅ No browser console errors  
✅ Works in Chrome and Firefox

---

## Notes

- Reuses existing `Modal` component from `src/components/ui/Modal.tsx`
- Follows existing job extraction architecture (event-driven streaming)
- No changes to storage schema (profile already stored in `userProfileStorage`)
- No changes to validation logic (already exists)
- No new dependencies required
