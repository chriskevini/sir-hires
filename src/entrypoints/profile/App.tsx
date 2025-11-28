import { useState, useEffect, useRef, useCallback } from 'react';
import { browser } from 'wxt/browser';

// Import WXT storage
import {
  userProfileStorage,
  profileTemplatePanelStorage,
  llmSettingsStorage,
} from '@/utils/storage';

// Import utilities
import { formatSaveTime } from '@/utils/date-utils';
import { exportMarkdown as exportMarkdownUtil } from '@/utils/export-utils';
import {
  setCursorAndScroll,
  findNextEntryId,
  findNextSectionPosition,
  applyFix as applyFixUtil,
} from '@/utils/profile-utils';
import { PROFILE_TEMPLATE, profileExtractionConfig } from '@/tasks';
import { UI_UPDATE_INTERVAL_MS } from '@/config';
import { LLMClient } from '@/utils/llm-client';
import { runTask, startKeepalive } from '@/utils/llm-task-runner';
import { DEFAULT_TASK_SETTINGS } from '@/utils/llm-utils';

// Import hooks
import {
  useProfileValidation,
  type ValidationFix,
} from './hooks/useProfileValidation';

// Import components
import {
  ValidationPanel,
  getValidationEditorClass,
} from '@/components/features/ValidationPanel';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { StreamingTextarea } from '@/components/ui/StreamingTextarea';
import { X } from 'lucide-react';

// Constants
const PROGRESS_MESSAGE_INTERVAL_MS = 1000; // Cycle progress messages every 1 second

// Progress messages shown sequentially during extraction
const EXTRACTION_PROGRESS_MESSAGES = [
  '⏳ Starting extraction',
  '⏳ Starting extraction.',
  '⏳ Starting extraction..',
  '⏳ Starting extraction...',
  '🔍 Analyzing resume structure',
  '🔍 Analyzing resume structure.',
  '🔍 Analyzing resume structure..',
  '🔍 Analyzing resume structure...',
  '📝 Extracting contact information',
  '📝 Extracting contact information.',
  '📝 Extracting contact information..',
  '📝 Extracting contact information...',
  '🎓 Processing education history',
  '🎓 Processing education history.',
  '🎓 Processing education history..',
  '🎓 Processing education history...',
  '💼 Parsing work experience',
  '💼 Parsing work experience.',
  '💼 Parsing work experience..',
  '💼 Parsing work experience...',
  '🔧 Identifying skills and projects',
  '🔧 Identifying skills and projects.',
  '🔧 Identifying skills and projects..',
  '🔧 Identifying skills and projects...',
  '✨ Formatting profile data',
  '✨ Formatting profile data.',
  '✨ Formatting profile data..',
  '✨ Formatting profile data...',
  '⏳ Almost done',
  '⏳ Almost done.',
  '⏳ Almost done..',
  '⏳ Almost done...',
];

// Helper to check if text is a progress message
const isProgressMessage = (text: string): boolean =>
  EXTRACTION_PROGRESS_MESSAGES.some((msg) => text.startsWith(msg));

