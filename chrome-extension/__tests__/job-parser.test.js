/**
 * Unit tests for job-parser.js
 * Tests the MarkdownDB Job Template parser functionality
 */

import {
  parseJobTemplate,
  extractDescription,
  extractRequiredSkills,
  extractPreferredSkills,
  extractAboutCompany,
  getTopLevelField,
  getAllTopLevelFields,
  getAllSections,
  mapMarkdownFieldsToJob,
} from '../utils/job-parser.js';

describe('parseJobTemplate', () => {
  test('should parse a complete job template', () => {
    const template = `<JOB>
TITLE: Senior Software Engineer
COMPANY: Tech Corp
ADDRESS: San Francisco, CA
REMOTE_TYPE: HYBRID
SALARY_RANGE_MIN: 100000
SALARY_RANGE_MAX: 150000
EMPLOYMENT_TYPE: FULL-TIME
EXPERIENCE_LEVEL: SENIOR
# DESCRIPTION:
- Design and implement scalable systems
- Lead technical initiatives
# REQUIRED_SKILLS:
- 5+ years of experience
- Proficient in JavaScript
# PREFERRED_SKILLS:
- Experience with React
- AWS certification
# ABOUT_COMPANY:
- Fast-growing startup
- Competitive benefits`;

    const result = parseJobTemplate(template);

    expect(result.type).toBe('JOB');
    expect(result.topLevelFields.TITLE).toBe('Senior Software Engineer');
    expect(result.topLevelFields.COMPANY).toBe('Tech Corp');
    expect(result.topLevelFields.ADDRESS).toBe('San Francisco, CA');
    expect(result.sections.DESCRIPTION.list).toHaveLength(2);
    expect(result.sections.REQUIRED_SKILLS.list).toHaveLength(2);
    expect(result.sections.PREFERRED_SKILLS.list).toHaveLength(2);
    expect(result.sections.ABOUT_COMPANY.list).toHaveLength(2);
  });

  test('should handle empty or null input', () => {
    expect(parseJobTemplate(null)).toEqual({
      type: null,
      topLevelFields: {},
      sections: {},
      raw: '',
    });

    expect(parseJobTemplate('')).toEqual({
      type: null,
      topLevelFields: {},
      sections: {},
      raw: '',
    });
  });

  test('should handle templates with inline comments', () => {
    const template = `<JOB>
TITLE: Engineer // required
COMPANY: TechCo // must be filled
REMOTE_TYPE: HYBRID // [ONSITE|REMOTE|HYBRID]`;

    const result = parseJobTemplate(template);

    expect(result.topLevelFields.TITLE).toBe('Engineer');
    expect(result.topLevelFields.COMPANY).toBe('TechCo');
    expect(result.topLevelFields.REMOTE_TYPE).toBe('HYBRID');
  });

  test('should skip full-line comments', () => {
    const template = `<JOB>
TITLE: Engineer
// This is a comment line
COMPANY: TechCo`;

    const result = parseJobTemplate(template);

    expect(result.topLevelFields.TITLE).toBe('Engineer');
    expect(result.topLevelFields.COMPANY).toBe('TechCo');
    expect(Object.keys(result.topLevelFields)).toHaveLength(2);
  });

  test('should handle sections with colons and without', () => {
    const template = `<JOB>
TITLE: Engineer
# DESCRIPTION:
- Item 1
# REQUIRED_SKILLS
- Skill 1`;

    const result = parseJobTemplate(template);

    expect(result.sections.DESCRIPTION).toBeDefined();
    expect(result.sections.REQUIRED_SKILLS).toBeDefined();
    expect(result.sections.DESCRIPTION.list).toEqual(['Item 1']);
    expect(result.sections.REQUIRED_SKILLS.list).toEqual(['Skill 1']);
  });

  test('should preserve original content in raw field', () => {
    const template = `<JOB>
TITLE: Engineer`;

    const result = parseJobTemplate(template);

    expect(result.raw).toBe(template);
  });
});

describe('extractDescription', () => {
  test('should extract description items', () => {
    const parsed = {
      sections: {
        DESCRIPTION: {
          list: ['Item 1', 'Item 2', 'Item 3'],
        },
      },
    };

    const result = extractDescription(parsed);

    expect(result).toEqual(['Item 1', 'Item 2', 'Item 3']);
  });

  test('should return empty array when no description section', () => {
    const parsed = { sections: {} };

    const result = extractDescription(parsed);

    expect(result).toEqual([]);
  });
});

