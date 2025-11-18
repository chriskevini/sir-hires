// Synthesis Modal component for LLM-powered document generation
// Self-contained: handles rendering, API calls, and event listeners

import { BaseView } from '../base-view.js';
import { llmConfig } from '../config.js';
import { LLMClient } from '../../utils/llm-client.js';

export class SynthesisModal extends BaseView {
  constructor() {
    super();
    this.isOpen = false;
    this.activeJob = null;
    this.activeJobIndex = null;
    this.activeDocumentKey = null;
    this.availableModels = [];
    this.selectedModel = llmConfig.synthesis.defaultModel;
    this.hasExistingContent = false; // Auto-detected: refine if true, generate if false
    this.maxTokens = 2000; // Default max tokens
    this.onGenerate = null; // Callback when generation completes
    this.onGenerationStart = null; // Callback when generation starts (before stream)
    this.onThinkingUpdate = null; // Callback for thinking stream updates
    this.onDocumentUpdate = null; // Callback for document stream updates
    this.onError = null; // Callback when generation fails
    
    // Initialize LLM client
    this.llmClient = new LLMClient({
      endpoint: llmConfig.synthesis.endpoint,
      modelsEndpoint: llmConfig.synthesis.modelsEndpoint
    });
  }

  /**
   * Open the modal
   * @param {Object} job - Job object
   * @param {number} jobIndex - Global index of the job
   * @param {string} documentKey - Active document tab (e.g., 'tailoredResume')
   */
  async open(job, jobIndex, documentKey) {
    this.activeJob = job;
    this.activeJobIndex = jobIndex;
    this.activeDocumentKey = documentKey;
    this.isOpen = true;

    // Check if document has existing content
    const existingContent = job.documents?.[documentKey]?.text || '';
    this.hasExistingContent = existingContent.trim().length > 0;

    // Fetch available models
    await this.fetchAvailableModels();

    // Render modal
    await this.render();
    this.attachListeners();

    // Show modal with animation
    const overlay = document.getElementById('synthesisModalOverlay');
    if (overlay) {
      overlay.classList.remove('hidden');
      requestAnimationFrame(() => {
        overlay.classList.add('visible');
      });
    }
  }

  /**
   * Close the modal
   */
  close() {
    const overlay = document.getElementById('synthesisModalOverlay');
    if (overlay) {
      overlay.classList.remove('visible');
      setTimeout(() => {
        overlay.classList.add('hidden');
        this.cleanup();
      }, 200); // Match CSS transition duration
    }

    this.isOpen = false;
    this.activeJob = null;
    this.activeJobIndex = null;
    this.activeDocumentKey = null;
  }

  /**
   * Fetch available models from LM Studio
   */
  async fetchAvailableModels() {
    this.availableModels = await this.llmClient.fetchModels();

    // Set default model if available
    if (this.availableModels.length > 0 && !this.availableModels.find(m => m.id === this.selectedModel)) {
      this.selectedModel = this.availableModels[0].id;
    }
  }

  /**
   * Build context data for prompt replacement
   * @returns {Object} Context data with all available fields
   */
  async buildContext() {
    // Fetch master resume
    const masterResumeResult = await chrome.storage.local.get(['masterResume']);
    const masterResume = masterResumeResult.masterResume?.content || '';

    return {
      masterResume: masterResume || 'Not provided',
      jobTitle: this.activeJob.jobTitle || 'Not provided',
      company: this.activeJob.company || 'Not provided',
      aboutJob: this.activeJob.aboutJob || 'Not provided',
      aboutCompany: this.activeJob.aboutCompany || 'Not provided',
      responsibilities: this.activeJob.responsibilities || 'Not provided',
      requirements: this.activeJob.requirements || 'Not provided',
      narrativeStrategy: this.activeJob.narrativeStrategy || 'Not provided',
      currentDraft: this.activeJob.documents?.[this.activeDocumentKey]?.text || ''
    };
  }

