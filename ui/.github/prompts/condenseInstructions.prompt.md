---
mode: Beast Mode
---

# Condense Copilot Instructions

## Instructions for AI Agent

When invoked, optimize `copilot-instructions.md` for AI agent consumption by applying these transformations:

### 1. Read Current File

Read `.github/copilot-instructions.md` completely.

### 2. Apply Optimization Rules

**Remove:**

- Redundant explanations and verbose prose
- Duplicate information across sections
- Human-oriented context and backstory
- Excessive examples (keep 1-2 most critical)
- Filler words and transitional phrases
- Detailed reasoning (keep only actionable directives)

**Transform:**

- Long paragraphs → Terse bullet points
- Explanatory text → Imperative commands
- Verbose examples → Symbol-marked patterns (✅/❌)
- Scattered rules → Consolidated sections
- General guidance → Exact paths/commands

**Preserve:**

- ALL technical requirements and constraints
- Critical warnings (⚠️ markers)
- Mandatory directives
- File paths and structure
- Code patterns and examples
- API endpoints and configurations
- Checklists

### 3. Structure Optimization

**Use:**

- **Hierarchical lists** for related items
- **Tables** for comparative data
- **Code blocks** for patterns (not paragraphs)
- **Symbols** for quick parsing:
  - ⚠️ CRITICAL/MANDATORY
  - ✅ Correct pattern
  - ❌ Incorrect pattern
  - 🔧 Configuration
  - 📁 File/Path reference

**Format:**

```markdown
## Section
⚠️ CRITICAL: [constraint]
- Rule 1: [imperative action]
- Rule 2: [imperative action]

✅ Do: [pattern]
❌ Don't: [anti-pattern]

Files: `path/to/file.ts`
```

### 4. Condensing Guidelines

| Original | Condensed |
|----------|-----------|
| "You should always ensure that..." | "Always [action]" |
| "It is important to remember that..." | "[Imperative directive]" |
| "When working with X, make sure to..." | "X requires: [action]" |
| Long example with comments | Single ✅/❌ example |
| 3 paragraphs explaining | 5 bullet points |

### 5. AI-Optimized Output Format

**Target Structure:**

```markdown
# [Project Title]

[One-line project summary with key tech stack]

## [Section Name]
⚠️ CRITICAL: [Non-negotiable constraint]
- [Imperative rule 1]
- [Imperative rule 2]
- Files: `path/to/file`
- Hook/API: `functionName()`

✅ Correct: [code pattern]
❌ Wrong: [anti-pattern]

## [Next Section]
[Key requirement]: [Technology/approach]
- [Rule with exact path/command]
- [Configuration requirement]

Variables/Config: `--variable-{variant1,variant2}`, `API_ENDPOINT`

[Continue with terse, imperative sections...]
```

### 6. Quality Checks

Before saving, verify:

- [ ] All technical details preserved
- [ ] File paths intact
- [ ] Code examples functional
- [ ] Critical warnings marked (⚠️)
- [ ] No loss of actionable information
- [ ] 40-60% size reduction achieved
- [ ] Symbols used consistently
- [ ] Imperative language throughout
- [ ] Zero redundancy

### 7. Save and Report

1. Save to `.github/copilot-instructions.md`
2. Report:
   - Original size vs new size (lines/chars)
   - Sections condensed
   - Information preserved
   - Optimization applied

## Example Transformation

**Before (verbose):**

```markdown
## Feature X Implementation

It's very important that you always ensure Feature X is implemented correctly 
throughout the application. When working with Feature X, make sure to follow 
the established patterns. Feature X is crucial because it affects system 
performance and maintainability. You should use Library Y for this purpose, 
as it is the industry standard and provides good performance. Remember to 
configure it properly in the configuration files.
```

**After (condensed):**

```markdown
## Feature X
⚠️ Follow established patterns - impacts performance
- Use Library Y
- Files: `src/feature-x/`, `config/feature-x.config.ts`
- Config: Set `option.enabled = true` before use

✅ `import { featureX } from 'library-y';`
❌ `// Custom implementation - avoid`
```

## Usage

AI agent automatically applies this when user requests:

- "condenseInstructions"
- "optimize copilot-instructions"
- "condense the instructions"
