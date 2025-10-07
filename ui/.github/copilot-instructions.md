# Monitoring2025 UI - Copilot Instructions
**Enterprise React + TypeScript + Redux Toolkit + Bootstrap 5**  
**Bilingual (fa/en) • RTL/LTR Support • Real-time Monitoring • .NET Core API**

## 🎯 Project Overview
This is a production-grade enterprise monitoring dashboard with:
- **Real-time streaming** via gRPC/Connect-RPC
- **Bilingual support** (Persian/English) with full RTL/LTR layouts
- **Advanced data grids** using AG Grid Enterprise
- **Secure authentication** with JWT + refresh token rotation
- **Theme system** with 7 preset themes and CSS custom properties
- **Interactive charts** using ECharts with i18n support

## 🌍 Internationalization (i18n)

### Critical Rules
⚠️ **NEVER hardcode any user-facing text** - all text must go through translation system
⚠️ **ALWAYS test both languages** (Persian and English) before considering work complete
⚠️ **ALWAYS verify RTL layout** for Persian language

### Implementation
- **Hook**: `useTranslation()` from `src/hooks/useTranslation.ts`
- **Translation Files**: `public/locales/{fa,en}/translation.json`
- **Key Structure**: Hierarchical dot notation (e.g., `pages.dashboard.title`, `common.buttons.save`)
- **RTL Stylesheet**: `bootstrap-rtl.css` (automatically loaded for Persian)
- **Font**: IRANSansX for Persian, system fonts for English

### Code Patterns

✅ **CORRECT - Using translation hook:**
```typescript
const { t } = useTranslation();
return (
  <button className="btn btn-primary">
    {t('common.buttons.save')}
  </button>
);
```

❌ **WRONG - Hardcoded text:**
```typescript
<button>Save</button>
<div>Welcome to Dashboard</div>
```

✅ **CORRECT - Dynamic translations with variables:**
```typescript
const { t } = useTranslation();
const userName = "Ahmad";
return <p>{t('messages.welcome', { name: userName })}</p>;
// Translation: "Welcome, {{name}}!"
```

✅ **CORRECT - Pluralization:**
```typescript
const { t } = useTranslation();
const count = 5;
return <p>{t('items.count', { count })}</p>;
// Translation handles: "1 item" vs "5 items"
```

### Translation Key Organization
```json
{
  "common": {
    "buttons": { "save": "Save", "cancel": "Cancel", "delete": "Delete" },
    "labels": { "username": "Username", "password": "Password" },
    "messages": { "loading": "Loading...", "error": "An error occurred" }
  },
  "pages": {
    "dashboard": { "title": "Dashboard", "subtitle": "System Overview" },
    "monitoring": { "title": "Real-time Monitoring" }
  },
  "errors": {
    "network": "Network connection failed",
    "auth": "Authentication failed"
  }
}
```

### RTL Considerations
- **Flexbox/Grid**: Automatically flips with `dir="rtl"` on `<html>`
- **Text Alignment**: Use `start`/`end` instead of `left`/`right`
- **Margins/Padding**: Use logical properties (`margin-inline-start` vs `margin-left`)
- **Icons**: Some icons may need mirroring (arrows, chevrons)
- **Bootstrap**: `bootstrap-rtl.css` handles most RTL adjustments

### Testing Checklist
- [ ] All text goes through `t()` function
- [ ] Translation keys exist in both `fa` and `en` files
- [ ] RTL layout works correctly in Persian
- [ ] No text overflow or layout breaks in either language
- [ ] Form validation messages are translated
- [ ] Date/time formats respect locale

## 🛠️ Technology Stack

### Core Technologies
- **React 18**: Functional components only, hooks-based
- **TypeScript 5**: Strict mode, no `any` type allowed
- **Redux Toolkit**: State management with RTK Query for API calls
- **Bootstrap 5**: Responsive grid system (xs/sm/md/lg/xl/xxl)
- **Vite**: Build tool and dev server (port 5173)

### Code Quality Standards
⚠️ **MANDATORY: TypeScript strict mode** - All code must be fully typed
⚠️ **NO `any` type** - Use `unknown` with type guards or proper interfaces
⚠️ **NO class components** - Only functional components with hooks
⚠️ **NO inline styles** - Use CSS modules or theme CSS variables

### Component Patterns

✅ **CORRECT - Functional component with TypeScript:**
```typescript
import React from 'react';

interface UserCardProps {
  userId: string;
  name: string;
  email: string;
  onEdit?: (userId: string) => void;
}

export const UserCard: React.FC<UserCardProps> = ({ 
  userId, 
  name, 
  email, 
  onEdit 
}) => {
  const handleEdit = () => {
    onEdit?.(userId);
  };

  return (
    <div className="card" data-id-ref="user-card">
      <h3>{name}</h3>
      <p>{email}</p>
      {onEdit && (
        <button onClick={handleEdit} data-id-ref="user-card-edit-button">
          Edit
        </button>
      )}
    </div>
  );
};
```

