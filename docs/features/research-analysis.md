# Research & Analysis Feature Plan (v2.0)

## Overview
This document outlines the **v2.0 Two-Pass System** for job application document synthesis. This is a planned enhancement to the existing v1.0 Drafting view, designed to address cognitive overload issues with small/medium language models.

**Status:** 📋 **PLANNED** - Not yet implemented

---

## Problem Statement

The v1.0 single-pass synthesis system (see `DRAFTING_VIEW_PLAN.md`) overloads small/medium models (7B-14B parameters) with too many responsibilities:

1. **Analysis**: Understand job requirements and identify gaps
2. **Content Selection**: Choose relevant achievements from master resume
3. **Prioritization**: Rank content by relevance and impact
4. **Formatting**: Apply document-specific rules (verbatim bullets, page limits)
5. **Synthesis**: Generate cohesive, polished output

**Result:** Models struggle with constraint adherence, produce inconsistent output, or fail to follow complex rules.

---

## Solution: Two-Pass System

Split synthesis into two focused phases with different models and goals:

### Pass 1: Analysis (Researching View)
**Location:** Researching View (new "AI Insights" section)  
**Model:** Small analytical model (3B-7B, e.g., Qwen-2.5-3B-Instruct, Phi-3-mini)  
**Goal:** Help user identify gaps and prepare for drafting

**Tasks:**
1. **Gap Analysis**: Compare master resume to job requirements
   - Missing skills, experiences, or qualifications
   - Weak areas that need strengthening
   - Overqualified areas that can be de-emphasized

2. **Content Prioritization**: Rank master resume achievements by relevance
   - Top 10-15 most relevant bullet points for this job
   - Suggested order/grouping for maximum impact
   - Content to exclude (irrelevant or space-constrained)

3. **Strategy Recommendations**: Suggest narrative approach
   - Tone (technical, leadership, collaborative, innovative)
   - Focus areas (match job's top 3-5 requirements)
   - Red flags to address (career gaps, job hopping, overqualification)

**Output:**
- Stored in `job.aiInsights` (new field)
- Displayed as expandable section in Researching View
- User can review, edit, or regenerate
- Informs user's manual Narrative Strategy entry

**Benefits:**
- ✅ Small model can focus on pure analysis (no formatting constraints)
- ✅ User reviews insights before drafting (human-in-the-loop)
- ✅ Prepares user to write better Narrative Strategy
- ✅ No risk of model "creativity" ruining final document

---

### Pass 2: Synthesis (Drafting View)
**Location:** Drafting View (existing synthesis modal)  
**Model:** Medium synthesis model (7B-14B, e.g., Llama-3.1-8B, Mistral-7B)  
**Goal:** Generate formatted document with strict constraints

**Tasks:**
1. **Structure**: Apply document template format exactly
2. **Formatting**: Follow document-specific rules (verbatim bullets for resume, synthesis for cover letter)
3. **Line Count**: Respect page limits and section balance

**Simplified Inputs:**
- Master Resume (filtered by Pass 1 analysis)
- Job fields (title, company, requirements)
- Narrative Strategy (informed by Pass 1 insights)
- Current Draft (template with rules)

**Constraints:**
- NO analysis or prioritization (already done in Pass 1)
- NO creative interpretation (follow user's Narrative Strategy)
- ONLY structural and formatting tasks

**Benefits:**
- ✅ Reduced prompt complexity (no analysis instructions)
- ✅ Model focuses on formatting and rule-following
- ✅ Smaller context window (pre-selected content)
- ✅ Higher quality output (simpler task = better adherence)

---

## Implementation Plan

### Phase 1: Add AI Insights to Researching View

**Files to Modify:**
- `chrome-extension/job-details/views/researching-view.js` (add insights section)
- `chrome-extension/job-details/storage.js` (add `aiInsights` field)
- `chrome-extension/job-details/config.js` (add analysis prompt)
- `chrome-extension/job-details.html` (add insights CSS)

**New Schema:**
```javascript
{
  // Existing job fields...
  aiInsights: {
    gapAnalysis: string,        // Missing skills/experiences
    contentPriority: string[],  // Ranked bullet points from master resume
    strategyTips: string,       // Narrative approach suggestions
    generatedAt: string,        // ISO 8601 timestamp
    model: string               // Model used for analysis
  }
}
```

**UI Components:**
- Expandable "AI Insights" section (similar to checklist)
- "Generate Insights" button (calls analysis LLM)
- Editable text fields for each insight category
- "Refresh" button to regenerate

---

### Phase 2: Simplify Drafting View Synthesis

**Files to Modify:**
- `chrome-extension/job-details/config.js` (simplify synthesis prompt)
- `chrome-extension/job-details/components/synthesis-modal.js` (update context builder)

**Prompt Simplification:**
- Remove analysis instructions (already in Pass 1)
- Remove content selection logic (pre-filtered by user)
- Focus ONLY on structure, formatting, and rule adherence

**Example New Prompt:**
```
You are a document formatter specialized in applying strict formatting rules.

Your task:
1. Read the [CURRENT DRAFT] to understand the required structure and rules
2. Use ONLY the provided content from [MASTER RESUME]
3. Apply formatting rules exactly as specified
4. Output ONLY the final formatted document

CONSTRAINTS:
- NO analysis or prioritization (content is pre-selected)
- NO creative additions (use provided content only)
- STRICTLY follow formatting rules in [CURRENT DRAFT]
```

---

## Why Two-Pass?

### Cognitive Load Distribution
- **Pass 1 (Analysis)**: Pure reasoning, no formatting constraints → Small model excels
- **Pass 2 (Synthesis)**: Pure formatting, no reasoning → Medium model excels

### Human-in-the-Loop
- User reviews analysis before drafting
- User can edit AI insights or add their own
- User maintains control over final narrative

### Model Efficiency
- Small model (3B-7B) handles analysis faster and cheaper
- Medium model (7B-14B) focuses on single task with higher quality

### Incremental Improvement
- v1.0 remains functional for users who prefer single-pass
- v2.0 adds optional analysis step without breaking existing workflow

---

## Migration Path from v1.0

1. **No breaking changes** - v1.0 synthesis modal continues to work
2. **Opt-in enhancement** - Users can choose to use AI Insights or skip directly to synthesis
3. **Backward compatible** - Jobs without `aiInsights` field work normally
4. **Graceful degradation** - If analysis LLM unavailable, fall back to v1.0 workflow

---

## Future Considerations

### Advanced Analysis Features
- Compare multiple job postings to identify common themes
- Track which achievements work best across applications
- Suggest resume restructuring for career pivots

### Context Compression
- Use Pass 1 output to create compressed context for Pass 2
- Reduce token usage in Pass 2 by pre-filtering irrelevant content

### Multi-Model Orchestration
- Use different models for different document types
- Route tasks to best-suited model automatically

---

## References

- **Current Implementation**: See `DRAFTING_VIEW_PLAN.md` for v1.0 details
- **Completed Features**: Single-pass synthesis with XML streaming (19 commits, +4377 lines)
- **Next Steps**: Implement Phase 1 (AI Insights in Researching View)
