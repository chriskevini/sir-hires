// LLM Client for LM Studio API
// Handles API calls, SSE streaming, and thinking/document separation
// Reusable across all extension contexts (popup, sidepanel, job-details)

interface LLMClientConfig {
  endpoint?: string;
  modelsEndpoint?: string;
  detectionWindow?: number;
}

interface StreamInfo {
  abortController: AbortController;
  reader: ReadableStreamDefaultReader<Uint8Array> | null;
}

interface StreamCompletionOptions {
  streamId?: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  onThinkingUpdate?: ((delta: string) => void) | null;
  onDocumentUpdate?: ((delta: string) => void) | null;
}

interface StreamCompletionWithMessagesOptions {
  streamId?: string;
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  maxTokens?: number;
  temperature?: number;
  onThinkingUpdate?: ((delta: string) => void) | null;
  onDocumentUpdate?: ((delta: string) => void) | null;
}

interface StreamCompletionTiming {
  /** Time to first token (any content) in ms */
  ttft: number | null;
  /** Time to first thinking token in ms */
  ttFirstThinking: number | null;
  /** Time to first document token in ms */
  ttFirstDocument: number | null;
}

interface StreamCompletionUsage {
  /** Number of prompt tokens (from API) */
  promptTokens: number | null;
  /** Number of completion tokens (from API) */
  completionTokens: number | null;
}

interface StreamCompletionResult {
  thinkingContent: string;
  documentContent: string;
  finishReason: string | null;
  cancelled: boolean;
  timing: StreamCompletionTiming;
  usage: StreamCompletionUsage;
}

/**
 * LLM Client for streaming completions from LM Studio
 * Supports two-stream architecture: thinking tags + document content
 */
export class LLMClient {
  private endpoint: string;
  private modelsEndpoint: string;
  private detectionWindow: number;
  private activeStreams: Map<string, StreamInfo>;

