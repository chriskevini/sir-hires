# Testing Guide

## Overview

This directory contains unit tests for the Sir Hires Chrome extension. We use Jest as our testing framework.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Writing Tests

### File Structure

- Place tests in `__tests__` directories next to the code they test
- Or name test files with `.test.js` suffix (e.g., `job-parser.test.js`)

### Test File Template

```javascript
/**
 * Tests for module-name.js
 */

import { functionToTest } from '../module-name.js';

describe('functionToTest', () => {
  it('should do something specific', () => {
    const result = functionToTest(input);
    expect(result).toBe(expected);
  });

  it('should handle edge cases', () => {
    const result = functionToTest(null);
    expect(result).toBe(null);
  });
});
```

## Current Test Coverage

### Fully Tested
- ✅ `utils/job-parser.js` - Job template parsing and extraction

### Partially Tested
- (Add more tests as modules are covered)

### Not Yet Tested
Most content scripts and UI code are not yet tested. Priority areas for future testing:
- Content extraction logic
- Storage operations
- State management
- Form validation

## Testing Strategy

### Unit Tests (Current Focus)
Test individual functions in isolation:
- Parser utilities (`job-parser.js`, `profile-parser.js`)
- Validator utilities (`job-validator.js`, `profile-validator.js`)
- Data transformation functions
- Pure utility functions

### Integration Tests (Future)
Test component interactions:
- Storage operations with mock Chrome APIs
- State management flows
- View rendering with test data

### Manual Testing (Always Required)
Chrome extension features that require manual testing:
- Content script extraction on real job boards
- Popup UI interactions
- Side panel functionality
- Extension installation and updates

## Chrome API Mocking

Chrome extension APIs are mocked in `jest.setup.js`:

```javascript
global.chrome = {
  storage: { local: { get: mockFn(), set: mockFn(), ... } },
  runtime: { sendMessage: mockFn(), ... },
  tabs: { query: mockFn(), ... },
};
```

Add more mocks as needed for your tests.

## Best Practices

1. **Keep tests simple**: One concept per test
2. **Use descriptive names**: Test names should explain what they verify
3. **Test edge cases**: null, undefined, empty strings, etc.
4. **Avoid implementation details**: Test behavior, not internals
5. **Mock Chrome APIs**: Use the mocks from `jest.setup.js`

## Example: Testing a Parser Function

```javascript
describe('parseJobTemplate', () => {
  it('should parse basic job data', () => {
    const template = '<JOB>\nTITLE: Engineer\n</JOB>';
    const result = parseJobTemplate(template);
    
    expect(result.type).toBe('JOB');
    expect(result.topLevelFields.TITLE).toBe('Engineer');
  });

  it('should handle malformed input gracefully', () => {
    const result = parseJobTemplate('');
    
    expect(result.type).toBeNull();
    expect(result.topLevelFields).toEqual({});
  });
});
```

## Adding Tests for New Features

When adding new features:

1. Write tests first (TDD) or alongside the feature
2. Test happy path and error cases
3. Run tests locally: `npm test`
4. Ensure tests pass before submitting PR

## Debugging Tests

```bash
# Run specific test file
npm test job-parser.test.js

# Run tests matching a pattern
npm test -- -t "parseJobTemplate"

# Run with verbose output
npm test -- --verbose
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Chrome Extension Testing Guide](https://developer.chrome.com/docs/extensions/mv3/tut_testing/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
