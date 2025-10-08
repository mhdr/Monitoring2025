# Monitoring2025 UI - Copilot Instructions
**Enterprise React + TypeScript + Redux Toolkit + Bootstrap 5**  
**Bilingual (fa/en) • RTL/LTR Support • Real-time Monitoring • .NET Core API**

## 🎯 Project Overview
This is a production-grade enterprise monitoring dashboard with:
- **Real-time streaming** via gRPC/Connect-RPC
- **Bilingual support** (Persian/English) with full RTL/LTR layouts
- **Advanced data grids** using AG Grid Enterprise
- **Secure authentication** with JWT + refresh token rotation
- **Theme system** with 26 Bootswatch themes using Bootstrap CSS variables
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

### Key Requirements
- Use `useTranslation()` hook and `t()` function for all user-facing text
- Support dynamic translations with variables: `t('messages.welcome', { name: userName })`
- Support pluralization: `t('items.count', { count })`
- Translation keys use hierarchical dot notation (e.g., `pages.dashboard.title`, `common.buttons.save`)

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
⚠️ **NO inline styles** - Use CSS classes with Bootstrap variables
⚠️ **NO custom colors** - ONLY use Bootstrap CSS variables (--bs-primary, --bs-body-bg, etc.)
⚠️ **MANDATORY: Element identification** - ALL elements created by AI must have `data-id-ref` attribute

### Component Requirements
- Always define TypeScript interfaces for component props
- Use functional components with React.FC type
- Include `data-id-ref` attribute on all elements
- No inline styles - use CSS classes with Bootstrap variables
- ONLY use Bootstrap CSS variables for colors (--bs-primary, --bs-secondary, --bs-success, --bs-danger, --bs-warning, --bs-info, --bs-light, --bs-dark, --bs-body-bg, --bs-body-color, etc.)
- Use proper event handler typing

### Code Splitting & Lazy Loading
⚠️ **MANDATORY: Lazy load all page components** to optimize bundle size
- Use `React.lazy()` for route components
- Wrap with `Suspense` and provide fallback component
- Import `LoadingScreen` component for fallbacks

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
- Use `AGGridWrapper` component, not vanilla `createGrid()`
- Enterprise features: Row Grouping, Aggregation, Pivoting, Excel Export, Master-Detail, Advanced Filtering, Server-Side, Tool Panels, Clipboard

## 🎨 Theme System (Bootstrap + Bootswatch)

⚠️ **CRITICAL: The project uses Bootstrap and Bootswatch themes exclusively**
⚠️ **NEVER hardcode colors, gradients, or shadows**
⚠️ **ONLY use Bootstrap CSS variables (--bs-*)**

### How Theming Works
1. User selects a Bootswatch theme (or default Bootstrap) from 26 available themes
2. `bootswatchLoader.ts` dynamically loads the theme CSS file
   - For Persian (RTL): loads `bootstrap.rtl.min.css` variant
   - For English (LTR): loads `bootstrap.min.css` variant
3. Bootstrap CSS variables are automatically set by the loaded theme
4. All UI elements, charts, and components use Bootstrap variables directly

### Files
- **Theme Types**: `src/types/themes.ts` (BootswatchTheme interface, 26 themes)
- **Theme Loader**: `src/utils/bootswatchLoader.ts` (dynamic CSS loading)
- **Theme Utils**: `src/utils/themeUtils.ts` (applyTheme, getCurrentThemeColors)
- **Theme Hook**: `src/hooks/useTheme.ts` (React hook for theme management)
- **Theme State**: `src/store/slices/themeSlice.ts` (Redux state)
- **Theme CSS**: `src/styles/theme.css` (global overrides using Bootstrap vars)

### Available Themes (26 Total)
**Default**: Bootstrap 5 (no Bootswatch)
**Light Themes** (16): Cerulean, Cosmo, Flatly, Journal, Litera, Lumen, Lux, Materia, Minty, Morph, Pulse, Quartz, Sandstone, Simplex, Spacelab, Yeti, Zephyr
**Dark Themes** (6): Cyborg, Darkly, Slate, Solar, Superhero, Vapor
**Colorful Themes** (2): Sketchy, United

### Bootstrap CSS Variables (MANDATORY)
**Colors**: `--bs-primary`, `--bs-secondary`, `--bs-success`, `--bs-info`, `--bs-warning`, `--bs-danger`, `--bs-light`, `--bs-dark`

