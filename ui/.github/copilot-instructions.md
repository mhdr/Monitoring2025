# Monitoring2025 UI
React + TypeScript + Redux + Bootstrap, Bilingual (fa/en), RTL, .NET API

## i18n
⚠️ NEVER hardcode text
- Hook: `useTranslation` (`src/hooks/useTranslation.ts`)
- Files: `public/locales/{fa,en}/translation.json`
- Keys: Hierarchical (`common.buttons.save`)
- RTL: `bootstrap-rtl.css`

✅ `const { t } = useTranslation(); <button>{t('common.save')}</button>`
❌ `<button>Save</button>`

## Stack
- React + TypeScript (functional, hooks), Redux Toolkit
- Bootstrap (xs/sm/md/lg/xl/xxl)
- Lazy: `React.lazy()` + `<Suspense fallback={<LoadingScreen />}>`
- Types: `src/types/`, no `any`
- Styles: `src/styles/{bootstrap-ltr,bootstrap-rtl,theme}.css`

## AG Grid
⚠️ ENTERPRISE v34.2.0 - ALL modules must be registered
- Component: `AGGridWrapper` (`src/components/AGGridWrapper.tsx`)
- Hook: `useAGGrid` (`src/hooks/useAGGrid.ts`)
- Types: `src/types/agGrid.ts`
- Themes: alpine, balham, material, quartz (default)
- License: `DownloadDevTools_COM_NDEwMjM0NTgwMDAwMA==59158b5225400879a12a96634544f5b6`
- Locale: `AG_GRID_LOCALE_IR` (`@ag-grid-community/locale`)
- RTL: `enableRtl: true` for Persian

⚠️ CRITICAL: Register `LocaleModule`, `RowSelectionModule`, `ColumnApiModule` in `ModuleRegistry.registerModules()`

✅ `<AGGridWrapper columnDefs={cols} rowData={data} theme="quartz" />`
❌ `createGrid()` // vanilla JS

**Enterprise:** Row Grouping, Aggregation, Pivoting, Excel Export, Master-Detail, Advanced Filtering, Server-Side, Tool Panels, Clipboard

## Theme
⚠️ NEVER hardcode colors/gradients/shadows
- Files: `src/styles/theme.css`, `src/types/themes.ts`, `src/utils/themeUtils.ts`, `src/hooks/useTheme.ts`, `src/store/slices/themeSlice.ts`
- Presets: Default, Green, Purple, Orange, Red, Teal, Indigo
- Vars: `--primary-{dark,medium,light,lighter,darker}`, `--accent-{primary,hover,active}`, `--text-{primary,secondary}-{light,dark}`, `--success/warning/error/info`, `--bg-primary-{light,dark}`, `--border-{light,medium,dark}`, `--shadow-{xs,sm,md,lg,xl,2xl}`, `--gradient-{primary,sidebar,navbar,button,button-hover,button-disabled}`

✅ `background: var(--primary-dark); box-shadow: var(--shadow-md);`
❌ `background: #2c3e50;` // hardcoded

## Charts
- ECharts 5.6.0 + echarts-for-react 3.0.2
- Component: `ReactECharts`, Type: `EChartsOption`
- i18n: Translate all text (titles/axes/legends/tooltips)
- RTL: Direction, legend position, tooltip alignment

```typescript
import ReactECharts from 'echarts-for-react';
const { t } = useTranslation();
const option: EChartsOption = { title: { text: t('charts.title') }, xAxis: { type: 'category' }, series: [{ type: 'line' }] };
<ReactECharts option={option} data-id-ref="chart-name" style={{ height: '400px' }} />
```

## Responsive
- Bootstrap: xs/sm/md/lg/xl/xxl
- Test: 1920x1080, 1366x768, 768x1024, 375x667, 414x896

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

## gRPC / Connect-RPC
⚠️ MANDATORY: Use Connect-RPC for real-time streaming data
- **Stack**: Connect-ES + gRPC-web, Buf CLI, @bufbuild/protobuf v2.9.0
- **Client**: `src/services/grpcClient.ts` (gRPC-web transport)
- **Hooks**: `src/hooks/useMonitoringStream.ts` (streaming lifecycle)
- **Protobuf**: `Protos/monitoring.proto` → `src/gen/monitoring_pb.ts`
- **Backend**: .NET Core gRPC server, same HTTPS port (7136)

