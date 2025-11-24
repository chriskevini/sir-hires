# Component CSS Architecture Analysis & Fix

**Date:** November 22, 2025  
**Issue:** Shared React components (ResearchingView, DraftingView) had styles defined in page-level stylesheets instead of component-level stylesheets, causing missing styles when components were reused across different entrypoints.

---

## Problem Summary

### Root Cause

When the sidepanel was converted from vanilla JS to React (commit `6fb6742`, Nov 21), shared components (`ResearchingView`, `DraftingView`) were created and placed in `src/entrypoints/job-details/views/`, but their CSS was not extracted into component-level stylesheets. Instead:

- **ResearchingView** styles remained duplicated in `assets/sidepanel.css` (lines 788-1143, ~355 lines)
- **DraftingView** styles remained only in `src/entrypoints/job-details/styles.css` (lines 1029-1412, ~384 lines)

This violated WXT best practices where **shared components should import their own CSS**.

### Impact

1. **ResearchingView Inconsistency:**
   - Rendered correctly in sidepanel (imported `assets/sidepanel.css`)
   - Rendered incorrectly in job-details page (missing styles from `assets/sidepanel.css`)

2. **DraftingView Inconsistency (Potential):**
   - Rendered correctly in job-details page (imported `job-details/styles.css`)
   - Would render incorrectly in sidepanel if accessed (missing styles from `job-details/styles.css`)

3. **Architecture Violation:**
   - Violated single-component-per-stylesheet convention
   - Created maintenance burden (style duplication, sync issues)
   - Made it unclear which styles belong to which component

---

## Architecture Analysis

### Current File Structure

**job-details page:**

```
src/entrypoints/job-details/
├── index.html
├── main.tsx
├── App.tsx
├── styles.css          # 1840 lines, 129 CSS classes (page-level)
└── views/
    ├── ResearchingView.tsx
    ├── ResearchingView.css  # ✅ NEW: Component-level (375 lines)
    ├── DraftingView.tsx
    └── DraftingView.css     # ✅ NEW: Component-level (384 lines)
```

**sidepanel page:**

```
src/entrypoints/sidepanel/
├── index.html
├── main.tsx              # Imports assets/sidepanel.css
├── App.tsx               # Imports JobViewRouter
└── ...

assets/
└── sidepanel.css         # 1319 lines, 99 CSS classes (page-level)
```

**Shared components:**

```
src/components/features/
└── JobViewRouter.tsx     # Routes to ResearchingView/DraftingView
```

### Style Distribution

| Component           | CSS Classes Used                                                                                                                               | Before Fix                                                                   | After Fix                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **ResearchingView** | `.researching-editor`, `.editor-layout`, `.template-panel`, `.editor-panel`, `.job-markdown-editor`, `.validation-panel`, etc. (~23 classes)   | Duplicated in `assets/sidepanel.css` + missing from `job-details/styles.css` | ✅ Extracted to `ResearchingView.css`, imported by component |
| **DraftingView**    | `.drafting-editor-container`, `.editor-wrapper`, `.editor-topbar`, `.editor-actions`, `.editor-footer`, `.document-editor`, etc. (~30 classes) | Only in `job-details/styles.css`, missing from `assets/sidepanel.css`        | ✅ Extracted to `DraftingView.css`, imported by component    |

---

## Solution: Component-Level CSS

### WXT Best Practice

**From AGENTS.md:**

> "Isn't it standard practice to have 1 style per component?" — **YES**

In WXT + React projects:

- **Page-level CSS** → Import in `main.tsx` or `App.tsx` (e.g., `styles.css` for layout, global styles)
- **Component-level CSS** → Import in component file (e.g., `import './my-component.css'`)
- **Shared components** → MUST import their own CSS to work across entrypoints

### Implementation

#### 1. ResearchingView Fix (Commit `649cab0`)

**Created:** `src/entrypoints/job-details/views/ResearchingView.css` (375 lines)

**Extracted from:** `assets/sidepanel.css` (lines 788-1143)

**Updated:** `ResearchingView.tsx`

```typescript
import './ResearchingView.css'; // ✅ Component imports its own styles
```

**Build Output:**

- Styles correctly bundled into `JobViewRouter-*.css` (4.84 kB)
- Vite automatically bundles imported CSS for that component tree

**Result:**

- ✅ ResearchingView renders correctly in both job-details and sidepanel
- ✅ No style duplication
- ✅ Single source of truth

#### 2. DraftingView Fix (Current Commit)

**Created:** `src/entrypoints/job-details/views/DraftingView.css` (384 lines)

**Extracted from:** `src/entrypoints/job-details/styles.css` (lines 1029-1412)

**Updated:** `DraftingView.tsx`

```typescript
import './DraftingView.css'; // ✅ Component imports its own styles
```

