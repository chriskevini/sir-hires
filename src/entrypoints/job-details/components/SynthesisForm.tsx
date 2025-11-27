import React, { useState, useEffect, useMemo } from 'react';
import { llmConfig } from '../config';
import { LLMClient } from '../../../utils/llm-client';
import type { Job } from '../hooks';
import { useParsedJob } from '../../../components/features/ParsedJobProvider';
import {
  getJobTitle,
  getCompanyName,
  extractDescription,
  extractAboutCompany,
  extractRequiredSkills,
  extractPreferredSkills,
} from '../../../utils/job-parser';
import { userProfileStorage } from '../../../utils/storage';
import { useLLMSettings } from '../../../hooks/useLLMSettings';
import { DEFAULT_MODEL, DEFAULT_TASK_SETTINGS } from '../../../utils/llm-utils';

// Helper to convert array to bullet-point string
const arrayToString = (arr: string[]): string => {
  return arr.length > 0 ? arr.map((item) => `- ${item}`).join('\n') : '';
};

interface SynthesisFormProps {
  job: Job | null;
  jobId: string | null;
  documentKey: string | null;
  onGenerate: (
    _jobId: string,
    _documentKey: string,
    _result: {
      content: string;
      thinkingContent: string;
      truncated: boolean;
      currentTokens: number;
    }
  ) => void;
  onGenerationStart?: (_jobId: string, _documentKey: string) => void;
  onThinkingUpdate?: (_documentKey: string, _delta: string) => void;
  onDocumentUpdate?: (_documentKey: string, _delta: string) => void;
  onError?: (_jobId: string, _documentKey: string, _error: Error) => void;
  onClose: () => void;
}