  /**
   * @param config - Configuration options
   */
  constructor(config: LLMClientConfig = {}) {
    this.endpoint =
      config.endpoint || 'http://localhost:1234/v1/chat/completions';
    this.modelsEndpoint =
      config.modelsEndpoint || 'http://localhost:1234/v1/models';
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        console.error(
          `[LLMClient] Connection test failed: HTTP ${response.status}`
        );
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
   * @param rawThinking - Raw thinking content with tags
   * @returns Cleaned thinking content
   */
  parseThinking(rawThinking: string): string {
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
   * @param options - Completion options
   * @returns Promise resolving to { thinkingContent, documentContent, finishReason, cancelled }
   */
  async streamCompletion(
    options: StreamCompletionOptions
  ): Promise<StreamCompletionResult> {
    const {
      streamId = crypto.randomUUID(),
      model,
      systemPrompt,
      userPrompt,
      maxTokens = 2000,
      temperature = 0.7,
      onThinkingUpdate = null,
      onDocumentUpdate = null,
    } = options;

    // Create abort controller for cancellation
    const abortController = new AbortController();

    // Register this stream for cancellation BEFORE any async work
    // This ensures cancellation works even if user clicks cancel during testConnection()
    this.activeStreams.set(streamId, {
      abortController,
      reader: null,
    });

    console.info('[LLMClient] Registered stream for cancellation:', streamId);

    // Test connection first
    const isConnected = await this.testConnection();
    if (!isConnected) {
      // Clean up on connection failure
      this.activeStreams.delete(streamId);
      throw new Error(
        'Cannot connect to LM Studio. Please ensure LM Studio is running on http://localhost:1234'
      );
    }

    try {
      // Call LM Studio API with streaming enabled
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: maxTokens,
          temperature: temperature,
          stream: true, // Enable streaming
          stream_options: { include_usage: true }, // Request token usage stats
        }),
        signal: abortController.signal, // Enable cancellation
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[LLMClient] LLM API error:', errorText);

        // Try to parse JSON error for better message
        try {
          const errorJson = JSON.parse(errorText);
          const errorMsg = errorJson.error?.message || '';

          // Check if it's a "no models loaded" error (JIT loading issue)
          if (
            errorJson.error?.code === 'model_not_found' ||
            errorMsg.toLowerCase().includes('no models loaded') ||
            errorMsg.toLowerCase().includes('please load a model')
          ) {
            // Model not loaded - provide comprehensive instructions
            throw new Error(
              `Model "${model}" is not loaded in LM Studio.\n\n` +
                `Option 1 - Enable JIT Loading (Recommended):\n` +
                `1. Open LM Studio → Developer tab → Server Settings\n` +
                `2. Enable "Automatically Load Model" (should be on by default)\n` +
                `3. Restart LM Studio server\n` +
                `4. Try generating again (model will auto-load)\n\n` +
                `Option 2 - Manually Load:\n` +
                `• In LM Studio: Click "${model}" in the left sidebar\n` +
                `• Or via CLI: lms load "${model}" --yes\n\n` +
                `Option 3 - Check Model Status:\n` +
                `• The model might not be downloaded yet\n` +
                `• Download it from LM Studio's model library first`
            );
          }
          throw new Error(
            errorJson.error?.message || `LLM API error: HTTP ${response.status}`
          );
        } catch (parseError) {
          // If parseError is our custom error, re-throw it
          if (
            parseError instanceof Error &&
            parseError.message.includes('is not loaded')
          ) {
            throw parseError;
          }
          // If not JSON, use raw error text
          throw new Error(
            `LLM API error: HTTP ${response.status} - ${errorText}`
          );
        }
      }

      // Process SSE stream
      if (!response.body) {
        throw new Error('Response body is null');
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // Store reader reference for cancellation
      const streamInfo = this.activeStreams.get(streamId);
      if (streamInfo) {
        streamInfo.reader = reader;
      }

      // Three-state machine: DETECTING → IN_THINKING → IN_DOCUMENT
      //                   or: DETECTING → IN_DOCUMENT
      // DETECTING buffers content until we can determine mode
      type State = 'DETECTING' | 'IN_THINKING' | 'IN_DOCUMENT';
      let state: State = 'DETECTING';
      let buffer = '';
      let thinkingContent = '';
      let documentContent = '';
      let finishReason = null;

      // Timing tracking
      const startTime = Date.now();
      let ttft: number | null = null;
      let ttFirstThinking: number | null = null;
      let ttFirstDocument: number | null = null;

      // Usage tracking (from API response)
      let promptTokens: number | null = null;
      let completionTokens: number | null = null;

      // Helper to flush buffer as document content
      const flushBufferAsDocument = () => {
        if (buffer) {
          if (onDocumentUpdate) {
            onDocumentUpdate(buffer);
          }
          documentContent += buffer;
          buffer = '';
        }
      };

      // Helper to check if buffer already contains full thinking block (both open and close)
      // Called after opening tag is detected and stripped from buffer
      const processThinkingBuffer = () => {
        // Opening tag already stripped - check if closing tag is in buffer
        const closeMatch = buffer.match(/<\/(?:think|thinking|reasoning)>/i);
        if (closeMatch) {
          // Full thinking block found - extract thinking content
          const thinkingPart = buffer.slice(0, closeMatch.index!);
          const afterClose = buffer.slice(
            closeMatch.index! + closeMatch[0].length
          );

          // Stream thinking content
          if (onThinkingUpdate && thinkingPart) {
            onThinkingUpdate(thinkingPart);
          }
          thinkingContent += thinkingPart;

          // Transition to document mode
          state = 'IN_DOCUMENT';
          buffer = '';

          // Stream any content after closing tag
          const trimmedDoc = afterClose.trimStart();
          if (trimmedDoc) {
            if (onDocumentUpdate) {
              onDocumentUpdate(trimmedDoc);
            }
            documentContent += trimmedDoc;
          }
        }
        // If no closing tag yet, stay in IN_THINKING and wait for more
      };

      console.info('[LLMClient] Starting stream processing...');

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (!line.trim() || line.trim() === 'data: [DONE]') continue;
            if (!line.startsWith('data: ')) continue;

            try {
              const jsonStr = line.slice(6); // Remove "data: " prefix
              const data = JSON.parse(jsonStr);

              // Check for usage stats (comes in final chunk with stream_options.include_usage)
              if (data.usage) {
                promptTokens = data.usage.prompt_tokens ?? null;
                completionTokens = data.usage.completion_tokens ?? null;
              }

              const delta = data.choices?.[0]?.delta?.content || '';
              if (!delta) {
                // Check for finish reason
                finishReason = data.choices?.[0]?.finish_reason || finishReason;
                continue;
              }

              // Track time to first token
              if (ttft === null) {
                ttft = Date.now() - startTime;
              }

              if (state === 'DETECTING') {
                buffer += delta;

                // Check if buffer contains a complete opening thinking tag
                const openingMatch = buffer.match(
                  /<(?:think|thinking|reasoning)>/i
                );
                if (openingMatch) {
                  console.info('[LLMClient] Detected thinking mode');
                  state = 'IN_THINKING';
                  // Track time to first thinking
                  if (ttFirstThinking === null) {
                    ttFirstThinking = Date.now() - startTime;
                  }
                  // Strip everything up to and including the opening tag
                  buffer = buffer.slice(
                    openingMatch.index! + openingMatch[0].length
                  );
                  // Check if closing tag is already in buffer (model output both in one chunk)
                  processThinkingBuffer();
                } else if (buffer.length >= this.detectionWindow) {
                  // Buffer is long enough without thinking tag - assume document mode
                  console.info(
                    '[LLMClient] Detected standard mode (no thinking tags)'
                  );
                  state = 'IN_DOCUMENT';
                  // Track time to first document
                  if (ttFirstDocument === null) {
                    ttFirstDocument = Date.now() - startTime;
                  }
                  flushBufferAsDocument();
                }
                // Otherwise keep buffering in DETECTING state
              } else if (state === 'IN_THINKING') {
                buffer += delta;

                // Check for closing tag in buffer
                const closeMatch = buffer.match(
                  /<\/(?:think|thinking|reasoning)>/i
                );

                if (closeMatch) {
                  // Found closing tag - extract and stream thinking content
                  const thinkingPart = buffer.slice(0, closeMatch.index!);
                  const afterClose = buffer.slice(
                    closeMatch.index! + closeMatch[0].length
                  );

                  // Stream thinking content (strip any remaining opening tags)
                  const parsedThinking = this.parseThinking(thinkingPart);
                  if (onThinkingUpdate && parsedThinking) {
                    onThinkingUpdate(parsedThinking);
                  }
                  thinkingContent += parsedThinking;

                  // Transition to document mode
                  console.info(
                    '[LLMClient] Thinking block complete, switching to document mode'
                  );
                  state = 'IN_DOCUMENT';
                  // Track time to first document
                  if (ttFirstDocument === null) {
                    ttFirstDocument = Date.now() - startTime;
                  }
                  buffer = '';

                  // Stream any content after closing tag
                  const trimmedDoc = afterClose.trimStart();
                  if (trimmedDoc) {
                    if (onDocumentUpdate) {
                      onDocumentUpdate(trimmedDoc);
                    }
                    documentContent += trimmedDoc;
                  }
                } else {
                  // No closing tag yet - stream safe content incrementally
                  // Keep last 12 chars in buffer (max length of "</reasoning>")
                  const holdBackLength = 12;
                  if (buffer.length > holdBackLength) {
                    const safeContent = buffer.slice(
                      0,
                      buffer.length - holdBackLength
                    );
                    buffer = buffer.slice(-holdBackLength);

                    const parsedSafe = this.parseThinking(safeContent);
                    if (onThinkingUpdate && parsedSafe) {
                      onThinkingUpdate(parsedSafe);
                    }
                    thinkingContent += parsedSafe;
                  }
                }
              } else if (state === 'IN_DOCUMENT') {
                // Direct streaming to document
                if (onDocumentUpdate) {
                  onDocumentUpdate(delta);
                }
                documentContent += delta;
              }
            } catch (error) {
              console.error(
                '[LLMClient] Failed to parse SSE line:',
                line,
                error
              );
            }
          }
        }