**RGB Variants** (for rgba usage): `--bs-primary-rgb`, `--bs-secondary-rgb`, `--bs-success-rgb`, `--bs-danger-rgb`, etc.

**Body**: `--bs-body-bg`, `--bs-body-color`, `--bs-body-bg-rgb`, `--bs-body-color-rgb`

**Text**: `--bs-emphasis-color`, `--bs-secondary-color`, `--bs-tertiary-color`

**Backgrounds**: `--bs-secondary-bg`, `--bs-tertiary-bg`

**Borders**: `--bs-border-color`, `--bs-border-width`, `--bs-border-radius`

**Shadows**: `--bs-box-shadow`, `--bs-box-shadow-sm`, `--bs-box-shadow-lg`

**Links**: `--bs-link-color`, `--bs-link-hover-color`

### Usage Examples
```css
/* Correct - Use Bootstrap variables */
.my-component {
  background-color: var(--bs-primary);
  color: var(--bs-body-color);
  border: 1px solid var(--bs-border-color);
  box-shadow: var(--bs-box-shadow);
}

/* Correct - Use RGB variants for transparency */
.overlay {
  background-color: rgba(var(--bs-dark-rgb), 0.8);
  border: 1px solid rgba(var(--bs-primary-rgb), 0.3);
}

/* WRONG - Never hardcode colors */
.my-component {
  background-color: #007bff;  /* ❌ WRONG */
  color: #212529;              /* ❌ WRONG */
}
```

### Bootstrap Classes (Use These First)
Bootstrap provides pre-built classes for colors:
- **Text**: `.text-primary`, `.text-secondary`, `.text-success`, `.text-danger`, `.text-warning`, `.text-info`, `.text-light`, `.text-dark`, `.text-body`, `.text-muted`
- **Backgrounds**: `.bg-primary`, `.bg-secondary`, `.bg-success`, `.bg-danger`, `.bg-warning`, `.bg-info`, `.bg-light`, `.bg-dark`, `.bg-body`
- **Buttons**: `.btn-primary`, `.btn-secondary`, `.btn-success`, `.btn-danger`, `.btn-warning`, `.btn-info`, `.btn-light`, `.btn-dark`
- **Borders**: `.border`, `.border-primary`, `.border-secondary`, etc.

### Critical Rules
1. **NEVER create custom color CSS variables** - Bootstrap provides everything
2. **NEVER hardcode hex/rgb colors** - always use Bootstrap variables
3. **Always test with multiple themes** - switch between light/dark themes to verify
4. **Use Bootstrap utility classes first** - before writing custom CSS
5. **For custom CSS, ONLY use Bootstrap variables** - `var(--bs-primary)`, etc.

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

### Key Requirements
- Always define TypeScript interfaces for chart props
- Use `useTranslation()` and `useLanguage()` hooks
- Use `useMemo` for chart options to prevent recalculations
- Adjust layout based on `isRTL` (title, legend, tooltip positions)
- Use Bootstrap CSS variables for all colors (read via JavaScript: `getComputedStyle(document.documentElement).getPropertyValue('--bs-primary')`)
- Include `data-id-ref` on chart components

### Chart Color Guidelines
```javascript
// Read Bootstrap colors for charts
const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--bs-primary').trim();
const successColor = getComputedStyle(document.documentElement).getPropertyValue('--bs-success').trim();
const dangerColor = getComputedStyle(document.documentElement).getPropertyValue('--bs-danger').trim();

// Use in ECharts options
const option = {
  color: [primaryColor, successColor, dangerColor],
  backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bs-body-bg').trim(),
  textStyle: {
    color: getComputedStyle(document.documentElement).getPropertyValue('--bs-body-color').trim()
  }
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

### Key Patterns
- Use Bootstrap mobile-first responsive classes (col-12 col-md-6 col-lg-4)
- Use display utilities (d-none d-md-block) for conditional visibility
- Use font size utilities (fs-6 fs-md-4 fs-lg-2) for responsive typography
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
- Server: .NET Core ASP.NET, HTTPS-only
- Base: `https://localhost:7136`
- Swagger: `https://localhost:7136/swagger/v1/swagger.json`
- Auth: JWT + refresh token rotation
- Test: `test` / `Password@12345`
- Client: `src/services/rtkApi.ts` (RTK Query)
- DTOs: Define in `src/types/api.ts`, match backend DTOs exactly

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

