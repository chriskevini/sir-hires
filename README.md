# sir-hires

> **Job search is painful. We make it delightful.**

An intelligent job search assistant that automates the tedious parts of finding your next role.

## Tech Stack
- **Backend**: n8n workflows for automation and orchestration
- **Frontend**: React + TypeScript + shadcn/ui
- **State Management**: TanStack Query + Zustand
- **Testing**: Vitest + Testing Library

## Features (Planned)
- Automated job matching based on your skills and preferences
- Smart application tracking
- Resume tailoring suggestions
- Interview preparation assistance

## Getting Started

See [workflows/README.md](workflows/README.md) for setup instructions.

---

## Development Insights

### Merge Node v3.2 Deduplication

**Discovery:** n8n's Merge node v3.2 has built-in deduplication via `keepNonMatches` mode.

**Configuration:**
```json
{
  "mode": "combine",
  "mergeByFields": {
    "values": [{"field1": "job_id", "field2": "job_id"}]
  },
  "joinMode": "keepNonMatches"
}
```

**How it works:**
- Input 1: New jobs from API (50 items)
- Input 2: Existing jobs from Google Sheet
- Output: Only jobs where `job_id` doesn't exist in Input 2
- **Built-in deduplication** - no custom JavaScript needed!

**Benefits:**
- Eliminates need for Aggregate node
- Eliminates need for custom Filter code
- Simpler, more maintainable architecture
- Native n8n functionality

---

### Salary Field: -1 Sentinel Value

**Problem:** Merge node v3.2 breaks when comparing fields with inconsistent types.

**Scenario:**
- Some jobs have `salary_min`/`salary_max` as numbers (e.g., `75000`)
- Some jobs have no salary data (`null` or missing)
- Merge node fails when comparing number vs null

**Solution:** Use `-1` as sentinel value for missing salaries.

```javascript
salary_min: job.salary_min || -1,
salary_max: job.salary_max || -1,
```

**Why -1:**
- Consistent type (always number)
- Easily identifiable as "no data" (salaries can't be negative)
- Works reliably with Merge node field comparison
- Simple to filter/handle in downstream processes

**Alternative considered:** Using `null` caused Merge node to fail with type mismatch errors.

---

### Architecture Evolution

**v0 (Over-engineered):**
```
API → Transform → Aggregate → Merge (append) → Filter (JS) → If → Append
                                  ↑
                           Read IDs (A:A)
```
- Required Aggregate to prevent 50x Read executions
- Required custom JavaScript for deduplication
- Required column A range restriction
- Complex, error-prone

**v0.1 (Current - Simplified):**
```
API → Transform → Merge (keepNonMatches) → If → Append
                     ↑
                Read Jobs
```
- Uses Merge v3.2's built-in deduplication
- No Aggregate needed
- No custom Filter code needed
- No range restriction needed
- **Simpler = more reliable**

---

### Key Takeaway

**Always check if n8n has native functionality before writing custom code.**

In this case, Merge node v3.2's `keepNonMatches` feature provided exactly what we needed - we just had to find it.
