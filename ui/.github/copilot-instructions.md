# Monitoring2025 UI - Copilot Instructions
**Enterprise React 18 + TypeScript 5 + Axios + Material-UI v6 + SignalR**  
**Bilingual (fa/en) • RTL/LTR • Real-time Monitoring • .NET Core API**

## 📋 Quick Reference

### Decision Trees
- **State**: Local → useState | Shared → Zustand store | Real-time → SignalR + Zustand
- **Styling**: MUI sx prop → theme values | Variants → styled() | RTL → logical properties
- **Data**: REST → Axios | Real-time → SignalR | Storage → Zustand + localStorage
- **Components**: Functional + hooks | Error handling → LazyErrorBoundary | Performance → useMemo/useCallback
- **Testing**: Chrome DevTools MCP (mandatory for ALL testing/debugging)

### Must-Follow Rules

| Rule | Why |
|------|-----|
| **NEVER commit to git** | Manual control only |
| Use `formatDate()` for dates | Consistent formatting |
| Use `t()` for all text | i18n support |
| Use logger, not console | Prod cleanup |
| Use Chrome DevTools MCP | Testing/debugging |
| Use theme palette | Theme consistency |
| No `any` type | Type safety |
| Add `data-id-ref` | Testing/debugging |
| Use MUI components | Design system |
| Zustand + localStorage | State management |
| Test both languages | i18n verification |
| Test all breakpoints | Responsive design |

### Common Pitfalls

| ❌ Don't | ✅ Do |
|---------|-------|
| Git commits | Never use git commands |
| `console.log()` | `logger.log()` |
| `toLocaleString()` | `formatDate(date, lang, 'short')` |
| Hardcoded colors | `theme.palette.primary.main` |
| `marginLeft: 16` | `marginInlineStart: 2` |
| `<div onClick>` | `<Button onClick>` |
| React Context | Zustand stores |
| `any` type | `unknown` + type guard |
| Hardcoded text | `t('key')` |
| Class components | Functional + hooks |



## 🎯 Project Overview
Enterprise monitoring dashboard with real-time SignalR streaming, bilingual support (Persian/English), RTL/LTR layouts, AG Grid Enterprise, JWT auth with refresh token rotation, MUI theming (light/dark), ECharts with i18n, and Zustand state management with localStorage persistence.

## 🌍 Internationalization (i18n)

### Rules
- **NEVER hardcode user-facing text** - use `useTranslation()` hook and `t()` function
- **ALWAYS test both languages** (Persian and English)
- **ALWAYS verify RTL layout** for Persian
- **Translation Files**: `public/locales/{fa,en}/translation.json`
- **Key Structure**: Hierarchical (e.g., `pages.dashboard.title`, `common.buttons.save`)
- **RTL Support**: MUI auto-handles when `direction: 'rtl'` in theme
- **Font**: IRANSansX for Persian

### RTL Best Practices
- Use `start`/`end` instead of `left`/`right` for text alignment
- Use logical properties: `marginInlineStart` vs `marginLeft`
- MUI components have built-in RTL support
- Some icons need mirroring (arrows, chevrons)

## 🛠️ Technology Stack

### Core
- **React 18**: Functional components, hooks only
- **TypeScript 5**: Strict mode, no `any` type
- **Zustand 5**: State management with localStorage persistence
- **Axios**: HTTP client with interceptors
- **SignalR**: Real-time alarms streaming
- **Material-UI v6**: Component library, responsive grid (xs/sm/md/lg/xl)
- **Vite**: Build tool (port 5173)

### Code Standards
- **TypeScript strict mode** - fully typed code
- **NO `any` type** - use `unknown` with type guards
- **NO class components** - functional + hooks only
- **MUI sx prop or styled()** - avoid inline styles
- **MUI theme colors** - access via `theme.palette.*`
- **Element IDs** - ALL AI-created elements need `data-id-ref`
- **Logger utility** - NEVER use `console.*` directly
- **Date formatting** - ALWAYS use `formatDate()` from `utils/dateFormatting.ts`

### Date Formatting (MANDATORY)
⚠️ **CRITICAL: Use centralized date formatting functions**
- **File**: `src/utils/dateFormatting.ts`
- **Main Function**: `formatDate(date, language, format)` 
  - `date`: Date object, ISO string, or Unix timestamp (seconds/milliseconds)
  - `language`: `'fa'` | `'en'`
  - `format`: `'long'` | `'short'`
- **Persian Long**: دوشنبه، ۵ آبان ۱۴۰۴، ساعت ۱۳:۰۳:۴۶
- **Persian Short**: ۱۴۰۴/۸/۵، ۱۳:۰۳:۴۶
- **❌ DON'T**: Use `toLocaleString()`, `toLocaleDateString()`, or `toLocaleTimeString()` directly
- **✅ DO**: `formatDate(timestamp, language, 'short')` everywhere

### Logging (Development-Only)
**CRITICAL: Always use logger, never console.***
- **Zero production cost** - all logger calls stripped from builds
- **Log extensively** - no performance penalty
- **Implementation**: `src/utils/logger.ts`
- **Usage**: `const logger = createLogger('ComponentName');`
- **Methods**: `log`, `info`, `warn`, `error`, `debug`, `table`, `group`, `time`

### File Organization
- `src/components/` - React components
- `src/types/` - TypeScript interfaces
- `src/hooks/` - Custom hooks (useAuth, useMonitoring, useLanguage, etc.)
- `src/utils/` - Helpers
- `src/services/` - API clients (Axios, SignalR)
- `src/stores/` - Zustand stores (authStore, monitoringStore, languageStore, themeStore, etc.)