❌ **WRONG - Missing types, inline styles:**
```typescript
export const UserCard = ({ userId, name, email, onEdit }) => { // No types!
  return (
    <div style={{ padding: '10px' }}> {/* Inline styles! */}
      <h3>{name}</h3>
    </div>
  );
};
```

### Code Splitting & Lazy Loading
⚠️ **MANDATORY: Lazy load all page components** to optimize bundle size

✅ **CORRECT - Lazy loading with Suspense:**
```typescript
import React, { Suspense } from 'react';
import { LoadingScreen } from './components/LoadingScreen';

const Dashboard = React.lazy(() => import('./components/Dashboard'));
const MonitoringPage = React.lazy(() => import('./components/MonitoringPage'));

function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Dashboard />
    </Suspense>
  );
}
```

### File Organization
- **Components**: `src/components/` - React components
- **Types**: `src/types/` - TypeScript interfaces and types
- **Hooks**: `src/hooks/` - Custom React hooks
- **Utils**: `src/utils/` - Helper functions
- **Styles**: `src/styles/` - Global CSS files
- **Services**: `src/services/` - API clients (RTK Query, gRPC)
- **Store**: `src/store/` - Redux store and slices

### Naming Conventions
- **Components**: PascalCase (e.g., `UserCard.tsx`, `DashboardLayout.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAuth.ts`, `useTranslation.ts`)
- **Types**: PascalCase (e.g., `UserProfile`, `ApiResponse`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`, `MAX_RETRIES`)
- **CSS Classes**: kebab-case (e.g., `user-card`, `dashboard-header`)

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

## 📊 Charts (ECharts)

### Setup
- **Library**: ECharts 5.6.0 + echarts-for-react 3.0.2
- **Component**: `ReactECharts`
- **Type**: `EChartsOption`
- **Theme**: Use theme CSS variables for colors

### Critical Rules
⚠️ **MANDATORY: Internationalize all chart text** - titles, axes, legends, tooltips
⚠️ **MANDATORY: RTL support** - adjust direction, legend position, tooltip alignment
⚠️ **MANDATORY: Responsive sizing** - charts must adapt to container size

### Implementation Pattern

✅ **CORRECT - Full implementation:**
```typescript
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguage } from '../hooks/useLanguage';

interface ChartProps {
  data: number[];
  categories: string[];
  title?: string;
}

export const LineChart: React.FC<ChartProps> = ({ data, categories, title }) => {
  const { t } = useTranslation();
  const { language, isRTL } = useLanguage();

  const option: EChartsOption = useMemo(() => ({
    title: {
      text: title || t('charts.defaultTitle'),
      left: isRTL ? 'right' : 'left',
      textStyle: {
        color: 'var(--text-primary-light)'
      }
    },
    tooltip: {
      trigger: 'axis',
      position: isRTL ? 'left' : 'right'
    },
    legend: {
      orient: 'horizontal',
      left: isRTL ? 'right' : 'left',
      textStyle: {
        color: 'var(--text-secondary-light)'
      }
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: {
        color: 'var(--text-secondary-light)'
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: 'var(--text-secondary-light)'
      }
    },
    series: [{
      name: t('charts.series.data'),
      type: 'line',
      data: data,
      itemStyle: {
        color: 'var(--primary-medium)'
      },
      lineStyle: {
        color: 'var(--primary-medium)'
      }
    }],
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    }
  }), [data, categories, title, t, isRTL]);

  return (
    <ReactECharts 
      option={option} 
      data-id-ref="line-chart"
      style={{ height: '400px', width: '100%' }} 
      opts={{ renderer: 'svg' }}
    />
  );
};
```

### Performance Tips
- Use `useMemo` to prevent unnecessary option recalculations
- Use SVG renderer for better performance with many data points
- Debounce window resize events for responsive charts
- Lazy load chart components to reduce initial bundle size

## 📱 Responsive Design

### Bootstrap Breakpoints
⚠️ **MANDATORY: Test all breakpoints** before considering work complete

| Breakpoint | Min Width | Device Type | Class Prefix |
|------------|-----------|-------------|--------------|
| xs | < 576px | Small phones | (none) |
| sm | ≥ 576px | Phones | `sm` |
| md | ≥ 768px | Tablets | `md` |
| lg | ≥ 992px | Desktops | `lg` |
| xl | ≥ 1200px | Large desktops | `xl` |
| xxl | ≥ 1400px | Extra large desktops | `xxl` |

### Test Resolutions
Must test on these standard resolutions:
- **1920x1080** - Full HD desktop
- **1366x768** - Laptop
- **768x1024** - Tablet portrait
- **375x667** - iPhone SE
- **414x896** - iPhone XR/11

### Responsive Patterns

✅ **CORRECT - Mobile-first responsive classes:**
```tsx
<div className="container">
  <div className="row">
    <div className="col-12 col-md-6 col-lg-4">
      {/* Full width on mobile, half on tablet, third on desktop */}
    </div>
  </div>
