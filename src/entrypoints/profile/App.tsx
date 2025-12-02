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
import { useProfileValidation } from './hooks/useProfileValidation';
import { useTheme } from '@/hooks/useTheme';
import type { ValidationFix } from '@/utils/validation-types';

// Import components
import { EditorFooter } from '@/components/features/EditorFooter';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ValidatedEditor } from '@/components/ui/ValidatedEditor';
import {
  ArrowLeft,
  Download,
  FileText,
  X,
  BookOpen,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Constants
const PROGRESS_MESSAGE_INTERVAL_MS = 1000; // Cycle progress messages every 1 second

// Progress messages shown sequentially during extraction
const EXTRACTION_PROGRESS_MESSAGES = [
  'Starting extraction',
  'Starting extraction.',
  'Starting extraction..',
  'Starting extraction...',
  'Analyzing resume structure',
  'Analyzing resume structure.',
  'Analyzing resume structure..',
  'Analyzing resume structure...',
  'Extracting contact information',
  'Extracting contact information.',
  'Extracting contact information..',
  'Extracting contact information...',
  'Processing education history',
  'Processing education history.',
  'Processing education history..',
  'Processing education history...',
  'Parsing work experience',
  'Parsing work experience.',
  'Parsing work experience..',
  'Parsing work experience...',
  'Identifying skills and projects',
  'Identifying skills and projects.',
  'Identifying skills and projects..',
  'Identifying skills and projects...',
  'Formatting profile data',
  'Formatting profile data.',
  'Formatting profile data..',
  'Formatting profile data...',
  'Almost done',
  'Almost done.',
  'Almost done..',
  'Almost done...',
];

// Helper to check if text is a progress message
const isProgressMessage = (text: string): boolean =>
  EXTRACTION_PROGRESS_MESSAGES.some((msg) => text.startsWith(msg));

export default function App() {
  // State
  const [content, setContent] = useState('');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [saveStatusText, setSaveStatusText] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isTemplatePanelVisible, setIsTemplatePanelVisible] = useState<
    boolean | null
  >(null);
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

  // Apply theme from storage
  useTheme();

  // Immediate save callback - saves to storage on every change
  const saveProfile = useCallback(async (newContent: string) => {
    try {
      const profileData = {
        content: newContent,
        updatedAt: new Date().toISOString(),
      };

      await userProfileStorage.setValue(profileData);
      setLastSavedTime(profileData.updatedAt);
      setSaveStatusText(`Last saved ${formatSaveTime(new Date())}`);

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
  const { validation } = useProfileValidation({
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
      setSaveStatusText(`Last saved ${formatSaveTime(new Date())}`);
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
        if (updatedAt) {
          setSaveStatusText(
            `Last saved ${formatSaveTime(new Date(updatedAt))}`
          );
        }
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
        setSaveStatusText(
          `Last saved ${formatSaveTime(new Date(lastSavedTime))}`
        );
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
          'LLM endpoint not configured. Please configure settings in the popup first.'
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
      setStatusMessage('Profile extracted successfully!');
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
  const hasContent = content.trim().length > 0;

  // Build messages array for ValidatedEditor
  // Fixes are attached directly to validation messages by the validator
  const validationMessages = [
    ...validation.errors.map((error) => ({
      type: 'error' as const,
      message: error.message,
      fix: error.fix,
    })),
    ...validation.warnings.map((warning) => ({
      type: 'warning' as const,
      message: warning.message,
      fix: warning.fix,
    })),
    ...validation.info.map((info) => ({
      type: 'info' as const,
      message: info.message,
    })),
  ];

  // Compute validity
  const isValid = hasContent && !hasErrors;

  return (
    <div className="flex h-screen w-full flex-col bg-muted">
      {/* Header - matches SidepanelHeader pattern */}
      <header className="flex items-center justify-between px-3 py-2 bg-background border-b border-border shrink-0 gap-2">
        {/* Left: Back button */}
        <Button
          variant="ghost"
          className="border border-border rounded px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted/80 hover:border-border hover:text-foreground active:bg-muted flex items-center justify-center gap-1.5 shrink-0 transition-all duration-200"
          onClick={goBack}
          title="Back to Jobs"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Jobs</span>
        </Button>

        {/* Center: Title and status */}
        <div className="flex-1 min-w-0 flex items-center justify-center gap-2 overflow-hidden">
          <span className="text-sm font-semibold text-foreground">Profile</span>
          {statusMessage && (
            <>
              <span className="text-muted-foreground">|</span>
              <span className="text-sm text-warning font-medium truncate">
                {statusMessage}
              </span>
            </>
          )}
        </div>

        {/* Right: Action buttons */}
        <div className="flex gap-1 items-center">
          <Button
            variant="ghost"
            className="rounded p-1.5 text-muted-foreground hover:bg-muted active:bg-muted/80 flex items-center justify-center min-w-8 min-h-8 transition-all duration-200"
            onClick={() => toggleTemplatePanel(!isTemplatePanelVisible)}
            title={isTemplatePanelVisible ? 'Hide template' : 'Show template'}
          >
            <BookOpen className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            className="rounded p-1.5 text-muted-foreground hover:bg-muted active:bg-muted/80 flex items-center justify-center min-w-8 min-h-8 transition-all duration-200"
            onClick={formatProfile}
            title="Fix formatting"
          >
            <Sparkles className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            className="rounded p-1.5 text-muted-foreground hover:bg-muted active:bg-muted/80 flex items-center justify-center min-w-8 min-h-8 transition-all duration-200"
            onClick={exportMarkdown}
            title="Export as Markdown"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            className="rounded p-1.5 text-muted-foreground hover:bg-muted active:bg-muted/80 flex items-center justify-center min-w-8 min-h-8 transition-all duration-200"
            onClick={exportText}
            title="Export as Text"
          >
            <FileText className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden p-4 gap-4">
        {/* Editor container - matches DraftingView/ResearchingView pattern */}
        <div className="flex-1 flex flex-col border border-border rounded-lg overflow-hidden bg-background max-w-4xl mx-auto">
          {/* Toolbar with insert actions */}
          <div className="flex items-center justify-between px-3 py-2 bg-card border-b border-border shrink-0">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={insertEducationTemplate}
                title="Insert education entry"
              >
                + Education
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={insertExperienceTemplate}
                title="Insert experience entry"
              >
                + Experience
              </Button>
            </div>
            <Button
              variant={isExtracting ? 'danger' : 'primary'}
              size="sm"
              className="gap-1.5"
              onClick={handleExtractClick}
              disabled={isExtracting && !content.trim()}
            >
              <WandSparkles className="h-3.5 w-3.5" />
              {isExtracting ? 'Cancel' : 'Extract with LLM'}
            </Button>
          </div>

          {/* Editor with inline validation */}
          <div className="flex-1 flex flex-col p-4 overflow-hidden">
            <ValidatedEditor
              ref={editorRef}
              id="profileEditor"
              value={content}
              onChange={handleContentChange}
              placeholder="Paste your resume text here and click 'Extract with LLM' to convert it to the profile format, or follow the template to write it manually."
              disabled={isExtracting}
              isStreaming={isExtracting}
              isValid={isValid}
              hasErrors={hasErrors}
              validationMessages={validationMessages}
              onApplyFix={applyFix}
            />
          </div>

          {/* Extraction error display */}
          {extractionError && (
            <div className="py-2 px-4 mx-4 mb-2 bg-destructive/10 border border-destructive/50 rounded text-destructive text-sm">
              <strong className="block mb-1">Extraction Error:</strong>{' '}
              {extractionError}
            </div>
          )}

          {/* Footer with save status */}
          <EditorFooter saveStatus={saveStatusText} />
        </div>

        {/* Template Panel - right side, collapsible (hidden until preference loaded) */}
        <div
          className={cn(
            'flex flex-col border border-border rounded-lg overflow-hidden bg-card transition-[width] duration-200 ease-in-out shrink-0',
            isTemplatePanelVisible === true ? 'w-80' : 'w-0 border-0'
          )}
        >
          <div className="flex items-center justify-between px-3 py-2 bg-card border-b border-border shrink-0">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-primary" />
              Profile Template
            </h3>
            <Button
              variant="ghost"
              className="p-1 text-muted-foreground hover:text-foreground"
              onClick={() => toggleTemplatePanel(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 font-mono text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {PROFILE_TEMPLATE}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Modal
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        title="Confirm Extraction"
      >
        <div className="p-6">
          <div className="my-4 flex items-start gap-3 rounded-md border border-warning bg-warning/10 p-4">
            <span className="shrink-0 text-2xl">!</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-warning-foreground">
                LLM extraction may have errors. The current content will be
                replaced. Save a backup first if needed.
              </p>
            </div>
          </div>
          <div className="my-4 flex items-start gap-3 rounded-md border border-primary bg-primary/10 p-4">
            <span className="shrink-0 text-lg">Tip:</span>
            <div className="flex-1">
              <p className="text-sm text-primary">
                Label your projects clearly in your resume (e.g., &quot;Project:
                MyApp&quot;) - the LLM may not recognize unlabeled projects.
              </p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3 border-t border-border pt-5">
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
    </div>
  );
}
