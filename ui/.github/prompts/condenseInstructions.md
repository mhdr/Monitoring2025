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

### 5. Section-Specific Rules

**i18n Section:**

- Keep: Translation file paths, key format, RTL rules
- Remove: Why i18n matters, benefits of bilingual support

**Theme System:**

- Keep: CSS variables list, file paths, adding new color steps
- Remove: Explanation of CSS custom properties, design philosophy

**Charts:**

- Keep: Library versions, import pattern, configuration requirements
- Remove: Why ECharts was chosen, benefits of charting

**Auth/API:**

- Keep: Endpoints, token flow steps, file paths, error codes
- Remove: OAuth background, security best practices explanation

**Guidelines:**

- Keep: Exact rules, file patterns, mandatory attributes
- Remove: "Why this matters" explanations

### 6. AI-Optimized Output Format

**Target Structure:**

```markdown
# Copilot Instructions: Monitoring2025 UI

React + TypeScript + Redux + Bootstrap | Bilingual (fa/en) | RTL Support

## i18n
⚠️ NEVER hardcode text - use i18next
- Primary: Persian (fa), Secondary: English (en)
- Keys: `public/locales/{fa,en}/translation.json`
- Format: `section.subsection.key`
- Hook: `src/hooks/useTranslation.ts`
- RTL: `bootstrap-rtl.css` for Persian

## Tech Stack
Framework: React 18 + TypeScript | State: RTK | UI: Bootstrap
Code Split: `React.lazy()` + `Suspense` + `<LoadingScreen />`
Types: `src/types/` | No `any` | Full typing required

## Theme System
⚠️ NEVER hardcode colors - use CSS variables from `src/styles/theme.css`

Files: `theme.css`, `themes.ts`, `themeUtils.ts`, `useTheme.ts`, `themeSlice.ts`

✅ `background: var(--primary-dark);`
❌ `background: #2c3e50;`

Variables: `--primary-{dark,medium,light}`, `--accent-{primary,hover,active}`, 
`--text-{primary,secondary}-{light,dark}`, `--shadow-{xs,sm,md,lg,xl,2xl}`, 
`--gradient-{primary,sidebar,navbar,button}`

[Continue with similar condensed sections...]
```

### 7. Quality Checks

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

### 8. Save and Report

1. Save to `.github/copilot-instructions.md`
2. Report:
   - Original size vs new size (lines/chars)
   - Sections condensed
   - Information preserved
   - Optimization applied

## Example Transformation

**Before (verbose):**

```markdown
It's very important that you always remember to use the i18next library 
for all user-facing text in the application. This is because the application 
needs to support both Persian and English languages. You should never hardcode 
any strings directly in your components as this would make it difficult to 
maintain translations and add new languages in the future.
```

**After (condensed):**

```markdown
⚠️ NEVER hardcode text - use i18next for ALL user-facing text
- Persian (fa) + English (en) required
- Hook: `useTranslation()` from `src/hooks/useTranslation.ts`
```

## Usage

AI agent automatically applies this when user requests:

- "condenseInstructions"
- "optimize copilot-instructions"
- "condense the instructions"
