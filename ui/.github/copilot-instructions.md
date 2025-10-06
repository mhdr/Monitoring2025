# Monitoring2025 UI

React + TypeScript + Redux + Bootstrap, Bilingual (fa/en), RTL, .NET API

## i18n
⚠️ NEVER hardcode text - use i18next
- Languages: Persian (fa) primary, English (en)
- Files: `public/locales/{fa,en}/translation.json`
- Keys: Hierarchical (`common.buttons.save`, `errors.validation.required`)
- Hook: `useTranslation` from `src/hooks/useTranslation.ts`
- RTL: `bootstrap-rtl.css` for Persian

✅ `const { t } = useTranslation(); <button>{t('common.save')}</button>`
❌ `<button>Save</button>`

## Tech Stack
- React + TypeScript (functional + hooks), Redux Toolkit
- Bootstrap (responsive grid: xs/sm/md/lg/xl/xxl)
- Lazy load: `React.lazy()` + `<Suspense fallback={<LoadingScreen />}>`
- Types: Define in `src/types/`, no `any`
- Styles: `src/styles/{bootstrap-ltr,bootstrap-rtl,theme}.css`

## Theme System
⚠️ NEVER hardcode colors/gradients/shadows - use CSS vars

Files:
- `src/styles/theme.css` - CSS custom properties
- `src/types/themes.ts` - Interfaces, presets (Default, Green, Purple, Orange, Red, Teal, Indigo)
- `src/utils/themeUtils.ts` - `applyTheme()`, `hexToRgb()`
- `src/hooks/useTheme.ts` - Hook
- `src/store/slices/themeSlice.ts` - State

✅ `.btn { background: var(--primary-dark); box-shadow: var(--shadow-md); }`
❌ `.btn { background: #2c3e50; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }`

Variables: `--primary-{dark,medium,light,lighter,darker}`, `--accent-{primary,hover,active}`, `--text-{primary,secondary}-{light,dark}`, `--success/warning/error/info`, `--bg-primary-{light,dark}`, `--border-{light,medium,dark}`, `--shadow-{xs,sm,md,lg,xl,2xl}`, `--gradient-{primary,sidebar,navbar,button,button-hover,button-disabled}`

Add color: `theme.css` → `themes.ts` → `themeUtils.ts`

## Charts
- Library: Apache ECharts 5.6.0 + echarts-for-react 3.0.2
- Component: `ReactECharts`
- Type: `EChartsOption`
- i18n: Translate titles/axes/legends/tooltips
- RTL: Configure text direction, legend position, tooltip alignment
- Responsive: Percentage dimensions, mobile adjustments
- Performance: Sampling, progressive rendering, lazy load

```typescript
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
const { t } = useTranslation();
const option: EChartsOption = {
  title: { text: t('charts.title') },
  xAxis: { type: 'category', data: [...] },
  series: [{ data: [...], type: 'line' }]
};
<ReactECharts option={option} data-id-ref="chart-name" style={{ height: '400px' }} />
```

## Responsive
- All components: desktop + tablet + mobile
- Bootstrap grid: xs/sm/md/lg/xl/xxl
- Test viewports: 1920x1080, 1366x768, 768x1024, 375x667, 414x896

## API
⚠️ MANDATORY: Use DTO classes for ALL requests/responses
- Server: .NET Core ASP.NET, HTTPS-only
- Base: `https://localhost:7136`
- Swagger: `https://localhost:7136/swagger/v1/swagger.json`
- Auth: JWT + refresh token rotation
- Test: `test` / `Password@12345`
- Client: `src/services/rtkApi.ts` (RTK Query)
- DTOs: Define in `src/types/api.ts`, match backend DTOs exactly

✅ `interface LoginRequestDto { username: string; password: string; }`
❌ `// Using plain objects without DTO types`

## Auth
⚠️ Refresh Token Rotation (OAuth 2.0)
- Auto-refresh: RTK Query interceptor handles expired tokens
- Rotation: Old refresh tokens invalidated on use
- Mutex: Prevents concurrent refresh (`async-mutex`)
- Storage: localStorage (persistent) or sessionStorage (session)

Files:
- `src/services/rtkApi.ts` - Interceptor + mutex
- `src/utils/authStorage.ts` - Storage
- `src/contexts/AuthContext.tsx` - State
- `REFRESH_TOKEN_ROTATION.md` - Docs

Flow: Login → 401 → Auto-refresh → New tokens → Retry → Seamless

⚠️ Never manually refresh in components - `baseQueryWithAuth` handles it

## Development
**i18n:**
- Both fa + en required
- RTL layout for Persian
- Test both modes

**Styling:**
- Bootstrap first
- Component `.css` files
- Theme vars only

**Code:**
- Follow structure, reuse components
- Full TypeScript, no `any`, no unused imports
- ⚠️ API: DTOs mandatory for requests/responses

**Element IDs (MANDATORY):**
- Every element: `data-id-ref="component-element-purpose"` (kebab-case)
- Purpose: AI/testing/debugging

✅ `<button data-id-ref="login-form-submit-button">`

**Testing:**
- Responsive: desktop + mobile
- Language: RTL/LTR
- Auth: authenticated + unauthenticated
- Errors: both languages

**Ports:**
- Frontend: 5173 (Vite), Backend: 7136 (HTTPS)
- ⚠️ Port 5173 in use → assume running, use `https://localhost:5173`
- ⚠️ NEVER suggest alternate port - CORS restricted to 5173

**DevTools MCP (debugging):**
- Auto-launches Chrome
- Use for: UI/layout, performance, console, network, RTL, responsive
- Tools: `navigate_page`, `take_screenshot`, `take_snapshot`, `evaluate_script`, `list_console_messages`, `list_network_requests`, `resize_page`, `performance_{start,stop}_trace`
- Workflow: Navigate → Interact → Inspect → Capture → Verify

## Structure
```
src/
├── components/   # React components
├── contexts/     # Auth, Language
├── hooks/        # Custom hooks
├── i18n/         # i18n config
├── services/     # API (rtkApi.ts)
├── store/        # Redux + slices
├── styles/       # Global styles
├── types/        # TypeScript types
└── utils/        # Helpers

public/locales/   # fa/, en/
```

## Checklist
- [ ] TypeScript types (props, functions, API)
- [ ] DTOs for all API requests/responses
- [ ] Translation keys (fa + en), no hardcoded text
- [ ] RTL tested (DevTools MCP)
- [ ] Bootstrap components, responsive tested (DevTools MCP)
- [ ] Redux state, existing patterns
- [ ] HTTPS API + error handling (DevTools MCP)
- [ ] Auth states tested
- [ ] Theme vars only, all themes verified
- [ ] Charts: i18n, responsive, RTL
- [ ] DevTools MCP: UI, console, performance