### Naming
- **Components**: PascalCase
- **Hooks**: camelCase with `use` prefix
- **Types**: PascalCase
- **Constants**: UPPER_SNAKE_CASE
- **CSS Classes**: kebab-case

## AG Grid
⚠️ ENTERPRISE v34.2.0 - ALL modules registered
- Component: `AGGridWrapper` (`src/components/AGGridWrapper.tsx`)
- Hook: `useAGGrid` (`src/hooks/useAGGrid.ts`)
- Themes: alpine, balham, material, quartz (default)
- License: `DownloadDevTools_COM_NDEwMjM0NTgwMDAwMA==59158b5225400879a12a96634544f5b6`
- Locale: `AG_GRID_LOCALE_IR` with `enableRtl: true` for Persian
- **CRITICAL**: Register `LocaleModule`, `RowSelectionModule`, `ColumnApiModule`

### AG Grid Styling Standards (MANDATORY)
⚠️ **All styling centralized in `src/components/AGGridWrapper.css`** - DO NOT create grid-specific CSS files

**Header Requirements** (56px height):
- Padding: `0.75rem 1rem` | Font: `600` weight, `1.4` line-height
- Always enable: `wrapHeaderText: true`, `autoHeaderHeight: true`
- Config: `suppressColumnVirtualisation: true` to prevent clipping

**Column Widths** (❌ NO fixed pixels, ✅ USE flex + minWidth):
```typescript
// Short: { flex: 0.8, minWidth: 140 } | Very short: { flex: 0.6, minWidth: 110 }
// Standard: { flex: 1, minWidth: 180 } | Actions: { flex: 0.8, minWidth: 150 }
```

**Testing Checklist**:
- ✅ 56px header height | ✅ Text visible without expansion | ✅ Both languages (RTL/LTR)
- ✅ Both themes (light/dark) | ✅ Mobile breakpoints (52px rows, 48px headers)

## 🎨 Theme System (Material-UI)

⚠️ **CRITICAL: NEVER hardcode colors - ALWAYS use MUI theme palette**

### Files
- **Theme Provider**: `src/contexts/MuiThemeProvider.tsx`
- **Theme Hook**: `src/hooks/useMuiTheme.ts`
- **Theme Switcher**: `src/components/MuiThemeSwitcher.tsx`

### MUI Theme Palette (MANDATORY)
**Colors**: `theme.palette.{primary|secondary|error|warning|info|success}.{main|light|dark|contrastText}`
**Background**: `theme.palette.background.{default|paper}`
**Text**: `theme.palette.text.{primary|secondary|disabled}`
**Dividers**: `theme.palette.divider`

### MUI Components (Use These First)
**Layout**: Box, Container, Grid, Stack, Paper
**Buttons**: Button, IconButton, Fab, ButtonGroup
**Inputs**: TextField, Select, Checkbox, Radio, Switch
**Data**: Typography, Card, Chip, Avatar, Badge, Table, List
**Feedback**: Alert, Snackbar, Dialog, Backdrop, CircularProgress
**Navigation**: AppBar, Drawer, Tabs, Menu, Breadcrumbs

### MUI Icons (MANDATORY: Use for ALL icons)
⚠️ **CRITICAL: Always use @mui/icons-material package**

**Package**: `@mui/icons-material`
**Variants**: Filled (default), Outlined, Rounded, TwoTone, Sharp

**Common Icons**: Menu, Home, Dashboard, Settings, Search, Person, Lock, CheckCircle, Error, Warning, Info, Edit, Delete, Save, Download, Upload, ArrowBack, Close, ExpandMore, Visibility

**Usage**: 
- Color: `color="primary"`, `color="error"`, `color="inherit"`
- Size: `fontSize="small"`, `fontSize="medium"`, `fontSize="large"`, or `sx={{ fontSize: 40 }}`
- RTL: `sx={{ transform: isRTL ? 'scaleX(-1)' : 'none' }}` for directional icons
- Accessibility: Include `aria-label` for standalone icons

**Search**: https://mui.com/material-ui/material-icons/

### Critical Rules
1. **NEVER hardcode colors** - always use theme palette values
2. **Use `sx` prop** - for component-level styling with theme access
3. **Always test both modes** - switch between light/dark themes to verify
4. **Use MUI components** - leverage built-in components before creating custom ones

## 📊 Charts (ECharts)

### Setup
- **Library**: ECharts 5.6.0 + echarts-for-react 3.0.2
- **Component**: `ReactECharts`
- **Type**: `EChartsOption`

### Critical Rules
⚠️ **MANDATORY: Internationalize all chart text** - titles, axes, legends, tooltips
⚠️ **MANDATORY: RTL support** - adjust direction, legend position, tooltip alignment
⚠️ **MANDATORY: Responsive sizing** - charts must adapt to container size
- Use `useTranslation()` and `useLanguage()` hooks
- Use `useMemo` for chart options to prevent recalculations
- Use MUI theme colors via `useTheme()` hook
- Include `data-id-ref` on chart components

## 📱 Responsive Design

### MUI Breakpoints
⚠️ **MANDATORY: Test all breakpoints** before considering work complete

| Breakpoint | Min Width | Device Type | Grid Prop |
|------------|-----------|-------------|-----------|
| xs | 0px | Small phones | `xs` |
| sm | 600px | Phones | `sm` |
| md | 900px | Tablets | `md` |
| lg | 1200px | Desktops | `lg` |
| xl | 1536px | Large desktops | `xl` |

### Test Resolutions
Must test on these standard resolutions:
- **1920x1080** - Full HD desktop
- **1366x768** - Laptop
- **768x1024** - Tablet portrait
- **375x667** - iPhone SE
- **414x896** - iPhone XR/11

