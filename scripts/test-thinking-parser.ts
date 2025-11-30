/**
 * Unit test for thinking/document stream separation in LLMClient
 *
 * Tests the state machine that separates <thinking>/<reasoning>/<think> blocks
 * from document content during LLM streaming.
 *
 * Run with: npx tsx scripts/test-thinking-parser.ts
 */

// =============================================================================
// TYPES
// =============================================================================

type State = 'DETECTING' | 'IN_THINKING' | 'IN_DOCUMENT';

interface TestResult {
  thinking: string;
  document: string;
  thinkingChunks: string[];
  documentChunks: string[];
}

// =============================================================================
// STATE MACHINE SIMULATION (extracted from src/utils/llm-client.ts)
// =============================================================================

function parseThinking(rawThinking: string): string {
  return rawThinking.replace(/<\/?(?:think|thinking|reasoning)>/gi, '');
}

function simulateStreamProcessing(deltas: string[]): TestResult {
  const detectionWindow = 50;
  let state: State = 'DETECTING';
  let buffer = '';
  let thinkingContent = '';
  let documentContent = '';
  const thinkingChunks: string[] = [];
  const documentChunks: string[] = [];

  const onThinkingUpdate = (delta: string) => {
    thinkingChunks.push(delta);
    thinkingContent += delta;
  };

  const onDocumentUpdate = (delta: string) => {
    documentChunks.push(delta);
    documentContent += delta;
  };

  const flushBufferAsDocument = () => {
    if (buffer) {
      onDocumentUpdate(buffer);
      buffer = '';
    }
  };

  // Helper to check if buffer already contains closing tag after opening is stripped
  const processThinkingBuffer = () => {
    const closeMatch = buffer.match(/<\/(?:think|thinking|reasoning)>/i);
    if (closeMatch) {
      const thinkingPart = buffer.slice(0, closeMatch.index!);
      const afterClose = buffer.slice(closeMatch.index! + closeMatch[0].length);

      if (thinkingPart) {
        onThinkingUpdate(thinkingPart);
      }

      console.log(
        '[processThinkingBuffer] Found closing tag, switching to IN_DOCUMENT'
      );
      state = 'IN_DOCUMENT';
      buffer = '';

      const trimmedDoc = afterClose.trimStart();
      if (trimmedDoc) {
        onDocumentUpdate(trimmedDoc);
      }
    }
  };

  for (const delta of deltas) {
    if (state === 'DETECTING') {
      buffer += delta;

      const openingMatch = buffer.match(/<(?:think|thinking|reasoning)>/i);
      if (openingMatch) {
        console.log('[DETECTING -> IN_THINKING] Found opening tag');
        state = 'IN_THINKING';
        // Strip everything up to and including the opening tag
        buffer = buffer.slice(openingMatch.index! + openingMatch[0].length);
        // Check if closing tag is already in buffer
        processThinkingBuffer();
      } else if (buffer.length >= detectionWindow) {
        console.log('[DETECTING -> IN_DOCUMENT] No thinking tags found');
        state = 'IN_DOCUMENT';
        flushBufferAsDocument();
      }
    } else if (state === 'IN_THINKING') {
      buffer += delta;

      // Check for closing tag in buffer
      const closeMatch = buffer.match(/<\/(?:think|thinking|reasoning)>/i);

      if (closeMatch) {
        // Found closing tag - extract and stream thinking content
        const thinkingPart = buffer.slice(0, closeMatch.index!);
        const afterClose = buffer.slice(
          closeMatch.index! + closeMatch[0].length
        );

        // Stream thinking content (strip any remaining opening tags)
        const parsedThinking = parseThinking(thinkingPart);
        if (parsedThinking) {
          onThinkingUpdate(parsedThinking);
        }

        // Transition to document mode
        console.log('[IN_THINKING -> IN_DOCUMENT] Found closing tag');
        state = 'IN_DOCUMENT';
        buffer = '';

        // Stream any content after closing tag
        const trimmedDoc = afterClose.trimStart();
        if (trimmedDoc) {
          onDocumentUpdate(trimmedDoc);
        }
      } else {
        // No closing tag yet - stream safe content incrementally
        // Keep last 12 chars in buffer (max length of "</reasoning>")
        const holdBackLength = 12;
        if (buffer.length > holdBackLength) {
          const safeContent = buffer.slice(0, buffer.length - holdBackLength);
          buffer = buffer.slice(-holdBackLength);

          const parsedSafe = parseThinking(safeContent);
          if (parsedSafe) {
            onThinkingUpdate(parsedSafe);
          }
        }
      }
    } else if (state === 'IN_DOCUMENT') {
      onDocumentUpdate(delta);
    }
  }

  // Handle remaining buffer at end of stream
  if (state === 'DETECTING' && buffer) {
    console.log('[END] Flushing DETECTING buffer as document');
    flushBufferAsDocument();
  } else if (state === 'IN_THINKING' && buffer) {
    console.log('[END] Flushing IN_THINKING buffer as thinking');
    const remainingThinking = parseThinking(buffer);
    if (remainingThinking) {
      onThinkingUpdate(remainingThinking);
    }
  }

  return {
    thinking: thinkingContent,
    document: documentContent,
    thinkingChunks,
    documentChunks,
  };
}

