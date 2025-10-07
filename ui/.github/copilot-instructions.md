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

### DevTools MCP Integration
Available MCP tools for browser automation:
- `navigate_page` - Navigate to URLs
- `take_screenshot` - Capture visual state
- `take_snapshot` - Get DOM snapshot
- `evaluate_script` - Run JavaScript
- `list_console_messages` - Check console logs
- `list_network_requests` - Monitor API calls
- `resize_page` - Test responsive behavior
- `performance_start_trace` / `performance_stop_trace` - Performance profiling

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