### Key Patterns
- Use MUI Grid system with responsive props
- Use `sx` prop with breakpoints for responsive styling
- Use MUI `Typography` with responsive variants
- Use `useMediaQuery` hook for programmatic breakpoint detection
- Always include `data-id-ref` attributes on all elements

### Testing Checklist
- [ ] Layout doesn't break at any breakpoint
- [ ] Text remains readable on all devices
- [ ] Touch targets are at least 44x44px on mobile
- [ ] Images scale appropriately
- [ ] Navigation is accessible on mobile
- [ ] No horizontal scrolling
- [ ] Charts and tables are scrollable on mobile

## API
⚠️ MANDATORY: Use DTO interfaces for ALL requests/responses
- Server: .NET Core ASP.NET, HTTP-only
- Base: `http://localhost:5030`
- Swagger: `http://localhost:5030/swagger/v1/swagger.json`
- Auth: JWT + refresh token rotation
- Test: `test` / `Password@12345`
- Client: `src/services/apiClient.ts` (Axios)
- DTOs: Define in `src/types/api.ts`, match backend DTOs exactly

⚠️ **CRITICAL: All API and SignalR DTOs are documented in Swagger JSON**
- **Swagger URL**: `http://localhost:5030/swagger/v1/swagger.json`
- **DTO Location**: `components.schemas` section in Swagger JSON
- **SignalR Hub Info**: GET `/api/Monitoring/SignalRHubInfo` endpoint provides complete SignalR documentation
- **SignalR DTOs**: Look for `SignalRHubInfoResponseDto`, `SignalRHubData`, `SignalRMethodInfo`, `SignalRParameterInfo`, `SignalRConnectionExamples`
- **Always verify DTOs**: Check Swagger before implementing to ensure exact match with backend

## Auth
⚠️ Refresh Token Rotation (OAuth 2.0) - auto-handled by Axios interceptors
- Files: `src/services/apiClient.ts`, `src/utils/authStorage.ts`, `src/contexts/AuthContext.tsx`
- Mutex: Prevents concurrent refresh (`async-mutex`)
- Storage: IndexedDB with 7-day rolling expiration
- Flow: Login → 401 → Auto-refresh → New tokens → Retry

⚠️ Never manually refresh - Axios interceptors handle it automatically

## Data Synchronization (CRITICAL)
⚠️ **PRINCIPLE: If user is authenticated, data MUST be in Zustand stores (persisted to localStorage)**

### Sync Strategy
- **Login**: Auto-redirect to `/dashboard/sync?force=true` → syncs once → data persists in Zustand + localStorage until logout
- **Page Refresh/New Tab**: NO sync checks → assumes data in Zustand stores (auto-loaded from localStorage)
- **Force Sync (navbar)**: User-triggered → bypasses cache, refreshes from API, updates Zustand stores
- **Logout**: Clears ALL Zustand store data (automatically clears localStorage)

### Three-Phase Sync Process
```
Phase 1: Groups (parallel)  → GET /api/Groups → setGroups()
Phase 2: Items (parallel)   → GET /api/Items  → setItems()
Phase 3: Alarms (sequential) → GET /api/Alarms (requires itemIds from Phase 2) → setAlarms()
```

### Critical Components
- **`ProtectedRoute`**: Only checks authentication, NO sync checks (assumes data exists in Zustand)
- **`LoginPage`**: Redirects to sync after successful login
- **`useDataSync`**: Orchestrates 3-phase sync with progress tracking
- **`useMonitoringStore`**: Zustand store for groups, items, alarms with localStorage persistence
- **Zustand persist middleware**: Automatic localStorage synchronization

### Key Files
- `src/components/ProtectedRoute.tsx` - Auth guard only, no sync checks
- `src/components/LoginPage.tsx` - Redirects to sync after login
- `src/hooks/useDataSync.ts` - Sync orchestration
- `src/stores/monitoringStore.ts` - Zustand store with persist middleware
- `src/hooks/useMonitoring.ts` - Hook to access monitoring store
- `src/components/SyncPage.tsx` - Sync UI with progress

## SignalR Real-Time Communication
⚠️ MANDATORY: Use SignalR for real-time streaming data
- **Backend Hub**: `MonitoringHub` at `/hubs/monitoring` endpoint
- **Hub Documentation**: GET `/api/Monitoring/SignalRHubInfo` returns complete hub metadata (methods, parameters, connection examples)
- **Message Method**: `ReceiveActiveAlarmsUpdate` receives `{ alarmCount: number, timestamp: number }`
- **Authentication**: JWT Bearer tokens via Authorization header
- **Backend**: .NET Core SignalR server, same HTTP port (5030)
- **Context**: State managed in `MonitoringContext` with `activeAlarms` property
- **Swagger Documentation**: All SignalR DTOs and methods documented in `http://localhost:5030/swagger/v1/swagger.json`

### Connection Lifecycle
⚠️ SignalR connection states match existing StreamStatus enum
- **States**: IDLE, CONNECTING, CONNECTED, ERROR, DISCONNECTED
- **Auto-connect**: Connect when user is authenticated
- **Auto-disconnect**: Disconnect on logout or component unmount
- **Reconnection**: Automatic reconnection with exponential backoff

### Message Handling
⚠️ Subscribe to `ReceiveActiveAlarmsUpdate` for real-time updates
- **Message Format**: `{ alarmCount: number, timestamp: number }`
- **Update Pattern**: Updates pushed from server to all connected clients
- **Permission-based**: Server filters alarm count by user's ItemPermissions
- **State Update**: Call `updateActiveAlarms(alarmCount, timestamp)` from MonitoringContext