        // Handle any remaining buffer at end of stream
        if (state === 'DETECTING' && buffer) {
          // Never detected thinking, treat as document
          console.info(
            '[LLMClient] Stream ended in DETECTING, flushing as document'
          );
          flushBufferAsDocument();
        } else if (state === 'IN_THINKING' && buffer) {
          // Thinking block never closed - flush remaining buffer as thinking
          console.info(
            '[LLMClient] Stream ended in IN_THINKING, flushing remaining'
          );
          const remainingThinking = this.parseThinking(buffer);
          if (onThinkingUpdate && remainingThinking) {
            onThinkingUpdate(remainingThinking);
          }
          thinkingContent += remainingThinking;
        }
      } catch (error) {
        console.error('[LLMClient] Stream processing error:', error);
        throw error;
      }

      console.info('[LLMClient] Stream complete, final state:', state);

      return {
        thinkingContent: thinkingContent.trim(),
        documentContent: documentContent.trim(),
        finishReason: finishReason,
        cancelled: false,
        timing: {
          ttft,
          ttFirstThinking,
          ttFirstDocument,
        },
        usage: {
          promptTokens,
          completionTokens,
        },
      };
    } catch (error) {
      // Handle abortion/cancellation
      if (error instanceof Error && error.name === 'AbortError') {
        console.info('[LLMClient] Stream cancelled:', streamId);
        return {
          thinkingContent: '',
          documentContent: '',
          finishReason: 'cancelled',
          cancelled: true,
          timing: {
            ttft: null,
            ttFirstThinking: null,
            ttFirstDocument: null,
          },
          usage: {
            promptTokens: null,
            completionTokens: null,
          },
        };
      }
      throw error;
    } finally {
      // Clean up stream registration
      this.activeStreams.delete(streamId);
      console.info('[LLMClient] Cleaned up stream:', streamId);
    }
  }

  /**
   * Stream completion from LLM with raw messages array
   * Supports any sequence of system/user/assistant messages including assistant prefill
   *
   * @param options - Completion options with messages array
   * @returns Promise resolving to { thinkingContent, documentContent, finishReason, cancelled }
   */
  async streamCompletionWithMessages(
    options: StreamCompletionWithMessagesOptions
  ): Promise<StreamCompletionResult> {
    const {
      streamId = crypto.randomUUID(),
      model,
      messages,
      maxTokens = 2000,
      temperature = 0.7,
      onThinkingUpdate = null,
      onDocumentUpdate = null,
    } = options;

    // Create abort controller for cancellation
    const abortController = new AbortController();

    // Register this stream for cancellation BEFORE any async work
    this.activeStreams.set(streamId, {
      abortController,
      reader: null,
    });

    console.info(
      '[LLMClient] Registered stream for cancellation (messages mode):',
      streamId
    );

    // Test connection first
    const isConnected = await this.testConnection();
    if (!isConnected) {
      this.activeStreams.delete(streamId);
      throw new Error(
        'Cannot connect to LM Studio. Please ensure LM Studio is running on http://localhost:1234'
      );
    }

    try {
      // Call LM Studio API with streaming enabled
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          messages: messages,
          max_tokens: maxTokens,
          temperature: temperature,
          stream: true,
          stream_options: { include_usage: true },
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[LLMClient] LLM API error:', errorText);

        try {
          const errorJson = JSON.parse(errorText);
          const errorMsg = errorJson.error?.message || '';

          if (
            errorJson.error?.code === 'model_not_found' ||
            errorMsg.toLowerCase().includes('no models loaded') ||
            errorMsg.toLowerCase().includes('please load a model')
          ) {
            throw new Error(
              `Model "${model}" is not loaded in LM Studio.\n\n` +
                `Option 1 - Enable JIT Loading (Recommended):\n` +
                `1. Open LM Studio → Developer tab → Server Settings\n` +
                `2. Enable "Automatically Load Model" (should be on by default)\n` +
                `3. Restart LM Studio server\n` +
                `4. Try generating again (model will auto-load)\n\n` +
                `Option 2 - Manually Load:\n` +
                `• In LM Studio: Click "${model}" in the left sidebar\n` +
                `• Or via CLI: lms load "${model}" --yes\n\n` +
                `Option 3 - Check Model Status:\n` +
                `• The model might not be downloaded yet\n` +
                `• Download it from LM Studio's model library first`
            );
          }
          throw new Error(
            errorJson.error?.message || `LLM API error: HTTP ${response.status}`
          );
        } catch (parseError) {
          if (
            parseError instanceof Error &&
            parseError.message.includes('is not loaded')
          ) {
            throw parseError;
          }
          throw new Error(
            `LLM API error: HTTP ${response.status} - ${errorText}`
          );
        }
      }

      // Process SSE stream - reuse the same streaming logic
      if (!response.body) {
        throw new Error('Response body is null');
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const streamInfo = this.activeStreams.get(streamId);
      if (streamInfo) {
        streamInfo.reader = reader;
      }

      type State = 'DETECTING' | 'IN_THINKING' | 'IN_DOCUMENT';
      let state: State = 'DETECTING';
      let buffer = '';
      let thinkingContent = '';
      let documentContent = '';
      let finishReason = null;

      const startTime = Date.now();
      let ttft: number | null = null;
      let ttFirstThinking: number | null = null;
      let ttFirstDocument: number | null = null;
      let promptTokens: number | null = null;
      let completionTokens: number | null = null;

      const flushBufferAsDocument = () => {
        if (buffer) {
          if (onDocumentUpdate) {
            onDocumentUpdate(buffer);
          }
          documentContent += buffer;
          buffer = '';
        }
      };

      const processThinkingBuffer = () => {
        const closeMatch = buffer.match(/<\/(?:think|thinking|reasoning)>/i);
        if (closeMatch) {
          const thinkingPart = buffer.slice(0, closeMatch.index!);
          const afterClose = buffer.slice(
            closeMatch.index! + closeMatch[0].length
          );

          if (onThinkingUpdate && thinkingPart) {
            onThinkingUpdate(thinkingPart);
          }
          thinkingContent += thinkingPart;

          state = 'IN_DOCUMENT';
          buffer = '';

          const trimmedDoc = afterClose.trimStart();
          if (trimmedDoc) {
            if (onDocumentUpdate) {
              onDocumentUpdate(trimmedDoc);
            }
            documentContent += trimmedDoc;
          }
        }
      };

      console.info('[LLMClient] Starting stream processing (messages mode)...');

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (!line.trim() || line.trim() === 'data: [DONE]') continue;
            if (!line.startsWith('data: ')) continue;

            try {
              const jsonStr = line.slice(6);
              const data = JSON.parse(jsonStr);

              if (data.usage) {
                promptTokens = data.usage.prompt_tokens ?? null;
                completionTokens = data.usage.completion_tokens ?? null;
              }

              const delta = data.choices?.[0]?.delta?.content || '';
              if (!delta) {
                finishReason = data.choices?.[0]?.finish_reason || finishReason;
                continue;
              }

              if (ttft === null) {
                ttft = Date.now() - startTime;
              }

              if (state === 'DETECTING') {
                buffer += delta;

                const openingMatch = buffer.match(
                  /<(?:think|thinking|reasoning)>/i
                );
                if (openingMatch) {
                  console.info('[LLMClient] Detected thinking mode');
                  state = 'IN_THINKING';
                  if (ttFirstThinking === null) {
                    ttFirstThinking = Date.now() - startTime;
                  }
                  buffer = buffer.slice(
                    openingMatch.index! + openingMatch[0].length
                  );
                  processThinkingBuffer();
                } else if (buffer.length >= this.detectionWindow) {
                  console.info(
                    '[LLMClient] Detected standard mode (no thinking tags)'
                  );
                  state = 'IN_DOCUMENT';
                  if (ttFirstDocument === null) {
                    ttFirstDocument = Date.now() - startTime;
                  }
                  flushBufferAsDocument();
                }
              } else if (state === 'IN_THINKING') {
                buffer += delta;

                const closeMatch = buffer.match(
                  /<\/(?:think|thinking|reasoning)>/i
                );

                if (closeMatch) {
                  const thinkingPart = buffer.slice(0, closeMatch.index!);
                  const afterClose = buffer.slice(
                    closeMatch.index! + closeMatch[0].length
                  );

                  const parsedThinking = this.parseThinking(thinkingPart);
                  if (onThinkingUpdate && parsedThinking) {
                    onThinkingUpdate(parsedThinking);
                  }
                  thinkingContent += parsedThinking;

                  console.info(
                    '[LLMClient] Thinking block complete, switching to document mode'
                  );
                  state = 'IN_DOCUMENT';
                  if (ttFirstDocument === null) {
                    ttFirstDocument = Date.now() - startTime;
                  }
                  buffer = '';

                  const trimmedDoc = afterClose.trimStart();
                  if (trimmedDoc) {
                    if (onDocumentUpdate) {
                      onDocumentUpdate(trimmedDoc);
                    }
                    documentContent += trimmedDoc;
                  }
                } else {
                  const holdBackLength = 12;
                  if (buffer.length > holdBackLength) {
                    const safeContent = buffer.slice(
                      0,
                      buffer.length - holdBackLength
                    );
                    buffer = buffer.slice(-holdBackLength);

                    const parsedSafe = this.parseThinking(safeContent);
                    if (onThinkingUpdate && parsedSafe) {
                      onThinkingUpdate(parsedSafe);
                    }
                    thinkingContent += parsedSafe;
                  }
                }
              } else if (state === 'IN_DOCUMENT') {
                if (onDocumentUpdate) {
                  onDocumentUpdate(delta);
                }
                documentContent += delta;
              }
            } catch (error) {
              console.error(
                '[LLMClient] Failed to parse SSE line:',
                line,
                error
              );
            }
          }
        }

        if (state === 'DETECTING' && buffer) {
          console.info(
            '[LLMClient] Stream ended in DETECTING, flushing as document'
          );
          flushBufferAsDocument();
        } else if (state === 'IN_THINKING' && buffer) {
          console.info(
            '[LLMClient] Stream ended in IN_THINKING, flushing remaining'
          );
          const remainingThinking = this.parseThinking(buffer);
          if (onThinkingUpdate && remainingThinking) {
            onThinkingUpdate(remainingThinking);
          }
          thinkingContent += remainingThinking;
        }
      } catch (error) {
        console.error('[LLMClient] Stream processing error:', error);
        throw error;
      }

      console.info('[LLMClient] Stream complete, final state:', state);

      return {
        thinkingContent: thinkingContent.trim(),
        documentContent: documentContent.trim(),
        finishReason: finishReason,
        cancelled: false,
        timing: {
          ttft,
          ttFirstThinking,
          ttFirstDocument,
        },
        usage: {
          promptTokens,
          completionTokens,
        },
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.info('[LLMClient] Stream cancelled:', streamId);
        return {
          thinkingContent: '',
          documentContent: '',
          finishReason: 'cancelled',
          cancelled: true,
          timing: {
            ttft: null,
            ttFirstThinking: null,
            ttFirstDocument: null,
          },
          usage: {
            promptTokens: null,
            completionTokens: null,
          },
        };
      }
      throw error;
    } finally {
      this.activeStreams.delete(streamId);
      console.info('[LLMClient] Cleaned up stream:', streamId);
    }
  }

  /**
   * Cancel an active stream
   * @param streamId - The stream ID to cancel
   */
  cancelStream(streamId: string): void {
    const streamInfo = this.activeStreams.get(streamId);
    if (!streamInfo) {
      console.info('[LLMClient] No active stream to cancel:', streamId);
      return;
    }

    console.info('[LLMClient] Cancelling stream:', streamId);

    // Abort the fetch request
    streamInfo.abortController.abort();

    // Cancel the reader if available
    if (streamInfo.reader) {
      streamInfo.reader.cancel().catch((err) => {
        console.error('[LLMClient] Error cancelling reader:', err);
      });
    }

    // Remove from active streams
    this.activeStreams.delete(streamId);

    console.info('[LLMClient] Stream cancelled successfully:', streamId);
  }
}
