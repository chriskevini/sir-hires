// LLM Client for LM Studio API
// Handles API calls, SSE streaming, and thinking/document separation
// Reusable across all extension contexts (popup, sidepanel, job-details)

/**
 * LLM Client for streaming completions from LM Studio
 * Supports two-stream architecture: thinking tags + document content
 */
export class LLMClient {
  /**
   * @param {Object} config - Configuration options
   * @param {string} config.endpoint - LLM API endpoint (default: http://localhost:1234/v1/chat/completions)
   * @param {string} config.modelsEndpoint - Models list endpoint (default: http://localhost:1234/v1/models)
   * @param {number} config.detectionWindow - Characters to scan for thinking tags (default: 50)
   */
  constructor(config = {}) {
    this.endpoint = config.endpoint || 'http://localhost:1234/v1/chat/completions';
    this.modelsEndpoint = config.modelsEndpoint || 'http://localhost:1234/v1/models';
    this.detectionWindow = config.detectionWindow || 50;
    this.activeStreams = new Map(); // Track active streams for cancellation
  }

  /**
   * Fetch available models from LM Studio
   * @returns {Promise<Array>} List of available models with { id, object, owned_by, ... }
   */
  async fetchModels() {
    try {
      const response = await fetch(this.modelsEndpoint, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('[LLMClient] Failed to fetch models:', error);
      return [];
    }
  }

  /**
   * Test connection to LM Studio
   * @returns {Promise<boolean>} True if connected
   */
  async testConnection() {
    try {
      const response = await fetch(this.modelsEndpoint, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        console.error(`[LLMClient] Connection test failed: HTTP ${response.status}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[LLMClient] Connection test failed:', error);
      return false;
    }
  }

  /**
   * Parse thinking content by removing tags
   * Supports <think>, <thinking>, and <reasoning> tags
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
   * Stream completion from LLM with thinking/document separation
   * Uses three-state machine to route content:
   *   DETECTING → IN_THINKING_BLOCK → IN_DOCUMENT
   * 
   * @param {Object} options - Completion options
   * @param {string} options.streamId - Unique ID for this stream (for cancellation)
   * @param {string} options.model - Model ID to use
   * @param {string} options.systemPrompt - System prompt defining AI behavior
   * @param {string} options.userPrompt - User prompt with context data
   * @param {number} options.maxTokens - Maximum tokens to generate (default: 2000)
   * @param {number} options.temperature - Sampling temperature (default: 0.7)
   * @param {Function} options.onThinkingUpdate - Callback for thinking stream updates (delta)
   * @param {Function} options.onDocumentUpdate - Callback for document stream updates (delta)
   * @returns {Promise<Object>} { thinkingContent, documentContent, finishReason, cancelled }
   */
  async streamCompletion(options) {
    const {
      streamId = crypto.randomUUID(),
      model,
      systemPrompt,
      userPrompt,
      maxTokens = 2000,
      temperature = 0.7,
      onThinkingUpdate = null,
      onDocumentUpdate = null
    } = options;

    // Test connection first
    const isConnected = await this.testConnection();
    if (!isConnected) {
      throw new Error('Cannot connect to LM Studio. Please ensure LM Studio is running on http://localhost:1234');
    }

    // Create abort controller for cancellation
    const abortController = new AbortController();
    
    // Register this stream for cancellation
    this.activeStreams.set(streamId, { 
      abortController, 
      reader: null 
    });
    
    console.log('[LLMClient] Registered stream for cancellation:', streamId);

    try {
      // Call LM Studio API with streaming enabled
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: maxTokens,
          temperature: temperature,
          stream: true  // Enable streaming
        }),
        signal: abortController.signal  // Enable cancellation
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[LLMClient] LLM API error:', errorText);
        
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
      
      // Store reader reference for cancellation
      const streamInfo = this.activeStreams.get(streamId);
      if (streamInfo) {
        streamInfo.reader = reader;
      }
    
      // Simplified state machine: null → IN_THINKING | IN_DOCUMENT
      // State is determined by first delta, no detection window needed
      let state = null;  // null → IN_THINKING | IN_DOCUMENT
      let buffer = '';
      let thinkingContent = '';
      let documentContent = '';
      let finishReason = null;

      console.log('[LLMClient] Starting stream processing...');

      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) {break;}

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (!line.trim() || line.trim() === 'data: [DONE]') {continue;}
            if (!line.startsWith('data: ')) {continue;}

            try {
              const jsonStr = line.slice(6);  // Remove "data: " prefix
              const data = JSON.parse(jsonStr);
            
            const delta = data.choices?.[0]?.delta?.content || '';
            if (!delta) {
              // Check for finish reason
              finishReason = data.choices?.[0]?.finish_reason || finishReason;
              continue;
            }

            // State determination: First delta decides the mode
            if (state === null) {
              // Check if first delta contains thinking tag
              if (/<(?:think|thinking|reasoning)>/i.test(delta)) {
                console.log('[LLMClient] Detected thinking mode');
                state = 'IN_THINKING';
                buffer = delta;
                
                // Check if opening tag is complete in first delta
                // If so, extract any content after it
                const match = delta.match(/^(.*?)<(?:think|thinking|reasoning)>(.*)$/is);
                if (match) {
                  const afterTag = match[2];
                  if (afterTag) {
                    // Content after opening tag in same delta
                    const parsedDelta = this.parseThinking(afterTag);
                    if (onThinkingUpdate && parsedDelta) {
                      onThinkingUpdate(parsedDelta);
                    }
                    thinkingContent += parsedDelta;
                  }
                }
              } else {
                // Standard model without thinking tags
                console.log('[LLMClient] Detected standard mode (no thinking tags)');
                state = 'IN_DOCUMENT';
                if (onDocumentUpdate) {
                  onDocumentUpdate(delta);
                }
                documentContent += delta;
              }
              continue;
            }

            // Process subsequent deltas based on state
            if (state === 'IN_THINKING') {
              buffer += delta;
              
              // Check for end of thinking block
              if (/<\/(?:think|thinking|reasoning)>/i.test(buffer)) {
                console.log('[LLMClient] Thinking block complete, switching to document mode');
                state = 'IN_DOCUMENT';
                
                // Extract thinking content and document start
                const match = buffer.match(/^.*?<(?:think|thinking|reasoning)>(.*?)<\/(?:think|thinking|reasoning)>(.*)$/is);
                if (match) {
                  const thinkingPart = match[1];
                  const documentPart = match[2];
                  
                  // Send final thinking content (without tags)
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
                // Still in thinking block, send parsed delta
                const parsedDelta = this.parseThinking(delta);
                if (onThinkingUpdate && parsedDelta) {
                  onThinkingUpdate(parsedDelta);
                }
                thinkingContent += parsedDelta;
              }
            } else if (state === 'IN_DOCUMENT') {
              // Route to document stream
              if (onDocumentUpdate) {
                onDocumentUpdate(delta);
              }
              documentContent += delta;
            }

            } catch (error) {
              console.error('[LLMClient] Failed to parse SSE line:', line, error);
            }
          }
        }
      } catch (error) {
        console.error('[LLMClient] Stream processing error:', error);
        throw error;
      }

      console.log('[LLMClient] Stream complete, final state:', state);

      return {
        thinkingContent: thinkingContent.trim(),
        documentContent: documentContent.trim(),
        finishReason: finishReason,
        cancelled: false
      };
      
    } catch (error) {
      // Handle abortion/cancellation
      if (error.name === 'AbortError') {
        console.log('[LLMClient] Stream cancelled:', streamId);
        return {
          thinkingContent: '',
          documentContent: '',
          finishReason: 'cancelled',
          cancelled: true
        };
      }
      throw error;
    } finally {
      // Clean up stream registration
      this.activeStreams.delete(streamId);
      console.log('[LLMClient] Cleaned up stream:', streamId);
    }
  }

  /**
   * Cancel an active stream
   * @param {string} streamId - The stream ID to cancel
   */
  cancelStream(streamId) {
    const streamInfo = this.activeStreams.get(streamId);
    if (!streamInfo) {
      console.log('[LLMClient] No active stream to cancel:', streamId);
      return;
    }

    console.log('[LLMClient] Cancelling stream:', streamId);
    
    // Abort the fetch request
    streamInfo.abortController.abort();
    
    // Cancel the reader if available
    if (streamInfo.reader) {
      streamInfo.reader.cancel().catch(err => {
        console.error('[LLMClient] Error cancelling reader:', err);
      });
    }
    
    // Remove from active streams
    this.activeStreams.delete(streamId);
    
    console.log('[LLMClient] Stream cancelled successfully:', streamId);
  }
}
