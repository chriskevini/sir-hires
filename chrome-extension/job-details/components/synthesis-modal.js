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
    this.promptTemplate = null; // Current prompt template (custom or default)
    this.onGenerate = null; // Callback when generation completes
  }

  /**
   * Load custom prompt template from storage or fall back to default
   * @param {string} documentKey - Document type (used for backward compatibility, now uses universal prompt)
   * @returns {string} Prompt template
   */
  async loadCustomPrompt(documentKey) {
    try {
      const result = await chrome.storage.local.get(['customPrompts']);
      const customPrompts = result.customPrompts || {};
      
      // Use single 'universal' key for all document types
      return customPrompts.universal || llmConfig.synthesis.prompts.universal;
    } catch (error) {
      console.error('[SynthesisModal] Failed to load custom prompt:', error);
      // Fall back to universal prompt on error
      return llmConfig.synthesis.prompts.universal;
    }
  }

  /**
   * Save custom prompt template to storage
   * @param {string} documentKey - Document type (unused, kept for API compatibility)
   * @param {string} template - Prompt template to save
   */
  async saveCustomPrompt(documentKey, template) {
    try {
      const result = await chrome.storage.local.get(['customPrompts']);
      const customPrompts = result.customPrompts || {};
      
      // Save to single 'universal' key
      customPrompts.universal = template;
      await chrome.storage.local.set({ customPrompts });
      
      console.log('[SynthesisModal] Saved custom universal prompt');
    } catch (error) {
      console.error('[SynthesisModal] Failed to save custom prompt:', error);
    }
  }

  /**
   * Clear custom prompt and revert to default
   * @param {string} documentKey - Document type (unused, kept for API compatibility)
   */
  async clearCustomPrompt(documentKey) {
    try {
      const result = await chrome.storage.local.get(['customPrompts']);
      const customPrompts = result.customPrompts || {};
      
      // Clear universal prompt
      customPrompts.universal = null;
      await chrome.storage.local.set({ customPrompts });
      
      console.log('[SynthesisModal] Cleared custom universal prompt');
      
      // Return default universal prompt
      return llmConfig.synthesis.prompts.universal;
    } catch (error) {
      console.error('[SynthesisModal] Failed to clear custom prompt:', error);
      // Fall back to universal prompt on error
      return llmConfig.synthesis.prompts.universal;
    }
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

    // Load custom prompt template or fall back to default
    this.promptTemplate = await this.loadCustomPrompt(documentKey);

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
   * Replace placeholders in template with actual values
   * @param {string} template - Prompt template with placeholders
   * @param {Object} context - Context data
   * @returns {string} Filled prompt
   */
  fillPlaceholders(template, context) {
    let prompt = template;
    
    // Replace all placeholders
    for (const [key, value] of Object.entries(context)) {
      prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    
    return prompt;
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
   * Synthesize document using LLM
   * @param {string} documentKey - Document type
   * @param {string} model - Model ID
   * @param {string} prompt - Filled prompt with actual data (no placeholders)
   * @returns {string} Generated content
   */
  async synthesizeDocument(documentKey, model, prompt) {
    // Test connection first
    const isConnected = await this.testConnection();
    if (!isConnected) {
      throw new Error('Cannot connect to LM Studio. Please ensure LM Studio is running on http://localhost:1234');
    }

    console.log('[SynthesisModal] Sending prompt to LLM:', { model, documentKey, promptLength: prompt.length });

    // Call LM Studio API
    const response = await fetch(llmConfig.synthesis.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: llmConfig.synthesis.maxTokens,
        temperature: llmConfig.synthesis.temperature
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[SynthesisModal] LLM API error:', errorText);
      throw new Error(`LLM API error: HTTP ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[SynthesisModal] Received response from LLM');

    // Extract generated content
    const content = data.choices?.[0]?.message?.content || '';
    if (!content) {
      throw new Error('LLM returned empty content');
    }

    return content;
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

    // Check for missing data fields
    const missingFields = [];
    const fieldLabels = {
      jobTitle: 'Job Title',
      company: 'Company',
      aboutJob: 'About Job',
      aboutCompany: 'About Company',
      responsibilities: 'Responsibilities',
      requirements: 'Requirements',
      narrativeStrategy: 'Narrative Focus'
    };

    for (const [field, label] of Object.entries(fieldLabels)) {
      if (!this.activeJob[field] || this.activeJob[field].trim() === '') {
        missingFields.push(label);
      }
    }

    const missingFieldsWarning = missingFields.length > 0 ? `
      <div class="missing-fields-warning">
        <p>⚠️ <strong>${missingFields.join(', ')} ${missingFields.length === 1 ? 'is' : 'are'} missing.</strong> We recommend doing more research for better document synthesis.</p>
      </div>
    ` : '';

    // Show different message based on whether user has started writing
    const draftInstructions = this.hasExistingContent ? `
      <div class="existing-content-warning">
        <p>💡 <strong>It looks like you already started writing.</strong></p>
        <p>The LLM will use your draft to understand what document to create and expand upon your instructions.</p>
      </div>
    ` : `
      <div class="existing-content-warning">
        <p>💡 <strong>Tip:</strong> In the text editor, write a brief instruction like "Write me a cover letter" or "Create a tailored resume" to tell the LLM what document to generate.</p>
      </div>
    `;

    return `
      <div class="synthesis-modal">
        <div class="modal-header">
          <h2>✨ Synthesize ${documentLabel} with LLM</h2>
          <button class="modal-close-btn" id="synthesisModalCloseBtn">&times;</button>
        </div>
        
        <div class="modal-body">
          <div class="prompt-template-header">
            <label for="synthesisPromptTemplate">Prompt Template:</label>
            <button class="btn-text" id="synthesisResetPromptBtn">Reset to Default</button>
          </div>

          <textarea 
            id="synthesisPromptTemplate" 
            class="prompt-editor" 
            rows="12" 
            placeholder="Enter your prompt template with placeholders like {masterResume}, {jobTitle}, etc."
          >${this.promptTemplate || ''}</textarea>

          <p class="prompt-help-text">
            <strong>Available placeholders:</strong> 
            {masterResume}, {jobTitle}, {company}, {aboutJob}, {aboutCompany}, {responsibilities}, {requirements}, {narrativeStrategy}, {currentDraft}
            <br>
            <strong>Note:</strong> The LLM will determine the document type from the user's instructions in {currentDraft}.
          </p>

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

    // Reset to Default button
    const resetBtn = document.getElementById('synthesisResetPromptBtn');
    if (resetBtn) {
      this.trackListener(resetBtn, 'click', async () => {
        const confirmed = confirm('Reset prompt to default? This will discard your custom prompt.');
        if (confirmed) {
          const defaultPrompt = await this.clearCustomPrompt(this.activeDocumentKey);
          this.promptTemplate = defaultPrompt;
          
          // Update textarea
          const textarea = document.getElementById('synthesisPromptTemplate');
          if (textarea) {
            textarea.value = defaultPrompt;
          }
        }
      });
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

    // Auto-save prompt template on blur
    const promptTextarea = document.getElementById('synthesisPromptTemplate');
    if (promptTextarea) {
      this.trackListener(promptTextarea, 'blur', async () => {
        const template = promptTextarea.value.trim();
        if (template && template !== this.promptTemplate) {
          await this.saveCustomPrompt(this.activeDocumentKey, template);
          this.promptTemplate = template;
          console.log('[SynthesisModal] Auto-saved prompt template on blur');
        }
      });
    }
  }



  /**
   * Handle generate button click
   */
  async handleGenerate() {
    const generateBtn = document.getElementById('synthesisModalGenerateBtn');
    const textarea = document.getElementById('synthesisPromptTemplate');
    
    if (!generateBtn || !textarea) return;

    // Get current template from textarea
    const template = textarea.value.trim();
    
    if (!template) {
      alert('Please enter a prompt template');
      return;
    }

    // Disable button and show loading state
    generateBtn.disabled = true;
    const originalText = generateBtn.textContent;
    generateBtn.innerHTML = '⏳ Generating...';

    try {
      // Save custom template to storage
      await this.saveCustomPrompt(this.activeDocumentKey, template);

      // Build context data
      const context = await this.buildContext();

      // Fill placeholders with actual values
      const filledPrompt = this.fillPlaceholders(template, context);

      // Synthesize document with filled prompt
      const content = await this.synthesizeDocument(
        this.activeDocumentKey,
        this.selectedModel,
        filledPrompt
      );

      // Call callback with generated content
      if (this.onGenerate) {
        this.onGenerate(this.activeJobIndex, this.activeDocumentKey, content);
      }

      // Close modal
      this.close();
    } catch (error) {
      console.error('[SynthesisModal] Synthesis failed:', error);
      alert(`Failed to generate document: ${error.message}`);
      
      // Re-enable button
      generateBtn.disabled = false;
      generateBtn.textContent = originalText;
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