export const SynthesisForm: React.FC<SynthesisFormProps> = ({
  job,
  jobId,
  documentKey,
  onGenerate,
  onGenerationStart,
  onThinkingUpdate,
  onDocumentUpdate,
  onError,
  onClose,
}) => {
  // Use shared LLM settings hook with synthesis task
  const {
    availableModels,
    model: savedModel,
    endpoint,
    modelsEndpoint,
    maxTokens: savedMaxTokens,
    temperature: savedTemperature,
    isLoading: isLoadingSettings,
    isConnected,
  } = useLLMSettings({ task: 'synthesis' });

  // Local state for form controls (initialized from saved settings)
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [maxTokens, setMaxTokens] = useState(
    DEFAULT_TASK_SETTINGS.synthesis.maxTokens
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [userProfile, setUserProfile] = useState('');
  const [_hasExistingContent, setHasExistingContent] = useState(false);

  // Sync local model state with saved settings when they load
  useEffect(() => {
    if (!isLoadingSettings && savedModel) {
      setSelectedModel(savedModel);
    }
  }, [isLoadingSettings, savedModel]);

  // Sync local maxTokens with saved task settings when they load
  useEffect(() => {
    if (!isLoadingSettings) {
      setMaxTokens(savedMaxTokens);
    }
  }, [isLoadingSettings, savedMaxTokens]);

  // Create LLM client with current settings (memoized to avoid recreating on every render)
  const llmClient = useMemo(
    () =>
      new LLMClient({
        endpoint,
        modelsEndpoint,
      }),
    [endpoint, modelsEndpoint]
  );

  // Fetch user profile on mount
  useEffect(() => {
    const init = async () => {
      await fetchUserProfile();
      checkExistingContent();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job, documentKey]);

  const fetchUserProfile = async () => {
    const userProfileData = await userProfileStorage.getValue();
    const profile = userProfileData?.content || '';
    setUserProfile(profile);
  };

  const checkExistingContent = () => {
    if (job && documentKey) {
      const existingContent = job.documents?.[documentKey]?.text || '';
      setHasExistingContent(existingContent.trim().length > 0);
    }
  };

  // Get parsed job from provider (cached)
  const parsed = useParsedJob(job?.id || '');

  const buildContext = async (): Promise<Record<string, string>> => {
    if (!job || !parsed)
      return {
        masterResume: 'Not provided',
        jobTitle: 'Not provided',
        company: 'Not provided',
        aboutJob: 'Not provided',
        aboutCompany: 'Not provided',
        requirements: 'Not provided',
        preferredSkills: 'Not provided',
        currentDraft: '',
      };

    // Extract fields from parsed MarkdownDB template
    const description = arrayToString(extractDescription(parsed));
    const aboutCompany = arrayToString(extractAboutCompany(parsed));
    const requiredSkills = arrayToString(extractRequiredSkills(parsed));
    const preferredSkills = arrayToString(extractPreferredSkills(parsed));

    return {
      masterResume: userProfile || 'Not provided',
      jobTitle: getJobTitle(parsed) || 'Not provided',
      company: getCompanyName(parsed) || 'Not provided',
      aboutJob: description || 'Not provided',
      aboutCompany: aboutCompany || 'Not provided',
      requirements: requiredSkills || 'Not provided',
      preferredSkills: preferredSkills || 'Not provided',
      currentDraft: job.documents?.[documentKey || '']?.text || '',
    };
  };

  const buildUserPrompt = (context: Record<string, string>) => {
    const sections = [];

    if (context.masterResume && context.masterResume !== 'Not provided') {
      sections.push(`[MASTER RESUME]\n${context.masterResume}`);
    }

    if (context.jobTitle && context.jobTitle !== 'Not provided') {
      sections.push(`[JOB TITLE]\n${context.jobTitle}`);
    }

    if (context.company && context.company !== 'Not provided') {
      sections.push(`[COMPANY]\n${context.company}`);
    }

    if (context.aboutJob && context.aboutJob !== 'Not provided') {
      sections.push(`[ABOUT THE JOB]\n${context.aboutJob}`);
    }

    if (context.aboutCompany && context.aboutCompany !== 'Not provided') {
      sections.push(`[ABOUT THE COMPANY]\n${context.aboutCompany}`);
    }

    if (context.requirements && context.requirements !== 'Not provided') {
      sections.push(`[REQUIRED SKILLS]\n${context.requirements}`);
    }

    if (context.preferredSkills && context.preferredSkills !== 'Not provided') {
      sections.push(`[PREFERRED SKILLS]\n${context.preferredSkills}`);
    }

    if (context.currentDraft && context.currentDraft !== 'Not provided') {
      sections.push(`[CURRENT DRAFT]\n${context.currentDraft}`);
    }

    return (
      sections.join('\n\n') +
      '\n\nSynthesize the document now, strictly following the STREAMING PROTOCOL.'
    );
  };

  const synthesizeDocument = async (
    systemPrompt: string,
    userPrompt: string
  ) => {
    const result = await llmClient.streamCompletion({
      model: selectedModel,
      systemPrompt,
      userPrompt,
      maxTokens,
      temperature: savedTemperature,
      onThinkingUpdate: onThinkingUpdate
        ? (delta: string) => onThinkingUpdate(documentKey!, delta)
        : undefined,
      onDocumentUpdate: onDocumentUpdate
        ? (delta: string) => onDocumentUpdate(documentKey!, delta)
        : undefined,
    });

    const truncated = result.finishReason === 'length';

    return {
      content: result.documentContent,
      thinkingContent: result.thinkingContent,
      truncated: truncated,
      currentTokens: maxTokens,
    };
  };

  const handleGenerate = async () => {
    if (!job || jobId === null || !documentKey) return;

    if (maxTokens < 100 || maxTokens > 32000) {
      alert('Max tokens must be between 100 and 32000');
      return;
    }

    setIsGenerating(true);

    try {
      // Build context data
      const context = await buildContext();

      // Build system prompt (from config) and user prompt (JIT)
      const systemPrompt = llmConfig.synthesis.prompts.universal;
      const userPrompt = buildUserPrompt(context);

      // Capture these values before closing modal
      const capturedJobId = jobId;
      const capturedDocumentKey = documentKey;

      // Close modal immediately so user can watch streaming
      onClose();

      // Notify that generation is starting (before stream begins)
      if (onGenerationStart) {
        onGenerationStart(capturedJobId, capturedDocumentKey);
      }

      // Synthesize document with system + user prompts and streaming callbacks
      const result = await synthesizeDocument(systemPrompt, userPrompt);

      // Check for truncation
      if (result.truncated) {
        console.warn('[SynthesisForm] Response truncated due to token limit');

        // Show alert to user
        alert(
          `Warning: Response was truncated due to token limit (${result.currentTokens} tokens).\n\n` +
            `This often happens with thinking models that use reasoning before output.\n\n` +
            `Please reopen the synthesis modal, increase "Max Tokens", and try again.`
        );

        // Still call onGenerate to save truncated content
        onGenerate(capturedJobId, capturedDocumentKey, result);
        return;
      }

      // Call callback with generated content
      onGenerate(capturedJobId, capturedDocumentKey, result);
    } catch (error) {
      console.error('[SynthesisForm] Synthesis failed:', error);

      if (jobId !== null && documentKey && onError) {
        onError(jobId, documentKey, error as Error);
      }

      // Still show alert to user
      alert(`Failed to generate document: ${(error as Error).message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const hasUserProfile = userProfile.trim().length > 0;

  // If no user profile, show only error warning + Cancel button
  if (!hasUserProfile) {
    return (
      <>
        <div className="modal-body">
          <div className="error-warning">
            <p>
              <strong>Please create a profile before continuing.</strong>
            </p>
            <button
              className="btn-primary"
              onClick={() => {
                window.location.href = '/profile.html';
              }}
            >
              Create Profile
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <div className="action-buttons-group" style={{ marginLeft: 'auto' }}>
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </>
    );
  }

  // User profile exists - show full form UI
  const modelOptions =
    availableModels.length > 0
      ? availableModels.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))
      : [
          <option key="default" value={selectedModel}>
            {selectedModel} (not loaded)
          </option>,
        ];

  // Extract parsed data for display in checklist
  const description = parsed ? extractDescription(parsed) : [];
  const aboutCompanyData = parsed ? extractAboutCompany(parsed) : [];
  const requiredSkillsData = parsed ? extractRequiredSkills(parsed) : [];
  const preferredSkillsData = parsed ? extractPreferredSkills(parsed) : [];

  const dataFields = [
    { key: 'masterResume', label: 'Profile', value: userProfile },
    {
      key: 'jobTitle',
      label: 'Job Title',
      value: parsed ? getJobTitle(parsed) : undefined,
    },
    {
      key: 'company',
      label: 'Company',
      value: parsed ? getCompanyName(parsed) : undefined,
    },
    {
      key: 'aboutJob',
      label: 'Description',
      value: description.length > 0 ? description.join('\n') : undefined,
    },
    {
      key: 'aboutCompany',
      label: 'About Company',
      value:
        aboutCompanyData.length > 0 ? aboutCompanyData.join('\n') : undefined,
    },
    {
      key: 'requirements',
      label: 'Required Skills',
      value:
        requiredSkillsData.length > 0
          ? requiredSkillsData.join('\n')
          : undefined,
    },
    {
      key: 'preferredSkills',
      label: 'Preferred Skills',
      value:
        preferredSkillsData.length > 0
          ? preferredSkillsData.join('\n')
          : undefined,
    },
    {
      key: 'currentDraft',
      label: 'Current Draft',
      value: job?.documents?.[documentKey || '']?.text,
    },
  ];

  const missingFields = dataFields.filter(
    (f) => !f.value || (typeof f.value === 'string' && f.value.trim() === '')
  );

  return (
    <>
      <div className="modal-body">
        <div className="data-checklist-section">
          <label>Input Data Status:</label>
          <ul className="data-checklist">
            {dataFields.map((field) => {
              const isFilled =
                field.value &&
                typeof field.value === 'string' &&
                field.value.trim().length > 0;
              const bulletClass = isFilled
                ? 'data-bullet-filled'
                : 'data-bullet-empty';
              const bulletIcon = isFilled ? '✓' : '○';
              return (
                <li key={field.key} className="data-checklist-item">
                  <span className={bulletClass}>{bulletIcon}</span>
                  <span className="data-field-label">{field.label}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="existing-content-info">
          <p>
            <strong>Tip:</strong> You can paste your own document to be used as
            a template during synthesis.
          </p>
        </div>

        {missingFields.length > 0 && (
          <div className="missing-fields-warning">
            <p>
              <strong>
                {missingFields.length} field
                {missingFields.length === 1 ? ' is' : 's are'} missing.
              </strong>{' '}
              We recommend doing more research for better document synthesis.
            </p>
          </div>
        )}
      </div>

      <div className="modal-footer">
        <div className="model-selector-group">
          <label htmlFor="synthesisModelSelect">Model:</label>
          <select
            id="synthesisModelSelect"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            {modelOptions}
          </select>
          {!isConnected && !isLoadingSettings && (
            <span className="model-warning">No models loaded</span>
          )}
        </div>
        <div className="max-tokens-group">
          <label htmlFor="synthesisMaxTokens">Max Tokens:</label>
          <input
            type="number"
            id="synthesisMaxTokens"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value) || 2000)}
            min={100}
            max={32000}
            step={100}
          />
        </div>
        <div className="action-buttons-group">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>
    </>
  );
};
