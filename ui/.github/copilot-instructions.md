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

## AG Grid
⚠️ ENTERPRISE version - use ALL enterprise features
- Packages: `ag-grid-react@34.2.0`, `ag-grid-enterprise@34.2.0`, `@ag-grid-community/locale`
- Component: `AGGridWrapper` from `src/components/AGGridWrapper.tsx`
- Hook: `useAGGrid` from `src/hooks/useAGGrid.ts`
- Types: `src/types/agGrid.ts` (re-exports official types)
- Themes: alpine, balham, material, quartz (default: quartz)
- License: `DownloadDevTools_COM_NDEwMjM0NTgwMDAwMA==59158b5225400879a12a96634544f5b6`

🔧 **Official React Integration**
- Uses `AgGridReact` component from `ag-grid-react`
- Module registration at startup via `ModuleRegistry.registerModules()`
- Persian locale: `AG_GRID_LOCALE_IR` from `@ag-grid-community/locale`
- RTL: Auto-enabled for Persian via `enableRtl` prop
- No lazy loading needed - modules registered once

✅ `import { AGGridWrapper, useAGGrid } from '../agGrid'; <AGGridWrapper columnDefs={cols} rowData={data} theme="quartz" />`
❌ `// Direct createGrid() or vanilla JS usage`

**Enterprise Features:**
- Row Grouping: `columnDef.rowGroup`, `groupDefaultExpanded`
- Aggregation: `aggFunc: 'sum'|'avg'|'min'|'max'|'count'`
- Pivoting: `pivot: true`, `pivotMode`
- Excel Export: `gridApi.exportDataAsExcel()`
- Master-Detail: `masterDetail: true`, `detailCellRenderer`
- Advanced Filtering: Set filters, number filters, text filters
- Server-Side: `rowModelType: 'serverSide'`
- Tool Panels: `sideBar: 'columns'|'filters'`
- Clipboard: Copy/paste with headers

## Theme
⚠️ NEVER hardcode colors/gradients/shadows - use CSS vars
- Files: `src/styles/theme.css`, `src/types/themes.ts`, `src/utils/themeUtils.ts`, `src/hooks/useTheme.ts`, `src/store/slices/themeSlice.ts`
- Presets: Default, Green, Purple, Orange, Red, Teal, Indigo
- Variables: `--primary-{dark,medium,light,lighter,darker}`, `--accent-{primary,hover,active}`, `--text-{primary,secondary}-{light,dark}`, `--success/warning/error/info`, `--bg-primary-{light,dark}`, `--border-{light,medium,dark}`, `--shadow-{xs,sm,md,lg,xl,2xl}`, `--gradient-{primary,sidebar,navbar,button,button-hover,button-disabled}`
- Add color: `theme.css` → `themes.ts` → `themeUtils.ts`

✅ `.btn { background: var(--primary-dark); box-shadow: var(--shadow-md); }`
❌ `.btn { background: #2c3e50; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }`

## Charts
- Library: ECharts 5.6.0 + echarts-for-react 3.0.2
- Component: `ReactECharts`, Type: `EChartsOption`
- i18n: Translate titles/axes/legends/tooltips
- RTL: Text direction, legend position, tooltip alignment
- Performance: Sampling, progressive rendering, lazy load

```typescript
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
const { t } = useTranslation();
const option: EChartsOption = { title: { text: t('charts.title') }, xAxis: { type: 'category', data: [...] }, series: [{ data: [...], type: 'line' }] };
<ReactECharts option={option} data-id-ref="chart-name" style={{ height: '400px' }} />
```

## Responsive
- Bootstrap grid: xs/sm/md/lg/xl/xxl
- Test viewports: 1920x1080, 1366x768, 768x1024, 375x667, 414x896

## API
⚠️ MANDATORY: Use DTO interfaces for ALL requests/responses
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
⚠️ Refresh Token Rotation (OAuth 2.0) - auto-handled by RTK Query
- Files: `src/services/rtkApi.ts`, `src/utils/authStorage.ts`, `src/contexts/AuthContext.tsx`
- Mutex: Prevents concurrent refresh (`async-mutex`)
- Storage: localStorage (persistent) or sessionStorage (session)
- Flow: Login → 401 → Auto-refresh → New tokens → Retry

⚠️ Never manually refresh - `baseQueryWithAuth` handles it

## Development
**i18n:** Both fa + en required, RTL for Persian, test both modes

**Styling:** Bootstrap first, component `.css` files, theme vars only

**Code:** TypeScript, no `any`, ⚠️ DTOs mandatory for API requests/responses

**Element IDs (MANDATORY):** `data-id-ref="component-element-purpose"` (kebab-case)
✅ `<button data-id-ref="login-form-submit-button">`

**Testing:** Responsive (desktop/mobile), RTL/LTR, auth states, both languages

**Ports:** Frontend 5173 (Vite), Backend 7136 (HTTPS)
⚠️ NEVER suggest alternate port - CORS restricted to 5173

**DevTools MCP:** UI/layout, performance, console, network, RTL, responsive
- Tools: `navigate_page`, `take_screenshot`, `take_snapshot`, `evaluate_script`, `list_console_messages`, `list_network_requests`, `resize_page`, `performance_{start,stop}_trace`

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