### Server Streaming
⚠️ Use `for await...of` for async stream iteration
- Pattern: `for await (const update of client.streamMethod(request)) { }`
- Lifecycle: Connection, streaming, error handling, cleanup
- Hook: `useMonitoringStream(clientId, autoConnect)`
- Abort: `AbortController` for graceful disconnection

### Code Generation
⚠️ Use Buf CLI + protoc-gen-es for TypeScript generation
- **Buf Config**: `buf.yaml` (modules), `buf.gen.yaml` (generation)
- **Command**: `npm run grpc:generate` (buf generate)
- **Output**: `src/gen/` (TypeScript schemas + services)
- **Version**: protoc-gen-es v2.9.0, target=ts, import_extension=none

### Message Handling
⚠️ Use schema-based creation with @bufbuild/protobuf v2
- **Create**: `create(MessageSchema, data)` (not new Message())
- **Types**: Generated TypeScript interfaces (strict typing)
- **Serialization**: `toBinary()`, `toJson()` standalone functions
- **Validation**: TypeScript compiler enforces message contracts

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
- Use `useMemo` to memoize expensive computations
- Use `useCallback` to memoize event handlers and callbacks
- Use conditional rendering with `Suspense` for heavy components
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
2. **HTTPS Only**: All API calls must use HTTPS (enforced at 7136)
3. **Token Security**: Never log or expose JWT tokens
4. **Input Validation**: Validate all user input on client AND server
5. **CORS**: Only `https://localhost:5173` is whitelisted

### Security Patterns
- React automatically escapes content - just render user text directly
- Never use `dangerouslySetInnerHTML` without proper sanitization
- Use `authStorage` utility for token storage - never log tokens
- Always validate user input on both client and server

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
- Use `unwrap()` on mutations to handle errors in try/catch blocks
- Check for `'status' in err` to identify RTK Query errors
- Display error state in UI using error property from mutation hook
- Always translate error messages using `t()` function

### gRPC Stream Error Handling
- Use try/catch around `for await...of` stream iteration
- Check `error instanceof ConnectError` for gRPC-specific errors
- Implement retry logic for transient failures (Code.Unavailable)
- Always update connection state on errors

### Global Error Boundary
- Wrap all route components with `LazyErrorBoundary`
- Use `Suspense` with `LoadingScreen` fallback
- Provide user-friendly error messages

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
- [ ] **Theme Compatibility**: Works with multiple Bootswatch themes (test light/dark/colorful)
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
⚠️ **MANDATORY: ALL elements created by AI must have `data-id-ref` attribute**

**Scope**: Every HTML element that you create (divs, buttons, inputs, forms, cards, modals, etc.) must include a `data-id-ref` attribute for automated testing, debugging, and element identification.

**Format**: `data-id-ref="component-element-purpose"` (kebab-case)

**Naming Convention Guidelines**:
- Use descriptive, hierarchical names: `component-element-purpose`
- Examples: `user-card-edit-button`, `search-input-field`, `dashboard-header-logo`
- For lists/grids: Include context like `user-list-item-{id}` or `data-grid-row-{index}`
- For modals/dialogs: Include modal name like `confirm-delete-modal-cancel-button`

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

**Key Debugging Steps:**
1. **Console Monitoring**: Use `list_console_messages` to check for errors, warnings, network failures
2. **Network Debugging**: Use `list_network_requests` with resourceTypes filter to monitor API calls
3. **Live JavaScript**: Use `evaluate_script` to inspect Redux state, auth tokens, theme, language settings
4. **State Inspection**: Take snapshot first, then use `evaluate_script` with element UID to inspect React component props/state

#### 👤 User Behavior Simulation

**Comprehensive User Journey Testing:**
⚠️ **MANDATORY: Test complete user workflows** including bilingual scenarios

**Key Testing Scenarios:**
1. **Authentication Flow**: Navigate to login, take snapshot, fill form with UIDs, click submit, wait for Dashboard
2. **Bilingual Testing**: Click language switcher, take full-page screenshots for RTL verification, test form inputs in both languages
3. **Real-Time Monitoring**: Navigate to monitoring page, use `evaluate_script` to test gRPC streaming connection state
4. **Complex Interactions**: Test drag-and-drop with element UIDs, test keyboard navigation using KeyboardEvent simulation

