import React, { useState, useEffect } from 'react';
import { llmConfig } from '../config';
import { LLMClient } from '../../../utils/llm-client';
import type { Job } from '../hooks';
import { useParsedJob } from '../../../components/features/ParsedJobProvider';
import { getJobTitle, getCompanyName } from '../../../utils/job-parser';
import { userProfileStorage } from '../../../utils/storage';

interface SynthesisFormProps {
  job: Job | null;
  jobIndex: number | null;
  documentKey: string | null;
  onGenerate: (
    _jobIndex: number,
    _documentKey: string,
    _result: {
      content: string;
      thinkingContent: string;
      truncated: boolean;
      currentTokens: number;
    }
  ) => void;
  onGenerationStart?: (_jobIndex: number, _documentKey: string) => void;
  onThinkingUpdate?: (_documentKey: string, _delta: string) => void;
  onDocumentUpdate?: (_documentKey: string, _delta: string) => void;
  onError?: (_jobIndex: number, _documentKey: string, _error: Error) => void;
  onClose: () => void;
}

interface Model {
  id: string;
}

export const SynthesisForm: React.FC<SynthesisFormProps> = ({
  job,
  jobIndex,
  documentKey,
  onGenerate,
  onGenerationStart,
  onThinkingUpdate,
  onDocumentUpdate,
  onError,
  onClose,
}) => {
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState(
    llmConfig.synthesis.model || llmConfig.model
  );
  const [maxTokens, setMaxTokens] = useState(2000);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userProfile, setUserProfile] = useState('');
  const [_hasExistingContent, setHasExistingContent] = useState(false);
  const [llmClient] = useState(
    () =>
      new LLMClient({
        endpoint: llmConfig.endpoint,
        modelsEndpoint: llmConfig.modelsEndpoint,
      })
  );

  // Fetch available models when component mounts
  useEffect(() => {
    const init = async () => {
      await fetchAvailableModels();
      await fetchUserProfile();
      checkExistingContent();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job, documentKey]);

  const fetchAvailableModels = async () => {
    const models = await llmClient.fetchModels();
    setAvailableModels(models);

    // Set default model if available
    if (
      models.length > 0 &&
      !models.find((m: { id: string }) => m.id === selectedModel)
    ) {
      setSelectedModel(models[0].id);
    }
  };

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
    if (!job)
      return {
        masterResume: 'Not provided',
        jobTitle: 'Not provided',
        company: 'Not provided',
        aboutJob: 'Not provided',
        aboutCompany: 'Not provided',
        responsibilities: 'Not provided',
        requirements: 'Not provided',
        narrativeStrategy: 'Not provided',
        currentDraft: '',
      };

    return {
      masterResume: userProfile || 'Not provided',
      jobTitle: parsed ? getJobTitle(parsed) || 'Not provided' : 'Not provided',
      company: parsed
        ? getCompanyName(parsed) || 'Not provided'
        : 'Not provided',
      aboutJob:
        ((job as unknown as Record<string, unknown>).aboutJob as string) ||
        'Not provided',
      aboutCompany:
        ((job as unknown as Record<string, unknown>).aboutCompany as string) ||
        'Not provided',
      responsibilities:
        ((job as unknown as Record<string, unknown>)
          .responsibilities as string) || 'Not provided',
      requirements:
        ((job as unknown as Record<string, unknown>).requirements as string) ||
        'Not provided',
      narrativeStrategy:
        ((job as unknown as Record<string, unknown>)
          .narrativeStrategy as string) || 'Not provided',
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

    if (
      context.responsibilities &&
      context.responsibilities !== 'Not provided'
    ) {
      sections.push(`[RESPONSIBILITIES]\n${context.responsibilities}`);
    }

    if (context.requirements && context.requirements !== 'Not provided') {
      sections.push(`[REQUIREMENTS]\n${context.requirements}`);
    }

    if (
      context.narrativeStrategy &&
      context.narrativeStrategy !== 'Not provided'
    ) {
      sections.push(`[NARRATIVE STRATEGY]\n${context.narrativeStrategy}`);
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
      temperature: llmConfig.synthesis.temperature,
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
    if (!job || jobIndex === null || !documentKey) return;

    if (maxTokens < 100 || maxTokens > 32000) {
      alert('Max tokens must be between 100 and 32000');
      return;
    }

    setIsGenerating(true);

    try {
      // Build context data
      const context = await buildContext();

      // Build system prompt (from config) and user prompt (JIT)
      const systemPrompt = llmConfig.synthesis.prompt;
      const userPrompt = buildUserPrompt(context);

      // Capture these values before closing modal
      const capturedJobIndex = jobIndex;
      const capturedDocumentKey = documentKey;

      // Close modal immediately so user can watch streaming
      onClose();

      // Notify that generation is starting (before stream begins)
      if (onGenerationStart) {
        onGenerationStart(capturedJobIndex, capturedDocumentKey);
      }

      // Synthesize document with system + user prompts and streaming callbacks
      const result = await synthesizeDocument(systemPrompt, userPrompt);

      // Check for truncation
      if (result.truncated) {
        console.warn('[SynthesisForm] Response truncated due to token limit');

        // Show alert to user
        alert(
          `⚠️ Response was truncated due to token limit (${result.currentTokens} tokens).\n\n` +
            `This often happens with thinking models that use reasoning before output.\n\n` +
            `Please reopen the synthesis modal, increase "Max Tokens", and try again.`
        );

        // Still call onGenerate to save truncated content
        onGenerate(capturedJobIndex, capturedDocumentKey, result);
        return;
      }

      // Call callback with generated content
      onGenerate(capturedJobIndex, capturedDocumentKey, result);
    } catch (error) {
      console.error('[SynthesisForm] Synthesis failed:', error);

      if (jobIndex !== null && documentKey && onError) {
        onError(jobIndex, documentKey, error as Error);
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
              ℹ️ <strong>Please create a profile before continuing.</strong>
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
      ? availableModels.map((model) => (
          <option key={model.id} value={model.id}>
            {model.id}
          </option>
        ))
      : [
          <option
            key="default"
            value={llmConfig.synthesis.model || llmConfig.model}
          >
            {llmConfig.synthesis.model || llmConfig.model} (not loaded)
          </option>,
        ];

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
      label: 'About Job',
      value: (job as unknown as Record<string, unknown>)?.aboutJob,
    },
    {
      key: 'aboutCompany',
      label: 'About Company',
      value: (job as unknown as Record<string, unknown>)?.aboutCompany,
    },
    {
      key: 'responsibilities',
      label: 'Responsibilities',
      value: (job as unknown as Record<string, unknown>)?.responsibilities,
    },
    {
      key: 'requirements',
      label: 'Requirements',
      value: (job as unknown as Record<string, unknown>)?.requirements,
    },
    {
      key: 'narrativeStrategy',
      label: 'Narrative Strategy',
      value: (job as unknown as Record<string, unknown>)?.narrativeStrategy,
    },
    {
      key: 'currentDraft',
      label: 'Current Draft',
      value: job?.documents?.[documentKey || '']?.text,
    },
  ];

  const missingFields = dataFields.filter(
    (f) =>
      !f.value ||
      (typeof f.value === 'string' && f.value.trim() === '') ||
      typeof f.value !== 'string'
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
            💡 <strong>Tip:</strong> You can paste your own document to be used
            as a template during synthesis.
          </p>
        </div>

        {missingFields.length > 0 && (
          <div className="missing-fields-warning">
            <p>
              ⚠️{' '}
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
          {availableModels.length === 0 && (
            <span className="model-warning">⚠️ No models loaded</span>
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
            {isGenerating ? '⏳ Generating...' : 'Generate'}
          </button>
        </div>
      </div>
    </>
  );
};