// =============================================================================
// TEST CASES
// =============================================================================

interface TestCase {
  name: string;
  deltas: string[];
  expectedThinking: string;
  expectedDocument: string;
}

const testCases: TestCase[] = [
  {
    name: 'Basic thinking then document',
    deltas: ['<thinking>', 'I am thinking', '</thinking>', 'Document content'],
    expectedThinking: 'I am thinking',
    expectedDocument: 'Document content',
  },
  {
    name: 'Closing tag split across two deltas',
    deltas: [
      '<thinking>',
      'My thoughts here',
      '</think',
      'ing>',
      'The document',
    ],
    expectedThinking: 'My thoughts here',
    expectedDocument: 'The document',
  },
  {
    name: 'Closing tag split into three deltas',
    deltas: ['<thinking>', 'Reasoning...', '</', 'thinking', '>', 'Result'],
    expectedThinking: 'Reasoning...',
    expectedDocument: 'Result',
  },
  {
    name: 'reasoning tag variant',
    deltas: ['<reasoning>', 'My reasoning', '</reasoning>', 'Output'],
    expectedThinking: 'My reasoning',
    expectedDocument: 'Output',
  },
  {
    name: 'reasoning closing split',
    deltas: ['<reasoning>', 'Analysis', '</reason', 'ing>', 'Answer'],
    expectedThinking: 'Analysis',
    expectedDocument: 'Answer',
  },
  {
    name: 'think tag variant',
    deltas: ['<think>', 'Short thought', '</think>', 'Doc'],
    expectedThinking: 'Short thought',
    expectedDocument: 'Doc',
  },
  {
    name: 'Closing tag character by character',
    deltas: [
      '<thinking>',
      'Thought',
      '<',
      '/',
      't',
      'h',
      'i',
      'n',
      'k',
      'i',
      'n',
      'g',
      '>',
      'Doc',
    ],
    expectedThinking: 'Thought',
    expectedDocument: 'Doc',
  },
  {
    name: 'No thinking tags - plain document',
    deltas: [
      'This is just a regular response with no thinking at all. It keeps going.',
      ' More content.',
    ],
    expectedThinking: '',
    expectedDocument:
      'This is just a regular response with no thinking at all. It keeps going. More content.',
  },
  {
    name: 'Long thinking with incremental streaming',
    deltas: [
      '<thinking>',
      'This is a very long thinking block that should stream incrementally. ',
      'We want to make sure that content is sent to the callback ',
      'as it arrives, not all at once at the end. ',
      'This makes for better UX.',
      '</thinking>',
      'Final answer',
    ],
    expectedThinking:
      'This is a very long thinking block that should stream incrementally. We want to make sure that content is sent to the callback as it arrives, not all at once at the end. This makes for better UX.',
    expectedDocument: 'Final answer',
  },
  {
    name: 'Opening tag split across deltas',
    deltas: ['<think', 'ing>', 'My thought', '</thinking>', 'Result'],
    expectedThinking: 'My thought',
    expectedDocument: 'Result',
  },
  {
    name: 'Full block in single delta',
    deltas: ['<thinking>All at once</thinking>Document here'],
    expectedThinking: 'All at once',
    expectedDocument: 'Document here',
  },
  {
    name: 'Whitespace after closing tag (same delta)',
    deltas: ['<thinking>', 'Thought', '</thinking>\n\nDocument'],
    expectedThinking: 'Thought',
    expectedDocument: 'Document',
  },
  {
    name: 'Whitespace after closing tag (separate deltas)',
    deltas: ['<thinking>', 'Thought', '</thinking>', '\n\n', 'Document'],
    expectedThinking: 'Thought',
    expectedDocument: '\n\nDocument', // Whitespace in separate delta is preserved
  },
];

// =============================================================================
// RUN TESTS
// =============================================================================

console.log('='.repeat(60));
console.log('Testing thinking/document stream separation');
console.log('='.repeat(60));
console.log('');

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  console.log(`TEST: ${testCase.name}`);
  console.log(`  Deltas: ${JSON.stringify(testCase.deltas)}`);

  const result = simulateStreamProcessing(testCase.deltas);

  const thinkingMatch = result.thinking === testCase.expectedThinking;
  const documentMatch = result.document === testCase.expectedDocument;

  if (thinkingMatch && documentMatch) {
    console.log('  PASS');
    passed++;
  } else {
    console.log('  FAIL');
    if (!thinkingMatch) {
      console.log(`    Expected thinking: "${testCase.expectedThinking}"`);
      console.log(`    Actual thinking:   "${result.thinking}"`);
    }
    if (!documentMatch) {
      console.log(`    Expected document: "${testCase.expectedDocument}"`);
      console.log(`    Actual document:   "${result.document}"`);
    }
    failed++;
  }

  // Show streaming behavior
  if (result.thinkingChunks.length > 0) {
    console.log(
      `  Thinking streamed in ${result.thinkingChunks.length} chunk(s): ${JSON.stringify(result.thinkingChunks)}`
    );
  }
  if (result.documentChunks.length > 0) {
    console.log(
      `  Document streamed in ${result.documentChunks.length} chunk(s): ${JSON.stringify(result.documentChunks)}`
    );
  }

  console.log('');
}

console.log('='.repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

process.exit(failed > 0 ? 1 : 0);