</div>
```

✅ **CORRECT - Responsive utilities:**
```tsx
<div className="d-none d-md-block">
  {/* Hidden on mobile, visible on tablet+ */}
</div>

<h1 className="fs-6 fs-md-4 fs-lg-2">
  {/* Smaller text on mobile, larger on desktop */}
</h1>
```

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

## ⚡ Performance Guidelines

### Optimization Requirements
⚠️ **MANDATORY: Follow these performance best practices**

1. **Code Splitting**: Lazy load all route components
2. **Memoization**: Use `useMemo` and `useCallback` for expensive operations
3. **Virtualization**: Use windowing for large lists (AG Grid handles this)
4. **Image Optimization**: Use appropriate formats and lazy loading
5. **Bundle Size**: Keep individual chunks under 500KB

### Performance Patterns

✅ **CORRECT - Memoized expensive computation:**
```typescript
const expensiveValue = useMemo(() => {
  return data.reduce((acc, item) => acc + item.value, 0);
}, [data]);

const handleClick = useCallback(() => {
  onAction(expensiveValue);
}, [expensiveValue, onAction]);
```

✅ **CORRECT - Conditional rendering for heavy components:**
```typescript
{isVisible && (
  <Suspense fallback={<Spinner />}>
    <HeavyChartComponent data={chartData} />
  </Suspense>
)}
```

❌ **WRONG - Recreating functions on every render:**
```typescript
<button onClick={() => handleAction(id)}>Click</button>
// Should use useCallback or bind outside render
```

### Performance Monitoring
- Use React DevTools Profiler to identify slow renders
- Monitor bundle size with `npm run build -- --report`
- Check Lighthouse scores (target: >90 for Performance)
- Use Chrome DevTools Performance tab for runtime analysis

## 🔒 Security Guidelines

### Critical Security Rules
⚠️ **MANDATORY: Follow these security practices**

1. **XSS Prevention**: Never use `dangerouslySetInnerHTML` without sanitization
2. **HTTPS Only**: All API calls must use HTTPS (enforced at 7136)
3. **Token Security**: Never log or expose JWT tokens
4. **Input Validation**: Validate all user input on client AND server
5. **CORS**: Only `https://localhost:5173` is whitelisted

### Security Patterns

✅ **CORRECT - Safe user content rendering:**
```typescript
// React automatically escapes content
<div>{userProvidedText}</div>
```

❌ **WRONG - Dangerous HTML injection:**
```typescript
<div dangerouslySetInnerHTML={{ __html: userInput }} />
// Never do this without sanitization!
```

✅ **CORRECT - Secure token storage:**
```typescript
// Use authStorage utility, never console.log tokens
import { authStorage } from '../utils/authStorage';
authStorage.saveTokens(accessToken, refreshToken);
```

### Security Checklist
- [ ] No sensitive data in localStorage without encryption
- [ ] No API keys or secrets in frontend code
- [ ] All forms validate input client-side AND server-side
- [ ] HTTPS enforced for all API calls
- [ ] Authentication required for protected routes
- [ ] CSRF tokens used where applicable

## 🐛 Error Handling

### Error Handling Requirements
⚠️ **MANDATORY: Comprehensive error handling**

### RTK Query Error Handling

✅ **CORRECT - Handling API errors:**
```typescript
import { useLoginMutation } from '../services/rtkApi';

const [login, { isLoading, error }] = useLoginMutation();

const handleSubmit = async (credentials: LoginDto) => {
  try {
    await login(credentials).unwrap();
    // Success handling
  } catch (err) {
    // Error is already in the error state
    if ('status' in err) {
      // RTK Query error
      const errorMessage = 'error' in err 
        ? String(err.error) 
        : t('errors.network');
      showToast(errorMessage, 'error');
    }
  }
};

// Display error in UI
{error && (
  <div className="alert alert-danger">
    {t('errors.loginFailed')}
  </div>
)}
```

### gRPC Stream Error Handling