describe('extractRequiredSkills', () => {
  test('should extract required skills', () => {
    const parsed = {
      sections: {
        REQUIRED_SKILLS: {
          list: ['JavaScript', 'Python', 'SQL'],
        },
      },
    };

    const result = extractRequiredSkills(parsed);

    expect(result).toEqual(['JavaScript', 'Python', 'SQL']);
  });

  test('should return empty array when no required skills section', () => {
    const parsed = { sections: {} };

    const result = extractRequiredSkills(parsed);

    expect(result).toEqual([]);
  });
});

describe('extractPreferredSkills', () => {
  test('should extract preferred skills', () => {
    const parsed = {
      sections: {
        PREFERRED_SKILLS: {
          list: ['React', 'AWS', 'Docker'],
        },
      },
    };

    const result = extractPreferredSkills(parsed);

    expect(result).toEqual(['React', 'AWS', 'Docker']);
  });

  test('should return empty array when no preferred skills section', () => {
    const parsed = { sections: {} };

    const result = extractPreferredSkills(parsed);

    expect(result).toEqual([]);
  });
});

describe('extractAboutCompany', () => {
  test('should extract company information', () => {
    const parsed = {
      sections: {
        ABOUT_COMPANY: {
          list: ['Founded in 2020', 'Series B funded', 'Remote-first culture'],
        },
      },
    };

    const result = extractAboutCompany(parsed);

    expect(result).toEqual(['Founded in 2020', 'Series B funded', 'Remote-first culture']);
  });

  test('should return empty array when no company section', () => {
    const parsed = { sections: {} };

    const result = extractAboutCompany(parsed);

    expect(result).toEqual([]);
  });
});

describe('getTopLevelField', () => {
  test('should retrieve specific field value', () => {
    const parsed = {
      topLevelFields: {
        TITLE: 'Engineer',
        COMPANY: 'TechCo',
      },
    };

    expect(getTopLevelField(parsed, 'TITLE')).toBe('Engineer');
    expect(getTopLevelField(parsed, 'COMPANY')).toBe('TechCo');
  });

  test('should return null for non-existent field', () => {
    const parsed = {
      topLevelFields: {
        TITLE: 'Engineer',
      },
    };

    expect(getTopLevelField(parsed, 'NONEXISTENT')).toBeNull();
  });
});

describe('getAllTopLevelFields', () => {
  test('should return all top-level fields', () => {
    const parsed = {
      topLevelFields: {
        TITLE: 'Engineer',
        COMPANY: 'TechCo',
        ADDRESS: 'Remote',
      },
    };

    const result = getAllTopLevelFields(parsed);

    expect(result).toEqual({
      TITLE: 'Engineer',
      COMPANY: 'TechCo',
      ADDRESS: 'Remote',
    });
  });

  test('should return empty object when no fields', () => {
    const parsed = {};

    const result = getAllTopLevelFields(parsed);

    expect(result).toEqual({});
  });
});

describe('getAllSections', () => {
  test('should return all sections', () => {
    const parsed = {
      sections: {
        DESCRIPTION: { list: ['Item 1'] },
        REQUIRED_SKILLS: { list: ['Skill 1'] },
      },
    };

    const result = getAllSections(parsed);

    expect(result).toEqual({
      DESCRIPTION: { list: ['Item 1'] },
      REQUIRED_SKILLS: { list: ['Skill 1'] },
    });
  });

  test('should return empty object when no sections', () => {
    const parsed = {};

    const result = getAllSections(parsed);

    expect(result).toEqual({});
  });
});

describe('mapMarkdownFieldsToJob', () => {
  test('should map template fields to job object', () => {
    const fields = {
      TITLE: 'Senior Engineer',
      COMPANY: 'TechCo',
      ADDRESS: 'San Francisco',
      EMPLOYMENT_TYPE: 'FULL-TIME',
      REMOTE_TYPE: 'HYBRID',
    };

    const result = mapMarkdownFieldsToJob(fields);

    expect(result).toEqual({
      jobTitle: 'Senior Engineer',
      company: 'TechCo',
      location: 'San Francisco',
      jobType: 'FULL-TIME',
      remoteType: 'HYBRID',
    });
  });

  test('should handle partial field mapping', () => {
    const fields = {
      TITLE: 'Engineer',
      COMPANY: 'TechCo',
    };

    const result = mapMarkdownFieldsToJob(fields);

    expect(result).toEqual({
      jobTitle: 'Engineer',
      company: 'TechCo',
    });
  });

  test('should return empty object for empty input', () => {
    const result = mapMarkdownFieldsToJob({});

    expect(result).toEqual({});
  });
});