  /**
   * Build JIT user prompt from context data
   * @param {Object} context - Context data from buildContext()
   * @returns {string} Formatted user prompt
   */
  buildUserPrompt(context) {
    const sections = [];
    
    // Only include sections with actual data
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
    
    if (context.responsibilities && context.responsibilities !== 'Not provided') {
      sections.push(`[RESPONSIBILITIES]\n${context.responsibilities}`);
    }
    
    if (context.requirements && context.requirements !== 'Not provided') {
      sections.push(`[REQUIREMENTS]\n${context.requirements}`);
    }
    
    if (context.narrativeStrategy && context.narrativeStrategy !== 'Not provided') {
      sections.push(`[NARRATIVE STRATEGY]\n${context.narrativeStrategy}`);
    }
    
    if (context.currentDraft && context.currentDraft !== 'Not provided') {
      sections.push(`[CURRENT DRAFT]\n${context.currentDraft}`);
    }
    
    // Join sections with double newlines and add closing instruction
    return sections.join('\n\n') + '\n\nSynthesize the document now, strictly following the STREAMING PROTOCOL.';
  }

  /**
   * Synthesize document using LLM with streaming support
   * @param {string} documentKey - Document type
   * @param {string} model - Model ID
   * @param {string} systemPrompt - System prompt defining AI behavior
   * @param {string} userPrompt - User prompt with context data
   * @param {Function} onThinkingUpdate - Callback for thinking stream updates (parsed content)
   * @param {Function} onDocumentUpdate - Callback for document stream updates
   * @param {number} maxTokens - Maximum tokens to generate (default: 2000)
   * @returns {Object} Result with { content, thinkingContent, truncated, currentTokens }
   */
  async synthesizeDocument(documentKey, model, systemPrompt, userPrompt, onThinkingUpdate = null, onDocumentUpdate = null, maxTokens = 2000) {
    // Use LLMClient to stream completion
    const result = await this.llmClient.streamCompletion({
      model,
      systemPrompt,
      userPrompt,
      maxTokens,
      temperature: llmConfig.synthesis.temperature,
      onThinkingUpdate,
      onDocumentUpdate
    });

    // Check for truncation
    const truncated = result.finishReason === 'length';

    return {
      content: result.documentContent,
      thinkingContent: result.thinkingContent,
      truncated: truncated,
      currentTokens: maxTokens
    };
  }

  /**
   * Render the modal
   */
  async render() {
    // Check if modal container already exists
    let overlay = document.getElementById('synthesisModalOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'synthesisModalOverlay';
      overlay.className = 'synthesis-modal-overlay hidden';
      document.body.appendChild(overlay);
    }

    // Render modal content
    overlay.innerHTML = await this.renderModalContent();
  }