export default function App() {
  // State
  const [content, setContent] = useState('');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isTemplatePanelVisible, setIsTemplatePanelVisible] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Refs
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const lastSavedIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressIndexRef = useRef<number>(0); // Track progress message index
  const originalContentRef = useRef<string>(''); // Store original before extraction
  const hasReceivedContentRef = useRef<boolean>(false); // Track if real content has started streaming
  const streamedContentRef = useRef<string>(''); // Accumulate streamed content synchronously

  // Immediate save callback - saves to storage on every change
  const saveProfile = useCallback(async (newContent: string) => {
    try {
      const profileData = {
        content: newContent,
        updatedAt: new Date().toISOString(),
      };

      await userProfileStorage.setValue(profileData);
      setLastSavedTime(profileData.updatedAt);

      // Also save to localStorage as backup
      localStorage.setItem('userProfileDraft', newContent);
    } catch (error) {
      console.error('Save error:', error);
      // Keep localStorage backup even if browser.storage fails
      localStorage.setItem('userProfileDraft', newContent);
    }
  }, []);

  // Content change handler - saves immediately when not extracting
  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);
      // Save immediately if not extracting (progress messages are temporary)
      if (!isExtracting) {
        saveProfile(newContent);
      }
    },
    [isExtracting, saveProfile]
  );

  // Validation hook - disable during extraction to avoid performance issues
  const { validation, validationFixes, warningFixes } = useProfileValidation({
    content: isExtracting ? '' : content,
  });

  // Helper to save profile directly to storage (for use in extraction callbacks)
  const saveProfileToStorage = async (newContent: string) => {
    try {
      const profileData = {
        content: newContent,
        updatedAt: new Date().toISOString(),
      };
      await userProfileStorage.setValue(profileData);
      setLastSavedTime(profileData.updatedAt);
      localStorage.setItem('userProfileDraft', newContent);
    } catch (error) {
      console.error('Save error:', error);
      localStorage.setItem('userProfileDraft', newContent);
    }
  };

  // AbortController for extraction cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Progress message cycling during extraction (stops at last message)
  useEffect(() => {
    if (isExtracting && !hasReceivedContentRef.current) {
      progressIntervalRef.current = setInterval(() => {
        // Only update content if we haven't started receiving real content
        if (!hasReceivedContentRef.current) {
          const lastIndex = EXTRACTION_PROGRESS_MESSAGES.length - 1;
          // Stop cycling at the last message
          if (progressIndexRef.current < lastIndex) {
            progressIndexRef.current += 1;
            setContent(
              EXTRACTION_PROGRESS_MESSAGES[progressIndexRef.current] + '\n\n'
            );
          } else {
            // At last message - clear interval to stop cycling
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
              progressIntervalRef.current = null;
            }
          }
        }
      }, PROGRESS_MESSAGE_INTERVAL_MS);
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [isExtracting]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Load profile from storage on mount
  useEffect(() => {
    loadProfile();
    loadTemplatePanelPreference();
    startLastSavedInterval();

    return () => {
      if (lastSavedIntervalRef.current)
        clearInterval(lastSavedIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTemplatePanelPreference = async () => {
    const isVisible = await profileTemplatePanelStorage.getValue();
    setIsTemplatePanelVisible(isVisible);
  };

  const toggleTemplatePanel = (visible: boolean) => {
    setIsTemplatePanelVisible(visible);
    profileTemplatePanelStorage.setValue(visible);
  };

  const loadProfile = async () => {
    try {
      const userProfile = await userProfileStorage.getValue();

      if (userProfile && userProfile.content) {
        const profileContent = userProfile.content;
        const updatedAt = userProfile.updatedAt;

        setContent(profileContent);
        setLastSavedTime(updatedAt);
      } else {
        // Check for draft in localStorage
        const draft = localStorage.getItem('userProfileDraft');
        if (draft) {
          setContent(draft);
          setStatusMessage('Draft recovered');
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      showStatusMessage('Error loading profile', 'error');
    }
  };

  const startLastSavedInterval = () => {
    lastSavedIntervalRef.current = setInterval(() => {
      // Trigger re-render to update last saved time display
      if (lastSavedTime) {
        setLastSavedTime(lastSavedTime);
      }
    }, UI_UPDATE_INTERVAL_MS);
  };

  const showStatusMessage = (message: string, type: 'success' | 'error') => {
    setStatusMessage(message);

    if (type === 'success') {
      setTimeout(() => {
        setStatusMessage('');
      }, 2000);
    }
  };

  const applyFix = (fix: ValidationFix, enumValue?: string) => {
    if (!editorRef.current) return;

    const currentContent = editorRef.current.value;
    const result = applyFixUtil(fix, currentContent, enumValue);

    if (result) {
      setCursorAndScroll(
        editorRef.current,
        result.newContent,
        result.cursorPosition
      );
      handleContentChange(result.newContent);
    }
  };

  const formatProfile = () => {
    if (!content.trim()) {
      showStatusMessage('Nothing to format', 'error');
      return;
    }

    const lines = content.split('\n');
    const formatted = [];

    for (let line of lines) {
      line = line.trimEnd();

      if (line.match(/^\s*[A-Z_]+:\s/)) {
        line = line.replace(/^(\s*)([A-Z_]+):\s+/, '$1$2: ');
      }

      if (line.match(/^#+\s+/)) {
        line = line.replace(/^(#+)\s+/, '$1 ');
      }

      formatted.push(line);
    }

    let newContent = formatted.join('\n');
    newContent = newContent.replace(/\n{3,}/g, '\n\n');
    newContent = newContent.replace(
      /^(\s*[A-Z_]+:.*)\n\n(\s*[A-Z_]+:)/gm,
      '$1\n$2'
    );
    newContent = newContent.replace(/^(\s*-.*)\n\n(\s*-)/gm, '$1\n$2');
    newContent = newContent.replace(/^(\s*[A-Z_]+:)\s*\n\n(\s*-)/gm, '$1\n$2');
    newContent = newContent.replace(
      /^(#+\s+[A-Z_]+)\s*\n\n(\s*[A-Z_]+:)/gm,
      '$1\n$2'
    );
    newContent = newContent.replace(
      /^(##\s+[A-Z0-9_]+)\s*\n\n(\s*[A-Z_]+:)/gm,
      '$1\n$2'
    );

    if (newContent !== content) {
      handleContentChange(newContent);
      showStatusMessage('Formatting fixed', 'success');
    } else {
      showStatusMessage('No formatting issues found', 'success');
    }
  };

  const exportMarkdown = () => {
    exportMarkdownUtil({ title: 'profile', text: content }, (message, type) =>
      showStatusMessage(message, type === 'info' ? 'success' : type)
    );
  };

  const exportText = async () => {
    if (!content.trim()) {
      showStatusMessage('Nothing to export', 'error');
      return;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `profile-${timestamp}.txt`;

    await browser.downloads.download({
      url: url,
      filename: filename,
      saveAs: true,
    });

    showStatusMessage('Exported as ' + filename, 'success');
  };

  const insertEducationTemplate = () => {
    const newId = findNextEntryId(content, 'EDU_');
    const template = `## EDU_${newId}
DEGREE: 
SCHOOL: 
LOCATION: 
START: 
END: 
`;

    const eduSectionMatch = content.match(/^#\s+EDUCATION\s*$/m);

    if (eduSectionMatch) {
      const sectionStart = eduSectionMatch.index! + eduSectionMatch[0].length;
      const insertPos = findNextSectionPosition(content, sectionStart);

      const newContent =
        content.slice(0, insertPos) +
        '\n' +
        template +
        '\n' +
        content.slice(insertPos);
      const cursorPos = insertPos + 1 + template.indexOf('DEGREE: ') + 8;

      if (editorRef.current) {
        setCursorAndScroll(editorRef.current, newContent, cursorPos);
        handleContentChange(newContent);
      }
    } else {
      const profileMatch = content.match(/^<PROFILE>\s*$/m);
      let insertPos = 0;

      if (profileMatch) {
        const afterProfile = profileMatch.index! + profileMatch[0].length;
        insertPos = findNextSectionPosition(content, afterProfile);
      } else {
        insertPos = content.length;
      }

      const sectionTemplate = `\n# EDUCATION\n${template}`;
      const newContent =
        content.slice(0, insertPos) +
        sectionTemplate +
        '\n' +
        content.slice(insertPos);
      const cursorPos = insertPos + sectionTemplate.indexOf('DEGREE: ') + 8;

      if (editorRef.current) {
        setCursorAndScroll(editorRef.current, newContent, cursorPos);
        handleContentChange(newContent);
      }
    }
  };

  const insertExperienceTemplate = () => {
    const newId = findNextEntryId(content, 'EXP_');
    const template = `## EXP_${newId}
TYPE: PROFESSIONAL
TITLE: 
AT: 
START: 
END: 
BULLETS:
- 
`;

    const expSectionMatch = content.match(/^#\s+EXPERIENCE\s*$/m);

    if (expSectionMatch) {
      const sectionStart = expSectionMatch.index! + expSectionMatch[0].length;
      const insertPos = findNextSectionPosition(content, sectionStart);

      const newContent =
        content.slice(0, insertPos) +
        '\n' +
        template +
        '\n' +
        content.slice(insertPos);
      const cursorPos = insertPos + 1 + template.indexOf('TITLE: ') + 7;

      if (editorRef.current) {
        setCursorAndScroll(editorRef.current, newContent, cursorPos);
        handleContentChange(newContent);
      }
    } else {
      const eduSectionMatch = content.match(/^#\s+EDUCATION\s*$/m);
      let insertPos = 0;

      if (eduSectionMatch) {
        const sectionStart = eduSectionMatch.index!;
        const restContent = content.slice(sectionStart);
        const nextSectionMatch = restContent.match(/^#\s+(?!EDUCATION)\w+/m);

        if (nextSectionMatch) {
          insertPos = sectionStart + nextSectionMatch.index!;
        } else {
          insertPos = content.length;
        }
      } else {
        const profileMatch = content.match(/^<PROFILE>\s*$/m);

        if (profileMatch) {
          const afterProfile = profileMatch.index! + profileMatch[0].length;
          insertPos = findNextSectionPosition(content, afterProfile);
        } else {
          insertPos = content.length;
        }
      }

      const sectionTemplate = `\n# EXPERIENCE\n${template}`;
      const newContent =
        content.slice(0, insertPos) +
        sectionTemplate +
        '\n' +
        content.slice(insertPos);
      const cursorPos = insertPos + sectionTemplate.indexOf('TITLE: ') + 7;

      if (editorRef.current) {
        setCursorAndScroll(editorRef.current, newContent, cursorPos);
        handleContentChange(newContent);
      }
    }
  };

  const goBack = () => {
    window.location.href = browser.runtime.getURL('/job-details.html');
  };

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

    // Initialize extraction state
    setIsExtracting(true);
    setExtractionError(null);
    progressIndexRef.current = 0;
    hasReceivedContentRef.current = false;
    // Capture content from editorRef to avoid stale closure
    originalContentRef.current = editorRef.current?.value || '';
    // Hide template during extraction and persist preference
    setIsTemplatePanelVisible(false);
    profileTemplatePanelStorage.setValue(false);
    setStatusMessage(''); // Clear header status - progress shown in editor
    setContent(EXTRACTION_PROGRESS_MESSAGES[0] + '\n\n'); // Initial progress message

    // Reset streamed content ref for new extraction
    streamedContentRef.current = '';

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    // Start keepalive to prevent service worker termination
    const stopKeepalive = startKeepalive();

    try {
      const llmSettings = await llmSettingsStorage.getValue();

      if (!llmSettings?.endpoint || llmSettings.endpoint.trim() === '') {
        throw new Error(
          '⚠️ LLM endpoint not configured. Please configure settings in the popup first.'
        );
      }

      // Calculate dynamic max tokens (~1.5x input length)
      // Rough estimate: 1 token ≈ 4 characters
      const estimatedInputTokens = Math.ceil(pastedText.length / 4);
      const dynamicMaxTokens = Math.ceil(estimatedInputTokens * 1.5);
      // Cap at reasonable maximum (4000 tokens)
      const maxTokens = Math.min(dynamicMaxTokens, 4000);

      console.info(
        `[Profile] Input length: ${pastedText.length} chars, estimated tokens: ${estimatedInputTokens}, max tokens: ${maxTokens}`
      );

      // Initialize LLM client
      const llmClient = new LLMClient({
        endpoint: llmSettings.endpoint,
        modelsEndpoint: llmSettings.modelsEndpoint,
      });

      // Get task-specific settings (use extraction settings)
      const extractionTemperature =
        llmSettings.tasks?.extraction?.temperature ??
        DEFAULT_TASK_SETTINGS.extraction.temperature;

      // Run extraction task
      const result = await runTask({
        config: profileExtractionConfig,
        context: { rawText: pastedText },
        llmClient,
        model: llmSettings.model || '',
        maxTokens,
        temperature: extractionTemperature,
        signal: abortControllerRef.current.signal,
        onChunk: (delta) => {
          hasReceivedContentRef.current = true;
          // Clear progress interval immediately when real content arrives
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }

          // Accumulate in ref synchronously (never loses chunks)
          streamedContentRef.current += delta;
          // Update React state from ref (complete value, not delta)
          setContent(streamedContentRef.current);
        },
      });

      // Check if cancelled
      if (result.cancelled) {
        console.info('[Profile] Extraction cancelled');
        // Clear progress interval if still running
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        // Keep whatever was streamed (don't revert to original)
        setContent((prev) => {
          // If still showing progress message, revert to original
          if (isProgressMessage(prev)) {
            return originalContentRef.current;
          }
          // Otherwise keep the streamed content as-is and save it
          if (prev && !isProgressMessage(prev)) {
            saveProfileToStorage(prev);
          }
          return prev;
        });
        setIsExtracting(false);
        progressIndexRef.current = 0;
        hasReceivedContentRef.current = false;
        setStatusMessage('Extraction cancelled - content preserved');
        setTimeout(() => setStatusMessage(''), 3000);
        return;
      }

      // Handle completion
      console.info('[Profile] Extraction complete');
      // Ensure progress interval is cleared
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setContent(result.content);
      setIsExtracting(false);
      progressIndexRef.current = 0;
      hasReceivedContentRef.current = false;
      setStatusMessage('✅ Profile extracted successfully!');
      setTimeout(() => setStatusMessage(''), 3000);
      // Save extracted content
      saveProfileToStorage(result.content);
    } catch (error) {
      console.error('[Profile] Extraction failed:', error);
      // Clear progress interval if still running
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setContent(originalContentRef.current); // REVERT to original
      setIsExtracting(false);
      progressIndexRef.current = 0;
      hasReceivedContentRef.current = false;
      setExtractionError((error as Error).message);
      setStatusMessage('');
    } finally {
      stopKeepalive();
      abortControllerRef.current = null;
    }
  };

  const handleCancelExtraction = () => {
    if (abortControllerRef.current) {
      console.info('[Profile] Cancelling extraction via AbortController');
      abortControllerRef.current.abort();
    }
  };

  // Compute editor className based on validation state
  const hasErrors = validation.errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;
  const hasContent = content.trim().length > 0;
  const editorClassName = getValidationEditorClass(
    hasErrors,
    hasWarnings,
    hasContent
  );

  // Build messages array for ValidationPanel
  const validationMessages = [
    ...validation.errors.map((error, index) => ({
      type: 'error' as const,
      message: error.message,
      fix: validationFixes[index],
    })),
    ...validation.warnings.map((warning, index) => ({
      type: 'warning' as const,
      message: warning.message,
      fix: warningFixes[index],
    })),
    ...validation.info.map((info) => ({
      type: 'info' as const,
      message: info.message,
    })),
  ];

  // Compute counts
  const errorCount = validation.errors.length;
  const warningCount = validation.warnings.length;
  const customCount =
    validation.customFields.length + validation.customSections.length;

  // Compute validity
  const isValid = hasContent && !hasErrors;

  return (
    <div className="flex h-screen w-full flex-col bg-white">
      <header className="flex shrink-0 items-center justify-between border-b-2 border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="secondary" size="sm" onClick={goBack}>
            ← Back to Jobs
          </Button>
          <h1 className="text-xl text-blue-600">Profile</h1>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-[13px] ${statusMessage ? 'font-semibold text-amber-600' : 'text-gray-500'}`}
          >
            {statusMessage ||
              (lastSavedTime
                ? `Last saved: ${formatSaveTime(new Date(lastSavedTime))}`
                : '')}
          </span>
        </div>
      </header>

      <div className="flex flex-1 flex-row overflow-hidden">
        {/* Left Panel: Template Guide */}
        <div
          id="templatePanel"
          className={`flex w-2/5 flex-col overflow-hidden border-r-2 border-gray-200 bg-gray-50 ${isTemplatePanelVisible ? '' : 'hidden'}`}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-blue-200 bg-blue-50 px-4 py-3">
            <h3 className="text-sm font-medium text-blue-700">
              Profile Template
            </h3>
            <Button
              variant="ghost"
              onClick={() => toggleTemplatePanel(false)}
              title="Hide template"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto whitespace-pre-wrap break-words p-4 font-mono text-[13px] leading-relaxed text-gray-700">
            {PROFILE_TEMPLATE}
          </div>
        </div>

        {/* Right Panel: Editor */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 overflow-hidden p-4">
            <StreamingTextarea
              ref={editorRef}
              id="profileEditor"
              value={content}
              onChange={handleContentChange}
              placeholder="Follow the template on the left or paste your resume here and click extract with LLM."
              disabled={isExtracting}
              isStreaming={isExtracting}
              minHeight="100%"
              className={`flex-1 w-full resize-none ${editorClassName}`}
            />
          </div>
          {extractionError && (
            <div className="mx-4 mb-3 rounded border border-red-600 bg-red-50 px-4 py-3 text-[13px] leading-normal text-red-900">
              <strong className="mb-1 block font-semibold">
                Extraction Error:
              </strong>{' '}
              {extractionError}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Modal
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        title="Confirm Extraction"
      >
        <div className="p-6">
          <div className="my-4 flex items-start gap-3 rounded-md border border-amber-400 bg-amber-50 p-4">
            <span className="shrink-0 text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">
                LLM extraction may have errors. The current content will be
                replaced. Save a backup first if needed.
              </p>
            </div>
          </div>
          <div className="my-4 flex items-start gap-3 rounded-md border border-blue-600 bg-blue-50 p-4">
            <span className="shrink-0 text-2xl">💡</span>
            <div className="flex-1">
              <p className="text-sm text-blue-900">
                <strong>Tip:</strong> Label your projects clearly in your resume
                (e.g., &quot;Project: MyApp&quot;) - the LLM may not recognize
                unlabeled projects.
              </p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-5">
            <Button
              variant="secondary"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmExtraction}>
              Continue with Extraction
            </Button>
          </div>
        </div>
      </Modal>

      {/* Validation Panel */}
      <ValidationPanel
        initialCollapsed={true}
        isValid={isValid}
        errorCount={errorCount}
        warningCount={warningCount}
        infoCount={customCount}
        messages={validationMessages}
        onApplyFix={applyFix}
        validLabel="Valid Profile"
        invalidLabel="Validation Errors"
        quickActions={[
          {
            label: '+ Education',
            onClick: insertEducationTemplate,
            title: 'Insert education entry template',
          },
          {
            label: '+ Experience',
            onClick: insertExperienceTemplate,
            title: 'Insert experience entry template',
          },
        ]}
      />

      <footer className="flex shrink-0 items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => toggleTemplatePanel(!isTemplatePanelVisible)}
        >
          Toggle Template
        </Button>
        <Button
          variant={isExtracting ? 'danger' : 'primary'}
          onClick={handleExtractClick}
          disabled={isExtracting && !content.trim()}
        >
          {isExtracting ? 'Cancel Extraction' : 'Extract with LLM'}
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={formatProfile}>
            Fix Formatting
          </Button>
          <Button variant="secondary" size="sm" onClick={exportMarkdown}>
            Export .md
          </Button>
          <Button variant="secondary" size="sm" onClick={exportText}>
            Export .txt
          </Button>
        </div>
      </footer>
    </div>
  );
}