#### 🎨 Live Styling and Layout Inspection

**Real-Time Theme and Layout Testing:**
⚠️ **MANDATORY: Test all 7 theme presets** and responsive breakpoints

**Key Testing Procedures:**
1. **Theme System**: Test multiple Bootswatch themes (light/dark/colorful), use `evaluate_script` to change theme and verify Bootstrap CSS variables, take screenshots
2. **Responsive Layout**: Test breakpoints (375×667, 768×1024, 1366×768, 1920×1080) using `resize_page`, check for horizontal scroll and overflow
3. **RTL Layout**: Switch to Persian using `evaluate_script`, verify dir="rtl" and bootstrap-rtl.css, check for hardcoded left/right positioning
4. **Bootstrap Variables**: Use `evaluate_script` to inspect `getComputedStyle` and verify all Bootstrap CSS variables (--bs-*) are applied correctly

#### ⚡ Performance Audits and Optimization

**Comprehensive Performance Testing:**
⚠️ **MANDATORY: Test Core Web Vitals** and streaming performance

**Key Performance Tests:**
1. **Core Web Vitals**: Use `performance_start_trace`, navigate/interact, then `performance_stop_trace` and `performance_analyze_insight` for LCP breakdown
2. **Network Testing**: Loop through network conditions (Fast/Slow 3G/4G) using `emulate_network`, measure load times, reset to "No emulation"
3. **CPU Testing**: Use `emulate_cpu` with throttlingRate 4, run heavy operations via `evaluate_script`, measure processing time and memory
4. **gRPC Streaming**: Use `evaluate_script` to monitor streaming metrics over 30 seconds (messages received, latency, errors)
5. **Memory Leaks**: Use `evaluate_script` to sample memory every 5 seconds for 2 minutes, analyze trend for memory increases

#### 🔄 DevTools MCP Best Practices

**Workflow Integration:**
1. **Start with snapshots** - Always take DOM snapshots to get element UIDs
2. **Monitor console** - Check for errors before and after each test
3. **Test incrementally** - Break complex scenarios into smaller steps
4. **Capture evidence** - Take screenshots at key points
5. **Verify cleanup** - Ensure no memory leaks or hanging connections

**Error Handling Pattern:**
- Wrap test sequences in try/catch blocks
- On error, capture screenshot and console messages before re-throwing
- Always document the failure state for debugging

**Multi-Browser Testing:**
- Use `list_pages` to get all open pages
- Loop through and `select_page` by index
- Take screenshots of each page state for comparison

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
- [ ] **Bootstrap Variables Only**: ONLY Bootstrap CSS variables (--bs-*) used, NO hardcoded colors
- [ ] **Multiple Themes**: Tested with at least 3 different themes (light, dark, colorful)
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
- [ ] **Bootstrap Colors**: Uses Bootstrap CSS variables read via JavaScript
- [ ] **Theme Compatibility**: Chart colors update when theme changes
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
- [ ] **Element IDs**: All elements created by AI have `data-id-ref`
- [ ] **Code Comments**: Complex logic documented
- [ ] **README**: Updated if new setup steps required
- [ ] **Types Exported**: Public types exported from index files

## 🎨 Best Practices Summary

### DO ✅
- Use functional components with hooks
- Use TypeScript with strict types
- Use translation system for all text
- Use Bootstrap CSS variables (--bs-*) for ALL colors
- Use Bootstrap utility classes first
- Use lazy loading for routes
- Use memoization for performance
- Use error boundaries
- Use DTOs for API communication
- Use existing patterns and conventions
- Test in both languages
- Test RTL layout
- Test multiple themes (light/dark/colorful)
- Test all breakpoints

### DON'T ❌
- Don't use class components
- Don't use `any` type
- Don't hardcode text strings
- Don't hardcode colors (hex, rgb, color names) - ONLY use Bootstrap variables
- Don't create custom color CSS variables
- Don't use inline styles
- Don't use alternate ports
- Don't skip error handling
- Don't forget loading states
- Don't mutate Redux state directly
- Don't forget to clean up streams/subscriptions
- Don't skip RTL testing
- Don't skip responsive testing
- Don't skip theme compatibility testing
- Don't log sensitive data
- Don't use outdated Protobuf patterns (v1)