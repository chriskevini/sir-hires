# Sir Hires Test Suite

This directory contains unit and integration tests for the Sir Hires Chrome extension.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-run on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

```
tests/
├── unit/              # Unit tests for individual functions/modules
│   ├── extraction.test.js    # Job data extraction tests
│   └── storage.test.js       # Storage operations tests
└── integration/       # Integration tests for workflows
```

## Writing Tests

### Unit Tests

Unit tests focus on testing individual functions in isolation:

```javascript
describe('functionName', () => {
  it('should do something specific', () => {
    // Arrange: Set up test data
    const input = 'test data'
    
    // Act: Call the function
    const result = functionName(input)
    
    // Assert: Verify the result
    expect(result).toBe('expected output')
  })
})
```

### Mocking Chrome APIs

Since we're testing a Chrome extension, we often need to mock Chrome APIs:

```javascript
beforeEach(() => {
  global.chrome = {
    storage: {
      local: {
        get: jest.fn(),
        set: jest.fn(),
      },
    },
  }
})
```

### Testing Async Functions

Use async/await for testing asynchronous code:

```javascript
it('should save data asynchronously', async () => {
  await saveData({ key: 'value' })
  expect(chrome.storage.local.set).toHaveBeenCalled()
})
```

## Test Coverage Goals

- **Critical functions**: 80%+ coverage
- **Business logic**: High coverage (70%+)
- **UI components**: Key interactions tested
- **Edge cases**: Failure scenarios covered

## Common Testing Patterns

### 1. DOM Testing

For functions that manipulate or read from the DOM:

```javascript
beforeEach(() => {
  document.body.innerHTML = '<div id="test-container"></div>'
})

afterEach(() => {
  document.body.innerHTML = ''
})
```

### 2. Async Storage Testing

For Chrome storage operations:

```javascript
it('should store job data', async () => {
  const mockSet = jest.fn((data, callback) => callback())
  chrome.storage.local.set = mockSet
  
  await saveJob({ id: '123', title: 'Engineer' })
  
  expect(mockSet).toHaveBeenCalledWith(
    expect.objectContaining({ jobs: expect.any(Object) }),
    expect.any(Function)
  )
})
```

### 3. Error Handling

Test both success and failure scenarios:

```javascript
it('should handle extraction errors gracefully', () => {
  const malformedHtml = '<div></div>'
  const result = extractJobData(malformedHtml)
  expect(result).toHaveProperty('error')
})
```

## Best Practices

1. **Test Naming**: Use descriptive names that explain what is being tested
   - Good: `it('should extract job title from LinkedIn')`
   - Bad: `it('works')`

2. **Arrange-Act-Assert**: Structure tests clearly
   - Arrange: Set up test data
   - Act: Execute the function
   - Assert: Verify the results

3. **Isolation**: Each test should be independent
   - Use `beforeEach` and `afterEach` to reset state
   - Don't rely on test execution order

4. **Mock External Dependencies**: 
   - Chrome APIs
   - DOM elements
   - Network requests
   - LLM services

5. **Test Edge Cases**:
   - Empty inputs
   - Null/undefined values
   - Malformed data
   - Error conditions

## Current Test Status

The test suite is in its early stages. Current tests demonstrate:
- Testing patterns for extraction functions
- Mocking Chrome storage APIs
- Async operation testing

## Contributing Tests

When adding new features:
1. Write tests first (TDD approach recommended)
2. Ensure tests pass before submitting PR
3. Aim for high coverage of business logic
4. Test edge cases and error scenarios
5. Keep tests maintainable and readable

## TODO

- [ ] Add tests for all extraction functions in `content.js`
- [ ] Add tests for job-details modules
- [ ] Add tests for parser utilities
- [ ] Add integration tests for complete workflows
- [ ] Add tests for LLM client
- [ ] Achieve 70%+ overall test coverage