✅ **CORRECT - Handling stream errors:**
```typescript
try {
  for await (const update of stream) {
    setData(update);
  }
} catch (error) {
  if (error instanceof ConnectError) {
    console.error('gRPC Error:', error.code, error.message);
    setConnectionState('ERROR');
    
    // Retry logic
    if (error.code === Code.Unavailable) {
      setTimeout(() => reconnect(), 5000);
    }
  }
}
```

### Global Error Boundary

All route components should be wrapped with error boundaries:
```typescript
<LazyErrorBoundary>
  <Suspense fallback={<LoadingScreen />}>
    <SomeComponent />
  </Suspense>
</LazyErrorBoundary>
```

## 🧪 Testing Guidelines

### Testing Requirements
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
- [ ] **Theme Compatibility**: Works with all 7 theme presets
- [ ] **Accessibility**: Keyboard navigation and screen readers

### Manual Testing Process
1. Test in English (LTR)
2. Switch to Persian and verify RTL layout
3. Resize browser through all breakpoints
4. Try all theme presets
5. Test error scenarios (network failures, invalid input)
6. Test with authentication (logged in/out)
7. Check console for errors or warnings

## 🚀 Development Environment

### Port Configuration
⚠️ **CRITICAL: Port numbers are fixed - DO NOT change**

- **Frontend (Vite)**: `https://localhost:5173`
- **Backend (.NET)**: `https://localhost:7136`
- **CORS**: Only port 5173 is whitelisted on backend
- **SSL/TLS**: Development certificates must be trusted

### Environment Setup
1. Trust development certificates:
   - Windows: Run `trust-dev-certs.ps1`
   - Linux/Mac: Run `trust-dev-certs.sh`
2. Install dependencies: `npm install`
3. Start dev server: `npm run dev`
4. Verify SSL: Navigate to `https://localhost:5173`

### Element Identification
⚠️ **MANDATORY: All interactive elements must have `data-id-ref` attribute**

**Format**: `data-id-ref="component-element-purpose"` (kebab-case)

✅ **CORRECT:**
```tsx
<button data-id-ref="login-form-submit-button">Login</button>
<input data-id-ref="search-input-field" />
<div data-id-ref="user-profile-card">...</div>
```

❌ **WRONG:**
```tsx
<button>Login</button> // Missing data-id-ref
<button data-id-ref="loginBtn">Login</button> // Wrong case
```

### Chrome DevTools MCP Integration
⚠️ **MANDATORY: Use Chrome DevTools MCP for comprehensive development workflow**

The Chrome DevTools Model Context Protocol (MCP) server provides powerful browser automation and debugging capabilities essential for modern web development. Use these tools for real-time debugging, user behavior simulation, live styling inspection, and performance optimization.

#### 🔧 Core MCP Tools Overview
**Navigation & Setup:**
- `mcp_chromedevtool_list_pages` - List all open browser pages
- `mcp_chromedevtool_select_page` - Set active page for operations
- `mcp_chromedevtool_new_page` - Create new browser page
- `mcp_chromedevtool_navigate_page` - Navigate to URLs
- `mcp_chromedevtool_close_page` - Close specific pages

**Live Inspection & Interaction:**
- `mcp_chromedevtool_take_snapshot` - Get DOM snapshot with element UIDs
- `mcp_chromedevtool_take_screenshot` - Capture visual state (full page or element)
- `mcp_chromedevtool_click` - Click elements (single/double click)
- `mcp_chromedevtool_hover` - Hover over elements
- `mcp_chromedevtool_fill` - Fill input fields and forms
- `mcp_chromedevtool_drag` - Drag and drop interactions

**Real-Time Debugging:**
- `mcp_chromedevtool_evaluate_script` - Execute JavaScript in browser context
- `mcp_chromedevtool_list_console_messages` - Monitor console output
- `mcp_chromedevtool_list_network_requests` - Track API calls and responses
- `mcp_chromedevtool_get_network_request` - Get detailed request information

**Performance & Testing:**
- `mcp_chromedevtool_performance_start_trace` - Start performance recording
- `mcp_chromedevtool_performance_stop_trace` - Stop and analyze performance
- `mcp_chromedevtool_performance_analyze_insight` - Get detailed performance insights
- `mcp_chromedevtool_resize_page` - Test responsive breakpoints
- `mcp_chromedevtool_emulate_network` - Simulate network conditions
- `mcp_chromedevtool_emulate_cpu` - Throttle CPU for testing

#### 🐛 Real-Time Debugging and Error Diagnosis

**Critical Debugging Workflow:**
⚠️ **MANDATORY: Always take snapshots before debugging** to identify element UIDs

