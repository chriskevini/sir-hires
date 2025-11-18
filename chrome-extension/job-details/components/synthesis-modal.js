// Synthesis Modal component for LLM-powered document generation
// Self-contained: handles rendering, API calls, and event listeners

import { BaseView } from '../base-view.js';
import { llmConfig } from '../config.js';

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
    try {
      console.log('[SynthesisModal] Fetching available models from LM Studio...');
      const response = await fetch(llmConfig.synthesis.modelsEndpoint, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.availableModels = data.data || [];
      console.log(`[SynthesisModal] Found ${this.availableModels.length} models:`, this.availableModels.map(m => m.id));

      // Set default model if available
      if (this.availableModels.length > 0 && !this.availableModels.find(m => m.id === this.selectedModel)) {
        this.selectedModel = this.availableModels[0].id;
      }
    } catch (error) {
      console.error('[SynthesisModal] Failed to fetch models:', error);
      this.availableModels = [];
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
   * Test connection to LM Studio
   * @returns {boolean} True if connected
   */
  async testConnection() {
    try {
      console.log('[SynthesisModal] Testing connection to LM Studio...');
      const response = await fetch(llmConfig.synthesis.modelsEndpoint, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        console.error(`[SynthesisModal] Connection test failed: HTTP ${response.status}`);
        return false;
      }

      console.log('[SynthesisModal] Connection test successful');
      return true;
    } catch (error) {
      console.error('[SynthesisModal] Connection test failed:', error);
      return false;
    }
  }

  /**
   * Parse thinking content by removing tags
   * @param {string} rawThinking - Raw thinking content with tags
   * @returns {string} Cleaned thinking content
   */
  parseThinking(rawThinking) {
    // Remove <think>, </think>, <thinking>, </thinking>, <reasoning>, </reasoning> tags
    // Support all three variants
    // Don't trim() to preserve whitespace in streaming
    return rawThinking.replace(/<\/?(?:think|thinking|reasoning)>/gi, '');
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
    // Test connection first
    const isConnected = await this.testConnection();
    if (!isConnected) {
      throw new Error('Cannot connect to LM Studio. Please ensure LM Studio is running on http://localhost:1234');
    }

    console.log('[SynthesisModal] Sending prompts to LLM with streaming:', { 
      model, 
      documentKey, 
      systemPromptLength: systemPrompt.length, 
      userPromptLength: userPrompt.length, 
      maxTokens 
    });

    // Call LM Studio API with streaming enabled
    const response = await fetch(llmConfig.synthesis.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: maxTokens,
        temperature: llmConfig.synthesis.temperature,
        stream: true  // Enable streaming
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[SynthesisModal] LLM API error:', errorText);
      
      // Try to parse JSON error for better message
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.code === 'model_not_found') {
          // Model not loaded - provide comprehensive instructions
          throw new Error(
            `Model "${model}" failed to load.\n\n` +
            `Option 1 - Enable JIT Loading (Recommended):\n` +
            `1. Open LM Studio → Developer tab → Server Settings\n` +
            `2. Enable "JIT Loading" (should be on by default)\n` +
            `3. Try generating again (model will auto-load)\n\n` +
            `Option 2 - Manually Load:\n` +
            `• In LM Studio: Click "${model}" in the left sidebar\n` +
            `• Or via CLI: lms load "${model}" --yes\n\n` +
            `Option 3 - Check Model Status:\n` +
            `• The model might not be downloaded yet\n` +
            `• Download it from LM Studio's model library first`
          );
        }
        throw new Error(errorJson.error?.message || `LLM API error: HTTP ${response.status}`);
      } catch (parseError) {
        // If parseError is our custom error, re-throw it
        if (parseError.message.includes('failed to load')) {
          throw parseError;
        }
        // If not JSON, use raw error text
        throw new Error(`LLM API error: HTTP ${response.status} - ${errorText}`);
      }
    }

    // Process SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    // State machine for content routing
    let state = 'DETECTING';  // DETECTING → IN_THINKING_BLOCK → IN_DOCUMENT
    let buffer = '';
    let thinkingContent = '';
    let documentContent = '';
    let finishReason = null;
    let charsProcessed = 0;
    const DETECTION_WINDOW = 50;  // First 50 chars for pattern detection

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.trim() || line.trim() === 'data: [DONE]') continue;
        if (!line.startsWith('data: ')) continue;

        try {
          const jsonStr = line.slice(6);  // Remove "data: " prefix
          const data = JSON.parse(jsonStr);
          
          const delta = data.choices?.[0]?.delta?.content || '';
          if (!delta) {
            // Check for finish reason
            finishReason = data.choices?.[0]?.finish_reason || finishReason;
            continue;
          }

          buffer += delta;
          charsProcessed += delta.length;

          // State machine logic
          if (state === 'DETECTING' && charsProcessed <= DETECTION_WINDOW) {
            // Check for thinking patterns in first 50 chars
            // Support <think>, <thinking>, and <reasoning> tags
            if (/<(?:think|thinking|reasoning)>/i.test(buffer)) {
              state = 'IN_THINKING_BLOCK';
              console.log('[SynthesisModal] Thinking model detected, routing to thinking panel');
            } else if (charsProcessed >= DETECTION_WINDOW) {
              // No thinking pattern detected, treat as standard model
              state = 'IN_DOCUMENT';
              console.log('[SynthesisModal] Standard model detected, routing to document');
              // Send buffered content to document
              if (onDocumentUpdate) {
                onDocumentUpdate(buffer);
              }
              documentContent += buffer;
              buffer = '';
            }
          } else if (state === 'IN_THINKING_BLOCK') {
            // Check for end of thinking block (support all three closing tags)
            if (/<\/(?:think|thinking|reasoning)>/i.test(buffer)) {
              state = 'IN_DOCUMENT';
              
              // Extract thinking content and document start
              const match = buffer.match(/^(.*?)<\/(?:think|thinking|reasoning)>(.*)$/is);
              if (match) {
                const thinkingPart = match[1];
                const documentPart = match[2];
                
                // Send parsed thinking (without tags)
                const parsedThinking = this.parseThinking(thinkingPart);
                if (onThinkingUpdate && parsedThinking) {
                  onThinkingUpdate(parsedThinking);
                }
                thinkingContent += parsedThinking;
                
                // Start document content
                if (onDocumentUpdate && documentPart) {
                  onDocumentUpdate(documentPart);
                }
                documentContent += documentPart;
                buffer = '';
              }
            } else {
              // Still in thinking block, accumulate and send parsed content
              const parsedDelta = this.parseThinking(delta);
              if (onThinkingUpdate && parsedDelta) {
                onThinkingUpdate(parsedDelta);
              }
              thinkingContent += parsedDelta;
            }
          } else if (state === 'IN_DOCUMENT') {
            // Route to document
            if (onDocumentUpdate) {
              onDocumentUpdate(delta);
            }
            documentContent += delta;
          }

        } catch (error) {
          console.error('[SynthesisModal] Failed to parse SSE line:', line, error);
        }
      }
    }

    console.log('[SynthesisModal] Streaming completed', { 
      state, 
      finishReason, 
      documentLength: documentContent.length, 
      thinkingLength: thinkingContent.length 
    });

    // Check for truncation
    const truncated = finishReason === 'length';
    
    if (truncated) {
      console.warn('[SynthesisModal] Response truncated due to token limit');
    }

    return {
      content: documentContent.trim(),
      thinkingContent: thinkingContent.trim(),
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