### Client Configuration
⚠️ Always use `createGrpcWebTransport` for browser clients
- Transport: `createGrpcWebTransport({ baseUrl: 'https://localhost:7136' })`
- Auth: JWT Bearer tokens via fetch interceptor
- Client: `createClient(MonitoringService, transport)`

✅ `const client = createClient(MonitoringService, transport);`
❌ `// Using vanilla gRPC or wrong transport`

### Server Streaming
⚠️ Use `for await...of` for async stream iteration
- Pattern: `for await (const update of client.streamMethod(request)) { }`
- Lifecycle: Connection, streaming, error handling, cleanup
- Hook: `useMonitoringStream(clientId, autoConnect)`
- Abort: `AbortController` for graceful disconnection

✅ `for await (const update of stream) { setData(update); }`
❌ `stream.on('data', ...)` // callback style

### Code Generation
⚠️ Use Buf CLI + protoc-gen-es for TypeScript generation
- **Buf Config**: `buf.yaml` (modules), `buf.gen.yaml` (generation)
- **Command**: `npm run grpc:generate` (buf generate)
- **Output**: `src/gen/` (TypeScript schemas + services)
- **Version**: protoc-gen-es v2.9.0, target=ts, import_extension=none

✅ `buf generate` → `src/gen/monitoring_pb.ts`
❌ `// Manual protoc commands or outdated generators`

### Message Handling
⚠️ Use schema-based creation with @bufbuild/protobuf v2
- **Create**: `create(MessageSchema, data)` (not new Message())
- **Types**: Generated TypeScript interfaces (strict typing)
- **Serialization**: `toBinary()`, `toJson()` standalone functions
- **Validation**: TypeScript compiler enforces message contracts

✅ `create(ActiveAlarmsRequestSchema, { clientId: 'web-client' })`
❌ `new ActiveAlarmsRequest({ clientId: 'web-client' })` // v1 pattern

### Error Handling
⚠️ Handle ConnectError and connection states
- **Types**: `ConnectError` from `@connectrpc/connect`
- **States**: IDLE, CONNECTING, CONNECTED, ERROR, DISCONNECTED
- **Retries**: Exponential backoff, manual reconnection
- **Cleanup**: Always abort streams on unmount

### Integration Patterns
- **Redux**: Store stream state in slices
- **React**: Custom hooks for stream lifecycle
- **Auth**: Automatic JWT refresh in transport
- **i18n**: Translate error messages and connection states
- **RTL**: Consider RTL layouts for streaming indicators

## Development
**i18n:** Both fa + en required, RTL tested

**Styling:** Bootstrap first, component `.css` files, theme vars only

**Code:** TypeScript, no `any`, ⚠️ DTOs mandatory

**Element IDs (MANDATORY):** `data-id-ref="component-element-purpose"` (kebab-case)
✅ `<button data-id-ref="login-form-submit-button">`

**Testing:** Responsive, RTL/LTR, auth states, both languages

**Ports:** Frontend 5173 (Vite), Backend 7136 (HTTPS)
⚠️ NEVER suggest alternate port - CORS restricted to 5173

**DevTools MCP:** `navigate_page`, `take_screenshot`, `take_snapshot`, `evaluate_script`, `list_console_messages`, `list_network_requests`, `resize_page`, `performance_{start,stop}_trace`

## Structure
```
src/
├── components/   # React components
├── contexts/     # Auth, Language
├── gen/          # Generated gRPC/Protobuf files
├── hooks/        # Custom hooks
├── i18n/         # i18n config
├── services/     # API (rtkApi.ts, grpcClient.ts)
├── store/        # Redux + slices
├── styles/       # Global styles
├── types/        # TypeScript types
└── utils/        # Helpers

public/locales/   # fa/, en/
Protos/           # Protocol buffer definitions
```

## Checklist
- [ ] TypeScript types (props, functions, API)
- [ ] DTOs for all API requests/responses
- [ ] Translation keys (fa + en), no hardcoded text
- [ ] RTL tested
- [ ] Bootstrap components, responsive tested
- [ ] Redux state, existing patterns
- [ ] HTTPS API + error handling
- [ ] Auth states tested
- [ ] Theme vars only, all themes verified
- [ ] Charts: i18n, responsive, RTL
- [ ] AG Grid: LocaleModule registered
- [ ] gRPC: Stream lifecycle, AbortController cleanup
- [ ] Protobuf: Schema-based creation, no v1 patterns