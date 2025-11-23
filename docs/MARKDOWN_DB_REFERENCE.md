# MarkdownDB Reference

## 🎯 Purpose

**MarkdownDB** is this project's custom data format for storing structured data as human-readable, LLM-friendly text strings. This reference guide covers syntax, storage patterns, parsing strategies, and anti-patterns.

---

## 📖 Philosophy: Why MarkdownDB?

The primary consumers of our data are **humans** and **LLMs** (Large Language Models). The app is a facilitator that should work harder to serve their needs.

### Key Benefits

- **Streamable** - Watch LLM responses stream in real-time (better UX than loading indicators)
- **Collaborative editing** - Make atomic changes to preserve KV cache and reduce latency
- **High accuracy** - Better structured output from LLMs compared to JSON
- **Low token count** - 10-50% token savings over JSON (reported by community)
- **Human-editable** - Users can edit raw templates directly without special UI
- **Fosters creativity** - Users and LLMs can customize structure as needed

### Further Reading

- [Improving Agents: Best Input Data Format for LLMs](https://www.improvingagents.com/blog/best-input-data-format-for-llms/)
- `docs/thoughts/markdown-db.md` - Original design philosophy

---

## 📝 Template Syntax

### Syntax Rules

1. **First line:** Data type wrapped in chevrons: `<TYPE>`
2. **Keys:** Always `ALL_CAPS` (no quotes needed)
3. **Values:** No quotes needed (plain text)
4. **Nesting:** Use `#` headers (markdown-style)
5. **Lists:**
   - List names end with `:` (e.g., `# SKILLS:`)
   - List items start with `-` (no commas needed)
6. **Comments:** Use `//` for inline comments or examples
7. **Required fields:** Mark with `// required` comment

---

## 📋 Job Template

**Purpose:** Store job posting data in a human/LLM-friendly format.

**Authoritative Source:** `src/utils/job-templates.ts` (SINGLE SOURCE OF TRUTH for schema and examples)

**Related Files:**

- `src/utils/job-parser.ts` (parser)
- `src/config.ts` (LLM prompts - imports examples from job-templates.ts)
- `src/entrypoints/job-details/config.ts` (LLM prompts - imports examples from job-templates.ts)

### Full Template Example

```
<JOB>
TITLE: Senior Cloud Infrastructure Engineer // required
COMPANY: Stellar Innovations Inc. // required
ADDRESS: San Francisco, CA
REMOTE_TYPE: HYBRID // [ONSITE|REMOTE|HYBRID]
SALARY_RANGE_MIN: 100,000
SALARY_RANGE_MAX: 150,000
EMPLOYMENT_TYPE: FULL-TIME // [FULL-TIME|PART-TIME|CONTRACT|INTERNSHIP|COOP]
EXPERIENCE_LEVEL: SENIOR // [ENTRY|MID|SENIOR|LEAD]
POSTED_DATE: 2025-11-15
CLOSING_DATE: 2025-12-31
# DESCRIPTION:
- Design, implement, and maintain scalable cloud infrastructure on AWS/Azure.
- Develop and manage CI/CD pipelines using GitLab or Jenkins.
- Provide subject matter expertise on security, reliability, and cost optimization.
# REQUIRED_SKILLS: // required
- 7+ years of experience in DevOps or SRE roles.
- Expert-level proficiency with Terraform and Kubernetes.
- Strong knowledge of Python or Go for scripting.
# PREFERRED_SKILLS:
- Experience with FinOps principles and tooling.
- AWS Certified DevOps Engineer - Professional.
- Background in the FinTech industry.
# ABOUT_COMPANY:
- Stellar Innovations is a high-growth Series C FinTech startup based in the Bay Area.
- **Culture:** We emphasize radical ownership, transparency, and continuous learning.
- **Team Structure:** Teams are cross-functional, highly autonomous, and empowered to make core product decisions.
- **Benefits:** We offer unlimited PTO, 1000% 401(k) matching and excellent health coverage.
- **Values:** We are committed to fostering diversity, equity, and inclusion in the workplace.
```

### Required Fields

- `TITLE` - Job title
- `COMPANY` - Company name
- `REQUIRED_SKILLS` - List of required qualifications

### Optional Fields

- `ADDRESS` - Job location
- `REMOTE_TYPE` - Onsite/Remote/Hybrid
- `SALARY_RANGE_MIN` / `SALARY_RANGE_MAX` - Compensation range
- `EMPLOYMENT_TYPE` - Full-time/Part-time/Contract/Internship/Co-op
- `EXPERIENCE_LEVEL` - Entry/Mid/Senior/Lead
- `POSTED_DATE` - When job was posted
- `CLOSING_DATE` - Application deadline
- `DESCRIPTION` - Job description bullets
- `PREFERRED_SKILLS` - Nice-to-have qualifications
- `ABOUT_COMPANY` - Company info, culture, benefits

---

## 👤 Profile Template

**Purpose:** Store user profile/resume data in a human/LLM-friendly format.

**File:** `src/utils/profile-parser.ts` (parser)

### Full Template Example

```
<PROFILE>
NAME: Place Holder // required
ADDRESS: 123 Main Street, Anytown, CA 45678
EMAIL: name@email.com
// ex: PHONE, WEBSITE, GITHUB

# EDUCATION
## EDU_1
DEGREE: Master of Science in Computer Science // required
SCHOOL: University of Helsinki // required
LOCATION: Helsinki, Finland
START: September 1988
END: March 1997
// ex: GPA

# EXPERIENCE
## EXP_1
TYPE: PROFESSIONAL // required [PROFESSIONAL|PROJECT|VOLUNTEER]
TITLE: Senior Developer // required
AT: Tech Solutions Inc.
START: October 2020
END: ONGOING
BULLETS:
- Built API...
- Led team...

## EXP_2
TYPE: PROJECT // required [PROFESSIONAL|PROJECT|VOLUNTEER]
TITLE: Linux Kernel // required
BULLETS:
- Architected kernel...
- Integrated Rust...

## EXP_3
TYPE: VOLUNTEER // required [PROFESSIONAL|PROJECT|VOLUNTEER]
TITLE: Community Volunteer // required
AT: Local Non-Profit
BULLETS:
- Supported educational...
- Helped organize...

# INTERESTS:
- Scuba diving
- Reading
// ex: # CERTIFICATIONS:
```

### Required Fields (Profile)

- `NAME` - User's full name

### Required Fields (Education Entry)

- `DEGREE` - Degree name
- `SCHOOL` - School name

### Required Fields (Experience Entry)

- `TYPE` - Professional/Project/Volunteer
- `TITLE` - Role title

### Optional Fields

- `ADDRESS`, `EMAIL`, `PHONE`, `WEBSITE`, `GITHUB` - Contact info
- `LOCATION` - Education location
- `START` / `END` - Date ranges (use "ONGOING" for current roles)
- `AT` - Company/organization name
- `BULLETS` - Bullet points for achievements
- `INTERESTS` - Personal interests
- `CERTIFICATIONS` - Professional certifications

---

## 💾 Storage Patterns

### ✅ CORRECT: Store Only Raw MarkdownDB

**Rule:** Store structured data as raw MarkdownDB templates in a `content` field. Parse on-read in components.

```typescript
// ✅ CORRECT - Store only content, no parsed fields
interface Job {
  id: string;
  content?: string; // Raw MarkdownDB template (source of truth)
  url: string;
  applicationStatus: string;
  // ... metadata only (non-parsed fields)
}

// ✅ CORRECT - Store only raw MarkdownDB
await storage.update({
  content: '<JOB>\nTITLE: Engineer\nCOMPANY: Acme Corp...',
});
```

### ❌ WRONG: Do Not Store Parsed Fields

**Anti-pattern:** Storing flat parsed fields alongside content creates sync issues.

```typescript
// ❌ WRONG - Do not add parsed fields like jobTitle, company
interface Job {
  id: string;
  content?: string;
  jobTitle: string; // ❌ Parse from content instead
  company: string; // ❌ Parse from content instead
}

// ❌ WRONG - Do not store parsed fields
await storage.update({
  jobTitle: 'Engineer',
  company: 'Acme',
});
```

### Why This Pattern?

- **Single source of truth** - No risk of `content` and flat fields getting out of sync
- **No sync issues** - Update content once, parsed data reflects immediately
- **LLM-streamable** - Stream MarkdownDB directly from LLM responses into storage
- **Human-editable** - Users can edit raw templates without breaking app state

---

## 🔍 Parsing Patterns

### Pattern 1: Parse in Components with useMemo (Recommended)

**When:** Single job/profile parsing in a component.

```typescript
import { useMemo } from 'react';
import { parseJobTemplate } from '@/utils/job-parser';

function JobView({ job }: { job: Job }) {
  // ✅ Parse once, memoize result
  const parsed = useMemo(
    () => parseJobTemplate(job.content || ''),
    [job.content]
  );

  return <h1>{parsed.jobTitle}</h1>;
}
```

**Why:** Prevents re-parsing on every render (performance optimization).

### Pattern 2: Use ParsedJobProvider for Multiple Components

**When:** Multiple components need access to parsed job data.

**File:** `src/components/features/ParsedJobProvider.tsx:71`

```typescript
import { ParsedJobProvider, useParsedJob } from '@/components/features/ParsedJobProvider';

// ✅ Wrap parent component
function JobDetailsApp() {
  const [jobs, setJobs] = useState<Job[]>([]);

  return (
    <ParsedJobProvider jobs={jobs}>
      <JobHeader />
      <JobDescription />
      <JobSkills />
    </ParsedJobProvider>
  );
}

// ✅ Child components access cached parsed data
function JobHeader() {
  const parsed = useParsedJob(jobId);
  return <h1>{parsed?.jobTitle}</h1>;
}
```

**Why:** Caches all parsed jobs in context, prevents duplicate parsing across components.

**See:** `docs/COMPONENTS_REFERENCE.md` - ParsedJobProvider section

### Pattern 3: Direct Parsing for One-Off Operations

**When:** Parsing once for validation, export, or transformation.

```typescript
import { parseJobTemplate } from '@/utils/job-parser';

// ✅ One-time parsing for validation
function validateAndSave(content: string) {
  const parsed = parseJobTemplate(content);
  const errors = validateJobTemplate(parsed);

  if (errors.length === 0) {
    await storage.saveJob({ content });
  }
}
```

**Why:** No need for memoization if parsing happens once.

### ❌ Anti-Pattern: Direct Parsing in Render

**Don't:** Call parser functions directly in component render without memoization.

```typescript
// ❌ BAD - Re-parses on every render
function JobView({ job }: { job: Job }) {
  const parsed = parseJobTemplate(job.content || ''); // 🔥 Performance issue
  return <h1>{parsed.jobTitle}</h1>;
}
```

**Why:** Parser runs on every render, even if `job.content` hasn't changed.

---

## 🚫 Anti-Patterns

### 1. Storing Flat Parsed Fields

```typescript
// ❌ DO NOT DO THIS
interface Job {
  content: string; // MarkdownDB source
  jobTitle: string; // ❌ Duplicate data
  company: string; // ❌ Sync issues
  requiredSkills: string[]; // ❌ Out of sync risk
}
```

**Problem:** Now you have two sources of truth. If user edits `content`, you must manually update flat fields. Easy to forget, causes bugs.

### 2. Parsing Without Memoization

```typescript
// ❌ DO NOT DO THIS
function JobView({ job }: { job: Job }) {
  const parsed = parseJobTemplate(job.content); // Re-parses every render
  return <div>{parsed.jobTitle}</div>;
}
```

**Problem:** Performance degradation. Parser runs on every render, even when `content` hasn't changed.

**Fix:** Wrap in `useMemo` or use `ParsedJobProvider`.

### 3. Storing Parsed Data in Storage

```typescript
// ❌ DO NOT DO THIS
const parsed = parseJobTemplate(content);
await storage.saveJob({
  content,
  jobTitle: parsed.jobTitle, // ❌ Redundant
  company: parsed.company, // ❌ Sync issues
});
```

**Problem:** Violates single source of truth. Content and flat fields can drift out of sync.

**Fix:** Store only `content`. Parse on-read in components.

### 4. Over-Engineering with Multiple Parsers

```typescript
// ❌ DO NOT DO THIS
const parsed1 = parseJobTemplate(job.content);
const parsed2 = parseJobTemplate(job.content); // Duplicate work
const parsed3 = parseJobTemplate(job.content); // Wasteful
```

**Problem:** Parsing the same content multiple times is wasteful.

**Fix:** Use `ParsedJobProvider` to cache parsed results, or pass parsed data as props.

---

## 🔗 Related Components & Hooks

### Components

- **[ParsedJobProvider](./COMPONENTS_REFERENCE.md#13-parsedjobprovider)** - Context provider for cached MarkdownDB parsing
- **[ValidationPanel](./COMPONENTS_REFERENCE.md#10-validationpanel)** - Displays MarkdownDB validation errors

### Hooks

- **[useParsedJob](./HOOKS_REFERENCE.md#useParsedjob)** - Access cached parsed job from context
- **[useJobValidation](./HOOKS_REFERENCE.md#usejobvalidation)** - Validate MarkdownDB job templates
- **[useProfileValidation](./HOOKS_REFERENCE.md#useprofilevalidation)** - Validate MarkdownDB profile templates

### Utilities

- `src/utils/job-parser.ts` - Parse job MarkdownDB templates
- `src/utils/profile-parser.ts` - Parse profile MarkdownDB templates
- `src/utils/job-templates.ts` - Generate default job templates
- `src/utils/job-validator.ts` - Validate job templates
- `src/utils/profile-validator.ts` - Validate profile templates

---

## 📚 Additional Resources

- **[AGENTS.md](../AGENTS.md#markdowndb-storage-pattern)** - MarkdownDB storage pattern overview
- **[HOOKS_REFERENCE.md](./HOOKS_REFERENCE.md)** - Parsing and validation hooks
- **[COMPONENTS_REFERENCE.md](./COMPONENTS_REFERENCE.md)** - ParsedJobProvider component
- **[docs/thoughts/markdown-db.md](./thoughts/markdown-db.md)** - Original design philosophy
- **[docs/refactors/markdown-db.md](./refactors/markdown-db.md)** - Implementation details