### Error Handling
⚠️ Handle SignalR connection errors and reconnection
- **Connection Errors**: Set `streamStatus` to ERROR, store error message
- **Disconnections**: Attempt automatic reconnection with backoff
- **Retries**: Exponential backoff (1s, 2s, 4s, 8s, max 30s)
- **Cleanup**: Always stop connection on unmount

### Integration Patterns
- **Context API**: Store connection state in MonitoringContext
- **React**: Custom hooks for connection lifecycle (TODO: implement useSignalR hook)
- **Auth**: Include JWT token in connection options
- **i18n**: Translate error messages and connection states
- **RTL**: Consider RTL layouts for connection status indicators

### TODO: SignalR Implementation
The following needs to be implemented:
1. Install `@microsoft/signalr` package
2. Create `src/services/signalrClient.ts` for connection management
3. Create `src/hooks/useSignalR.ts` hook for component integration
4. Update `MonitoringContext` to manage SignalR connection
5. Update `Dashboard` component to use SignalR connection state

## ⚡ Performance Guidelines

### Optimization Requirements
⚠️ **MANDATORY: Follow these performance best practices**

1. **Direct Imports**: All components use direct imports (no lazy loading for internal networks)
2. **Memoization**: Use `useMemo` and `useCallback` for expensive operations
3. **Virtualization**: Use windowing for large lists (AG Grid handles this)
4. **Image Optimization**: Use appropriate formats and lazy loading for images
5. **Bundle Analysis**: Monitor bundle size with `npm run build -- --report`

### Performance Patterns
- Use `useMemo` to memoize expensive computations
- Use `useCallback` to memoize event handlers and callbacks
- Avoid recreating functions on every render - use `useCallback` or define outside component

### Performance Monitoring
- Use React DevTools Profiler to identify slow renders
- Monitor bundle size with `npm run build -- --report`
- Check Lighthouse scores (target: >90 for Performance)
- Use Chrome DevTools Performance tab for runtime analysis

## 🔒 Security Guidelines

### Critical Security Rules
⚠️ **MANDATORY: Follow these security practices**

1. **XSS Prevention**: Never use `dangerouslySetInnerHTML` without sanitization
2. **Token Security**: Never log or expose JWT tokens
3. **Input Validation**: Validate all user input on client AND server
4. **CORS**: Backend configured to allow frontend domain

### Security Patterns
- React automatically escapes content - just render user text directly
- Never use `dangerouslySetInnerHTML` without proper sanitization
- Use `authStorage` utility for token storage - never log tokens
- Always validate user input on both client and server

### Security Checklist
- [ ] No sensitive data in IndexedDB without encryption
- [ ] No API keys or secrets in frontend code
- [ ] All forms validate input client-side AND server-side
- [ ] Authentication required for protected routes
- [ ] CSRF tokens used where applicable

## ♿ Accessibility Guidelines

### WCAG 2.1 AA Compliance
⚠️ **MANDATORY: Follow WCAG 2.1 Level AA standards**

#### Semantic HTML
```typescript
// ❌ Don't use generic divs for interactive elements
<div onClick={handleClick}>Click me</div>

// ✅ Use semantic HTML elements
<button onClick={handleClick}>Click me</button>
```

#### ARIA Labels and Roles
```typescript
// ✅ Add aria-label for icon-only buttons
<IconButton aria-label="close dialog" onClick={handleClose}>
  <CloseIcon />
</IconButton>

// ✅ Use aria-describedby for error messages
<TextField
  error={hasError}
  helperText={errorMessage}
  inputProps={{
    'aria-describedby': 'error-message',
  }}
/>
```

#### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Tab order must be logical (top to bottom, left to right / right to left for RTL)
- Focus indicators must be visible
- Escape key should close modals/dropdowns
- Enter/Space should activate buttons

#### Color Contrast
- **Normal text**: Minimum 4.5:1 contrast ratio
- **Large text** (18pt+ or 14pt+ bold): Minimum 3:1 contrast ratio
- **UI components**: Minimum 3:1 contrast ratio
- **Disabled elements**: No minimum requirement

**MUI Theme Palette ensures WCAG compliance:**
```typescript
// ✅ MUI theme colors have proper contrast
<Button color="primary">{t('common.buttons.submit')}</Button>
<Alert severity="error">{errorMessage}</Alert>
```

#### Focus Management
```typescript
// ✅ Move focus to dialog when opened
useEffect(() => {
  if (open && dialogRef.current) {
    dialogRef.current.focus();
  }
}, [open]);

// ✅ Return focus to trigger element when closed
const buttonRef = useRef<HTMLButtonElement>(null);

const handleClose = () => {
  setOpen(false);
  buttonRef.current?.focus();
};
```

#### Screen Reader Support
- Use `role` attributes for custom components
- Provide `aria-live` regions for dynamic content
- Use `aria-busy` for loading states
- Announce route changes for SPAs

```typescript
// ✅ Live region for status updates
<div role="status" aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

// ✅ Loading state announcement
<div aria-busy={isLoading} aria-label={t('common.loading')}>
  {content}
</div>
```

#### Accessibility Testing Checklist
- [ ] All images have alt text
- [ ] Forms have proper labels
- [ ] Buttons have descriptive text or aria-label
- [ ] Color is not the only indicator of state
- [ ] Keyboard navigation works throughout
- [ ] Screen reader announces content correctly
- [ ] Focus indicators are visible
- [ ] Skip links provided for navigation
- [ ] Headings are hierarchical (h1 → h2 → h3)
- [ ] ARIA roles used correctly

### RTL Accessibility Considerations
- Tab order reverses in RTL mode (right to left)
- Ensure focus indicators work in both directions
- Test with screen readers in RTL mode (NVDA, JAWS with Arabic/Persian)
- Verify keyboard shortcuts don't conflict with RTL conventions