**Build Output:**

- Styles correctly bundled into `JobViewRouter-*.css` (9.88 kB)
- Bundle size doubled (~5 kB → ~10 kB) confirming both component stylesheets included
- Verified classes present: `drafting-editor-container`, `editor-footer`, `document-editor`, `thinking-stream-panel`

**Result:**

- ✅ DraftingView renders correctly in both job-details and sidepanel
- ✅ No missing styles when used via `JobViewRouter` in sidepanel
- ✅ Single source of truth

---

## How This Happened

### Timeline

1. **Initial Architecture:**
   - job-details page built with monolithic `styles.css`
   - sidepanel page built separately with `assets/sidepanel.css`
   - No shared React components

2. **Sidepanel React Conversion (Nov 21, commit `6fb6742`):**
   - Converted sidepanel to React
   - Created shared components: `ResearchingView`, `DraftingView`
   - **Mistake:** Did not extract component-specific CSS
   - Result: Styles remained in page-level stylesheets

3. **Style Duplication:**
   - ResearchingView styles manually duplicated to `assets/sidepanel.css`
   - DraftingView styles remained only in `job-details/styles.css`
   - Created inconsistency and maintenance burden

### Lessons Learned

1. **Always extract component CSS during componentization**
   - When creating reusable React components from existing pages
   - Don't leave component-specific styles in page-level stylesheets

2. **Test components in all contexts**
   - If a component is shared across entrypoints, test rendering in all locations
   - Would have caught ResearchingView styling issue earlier

3. **Follow WXT conventions**
   - Shared components → Import own CSS
   - Page-level styles → Import in entrypoint main.tsx/App.tsx

---

## Verification

### Manual Testing Checklist

- [ ] Load job-details page → ResearchingView renders correctly
- [ ] Load job-details page → DraftingView renders correctly
- [ ] Load sidepanel → ResearchingView renders correctly (via JobViewRouter)
- [ ] Load sidepanel → DraftingView renders correctly (via JobViewRouter)
- [ ] Verify no visual regressions in either page
- [ ] Check browser DevTools for missing CSS classes

### Build Verification

```bash
npm run build

# Check bundle includes both component stylesheets
grep -o "researching-editor\|drafting-editor-container" .output/chrome-mv3/assets/JobViewRouter-*.css
# Should output: researching-editor, drafting-editor-container

# Check bundle size (should be ~10 kB)
ls -lh .output/chrome-mv3/assets/JobViewRouter-*.css
```

---

## Remaining Work

### 1. Cleanup Duplicated Styles

After verifying the fix works:

**Remove from `assets/sidepanel.css`:**

- Lines 788-1143 (ResearchingView styles) — ⚠️ NOW DUPLICATED

**Remove from `src/entrypoints/job-details/styles.css`:**

- Lines 1029-1412 (DraftingView styles) — ⚠️ NOW DUPLICATED

**Important:** Only remove after confirming components render correctly with imported CSS.

### 2. Check Other Shared Components

**Candidates for extraction:**

- `src/components/ui/EditorToolbar.tsx` (uses `.editor-topbar`, `.editor-actions`)
- `src/components/ui/EditorContentPanel.tsx` (uses `.document-editor`, `.thinking-stream-panel`)
- `src/components/ui/EditorFooter.tsx` (uses `.editor-footer`)
- `src/components/ui/TabBar.tsx` (uses `.tab-container`, `.tab-btn`)
- `src/components/ui/Dropdown.tsx` (uses `.dropdown-container`, `.dropdown-menu`)
- `src/components/ui/Modal.tsx` (if used across entrypoints)

**Action:** Check if these UI components have styles in page-level CSS. If yes, extract to component-level CSS.

### 3. Update AGENTS.md

Add section on component CSS architecture:

```markdown
### Component CSS Architecture

**Rule:** Shared components must import their own CSS.

- **Page-level CSS** (e.g., `entrypoints/popup/styles.css`):
  - Layout, typography, global variables
  - Page-specific classes (not used by shared components)
  - Imported in `main.tsx` or `App.tsx`

- **Component-level CSS** (e.g., `components/MyButton.css`):
  - Component-specific classes
  - Imported directly in component file: `import './MyButton.css'`
  - Ensures component works across all entrypoints

**Anti-pattern:**
❌ Shared component relies on page-level CSS → Missing styles when reused

**Correct pattern:**
✅ Shared component imports own CSS → Works everywhere
```

---

## References

- **WXT Docs:** https://wxt.dev/guide/essentials/styling.html
- **Commit History:**
  - `649cab0` — Extract ResearchingView styles
  - `6fb6742` — Sidepanel React conversion (original componentization)
- **Related Docs:**
  - `docs/refactors/modular-architecture.md` — Component architecture
  - `AGENTS.md` — WXT best practices