**1. Console Error Monitoring**
```typescript
// Step 1: Check for console errors
const consoleMessages = await mcp_chromedevtool_list_console_messages();
// Look for errors, warnings, and network failures

// Step 2: Monitor real-time console output while reproducing issues
// Execute user actions and watch for new console messages
```

**2. Network Request Debugging**
```typescript
// Monitor API calls and responses
const networkRequests = await mcp_chromedevtool_list_network_requests({
  resourceTypes: ['xhr', 'fetch', 'websocket']
});

// Get detailed request information
const requestDetails = await mcp_chromedevtool_get_network_request({
  url: 'https://localhost:7136/api/auth/login'
});
```

**3. Live JavaScript Debugging**
```typescript
// Execute debugging scripts in browser context
const debugInfo = await mcp_chromedevtool_evaluate_script({
  function: `() => {
    return {
      reduxState: window.__REDUX_DEVTOOLS_EXTENSION__?.getState?.() || 'Not available',
      authToken: localStorage.getItem('accessToken') ? 'Present' : 'Missing',
      currentTheme: document.documentElement.getAttribute('data-theme'),
      language: document.documentElement.getAttribute('lang'),
      grpcConnectionState: window.grpcConnectionState || 'Unknown'
    };
  }`
});
```

**4. Real-Time State Inspection**
✅ **CORRECT - Live state debugging pattern:**
```typescript
// Take snapshot to get element UIDs
const snapshot = await mcp_chromedevtool_take_snapshot();

// Inspect specific component state
const componentState = await mcp_chromedevtool_evaluate_script({
  function: `(element) => {
    // Access React component props/state
    const reactInstance = element._reactInternalInstance || 
                         element._reactInternals ||
                         Object.keys(element).find(key => key.startsWith('__reactInternalInstance'));
    
    return {
      props: reactInstance?.memoizedProps || 'Not found',
      state: reactInstance?.memoizedState || 'Not found',
      elementText: element.textContent,
      computedStyles: window.getComputedStyle(element)
    };
  }`,
  args: [{ uid: 'element-uid-from-snapshot' }]
});
```

#### 👤 User Behavior Simulation

**Comprehensive User Journey Testing:**
⚠️ **MANDATORY: Test complete user workflows** including bilingual scenarios

**1. Authentication Flow Simulation**
```typescript
// Simulate complete login process
await mcp_chromedevtool_navigate_page({ url: 'https://localhost:5173/login' });
await mcp_chromedevtool_take_snapshot(); // Get form element UIDs

await mcp_chromedevtool_fill_form({
  elements: [
    { uid: 'login-username-input', value: 'test' },
    { uid: 'login-password-input', value: 'Password@12345' }
  ]
});

await mcp_chromedevtool_click({ uid: 'login-form-submit-button' });
await mcp_chromedevtool_wait_for({ text: 'Dashboard', timeout: 5000 });
```

**2. Bilingual User Experience Testing**
```typescript
// Test Persian (RTL) user flow
await mcp_chromedevtool_click({ uid: 'language-switcher-fa-button' });
await mcp_chromedevtool_take_screenshot({ fullPage: true }); // Verify RTL layout

// Test form interaction in Persian
await mcp_chromedevtool_fill({ uid: 'search-input-field', value: 'جستجو' });
await mcp_chromedevtool_take_snapshot(); // Verify RTL text input

// Switch back to English and verify layout
await mcp_chromedevtool_click({ uid: 'language-switcher-en-button' });
await mcp_chromedevtool_take_screenshot({ fullPage: true });
```

**3. Real-Time Monitoring Workflow**
```typescript
// Simulate monitoring dashboard usage
await mcp_chromedevtool_navigate_page({ url: 'https://localhost:5173/monitoring' });

// Test gRPC streaming connection
const streamingTest = await mcp_chromedevtool_evaluate_script({
  function: `() => {
    // Trigger streaming connection
    window.testGrpcStream = true;
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          connectionState: window.grpcConnectionState,
          dataReceived: window.streamingDataCount || 0,
          errors: window.grpcErrors || []
        });
      }, 3000);
    });
  }`
});
```

**4. Complex User Interactions**
```typescript
// Test drag and drop functionality
await mcp_chromedevtool_take_snapshot();
await mcp_chromedevtool_drag({
  from_uid: 'draggable-chart-element',
  to_uid: 'dashboard-drop-zone'
});

// Test keyboard navigation
await mcp_chromedevtool_evaluate_script({
  function: `() => {
    // Simulate keyboard navigation
    const event = new KeyboardEvent('keydown', { key: 'Tab' });
    document.dispatchEvent(event);
    return document.activeElement?.getAttribute('data-id-ref');
  }`
});
```