## 🗄️ State Management with Zustand + localStorage

### Critical State Management Rules
⚠️ **MANDATORY: Use Zustand stores with localStorage persistence for ALL application state**

**Architecture Change:** This project migrated from React Context + IndexedDB to Zustand + localStorage for simplified state management and better performance.

### Why Zustand + localStorage?
1. **Simpler API**: Less boilerplate than React Context, no Provider/Consumer complexity
2. **Better Performance**: Only re-renders components that subscribe to changed state slices
3. **Synchronous Access**: Critical for API interceptors (e.g., `getTokenSync()` in authStore)
4. **DevTools Integration**: Built-in Redux DevTools support for debugging
5. **Middleware System**: Persist, devtools, immer middleware for enhanced functionality
6. **Automatic Persistence**: `persist` middleware handles localStorage sync automatically
7. **Cross-Tab Sync**: Built-in support for state sync across browser tabs
8. **TypeScript-First**: Excellent TypeScript inference and type safety

### Current Zustand Stores
✅ **Implemented Stores** (`src/stores/`):
- **`authStore.ts`**: Authentication (tokens, user, expiration) - 7-day rolling expiration
- **`monitoringStore.ts`**: Monitoring data (groups, items, alarms, sync status) - partial persistence
- **`languageStore.ts`**: Language preferences (fa/en) with i18n integration
- **`themeStore.ts`**: MUI theme preferences (light/dark mode)
- **`sortStore.ts`**: Sort preferences for various pages
- **`notificationStore.ts`**: Desktop notification preferences

### Zustand Store Patterns

**Basic Store Structure:**
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MyState {
  data: string;
  count: number;
}

interface MyActions {
  setData: (data: string) => void;
  increment: () => void;
}

export const useMyStore = create<MyState & MyActions>()(
  persist(
    (set, get) => ({
      // Initial state
      data: '',
      count: 0,
      
      // Actions
      setData: (data) => set({ data }),
      increment: () => set((state) => ({ count: state.count + 1 })),
    }),
    {
      name: 'my-storage', // localStorage key
      version: 1,
    }
  )
);
```

**Partial Persistence** (for transient + persistent state):
```typescript
export const useMonitoringStore = create<State & Actions>()(
  persist(
    (set, get) => ({ /* state and actions */ }),
    {
      name: 'monitoring-storage',
      version: 1,
      // Only persist specific fields
      partialize: (state) => ({
        groups: state.groups,
        items: state.items,
        alarms: state.alarms,
        isDataSynced: state.isDataSynced,
        // Exclude: activeAlarms (real-time), backgroundRefresh (transient)
      }),
    }
  )
);
```

**DevTools Integration:**
```typescript
import { devtools } from 'zustand/middleware';

export const useMyStore = create<State & Actions>()(
  devtools(
    persist(
      (set, get) => ({ /* state and actions */ }),
      { name: 'my-storage', version: 1 }
    ),
    { name: 'MyStore', enabled: true }
  )
);
```

### Accessing Zustand Stores

**In Components (React hooks):**
```typescript
import { useAuthStore } from '../stores/authStore';

function MyComponent() {
  // Subscribe to specific state slices (prevents unnecessary re-renders)
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const login = useAuthStore((state) => state.setAuth);
  
  // Or subscribe to entire store (not recommended)
  const auth = useAuthStore();
}
```

**Outside React (API interceptors, utilities):**
```typescript
import { useAuthStore } from '../stores/authStore';

// Direct access to store state
const token = useAuthStore.getState().token;
const user = useAuthStore.getState().user;

// Call actions directly
useAuthStore.getState().setAuth(token, user, refreshToken);
useAuthStore.getState().clearAuth();
```

**Custom Hooks Pattern:**
```typescript
// src/hooks/useAuth.ts
import { useAuthStore } from '../stores/authStore';

