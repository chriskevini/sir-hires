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
    this.onGenerate = null; // Callback when generation completes
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
    this.render();
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
   * Check data availability for synthesis
   * @param {Object} job - Job object
   * @param {string} documentKey - Document key (e.g., 'tailoredResume')
   * @returns {Array} Checklist items with status
   */
  async checkDataAvailability(job, documentKey) {
    // Fetch master resume
    const masterResumeResult = await chrome.storage.local.get(['masterResume']);
    const masterResume = masterResumeResult.masterResume?.content || '';

    const checklist = [
      {
        key: 'masterResume',
        label: 'Master Resume',
        critical: true,
        status: masterResume ? 'available' : 'missing',
        value: masterResume
      },
      {
        key: 'jobTitle',
        label: 'Job Title & Company',
        critical: true,
        status: (job.jobTitle && job.company) ? 'available' : 'missing',
        value: `${job.jobTitle || ''} at ${job.company || ''}`
      },
      {
        key: 'aboutJob',
        label: 'Job Description',
        critical: false,
        status: job.aboutJob ? 'available' : 'warning',
        value: job.aboutJob || ''
      },
      {
        key: 'requirements',
        label: 'Requirements',
        critical: false,
        status: job.requirements ? 'available' : 'warning',
        value: job.requirements || ''
      },
      {
        key: 'narrativeStrategy',
        label: 'Narrative Strategy',
        critical: false,
        status: job.narrativeStrategy ? 'available' : 'warning',
        value: job.narrativeStrategy || ''
      },
      {
        key: 'currentDraft',
        label: 'Current Draft',
        critical: false,
        status: job.documents?.[documentKey]?.text ? 'available' : 'warning',
        value: job.documents?.[documentKey]?.text || ''
      }
    ];

    return checklist;
  }

  /**
   * Generate recommendations based on checklist
   * @param {Array} checklist - Checklist items
   * @returns {Array} Recommendation messages
   */
  generateRecommendations(checklist) {
    const recommendations = [];

    const missingCritical = checklist.filter(item => item.critical && item.status === 'missing');
    const missingNarrative = checklist.find(item => item.key === 'narrativeStrategy' && item.status === 'warning');
    const missingDetails = checklist.filter(item => !item.critical && item.status === 'warning' && item.key !== 'currentDraft');

    if (missingCritical.length > 0) {
      recommendations.push({
        type: 'warning',
        message: `Missing critical data: ${missingCritical.map(i => i.label).join(', ')}. Generation quality may be poor.`
      });
    }

    if (missingNarrative) {
      recommendations.push({
        type: 'info',
        message: 'We recommend completing research and adding a narrative strategy first for better results.'
      });
    }

    if (missingDetails.length > 0) {
      recommendations.push({
        type: 'info',
        message: 'More job details will improve the output quality.'
      });
    }

    return recommendations;
  }

  /**
   * Build prompt for document synthesis
   * @param {string} documentKey - Document type ('tailoredResume' or 'coverLetter')
   * @param {Object} context - Context data from checklist
   * @returns {string} Prompt text
   */
  buildPrompt(documentKey, context) {
    // Determine which prompt template to use (no generate/refine distinction - LLM adapts)
    let templateKey;
    if (documentKey === 'tailoredResume') {
      templateKey = 'resume';
    } else if (documentKey === 'coverLetter') {
      templateKey = 'coverLetter';
    } else {
      // Fallback for custom document types (future extensibility)
      return `Generate a document for: ${documentKey}`;
    }
    
    // Get template from config
    let prompt = llmConfig.synthesis.prompts[templateKey];
    
    // Replace placeholders with actual values
    const replacements = {
      masterResume: context.masterResume || 'Not provided',
      jobTitle: context.jobTitle || 'Not provided',
      company: context.jobTitle?.split(' at ')[1] || 'Not provided',
      aboutJob: context.aboutJob || 'Not provided',
      aboutCompany: this.activeJob?.aboutCompany || 'Not provided',
      requirements: context.requirements || 'Not provided',
      narrativeStrategy: context.narrativeStrategy || 'Not provided',
      currentDraft: context.currentDraft || ''
    };
    
    // Replace all placeholders
    for (const [key, value] of Object.entries(replacements)) {
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
   * @param {Object} context - Context data
   * @returns {string} Generated content
   */
  async synthesizeDocument(documentKey, model, context) {
    // Test connection first
    const isConnected = await this.testConnection();
    if (!isConnected) {
      throw new Error('Cannot connect to LM Studio. Please ensure LM Studio is running on http://localhost:1234');
    }

    // Build prompt
    const prompt = this.buildPrompt(documentKey, context);
    console.log('[SynthesisModal] Sending prompt to LLM:', { model, hasExistingContent: this.hasExistingContent, documentKey });

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
  render() {
    // Check if modal container already exists
    let overlay = document.getElementById('synthesisModalOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'synthesisModalOverlay';
      overlay.className = 'synthesis-modal-overlay hidden';
      document.body.appendChild(overlay);
    }

    // Render modal content
    overlay.innerHTML = this.renderModalContent();
  }

  /**
   * Render modal content
   * @returns {string} HTML string
   */
  renderModalContent() {
    if (!this.activeJob) return '';

    // Get document label
    const documentLabel = this.activeDocumentKey === 'tailoredResume' ? 'Resume/CV' : 'Cover Letter';

    // Get model options
    const modelOptions = this.availableModels.length > 0
      ? this.availableModels.map(model => 
          `<option value="${model.id}" ${model.id === this.selectedModel ? 'selected' : ''}>${model.id}</option>`
        ).join('')
      : `<option value="${llmConfig.synthesis.defaultModel}">${llmConfig.synthesis.defaultModel} (not loaded)</option>`;

    // Show warning if existing content detected
    const existingContentWarning = this.hasExistingContent ? `
      <div class="existing-content-warning">
        <p>⚠️ <strong>It looks like you already began writing this document.</strong></p>
        <p>The LLM will use this as a draft to expand upon.</p>
      </div>
    ` : '';

    return `
      <div class="synthesis-modal">
        <div class="modal-header">
          <h2>✨ Synthesize Document with LLM</h2>
          <button class="modal-close-btn" id="synthesisModalCloseBtn">&times;</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label for="synthesisDocumentSelect">Document:</label>
            <select id="synthesisDocumentSelect" disabled>
              <option value="${this.activeDocumentKey}">${documentLabel}</option>
            </select>
          </div>

          <div class="form-group">
            <label for="synthesisModelSelect">Model:</label>
            <select id="synthesisModelSelect">
              ${modelOptions}
            </select>
            ${this.availableModels.length === 0 ? 
              '<p class="model-warning">⚠️ No models loaded in LM Studio. Please load a model first.</p>' : 
              ''}
          </div>

          ${existingContentWarning}

          <div class="data-checklist-section" id="dataChecklistSection">
            <div class="loading-indicator">Loading data availability...</div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" id="synthesisModalCancelBtn">Cancel</button>
          <button class="btn-primary" id="synthesisModalGenerateBtn">Generate Document</button>
        </div>
      </div>
    `;
  }

  /**
   * Render data checklist
   * @param {Array} checklist - Checklist items
   * @param {Array} recommendations - Recommendation messages
   * @returns {string} HTML string
   */
  renderDataChecklist(checklist, recommendations) {
    const checklistHtml = checklist.map(item => {
      const icon = item.status === 'available' ? '✅' : 
                   item.status === 'warning' ? '⚠️' : '❌';
      const statusClass = `checklist-status-${item.status}`;
      
      return `
        <div class="checklist-item ${statusClass}">
          <span class="checklist-icon">${icon}</span>
          <span class="checklist-label">${item.label}</span>
        </div>
      `;
    }).join('');

    const recommendationsHtml = recommendations.length > 0 ? `
      <div class="recommendations-section">
        ${recommendations.map(rec => `
          <div class="recommendation ${rec.type}">
            <span class="recommendation-icon">${rec.type === 'warning' ? '⚠️' : '💡'}</span>
            <span>${rec.message}</span>
          </div>
        `).join('')}
      </div>
    ` : '';

    return `
      <div class="data-checklist">
        <p><strong>Data to be sent to LLM:</strong></p>
        ${checklistHtml}
      </div>
      ${recommendationsHtml}
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

    // Load data checklist asynchronously
    this.loadDataChecklist();
  }

  /**
   * Load and display data checklist
   */
  async loadDataChecklist() {
    const section = document.getElementById('dataChecklistSection');
    if (!section) return;

    try {
      const checklist = await this.checkDataAvailability(this.activeJob, this.activeDocumentKey);
      const recommendations = this.generateRecommendations(checklist);
      
      section.innerHTML = this.renderDataChecklist(checklist, recommendations);
    } catch (error) {
      console.error('[SynthesisModal] Failed to load data checklist:', error);
      section.innerHTML = '<p class="error">Failed to load data availability</p>';
    }
  }

  /**
   * Handle generate button click
   */
  async handleGenerate() {
    const generateBtn = document.getElementById('synthesisModalGenerateBtn');
    if (!generateBtn) return;

    // Disable button and show loading state
    generateBtn.disabled = true;
    const originalText = generateBtn.textContent;
    generateBtn.innerHTML = '⏳ Generating...';

    try {
      // Get context data
      const checklist = await this.checkDataAvailability(this.activeJob, this.activeDocumentKey);
      const context = {};
      checklist.forEach(item => {
        context[item.key] = item.value;
      });

      // Synthesize document
      const content = await this.synthesizeDocument(
        this.activeDocumentKey,
        this.selectedModel,
        context
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