#### 🎨 Live Styling and Layout Inspection

**Real-Time Theme and Layout Testing:**
⚠️ **MANDATORY: Test all 7 theme presets** and responsive breakpoints

**1. Theme System Testing**
```typescript
// Test all theme presets
const themes = ['default', 'green', 'purple', 'orange', 'red', 'teal', 'indigo'];

for (const theme of themes) {
  await mcp_chromedevtool_evaluate_script({
    function: `(themeName) => {
      // Apply theme
      document.documentElement.setAttribute('data-theme', themeName);
      return {
        appliedTheme: themeName,
        primaryColor: getComputedStyle(document.documentElement).getPropertyValue('--primary-medium'),
        accentColor: getComputedStyle(document.documentElement).getPropertyValue('--accent-primary')
      };
    }`,
    args: [{ uid: theme }] // Note: Using uid parameter as string container
  });
  
  await mcp_chromedevtool_take_screenshot({ 
    filePath: `theme-${theme}-test.png` 
  });
}
```

**2. Responsive Layout Testing**
```typescript
// Test all Bootstrap breakpoints
const breakpoints = [
  { width: 375, height: 667, name: 'mobile' },    // iPhone SE
  { width: 768, height: 1024, name: 'tablet' },   // iPad
  { width: 1366, height: 768, name: 'laptop' },   // Standard laptop
  { width: 1920, height: 1080, name: 'desktop' }  // Full HD
];

for (const bp of breakpoints) {
  await mcp_chromedevtool_resize_page({ width: bp.width, height: bp.height });
  await mcp_chromedevtool_take_screenshot({ 
    filePath: `responsive-${bp.name}.png` 
  });
  
  // Check for layout issues
  const layoutCheck = await mcp_chromedevtool_evaluate_script({
    function: `() => {
      return {
        hasHorizontalScroll: document.body.scrollWidth > window.innerWidth,
        hasOverflowElements: Array.from(document.querySelectorAll('*')).some(el => 
          el.scrollWidth > el.clientWidth
        ),
        breakpoint: window.getComputedStyle(document.body, '::before').content
      };
    }`
  });
}
```

**3. RTL Layout Verification**
```typescript
// Comprehensive RTL layout testing
await mcp_chromedevtool_evaluate_script({
  function: `() => {
    // Switch to Persian
    document.documentElement.setAttribute('lang', 'fa');
    document.documentElement.setAttribute('dir', 'rtl');
    
    return {
      direction: document.documentElement.dir,
      language: document.documentElement.lang,
      rtlStylesheet: document.querySelector('link[href*="bootstrap-rtl"]') ? 'Loaded' : 'Missing'
    };
  }`
});

await mcp_chromedevtool_take_screenshot({ 
  fullPage: true, 
  filePath: 'rtl-layout-verification.png' 
});

// Check for RTL-specific issues
const rtlIssues = await mcp_chromedevtool_evaluate_script({
  function: `() => {
    const issues = [];
    
    // Check for elements with hardcoded left/right positioning
    document.querySelectorAll('*').forEach(el => {
      const styles = window.getComputedStyle(el);
      if (styles.textAlign === 'left' || styles.textAlign === 'right') {
        issues.push({
          element: el.tagName + (el.className ? '.' + el.className : ''),
          issue: 'Hardcoded text alignment: ' + styles.textAlign
        });
      }
    });
    
    return issues;
  }`
});
```

**4. CSS Variable Inspection**
```typescript
// Verify theme CSS variables are properly applied
const themeVariables = await mcp_chromedevtool_evaluate_script({
  function: `() => {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    
    return {
      primary: {
        dark: computedStyle.getPropertyValue('--primary-dark'),
        medium: computedStyle.getPropertyValue('--primary-medium'),
        light: computedStyle.getPropertyValue('--primary-light')
      },
      accent: {
        primary: computedStyle.getPropertyValue('--accent-primary'),
        hover: computedStyle.getPropertyValue('--accent-hover')
      },
      shadows: {
        md: computedStyle.getPropertyValue('--shadow-md'),
        lg: computedStyle.getPropertyValue('--shadow-lg')
      }
    };
  }`
});
```

#### ⚡ Performance Audits and Optimization

**Comprehensive Performance Testing:**
⚠️ **MANDATORY: Test Core Web Vitals** and streaming performance

**1. Core Web Vitals Measurement**
```typescript
// Start performance trace
await mcp_chromedevtool_performance_start_trace({ 
  reload: true, 
  autoStop: false 
});

// Navigate and interact with the application
await mcp_chromedevtool_navigate_page({ url: 'https://localhost:5173/dashboard' });
await mcp_chromedevtool_wait_for({ text: 'Dashboard', timeout: 10000 });

// Stop trace and analyze
await mcp_chromedevtool_performance_stop_trace();

// Get detailed performance insights
const performanceInsights = await mcp_chromedevtool_performance_analyze_insight({
  insightName: 'LCPBreakdown'
});
```