export const useAuth = () => {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = Boolean(token && user);
  
  const login = useCallback(async (credentials) => {
    const result = await apiLogin(credentials);
    useAuthStore.getState().setAuth(result.accessToken, result.user, result.refreshToken);
  }, []);
  
  const logout = useCallback(async () => {
    useAuthStore.getState().clearAuth();
  }, []);
  
  return { user, token, isAuthenticated, login, logout };
};
```

### When to Create New Stores
✅ **Create a new Zustand store when:**
- State needs to be shared across multiple components
- State needs to persist across page refreshes
- State requires complex update logic
- State needs to be accessed outside React components

❌ **Use local state (useState) when:**
- State is only used in a single component
- State is ephemeral (form inputs, UI toggles)
- State doesn't need to persist

### Migration from React Context
If you find existing React Context code:
1. Create Zustand store in `src/stores/`
2. Move state and actions from Context to store
3. Replace `useContext()` with `useStoreName()`
4. Remove Context Provider from component tree
5. Update imports throughout codebase
6. Test thoroughly including persistence

### Best Practices
1. **Slice Subscriptions**: Only subscribe to state slices you need (prevents re-renders)
2. **Immutable Updates**: Always return new objects in `set()`, never mutate
3. **Action Creators**: Define all state updates as named actions in the store
4. **TypeScript**: Define separate interfaces for state and actions
5. **Middleware Order**: `devtools(persist(...))` for both features
6. **Version Migration**: Use `version` field for schema migrations
7. **Partialize**: Only persist what's necessary (exclude transient state)
8. **Logging**: Log state changes in actions using logger utility
9. **Backward Compat**: Provide helper functions for gradual migration (see `authStorageHelpers`)
10. **Cross-Tab Sync**: Use BroadcastChannel API for critical state (auth, logout)

## 🐛 Error Handling

### Error Boundary Pattern
⚠️ **CRITICAL: All route components must be wrapped with error boundaries**
- Use `LazyErrorBoundary` with `Suspense` and `LoadingScreen`
- Display user-friendly translated error messages
- Log errors using logger utility
- Provide recovery actions (reload, go back)
- Never expose stack traces to users

### Axios Error Handling
- Check `axios.isAxiosError(err)` to determine error type
- Handle status codes: 400 (validation), 401 (auth), 403 (forbidden), 404 (not found), 500 (server error)
- Network errors have `err.response === undefined`
- Always show translated error messages via `t()`
- Update UI with loading states and error alerts

### SignalR Error Handling
- Handle connection states: IDLE, CONNECTING, CONNECTED, ERROR, DISCONNECTED
- Implement exponential backoff for reconnection
- Log connection errors and retry attempts
- Clean up connections on unmount

### Form Validation
- Validate on client AND server
- Store errors in state: `Record<string, string>`
- Display errors with `TextField` error/helperText props
- Use aria attributes for accessibility

### Error Logging
- Use structured logging: `logger.error('Operation failed', { context })`
- NEVER log sensitive data (passwords, tokens)
- Include relevant context (userId, operation, timestamp)


## 🧪 Testing Guidelines

### Testing Requirements
⚠️ **MANDATORY: Use Chrome DevTools MCP for ALL testing**
⚠️ **Test before marking work complete**

### Test Checklist for Every Feature
- [ ] **Functionality**: Core feature works as expected
- [ ] **Both Languages**: Works in both Persian and English
- [ ] **RTL Layout**: Persian layout renders correctly
- [ ] **Responsive**: Works on mobile, tablet, desktop
- [ ] **Error States**: Handles errors gracefully
- [ ] **Loading States**: Shows appropriate loading indicators
- [ ] **Empty States**: Handles empty data gracefully
- [ ] **Auth States**: Works for authenticated/unauthenticated users
- [ ] **Theme Compatibility**: Works with both light and dark modes
- [ ] **Accessibility**: Keyboard navigation and screen readers

### Chrome DevTools MCP Testing Process (MANDATORY)
⚠️ **ALL testing MUST be performed using Chrome DevTools MCP**

**Key Testing Workflows:**
1. **Initial Setup**: List pages, create/select page with URL
2. **Bilingual Testing**: Navigate, snapshot, switch language, verify RTL with screenshots
3. **Responsive Testing**: Resize to all breakpoints (xs, sm, md, lg, xl), check horizontal scroll
4. **Theme Testing**: Snapshot/screenshot light mode, switch to dark, verify with screenshot
5. **Error State Testing**: Emulate offline network, trigger action, verify error message, restore network
6. **Performance Testing**: Start trace, perform interactions, stop trace, analyze insights
7. **Console & Network**: List console messages (check errors), list network requests (check failures)

**Core MCP Tools:**
- **Navigation**: `list_pages`, `select_page`, `new_page`, `navigate_page`, `close_page`
- **Inspection**: `take_snapshot`, `take_screenshot`, `click`, `hover`, `fill`, `drag`
- **Debugging**: `evaluate_script`, `list_console_messages`, `list_network_requests`
- **Performance**: `performance_start_trace`, `performance_stop_trace`, `performance_analyze_insight`
- **Testing**: `resize_page`, `emulate_network`, `emulate_cpu`, `wait_for`


## 🚀 Development Environment

### Port Configuration
⚠️ **CRITICAL: Port numbers are fixed - DO NOT change**

- **Frontend (Vite)**: `http://localhost:5173`
- **Backend (.NET)**: `http://localhost:5030`
- **CORS**: Only port 5173 is whitelisted on backend

### Environment Setup
1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Verify: Navigate to `http://localhost:5173`

### Element Identification
⚠️ **MANDATORY: ALL elements created by AI must have `data-id-ref` attribute**

**Scope**: Every HTML element that you create (divs, buttons, inputs, forms, cards, modals, etc.) must include a `data-id-ref` attribute for automated testing, debugging, and element identification.

**Format**: `data-id-ref="component-element-purpose"` (kebab-case)

**Naming Convention Guidelines**:
- Use descriptive, hierarchical names: `component-element-purpose`
- For lists/grids: Include context like element identifiers
- For modals/dialogs: Include modal name in the identifier

### Chrome DevTools MCP Integration
⚠️ **MANDATORY: Use Chrome DevTools MCP for ALL testing, debugging, and verification**

**Why Mandatory:**
- Automated, reproducible testing across breakpoints, themes, languages
- Real-time state inspection, network monitoring, performance analysis
- Eliminates manual testing, ensures comprehensive coverage

**Core Tools:**
- **Navigation**: `list_pages`, `select_page`, `new_page`, `navigate_page`
- **Interaction**: `take_snapshot`, `take_screenshot`, `click`, `fill`, `hover`, `drag`
- **Debugging**: `evaluate_script`, `list_console_messages`, `list_network_requests`
- **Performance**: `performance_start_trace`, `performance_stop_trace`, `resize_page`, `emulate_network`

**Usage Scenarios:**
1. **Feature Development**: Navigate → snapshot → interact → verify with screenshots
2. **Bilingual Testing**: Switch language → verify RTL → test forms
3. **Responsive Testing**: Resize to all breakpoints → check scroll
4. **Theme Testing**: Switch themes → verify with screenshots
5. **Debugging**: Console messages → network requests → evaluate script for state inspection

### MUI MCP Server Integration
⚠️ **MANDATORY: Use MUI MCP Server for Material-UI documentation**

