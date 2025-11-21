/**
 * Tests for job-parser.js
 */

import {
  parseJobTemplate,
  extractDescription,
  extractRequiredSkills,
  extractPreferredSkills,
  extractAboutCompany,
  getTopLevelField,
} from '../job-parser.js';

describe('parseJobTemplate', () => {
  it('should parse a basic job template', () => {
    const template = `<JOB>
TITLE: Software Engineer
COMPANY: Acme Corp
ADDRESS: San Francisco, CA
</JOB>`;

    const result = parseJobTemplate(template);
    
    expect(result.type).toBe('JOB');
    expect(result.topLevelFields.TITLE).toBe('Software Engineer');
    expect(result.topLevelFields.COMPANY).toBe('Acme Corp');
    expect(result.topLevelFields.ADDRESS).toBe('San Francisco, CA');
  });

  it('should parse sections with lists', () => {
    const template = `<JOB>
TITLE: Software Engineer

# REQUIRED_SKILLS:
- JavaScript
- React
- Node.js

# DESCRIPTION:
- Build web applications
- Collaborate with team
</JOB>`;

    const result = parseJobTemplate(template);
    
    expect(result.sections.REQUIRED_SKILLS).toBeDefined();
    expect(result.sections.REQUIRED_SKILLS.list).toHaveLength(3);
    expect(result.sections.REQUIRED_SKILLS.list[0]).toBe('JavaScript');
    
    expect(result.sections.DESCRIPTION).toBeDefined();
    expect(result.sections.DESCRIPTION.list).toHaveLength(2);
  });

  it('should handle empty or null input', () => {
    const result = parseJobTemplate('');
    expect(result.type).toBeNull();
    expect(result.topLevelFields).toEqual({});
    expect(result.sections).toEqual({});
  });

  it('should ignore inline comments', () => {
    const template = `<JOB>
TITLE: Software Engineer // This is a comment
COMPANY: Acme Corp
</JOB>`;

    const result = parseJobTemplate(template);
    expect(result.topLevelFields.TITLE).toBe('Software Engineer');
  });

  it('should handle salary range fields', () => {
    const template = `<JOB>
TITLE: Software Engineer
SALARY_RANGE_MIN: 100000
SALARY_RANGE_MAX: 150000
</JOB>`;

    const result = parseJobTemplate(template);
    expect(result.topLevelFields.SALARY_RANGE_MIN).toBe('100000');
    expect(result.topLevelFields.SALARY_RANGE_MAX).toBe('150000');
  });

  it('should handle remote type field', () => {
    const template = `<JOB>
TITLE: Software Engineer
REMOTE_TYPE: REMOTE
</JOB>`;

    const result = parseJobTemplate(template);
    expect(result.topLevelFields.REMOTE_TYPE).toBe('REMOTE');
  });
});

describe('extractDescription', () => {
  it('should extract description list items', () => {
    const parsed = {
      sections: {
        DESCRIPTION: {
          list: ['Build web apps', 'Write tests', 'Code reviews'],
        },
      },
    };

    const description = extractDescription(parsed);
    expect(description).toHaveLength(3);
    expect(description[0]).toBe('Build web apps');
  });

  it('should return empty array if no description section', () => {
    const parsed = { sections: {} };
    const description = extractDescription(parsed);
    expect(description).toEqual([]);
  });
});

describe('extractRequiredSkills', () => {
  it('should extract required skills list', () => {
    const parsed = {
      sections: {
        REQUIRED_SKILLS: {
          list: ['JavaScript', 'React', 'Node.js'],
        },
      },
    };

    const skills = extractRequiredSkills(parsed);
    expect(skills).toHaveLength(3);
    expect(skills).toContain('JavaScript');
    expect(skills).toContain('React');
  });

  it('should return empty array if no required skills section', () => {
    const parsed = { sections: {} };
    const skills = extractRequiredSkills(parsed);
    expect(skills).toEqual([]);
  });
});

describe('extractPreferredSkills', () => {
  it('should extract preferred skills list', () => {
    const parsed = {
      sections: {
        PREFERRED_SKILLS: {
          list: ['Python', 'AWS'],
        },
      },
    };

    const skills = extractPreferredSkills(parsed);
    expect(skills).toHaveLength(2);
    expect(skills).toContain('Python');
  });
});

describe('extractAboutCompany', () => {
  it('should extract about company list', () => {
    const parsed = {
      sections: {
        ABOUT_COMPANY: {
          list: ['Founded in 2010', 'Tech startup'],
        },
      },
    };

    const about = extractAboutCompany(parsed);
    expect(about).toHaveLength(2);
    expect(about[0]).toBe('Founded in 2010');
  });
});

describe('getTopLevelField', () => {
  it('should retrieve a top-level field value', () => {
    const parsed = {
      topLevelFields: {
        TITLE: 'Software Engineer',
        COMPANY: 'Acme Corp',
      },
    };

    expect(getTopLevelField(parsed, 'TITLE')).toBe('Software Engineer');
    expect(getTopLevelField(parsed, 'COMPANY')).toBe('Acme Corp');
  });

  it('should return null for non-existent fields', () => {
    const parsed = { topLevelFields: {} };
    expect(getTopLevelField(parsed, 'NONEXISTENT')).toBeNull();
  });
});