**2. Network Performance Testing**
```typescript
// Test different network conditions
const networkConditions = ['Fast 3G', 'Slow 3G', 'Fast 4G', 'Slow 4G'];

for (const condition of networkConditions) {
  await mcp_chromedevtool_emulate_network({ throttlingOption: condition });
  
  // Measure load time
  const startTime = Date.now();
  await mcp_chromedevtool_navigate_page({ url: 'https://localhost:5173' });
  await mcp_chromedevtool_wait_for({ text: 'Dashboard' });
  const loadTime = Date.now() - startTime;
  
  console.log(`${condition} load time: ${loadTime}ms`);
}

// Reset to no throttling
await mcp_chromedevtool_emulate_network({ throttlingOption: 'No emulation' });
```

**3. CPU Performance Testing**
```typescript
// Test under CPU throttling
await mcp_chromedevtool_emulate_cpu({ throttlingRate: 4 }); // 4x slowdown

// Test heavy operations
const heavyOperationTest = await mcp_chromedevtool_evaluate_script({
  function: `() => {
    const start = performance.now();
    
    // Simulate heavy data processing (like AG Grid rendering)
    const data = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      name: 'Item ' + i,
      value: Math.random() * 1000
    }));
    
    // Process data
    const processed = data.map(item => ({
      ...item,
      formatted: new Intl.NumberFormat('fa-IR').format(item.value)
    }));
    
    const end = performance.now();
    return {
      processingTime: end - start,
      dataSize: processed.length,
      memoryUsage: performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize
      } : 'Not available'
    };
  }`
});

// Reset CPU throttling
await mcp_chromedevtool_emulate_cpu({ throttlingRate: 1 });
```

**4. gRPC Streaming Performance**
```typescript
// Test real-time streaming performance
const streamingPerformance = await mcp_chromedevtool_evaluate_script({
  function: `() => {
    return new Promise(resolve => {
      const metrics = {
        startTime: performance.now(),
        messagesReceived: 0,
        avgLatency: 0,
        errors: []
      };
      
      // Monitor streaming for 30 seconds
      setTimeout(() => {
        resolve({
          ...metrics,
          duration: performance.now() - metrics.startTime,
          messagesPerSecond: metrics.messagesReceived / 30
        });
      }, 30000);
      
      // Hook into gRPC stream monitoring
      if (window.grpcStreamMonitor) {
        window.grpcStreamMonitor.onMessage = () => metrics.messagesReceived++;
        window.grpcStreamMonitor.onError = (error) => metrics.errors.push(error);
      }
    });
  }`
});
```

**5. Memory Leak Detection**
```typescript
// Monitor memory usage over time
const memoryLeakTest = await mcp_chromedevtool_evaluate_script({
  function: `() => {
    const measurements = [];
    let interval;
    
    return new Promise(resolve => {
      // Take memory measurements every 5 seconds
      interval = setInterval(() => {
        if (performance.memory) {
          measurements.push({
            timestamp: Date.now(),
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize
          });
        }
        
        // Run for 2 minutes
        if (measurements.length >= 24) {
          clearInterval(interval);
          
          // Analyze memory trend
          const trend = measurements.map((m, i) => ({
            time: i * 5,
            memoryMB: Math.round(m.used / 1024 / 1024)
          }));
          
          resolve({
            measurements: trend,
            memoryIncrease: trend[trend.length - 1].memoryMB - trend[0].memoryMB,
            possibleLeak: trend[trend.length - 1].memoryMB > trend[0].memoryMB * 1.5
          });
        }
      }, 5000);
    });
  }`
});
```

#### 🔄 DevTools MCP Best Practices

**Workflow Integration:**
1. **Start with snapshots** - Always take DOM snapshots to get element UIDs
2. **Monitor console** - Check for errors before and after each test
3. **Test incrementally** - Break complex scenarios into smaller steps
4. **Capture evidence** - Take screenshots at key points
5. **Verify cleanup** - Ensure no memory leaks or hanging connections

**Error Handling Pattern:**
```typescript
try {
  await mcp_chromedevtool_take_snapshot();
  await mcp_chromedevtool_click({ uid: 'target-element' });
  await mcp_chromedevtool_wait_for({ text: 'Expected Result' });
} catch (error) {
  // Capture failure state
  await mcp_chromedevtool_take_screenshot({ 
    filePath: 'error-state.png' 
  });
  await mcp_chromedevtool_list_console_messages();
  throw error;
}
```

