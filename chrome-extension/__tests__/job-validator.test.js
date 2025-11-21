/**
 * Unit tests for job-validator.js
 * Tests the MarkdownDB Job Template validator functionality
 */

import { parseJobTemplate } from '../utils/job-parser.js';
import { validateJobTemplate, getValidationSummary } from '../utils/job-validator.js';

describe('validateJobTemplate', () => {
  test('should validate a complete valid job template', () => {
    const template = `<JOB>
TITLE: Senior Software Engineer
COMPANY: Tech Corp
ADDRESS: San Francisco, CA
REMOTE_TYPE: HYBRID
EMPLOYMENT_TYPE: FULL-TIME
# REQUIRED_SKILLS:
- 5+ years of experience
- JavaScript expertise`;

    const parsed = parseJobTemplate(template);
    const result = validateJobTemplate(parsed);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should report error for missing required fields', () => {
    const template = `<JOB>
COMPANY: Tech Corp`;

    const parsed = parseJobTemplate(template);
    const result = validateJobTemplate(parsed);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.type === 'missing_required_field')).toBe(true);
  });

  test('should report error for missing REQUIRED_SKILLS section', () => {
    const template = `<JOB>
TITLE: Engineer
COMPANY: Tech Corp`;

    const parsed = parseJobTemplate(template);
    const result = validateJobTemplate(parsed);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.type === 'missing_required_section')).toBe(true);
  });

  test('should report error for invalid enum value', () => {
    const template = `<JOB>
TITLE: Engineer
COMPANY: Tech Corp
REMOTE_TYPE: SOMETIMES
# REQUIRED_SKILLS:
- Skill 1`;

    const parsed = parseJobTemplate(template);
    const result = validateJobTemplate(parsed);

    expect(result.errors.some((e) => e.type === 'invalid_enum_value')).toBe(true);
  });

  test('should detect custom top-level fields', () => {
    const template = `<JOB>
TITLE: Engineer
COMPANY: Tech Corp
CUSTOM_FIELD: Custom Value
# REQUIRED_SKILLS:
- Skill 1`;

    const parsed = parseJobTemplate(template);
    const result = validateJobTemplate(parsed);

    expect(result.customFields).toContain('CUSTOM_FIELD');
    expect(result.info.some((i) => i.message.includes('custom field'))).toBe(true);
  });

  test('should detect custom sections', () => {
    const template = `<JOB>
TITLE: Engineer
COMPANY: Tech Corp
# REQUIRED_SKILLS:
- Skill 1
# CUSTOM_SECTION:
- Item 1`;

    const parsed = parseJobTemplate(template);
    const result = validateJobTemplate(parsed);

    expect(result.customSections).toContain('CUSTOM_SECTION');
    expect(result.info.some((i) => i.message.includes('custom section'))).toBe(true);
  });

  test('should handle null input', () => {
    const result = validateJobTemplate(null);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.type === 'invalid_input')).toBe(true);
  });

  test('should warn when type is not JOB', () => {
    const parsed = {
      type: 'PROFILE',
      topLevelFields: { TITLE: 'Engineer', COMPANY: 'TechCo' },
      sections: { REQUIRED_SKILLS: { list: ['Skill'] } },
    };

    const result = validateJobTemplate(parsed);

    expect(result.warnings.some((w) => w.type === 'unexpected_type')).toBe(true);
  });
});

describe('getValidationSummary', () => {
  test('should generate summary for valid template', () => {
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      info: [],
      customFields: [],
      customSections: [],
    };

    const summary = getValidationSummary(validation);

    expect(summary).toContain('✅');
    expect(summary).toContain('valid');
  });

  test('should generate summary with errors', () => {
    const validation = {
      valid: false,
      errors: [
        { type: 'missing_required', message: 'Missing TITLE' },
        { type: 'missing_required', message: 'Missing COMPANY' },
      ],
      warnings: [],
      info: [],
      customFields: [],
      customSections: [],
    };

    const summary = getValidationSummary(validation);

    expect(summary).toContain('❌');
    expect(summary).toContain('Errors (2)');
  });

  test('should include warnings and info in summary', () => {
    const validation = {
      valid: true,
      errors: [],
      warnings: [{ type: 'warning', message: 'Warning message' }],
      info: [{ type: 'info', message: 'Info message' }],
      customFields: ['CUSTOM'],
      customSections: [],
    };

    const summary = getValidationSummary(validation);

    expect(summary).toContain('Warnings (1)');
    expect(summary).toContain('Info (1)');
  });
});