  /**
   * Render modal content
   * @returns {string} HTML string
   */
  async renderModalContent() {
    if (!this.activeJob) return '';

    // Use generic document label since we now support universal generation
    const documentLabel = 'Document';

    // Check for master resume (critical requirement)
    const masterResumeResult = await chrome.storage.local.get(['masterResume']);
    const masterResume = masterResumeResult.masterResume?.content || '';
    const hasMasterResume = masterResume.trim().length > 0;

    // If no master resume, show only error warning + Cancel button
    if (!hasMasterResume) {
      return `
        <div class="synthesis-modal">
          <div class="modal-header">
            <h2>✨ Synthesize ${documentLabel} with LLM</h2>
            <button class="modal-close-btn" id="synthesisModalCloseBtn">&times;</button>
          </div>
          
          <div class="modal-body">
            <div class="error-warning">
              <p>ℹ️ <strong>Please create a master resume before continuing.</strong></p>
              <button class="btn-primary" id="synthesisCreateResumeBtn">Create Master Resume</button>
            </div>
          </div>

          <div class="modal-footer">
            <div class="action-buttons-group" style="margin-left: auto;">
              <button class="btn-secondary" id="synthesisModalCancelBtn">Cancel</button>
            </div>
          </div>
        </div>
      `;
    }

    // Master resume exists - show full modal UI
    // Get model options
    const modelOptions = this.availableModels.length > 0
      ? this.availableModels.map(model => 
          `<option value="${model.id}" ${model.id === this.selectedModel ? 'selected' : ''}>${model.id}</option>`
        ).join('')
      : `<option value="${llmConfig.synthesis.defaultModel}">${llmConfig.synthesis.defaultModel} (not loaded)</option>`;

    // Build data checklist with filled/missing indicators
    const dataFields = [
      { key: 'masterResume', label: 'Master Resume', value: masterResume },
      { key: 'jobTitle', label: 'Job Title', value: this.activeJob.jobTitle },
      { key: 'company', label: 'Company', value: this.activeJob.company },
      { key: 'aboutJob', label: 'About Job', value: this.activeJob.aboutJob },
      { key: 'aboutCompany', label: 'About Company', value: this.activeJob.aboutCompany },
      { key: 'responsibilities', label: 'Responsibilities', value: this.activeJob.responsibilities },
      { key: 'requirements', label: 'Requirements', value: this.activeJob.requirements },
      { key: 'narrativeStrategy', label: 'Narrative Strategy', value: this.activeJob.narrativeStrategy },
      { key: 'currentDraft', label: 'Current Draft', value: this.activeJob.documents?.[this.activeDocumentKey]?.text }
    ];

    const checklistHTML = dataFields.map(field => {
      const isFilled = field.value && field.value.trim().length > 0;
      const bulletClass = isFilled ? 'data-bullet-filled' : 'data-bullet-empty';
      const bulletIcon = isFilled ? '✓' : '○';
      return `
        <li class="data-checklist-item">
          <span class="${bulletClass}">${bulletIcon}</span>
          <span class="data-field-label">${field.label}</span>
        </li>
      `;
    }).join('');

    const missingFields = dataFields.filter(f => !f.value || f.value.trim() === '');
    const missingFieldsWarning = missingFields.length > 0 ? `
      <div class="missing-fields-warning">
        <p>⚠️ <strong>${missingFields.length} field${missingFields.length === 1 ? ' is' : 's are'} missing.</strong> We recommend doing more research for better document synthesis.</p>
      </div>
    ` : '';

    // Show helpful tip about the template prefill
    const draftInstructions = `
      <div class="existing-content-info">
        <p>💡 <strong>Tip:</strong> You can paste your own document to be used as a template during synthesis.</p>
      </div>
    `;

    return `
      <div class="synthesis-modal">
        <div class="modal-header">
          <h2>✨ Synthesize ${documentLabel} with LLM</h2>
          <button class="modal-close-btn" id="synthesisModalCloseBtn">&times;</button>
        </div>
        
        <div class="modal-body">
          <div class="data-checklist-section">
            <label>Input Data Status:</label>
            <ul class="data-checklist">
              ${checklistHTML}
            </ul>
          </div>

          ${draftInstructions}
          ${missingFieldsWarning}
        </div>

        <div class="modal-footer">
          <div class="model-selector-group">
            <label for="synthesisModelSelect">Model:</label>
            <select id="synthesisModelSelect">
              ${modelOptions}
            </select>
            ${this.availableModels.length === 0 ? 
              '<span class="model-warning">⚠️ No models loaded</span>' : 
              ''}
          </div>
          <div class="max-tokens-group">
            <label for="synthesisMaxTokens">Max Tokens:</label>
            <input type="number" id="synthesisMaxTokens" value="${this.maxTokens}" min="100" max="32000" step="100" />
          </div>
          <div class="action-buttons-group">
            <button class="btn-secondary" id="synthesisModalCancelBtn">Cancel</button>
            <button class="btn-primary" id="synthesisModalGenerateBtn">Generate</button>
          </div>
        </div>
      </div>
    `;
  }



  /**
   * Attach event listeners
   */
  attachListeners() {
    const overlay = document.getElementById('synthesisModalOverlay');
    if (!overlay) return;

    // Close button
    const closeBtn = document.getElementById('synthesisModalCloseBtn');
    if (closeBtn) {
      this.trackListener(closeBtn, 'click', () => this.close());
    }

    // Cancel button
    const cancelBtn = document.getElementById('synthesisModalCancelBtn');
    if (cancelBtn) {
      this.trackListener(cancelBtn, 'click', () => this.close());
    }

    // Create Master Resume button
    const createResumeBtn = document.getElementById('synthesisCreateResumeBtn');
    if (createResumeBtn) {
      this.trackListener(createResumeBtn, 'click', () => {
        // Navigate to resume page
        window.location.href = '/resume.html';
      });
    }

    // Generate button
    const generateBtn = document.getElementById('synthesisModalGenerateBtn');
    if (generateBtn) {
      this.trackListener(generateBtn, 'click', () => this.handleGenerate());
    }

    // Close on overlay click
    this.trackListener(overlay, 'click', (e) => {
      if (e.target === overlay) {
        this.close();
      }
    });

    // Close on Escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    };
    this.trackListener(document, 'keydown', escapeHandler);

    // Model selection
    const modelSelect = document.getElementById('synthesisModelSelect');
    if (modelSelect) {
      this.trackListener(modelSelect, 'change', (e) => {
        this.selectedModel = e.target.value;
      });
    }
  }