**Tools:**
- `mcp_mui-mcp_useMuiDocs` - Access MUI docs for specific versions
- `mcp_mui-mcp_fetchDocs` - Fetch detailed documentation

**Supported Packages:** @mui/material v6, @mui/x-data-grid, @mui/x-charts, @mui/x-date-pickers, @mui/x-tree-view

**When to Use:**
- Before implementing any MUI component
- When encountering component errors
- Before using theme customization, responsive layouts, or sx prop patterns
- For form components, data display, RTL support, accessibility

**Best Practices:**
- Always verify with MUI MCP (don't assume from memory)
- Use @mui/material v6 docs for this project
- Check for breaking changes and prop interfaces
- Follow official styling patterns (sx prop over inline styles)


## Structure
```
src/
├── components/   # React components
├── stores/       # Zustand stores (auth, monitoring, language, theme, etc.)
├── hooks/        # Custom hooks (useAuth, useMonitoring, useLanguage, etc.)
├── i18n/         # i18n config
├── services/     # API clients (apiClient.ts, signalrClient.ts)
├── styles/       # Global styles
├── types/        # TypeScript types
└── utils/        # Helpers

public/locales/   # fa/, en/
```

## ✅ Code Quality Checklist

### Code Quality
- [ ] **TypeScript**: All types defined, no `any` type used
- [ ] **DTOs**: Request/response DTOs defined in `src/types/api.ts`
- [ ] **Props**: All component props have TypeScript interfaces
- [ ] **Hooks**: Custom hooks follow `use*` naming convention
- [ ] **Naming**: Consistent naming conventions followed
- [ ] **Comments**: Complex logic has explanatory comments
- [ ] **No Console Logs**: Use logger utility, not `console.*` directly
- [ ] **Imports**: Organized and no unused imports

### Internationalization
- [ ] **No Hardcoded Text**: All text goes through `t()` function
- [ ] **Translation Keys**: Keys exist in both `fa` and `en` files
- [ ] **RTL Layout**: Persian layout tested and works correctly
- [ ] **Language Switch**: Component works when language changes
- [ ] **Date/Time**: Localized date/time formatting used

### Styling & Theming
- [ ] **MUI Components First**: MUI components used before custom implementations
- [ ] **MUI Theme Values Only**: ONLY MUI theme palette values used, NO hardcoded colors
- [ ] **Both Theme Modes**: Tested with both light and dark modes
- [ ] **Use sx Prop**: MUI `sx` prop preferred over inline styles
- [ ] **Responsive**: Mobile, tablet, desktop all tested
- [ ] **RTL Styling**: No broken layouts in RTL mode

### State Management
- [ ] **Zustand Stores**: Use Zustand for shared state across components
- [ ] **Local State**: Use useState/useReducer for component-level state only
- [ ] **No Direct Mutation**: Always return new objects in `set()`, never mutate
- [ ] **State Minimal**: Keep only necessary data in state
- [ ] **Persist Middleware**: Use for localStorage persistence
- [ ] **Slice Subscriptions**: Subscribe to specific state slices to prevent re-renders
- [ ] **DevTools**: Enable Redux DevTools for debugging

### Data Synchronization
- [ ] **Authenticated = Data Exists**: If user is authenticated, data MUST be in IndexedDB
- [ ] **NO sync checks in ProtectedRoute**: Only checks auth, assumes data exists
- [ ] **Login triggers sync**: LoginPage redirects to sync after successful auth
- [ ] **500ms verification**: Wait for IndexedDB writes before marking sync complete
- [ ] **Phase order**: Groups+Items parallel → Alarms sequential (needs itemIds)

### API & Backend Integration
- [ ] **HTTP Protocol**: All API calls use `http://localhost:5030`
- [ ] **Error Handling**: API errors handled gracefully with Axios error checks
- [ ] **Loading States**: Loading indicators for async operations
- [ ] **Auth States**: Protected routes require authentication
- [ ] **Refresh Token**: Automatic refresh handled by Axios interceptors

### SignalR & Real-time Streaming
- [ ] **Connection Lifecycle**: Proper connection, disconnect, error handling
- [ ] **Cleanup**: Stop connection on component unmount
- [ ] **Message Handling**: Subscribe to `ReceiveActiveAlarmsUpdate`
- [ ] **Error States**: Connection errors handled appropriately
- [ ] **Connection UI**: Show connection status to user
- [ ] **Reconnection**: Automatic reconnection with exponential backoff

### MUI Components & Theming
- [ ] **MUI MCP Verified**: Checked official MUI docs for component usage
- [ ] **Version Specific**: Used @mui/material v6 documentation
- [ ] **Theme Palette Only**: NO hardcoded colors, only theme palette values
- [ ] **MUI Components First**: Used built-in MUI components before custom ones
- [ ] **Prop Interfaces**: Verified component prop TypeScript interfaces
- [ ] **sx Prop Pattern**: Used `sx` prop for styling, not inline styles
- [ ] **RTL Compatible**: Component works correctly in RTL mode
- [ ] **Responsive Props**: Used responsive props (xs, sm, md, lg, xl)
- [ ] **Accessibility**: Followed MUI accessibility guidelines

### AG Grid
- [ ] **Modules Registered**: All required modules in `ModuleRegistry`
- [ ] **LocaleModule**: Persian locale loaded
- [ ] **RTL Mode**: `enableRtl: true` for Persian
- [ ] **Theme Applied**: One of the 4 supported themes used
- [ ] **AGGridWrapper**: Use wrapper component, not raw `createGrid()`

### Charts & Visualization
- [ ] **i18n**: All chart text translated
- [ ] **RTL Support**: Legend, tooltip position adjusted for RTL
- [ ] **Responsive**: Chart resizes with container
- [ ] **MUI Theme Colors**: Uses MUI theme palette colors via `useTheme()` hook
- [ ] **Theme Compatibility**: Chart colors update when theme changes
- [ ] **Performance**: `useMemo` used for chart options

### Performance
- [ ] **Direct Imports**: All components use direct imports (no lazy loading for internal networks)
- [ ] **Memoization**: `useMemo`/`useCallback` for expensive operations
- [ ] **Bundle Size**: No large dependencies imported unnecessarily
- [ ] **Images**: Optimized and lazy loaded where appropriate
- [ ] **Re-renders**: Minimize unnecessary re-renders

### Security
- [ ] **No Token Logging**: JWT tokens never logged or exposed
- [ ] **Input Validation**: User input validated
- [ ] **XSS Prevention**: No `dangerouslySetInnerHTML` without sanitization
- [ ] **HTTPS**: All communication over HTTPS
- [ ] **Secrets**: No API keys or secrets in frontend code

### Accessibility
- [ ] **Semantic HTML**: Proper HTML5 elements used
- [ ] **ARIA Labels**: Interactive elements have labels
- [ ] **Keyboard Navigation**: Can navigate with keyboard
- [ ] **Color Contrast**: Text readable in all themes
- [ ] **Focus Indicators**: Visible focus states

### Testing (Chrome DevTools MCP MANDATORY)
- [ ] **Chrome DevTools MCP Used**: ALL testing performed using MCP tools
- [ ] **Navigation Verified**: Used `navigate_page` and `take_snapshot`
- [ ] **Both Languages**: Tested with MCP bilingual workflow (fa and en)
- [ ] **All Breakpoints**: Used `resize_page` for xs, sm, md, lg, xl
- [ ] **Theme Modes**: Used MCP to test light and dark themes
- [ ] **Error Scenarios**: Used `emulate_network` for network failures
- [ ] **Console Clean**: Used `list_console_messages` - no errors/warnings
- [ ] **Network Verified**: Used `list_network_requests` - all successful
- [ ] **Screenshots Taken**: Captured visual evidence with `take_screenshot`
- [ ] **Performance Tested**: Used `performance_start_trace` for critical paths

### Documentation
- [ ] **Element IDs**: All elements created by AI have `data-id-ref`
- [ ] **Code Comments**: Complex logic documented
- [ ] **README**: Updated if new setup steps required
- [ ] **Types Exported**: Public types exported from index files

## 🔧 Common Troubleshooting

### MUI Theme Issues
- **Colors not updating**: Use `theme.palette.*` not hardcoded values
- **RTL not working**: Use logical properties (`marginInlineStart` not `marginLeft`)

### Axios API Issues
- **No UI update**: Handle async properly, update state in try/catch/finally
- **Token refresh loop**: Check `apiClient.ts` mutex, verify refresh endpoint, check console for 401 loops

### SignalR Stream Issues
- **Not connecting**: Verify backend running on 5030, check CORS configuration
- **Memory leak**: Always cleanup in useEffect return function

### i18n Issues
- **Translations missing**: Verify keys exist in both fa/en files, check console warnings
- **RTL not applying**: Check LanguageContext direction, verify theme receives `direction: 'rtl'`

### Build/Bundling Issues
- **Type errors**: Run `npm run type-check`, check `tsconfig.json`
- **Bundle too large**: Run `npm run build -- --report`, check for duplicates

### Performance Issues
- **Slow re-renders**: Use `useCallback` for functions, `useMemo` for expensive calculations

### AG Grid Issues

**Problem**: Grid not displaying
- Verify all required modules registered
- Check license key valid
- Ensure grid container has height

**Problem**: Persian locale not working
- Verify `LocaleModule` registered
- Check `AG_GRID_LOCALE_IR` imported
- Ensure `localeText` prop passed to grid

## 🎨 Best Practices Summary

### DO ✅
- Use functional components with hooks
- Use TypeScript with strict types
- Use translation system for all text
- Use logger utility for ALL logging (never `console.*`)
- Use Chrome DevTools MCP for ALL testing and debugging
- Use MUI MCP Server to verify component usage and APIs
- Use MUI theme palette values for ALL colors
- Use MUI components first before custom implementations
- Use Axios for all REST API calls
- Use Zustand stores with persist middleware for state management
- Use Zustand for shared state, useState for local state
- Use direct imports (no lazy loading for internal networks)
- Use memoization for performance
- Use error boundaries
- Use DTOs for API communication
- Use existing patterns and conventions
- Test in both languages with Chrome DevTools MCP
- Test RTL layout with Chrome DevTools MCP
- Test both theme modes (light/dark) with Chrome DevTools MCP
- Test all breakpoints with Chrome DevTools MCP

### DON'T ❌
- Don't use class components
- Don't use `any` type
- Don't hardcode text strings
- Don't use `console.*` directly - use logger utility instead
- Don't rely on manual browser testing - use Chrome DevTools MCP
- Don't assume MUI APIs from memory - verify with MUI MCP
- Don't hardcode colors (hex, rgb, color names) - ONLY use MUI theme palette
- Don't create custom color variables outside of MUI theme
- Don't use inline styles when `sx` prop is available
- Don't use alternate ports
- Don't skip error handling
- Don't forget loading states
- Don't use React Context for state management - use Zustand instead
- Don't use IndexedDB - use Zustand + localStorage instead
- Don't forget to clean up streams/subscriptions
- Don't skip RTL testing with Chrome DevTools MCP
- Don't skip responsive testing with Chrome DevTools MCP
- Don't skip theme compatibility testing with Chrome DevTools MCP
- Don't log sensitive data (passwords, tokens, etc.)
- Don't use outdated Protobuf patterns (v1)