**Multi-Browser Testing:**
```typescript
// Test multiple pages simultaneously
const pages = await mcp_chromedevtool_list_pages();
for (let i = 0; i < pages.length; i++) {
  await mcp_chromedevtool_select_page({ pageIdx: i });
  await mcp_chromedevtool_take_screenshot({ 
    filePath: `page-${i}-state.png` 
  });
}
```

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

## ✅ Pre-Commit Checklist

### Code Quality
- [ ] **TypeScript**: All types defined, no `any` type used
- [ ] **DTOs**: Request/response DTOs defined in `src/types/api.ts`
- [ ] **Props**: All component props have TypeScript interfaces
- [ ] **Hooks**: Custom hooks follow `use*` naming convention
- [ ] **Naming**: Consistent naming conventions followed
- [ ] **Comments**: Complex logic has explanatory comments
- [ ] **No Console Logs**: Remove debug `console.log` statements
- [ ] **Imports**: Organized and no unused imports

### Internationalization
- [ ] **No Hardcoded Text**: All text goes through `t()` function
- [ ] **Translation Keys**: Keys exist in both `fa` and `en` files
- [ ] **RTL Layout**: Persian layout tested and works correctly
- [ ] **Language Switch**: Component works when language changes
- [ ] **Date/Time**: Localized date/time formatting used

### Styling & Theming
- [ ] **Bootstrap First**: Bootstrap utilities used before custom CSS
- [ ] **Theme Variables**: Only CSS variables used, no hardcoded colors
- [ ] **All Themes**: Tested with all 7 theme presets
- [ ] **No Inline Styles**: No `style` prop used (use CSS classes)
- [ ] **Responsive**: Mobile, tablet, desktop all tested
- [ ] **RTL Styling**: No broken layouts in RTL mode

### Redux & State Management
- [ ] **Existing Patterns**: Follow existing Redux patterns
- [ ] **RTK Query**: Use for all API calls
- [ ] **Selectors**: Use typed selectors from hooks
- [ ] **No Direct Mutation**: Use Redux Toolkit's immer
- [ ] **State Minimal**: Keep only necessary data in Redux

### API & Backend Integration
- [ ] **HTTPS Only**: All API calls use `https://localhost:7136`
- [ ] **Error Handling**: API errors handled gracefully
- [ ] **Loading States**: Loading indicators for async operations
- [ ] **Auth States**: Protected routes require authentication
- [ ] **Refresh Token**: Automatic refresh handled by RTK Query

### gRPC & Real-time Streaming
- [ ] **Stream Lifecycle**: Proper connection, disconnect, error handling
- [ ] **AbortController**: Cleanup on component unmount
- [ ] **Schema-based**: Use `create()` for Protobuf messages (v2 pattern)
- [ ] **Error States**: ConnectError handled appropriately
- [ ] **Connection UI**: Show connection status to user

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
- [ ] **Theme Colors**: Uses CSS variables for colors
- [ ] **Performance**: `useMemo` used for chart options

### Performance
- [ ] **Lazy Loading**: Route components lazy loaded
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

### Testing
- [ ] **Manual Testing**: Feature tested manually
- [ ] **Both Languages**: Works in fa and en
- [ ] **All Breakpoints**: Mobile, tablet, desktop tested
- [ ] **Error Scenarios**: Error states tested
- [ ] **Browser Console**: No errors or warnings
- [ ] **DevTools**: Network requests successful

### Documentation
- [ ] **Element IDs**: All interactive elements have `data-id-ref`
- [ ] **Code Comments**: Complex logic documented
- [ ] **README**: Updated if new setup steps required
- [ ] **Types Exported**: Public types exported from index files

## 🎨 Best Practices Summary

### DO ✅
- Use functional components with hooks
- Use TypeScript with strict types
- Use translation system for all text
- Use theme CSS variables for styling
- Use Bootstrap utilities first
- Use lazy loading for routes
- Use memoization for performance
- Use error boundaries
- Use DTOs for API communication
- Use existing patterns and conventions
- Test in both languages
- Test RTL layout
- Test all breakpoints

### DON'T ❌
- Don't use class components
- Don't use `any` type
- Don't hardcode text strings
- Don't hardcode colors/styles
- Don't use inline styles
- Don't use alternate ports
- Don't skip error handling
- Don't forget loading states
- Don't mutate Redux state directly
- Don't forget to clean up streams/subscriptions
- Don't skip RTL testing
- Don't skip responsive testing
- Don't log sensitive data
- Don't use outdated Protobuf patterns (v1)