  /**
   * Handle generate button click
   */
  async handleGenerate() {
    const generateBtn = document.getElementById('synthesisModalGenerateBtn');
    const maxTokensInput = document.getElementById('synthesisMaxTokens');
    
    if (!generateBtn || !maxTokensInput) return;

    // Get max tokens from input
    const maxTokens = parseInt(maxTokensInput.value) || 2000;
    
    if (maxTokens < 100 || maxTokens > 32000) {
      alert('Max tokens must be between 100 and 32000');
      return;
    }

    // Disable button and show loading state
    generateBtn.disabled = true;
    const originalText = generateBtn.textContent;
    generateBtn.innerHTML = '⏳ Generating...';

    try {
      // Build context data
      const context = await this.buildContext();

      // Build system prompt (from config) and user prompt (JIT)
      const systemPrompt = llmConfig.synthesis.prompts.universal;
      const userPrompt = this.buildUserPrompt(context);

      // Capture these values before closing modal (close() sets them to null)
      const capturedJobIndex = this.activeJobIndex;
      const capturedDocumentKey = this.activeDocumentKey;

      // Close modal immediately so user can watch streaming
      this.close();

      // Notify that generation is starting (before stream begins)
      if (this.onGenerationStart) {
        this.onGenerationStart(capturedJobIndex, capturedDocumentKey);
      }

      // Synthesize document with system + user prompts and streaming callbacks
      // This runs in the background while modal is closed
      // Wrap callbacks to inject documentKey parameter
      const wrappedOnThinkingUpdate = this.onThinkingUpdate 
        ? (delta) => this.onThinkingUpdate(capturedDocumentKey, delta) 
        : null;
      const wrappedOnDocumentUpdate = this.onDocumentUpdate 
        ? (delta) => this.onDocumentUpdate(capturedDocumentKey, delta) 
        : null;
      
      const result = await this.synthesizeDocument(
        capturedDocumentKey,
        this.selectedModel,
        systemPrompt,
        userPrompt,
        wrappedOnThinkingUpdate,  // Pass wrapped thinking callback
        wrappedOnDocumentUpdate,  // Pass wrapped document callback
        maxTokens
      );

      // Check for truncation
      if (result.truncated) {
        console.warn('[SynthesisModal] Response truncated due to token limit');
        
        // Show alert to user
        alert(
          `⚠️ Response was truncated due to token limit (${result.currentTokens} tokens).\n\n` +
          `This often happens with thinking models that use reasoning before output.\n\n` +
          `Please reopen the synthesis modal, increase "Max Tokens", and try again.`
        );
        
        // Still call onGenerate to save truncated content
        if (this.onGenerate) {
          this.onGenerate(capturedJobIndex, capturedDocumentKey, result);
        }
        return;
      }

      // Call callback with generated content
      if (this.onGenerate) {
        this.onGenerate(capturedJobIndex, capturedDocumentKey, result);
      }
    } catch (error) {
      console.error('[SynthesisModal] Synthesis failed:', error);
      
      // Re-enable button and restore text if modal is still open
      if (this.isOpen) {
        generateBtn.disabled = false;
        generateBtn.innerHTML = originalText;
      }
      
      // Call error callback if available
      if (this.onError) {
        this.onError(capturedJobIndex, capturedDocumentKey, error);
      }
      
      // Still show alert to user
      alert(`Failed to generate document: ${error.message}`);
    }
  }

  /**
   * Clean up event listeners
   */
  cleanup() {
    super.cleanup();
    
    // Remove modal from DOM if needed
    const overlay = document.getElementById('synthesisModalOverlay');
    if (overlay) {
      overlay.innerHTML = '';
    }
  }
}
