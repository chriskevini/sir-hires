#!/bin/bash
# MarkdownDB Pattern Violation Detector
# Prevents commits that violate the MarkdownDB storage pattern
# Run automatically via git pre-commit hook

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "🔍 Checking for MarkdownDB pattern violations..."

# Get list of staged TypeScript files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$' || true)

if [ -z "$STAGED_FILES" ]; then
  echo "${GREEN}✓ No TypeScript files to check${NC}"
  exit 0
fi

VIOLATIONS_FOUND=0

# Pattern 1: Detect jobTitle or company in interface definitions
# Matches: jobTitle: string, company: string, etc. in interface Job
echo "  → Checking for flat parsed fields in interfaces..."
for FILE in $STAGED_FILES; do
  if grep -nE 'interface\s+Job\s*\{' "$FILE" > /dev/null 2>&1; then
    # Found Job interface, check for violations
    VIOLATIONS=$(grep -nE '^\s*(jobTitle|company|location|salary|jobType|remoteType|postedDate|deadline|rawDescription|aboutJob|aboutCompany|responsibilities|requirements|notes|narrativeStrategy|targetedResume)(\?)?:\s*(string|string\s*\|)' "$FILE" || true)
    
    if [ -n "$VIOLATIONS" ]; then
      echo "${RED}✗ VIOLATION in $FILE:${NC}"
      echo "$VIOLATIONS" | while read -r line; do
        echo "    ${YELLOW}Line: $line${NC}"
      done
      echo "    ${RED}Job interface should only have 'content' field, not flat parsed fields${NC}"
      VIOLATIONS_FOUND=$((VIOLATIONS_FOUND + 1))
    fi
  fi
done

# Pattern 2: Detect storage operations creating flat fields
# Matches: jobTitle: ..., company: ..., in storage update/set calls
echo "  → Checking for flat fields in storage operations..."
for FILE in $STAGED_FILES; do
  # Look for storage.update, storage.set, or .setValue with prohibited fields
  VIOLATIONS=$(grep -nE '(storage\.(update|set)|\.setValue)\s*\(\s*\{[^}]*(jobTitle|company|location|salary|jobType|remoteType|postedDate|deadline|rawDescription|aboutJob|aboutCompany|responsibilities|requirements|notes|narrativeStrategy|targetedResume)\s*:' "$FILE" || true)
  
  if [ -n "$VIOLATIONS" ]; then
    echo "${RED}✗ VIOLATION in $FILE:${NC}"
    echo "$VIOLATIONS" | while read -r line; do
      echo "    ${YELLOW}Line: $line${NC}"
    done
    echo "    ${RED}Storage operations should only update 'content' field, not flat parsed fields${NC}"
    VIOLATIONS_FOUND=$((VIOLATIONS_FOUND + 1))
  fi
done

# Pattern 3: Detect migration creating flat fields (background.ts specific)
echo "  → Checking for flat fields in migrations..."
if echo "$STAGED_FILES" | grep -q "background\.ts"; then
  for FILE in $STAGED_FILES; do
    if [[ "$FILE" == *"background.ts" ]]; then
      # Check if migration creates jobTitle or company
      VIOLATIONS=$(grep -nE '^\s*(jobTitle|company):\s*(job\.|[^,}]+)' "$FILE" || true)
      
      if [ -n "$VIOLATIONS" ]; then
        echo "${RED}✗ VIOLATION in $FILE:${NC}"
        echo "$VIOLATIONS" | while read -r line; do
          echo "    ${YELLOW}Line: $line${NC}"
        done
        echo "    ${RED}Migrations should not create flat parsed fields like jobTitle or company${NC}"
        VIOLATIONS_FOUND=$((VIOLATIONS_FOUND + 1))
      fi
    fi
  done
fi

# Pattern 4: Detect parseJobTemplate destructuring violations
# Matches: const { jobTitle, company } = parseJobTemplate(...)
echo "  → Checking for parseJobTemplate destructuring outside components..."
for FILE in $STAGED_FILES; do
  # Skip component files (they're allowed to destructure for rendering)
  if [[ "$FILE" == *"components/"* ]] || [[ "$FILE" == *"views/"* ]]; then
    continue
  fi
  
  # Check for destructuring in hooks/services/storage
  VIOLATIONS=$(grep -nE 'const\s*\{\s*(jobTitle|company)[^}]*\}\s*=\s*parseJobTemplate' "$FILE" || true)
  
  if [ -n "$VIOLATIONS" ]; then
    echo "${RED}✗ VIOLATION in $FILE:${NC}"
    echo "$VIOLATIONS" | while read -r line; do
      echo "    ${YELLOW}Line: $line${NC}"
    done
    echo "    ${RED}Avoid destructuring parseJobTemplate in services/hooks - pass full parsed object instead${NC}"
    VIOLATIONS_FOUND=$((VIOLATIONS_FOUND + 1))
  fi
done

# Report results
if [ $VIOLATIONS_FOUND -gt 0 ]; then
  echo ""
  echo "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo "${RED}❌ Found $VIOLATIONS_FOUND MarkdownDB pattern violation(s)${NC}"
  echo "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "ℹ️  ${YELLOW}MarkdownDB Pattern Rules:${NC}"
  echo "   1. Job interface should only have 'content' field (MarkdownDB template)"
  echo "   2. Never store flat fields like jobTitle, company in Job objects"
  echo "   3. Parse on-read using parseJobTemplate() in components"
  echo "   4. Only update 'content' field in storage operations"
  echo ""
  echo "📖 See: docs/refactors/markdown-db.md"
  echo ""
  exit 1
else
  echo "${GREEN}✓ No MarkdownDB pattern violations detected${NC}"
  exit 0
fi
