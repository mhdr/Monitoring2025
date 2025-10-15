# Monitoring2025 UI - Copilot Instructions
**Enterprise React + TypeScript + Redux Toolkit + Material-UI (MUI)**  
**Bilingual (fa/en) • RTL/LTR Support • Real-time Monitoring • .NET Core API**

## 🎯 Project Overview
This is a production-grade enterprise monitoring dashboard with:
- **Real-time streaming** via gRPC/Connect-RPC
- **Bilingual support** (Persian/English) with full RTL/LTR layouts
- **Advanced data grids** using AG Grid Enterprise
- **Secure authentication** with JWT + refresh token rotation
- **Theme system** with Material-UI theming (light/dark modes)
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
- **RTL Support**: MUI automatically handles RTL when `direction: 'rtl'` is set in theme
- **Font**: IRANSansX for Persian, system fonts for English

### Key Requirements
- Use `useTranslation()` hook and `t()` function for all user-facing text
- Support dynamic translations with variables using object parameter
- Support pluralization using count parameter
- Translation keys use hierarchical dot notation

### RTL Considerations
- **MUI Theme**: Automatically flips layouts when `direction: 'rtl'` is set in theme
- **Text Alignment**: Use `start`/`end` instead of `left`/`right`
- **Margins/Padding**: Use logical properties (`margin-inline-start` vs `margin-left`)
- **Icons**: Some icons may need mirroring (arrows, chevrons)
- **MUI Components**: Built-in RTL support for all components (Grid, Stack, Box, etc.)

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
- **Material-UI (MUI) v6**: Component library with responsive grid system (xs/sm/md/lg/xl)
- **Vite**: Build tool and dev server (port 5173)

### Code Quality Standards
⚠️ **MANDATORY: TypeScript strict mode** - All code must be fully typed
⚠️ **NO `any` type** - Use `unknown` with type guards or proper interfaces
⚠️ **NO class components** - Only functional components with hooks
⚠️ **USE MUI sx prop or styled components** - Avoid inline styles when possible
⚠️ **USE MUI theme colors** - Access via theme palette (theme.palette.primary.main, etc.)
⚠️ **MANDATORY: Element identification** - ALL elements created by AI must have `data-id-ref` attribute

### Component Requirements
- Always define TypeScript interfaces for component props
- Use functional components with React.FC type
- Include `data-id-ref` attribute on all elements
- Prefer MUI `sx` prop for styling over inline styles
- Use MUI theme system for colors (theme.palette.primary.main, theme.palette.background.paper, etc.)
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
- **Components**: PascalCase
- **Hooks**: camelCase with `use` prefix
- **Types**: PascalCase
- **Constants**: UPPER_SNAKE_CASE
- **CSS Classes**: kebab-case

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

## 🎨 Theme System (Material-UI)

⚠️ **CRITICAL: The project uses Material-UI theming system**
⚠️ **NEVER hardcode colors, gradients, or shadows**
⚠️ **ALWAYS use MUI theme palette and system values**

### How Theming Works
1. User selects light or dark mode
2. MUI theme provider applies theme with RTL support for Persian
3. All MUI components automatically adapt to theme
4. Custom components use theme values via `sx` prop or `useTheme()` hook

### Files
- **Theme Provider**: `src/contexts/MuiThemeProvider.tsx` (Theme provider wrapper)
- **Theme Hook**: `src/hooks/useMuiTheme.ts` (React hook for theme management)
- **Theme Switcher**: `src/components/MuiThemeSwitcher.tsx` (UI control for theme)

### Available Modes
- **Light Mode**: Default light theme
- **Dark Mode**: Dark theme with appropriate contrast

### MUI Theme Palette (MANDATORY)
**Primary Colors**: 
- `theme.palette.primary.main`, `theme.palette.primary.light`, `theme.palette.primary.dark`
- `theme.palette.primary.contrastText`

**Secondary Colors**: 
- `theme.palette.secondary.main`, `theme.palette.secondary.light`, `theme.palette.secondary.dark`

**Status Colors**:
- `theme.palette.error.main` - Error/danger states
- `theme.palette.warning.main` - Warning states
- `theme.palette.info.main` - Informational states
- `theme.palette.success.main` - Success states

**Background Colors**:
- `theme.palette.background.default` - Page background
- `theme.palette.background.paper` - Card/surface background

**Text Colors**:
- `theme.palette.text.primary` - Primary text
- `theme.palette.text.secondary` - Secondary/muted text
- `theme.palette.text.disabled` - Disabled text

**Dividers and Borders**:
- `theme.palette.divider` - Divider/border color

### MUI Components (Use These First)
MUI provides comprehensive component library:
- **Layout**: `Box`, `Container`, `Grid`, `Stack`, `Paper`
- **Buttons**: `Button`, `IconButton`, `Fab`, `ButtonGroup`
- **Inputs**: `TextField`, `Select`, `Checkbox`, `Radio`, `Switch`
- **Data Display**: `Typography`, `Card`, `Chip`, `Avatar`, `Badge`
- **Feedback**: `Alert`, `Snackbar`, `Dialog`, `Backdrop`, `CircularProgress`
- **Navigation**: `AppBar`, `Drawer`, `Tabs`, `Menu`, `Breadcrumbs`

### MUI Icons (MANDATORY: Use for ALL icons)
⚠️ **CRITICAL: Always use Material Icons from @mui/icons-material package**
⚠️ **NEVER use custom SVG icons or other icon libraries** unless explicitly required

**Package**: `@mui/icons-material`
**Import Pattern**: `import { IconName } from '@mui/icons-material';`

#### Available Icon Variants
MUI Icons come in 5 variants (themes):
- **Filled** (default): `import { Home } from '@mui/icons-material';`
- **Outlined**: `import { HomeOutlined } from '@mui/icons-material';`
- **Rounded**: `import { HomeRounded } from '@mui/icons-material';`
- **TwoTone**: `import { HomeTwoTone } from '@mui/icons-material';`
- **Sharp**: `import { HomeSharp } from '@mui/icons-material';`

#### Common Icons by Category

**Navigation & Actions:**
- `Menu`, `MenuOpen`, `Close`, `ArrowBack`, `ArrowForward`
- `Home`, `Dashboard`, `Settings`, `Search`, `Refresh`
- `ExpandMore`, `ExpandLess`, `ChevronLeft`, `ChevronRight`
- `MoreVert`, `MoreHoriz`, `FilterList`, `Sort`

**User & Authentication:**
- `Person`, `AccountCircle`, `Group`, `Login`, `Logout`
- `Lock`, `LockOpen`, `Visibility`, `VisibilityOff`
- `PersonAdd`, `PersonRemove`, `Badge`, `ContactMail`

**Status & Feedback:**
- `CheckCircle`, `Cancel`, `Error`, `Warning`, `Info`
- `Done`, `Clear`, `HelpOutline`, `Notifications`, `NotificationsActive`
- `Sync`, `CloudDone`, `CloudOff`, `CheckCircleOutline`

**Data & Content:**
- `Edit`, `Delete`, `Add`, `Remove`, `Save`, `ContentCopy`
- `Download`, `Upload`, `Share`, `Print`, `Folder`, `FolderOpen`
- `Description`, `Article`, `AttachFile`, `InsertDriveFile`

**Media & Communication:**
- `PlayArrow`, `Pause`, `Stop`, `VolumeUp`, `VolumeOff`
- `Call`, `Email`, `Message`, `Chat`, `Send`
- `Image`, `PhotoCamera`, `Videocam`, `Mic`

**Date & Time:**
- `CalendarToday`, `Event`, `Schedule`, `AccessTime`, `DateRange`
- `Today`, `Update`, `History`, `Timer`, `Alarm`

**Data Visualization:**
- `BarChart`, `PieChart`, `ShowChart`, `Timeline`, `TrendingUp`, `TrendingDown`
- `Assessment`, `Equalizer`, `MultilineChart`, `BubbleChart`

**Connectivity & System:**
- `Wifi`, `WifiOff`, `SignalWifi4Bar`, `Cloud`, `CloudQueue`
- `Computer`, `Storage`, `Memory`, `Router`, `Dns`, `Power`, `PowerOff`

#### Usage Patterns
- **Color Props**: Use `color="primary"`, `color="error"`, `color="inherit"`, `color="action"`, `color="disabled"`
- **Size Props**: Use `fontSize="small"` (20px), `fontSize="medium"` (24px default), `fontSize="large"` (35px), `fontSize="inherit"`, or custom size via `sx={{ fontSize: 40 }}`
- **Icon Buttons**: Wrap icon in `IconButton` component with `aria-label`, `onClick`, `color`, and `data-id-ref`
- **Icons with Text**: Use `startIcon` or `endIcon` props on Button components
- **RTL Support**: Transform directional icons with `sx={{ transform: isRTL ? 'scaleX(-1)' : 'none' }}`
- **List Items**: Place icons in `ListItemIcon` component within `ListItem`

#### Critical Rules for Icons
1. **ALWAYS use @mui/icons-material** - consistent design system
2. **Use theme colors** - `color="primary"`, `color="error"`, etc.
3. **Include aria-label** - for accessibility when icon is standalone
4. **Consider RTL** - flip directional icons (arrows, chevrons) in RTL mode
5. **Use semantic icons** - choose icons that match their purpose
6. **Consistent variant** - stick to one variant (Outlined/Filled) per project
7. **Add data-id-ref** - for testing and debugging
8. **Size appropriately** - use fontSize prop, not hardcoded pixel values

#### Icon Search
Find icons at: https://mui.com/material-ui/material-icons/
- Search by name or category
- Preview all variants
- Copy import statement
- Check accessibility guidelines

### Critical Rules
1. **NEVER hardcode colors** - always use theme palette values
2. **Use `sx` prop** - for component-level styling with theme access
3. **Use `useTheme()` hook** - when you need theme values in JavaScript logic
4. **Always test both modes** - switch between light/dark themes to verify
5. **Use MUI components** - leverage built-in components before creating custom ones
6. **Respect spacing** - use `theme.spacing()` for consistent spacing

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
- Use MUI theme colors via `useTheme()` hook
- Include `data-id-ref` on chart components

### Performance Tips
- Use `useMemo` to prevent unnecessary option recalculations
- Use SVG renderer for better performance with many data points
- Debounce window resize events for responsive charts
- Lazy load chart components to reduce initial bundle size

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
- [ ] **Theme Compatibility**: Works with both light and dark modes
- [ ] **Accessibility**: Keyboard navigation and screen readers

### Manual Testing Process
1. Test in English (LTR)
2. Switch to Persian and verify RTL layout
3. Resize browser through all breakpoints
4. Switch between light and dark themes
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
- For lists/grids: Include context like element identifiers
- For modals/dialogs: Include modal name in the identifier

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
1. **Authentication Flow**: Navigate to login, take snapshot, fill form with UIDs, click submit, wait for redirect
2. **Bilingual Testing**: Click language switcher, take screenshots for RTL verification, test form inputs in both languages
3. **Real-Time Monitoring**: Navigate to monitoring page, use `evaluate_script` to test gRPC streaming connection state
4. **Complex Interactions**: Test drag-and-drop with element UIDs, test keyboard navigation

#### 🎨 Live Styling and Layout Inspection

**Real-Time Theme and Layout Testing:**
⚠️ **MANDATORY: Test both light and dark themes** and responsive breakpoints

**Key Testing Procedures:**
1. **Theme System**: Test light and dark modes, use `evaluate_script` to inspect MUI theme values, take screenshots
2. **Responsive Layout**: Test breakpoints using `resize_page`, check for horizontal scroll and overflow
3. **RTL Layout**: Switch to Persian, verify MUI RTL handling, check for hardcoded left/right positioning
4. **MUI Theme Values**: Use `evaluate_script` to inspect theme palette values and verify correct application

#### ⚡ Performance Audits and Optimization

**Comprehensive Performance Testing:**
⚠️ **MANDATORY: Test Core Web Vitals** and streaming performance

**Key Performance Tests:**
1. **Core Web Vitals**: Use `performance_start_trace`, navigate/interact, then `performance_stop_trace` and `performance_analyze_insight`
2. **Network Testing**: Use `emulate_network` with different conditions, measure load times, reset to "No emulation"
3. **CPU Testing**: Use `emulate_cpu` with throttling rate, run heavy operations via `evaluate_script`, measure processing time
4. **gRPC Streaming**: Use `evaluate_script` to monitor streaming metrics (messages received, latency, errors)
5. **Memory Leaks**: Use `evaluate_script` to sample memory over time, analyze trend for memory increases

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

### MUI MCP Server Integration
⚠️ **MANDATORY: Use MUI MCP Server for Material-UI documentation and examples**

The MUI MCP Server provides direct access to official Material-UI documentation and code examples, ensuring you're using the latest MUI patterns, components, and best practices.

#### 📚 MUI Documentation Access

**Available Tools:**
- `mcp_mui-mcp_useMuiDocs` - Access Material-UI documentation for specific versions
- `mcp_mui-mcp_fetchDocs` - Fetch detailed documentation from specific URLs

**Supported MUI Packages:**
- **@mui/material** - Core Material-UI components (v5.17.1, v6.4.12, v7.2.0)
- **@mui/x-data-grid** - Data Grid components (v7.29.7, v8.8.0)
- **@mui/x-charts** - Chart components (v7.29.1, v8.8.0)
- **@mui/x-date-pickers** - Date/Time pickers (v7.29.4, v8.8.0)
- **@mui/x-tree-view** - Tree view components (v7.29.1, v8.8.0)
- **@mui/x-common-concepts** - Common concepts across MUI X components (v7.29.7, v8.8.0)

#### 🎯 When to Use MUI MCP

**MANDATORY Usage Scenarios:**
- Before implementing any MUI component for the first time
- When encountering MUI component errors or unexpected behavior
- Before using MUI theme customization features
- When implementing responsive layouts with MUI Grid/Stack
- Before using MUI sx prop patterns or styling solutions
- When working with MUI form components and validation
- Before implementing MUI data display components (Tables, Cards, Lists)
- When setting up MUI RTL support for Persian language
- Before using advanced MUI features (virtualization, customization, etc.)

#### 📖 Usage Pattern

**Step 1: Identify the MUI Package and Version**
This project uses **@mui/material v6** - always reference v6 documentation using the MUI MCP server

**Step 2: Fetch Specific Documentation**
After getting the documentation structure, fetch specific pages using the appropriate MUI MCP tool

#### 🔍 Common Use Cases

**1. Component Implementation:**
- Use MUI MCP before creating any component using MUI
- Verify current API and prop interfaces
- Check for deprecated patterns or new features
- Get official code examples

**2. Theme Customization:**
- Reference official theming documentation
- Verify palette structure and theme values
- Check RTL support requirements
- Understand theme provider patterns

**3. Responsive Design:**
- Get documentation on Grid system usage
- Verify breakpoint definitions and usage
- Check responsive prop patterns
- Understand sx prop breakpoint syntax

**4. Form Components:**
- Verify TextField, Select, Checkbox patterns
- Check form validation integration
- Understand controlled/uncontrolled patterns
- Get accessibility best practices

**5. Data Display:**
- Check Table, Card, List component APIs
- Verify data formatting patterns
- Understand virtualization options
- Check pagination and sorting patterns

#### ⚡ MUI MCP Best Practices

**Workflow Integration:**
1. **Documentation First** - Always check MUI docs before implementation
2. **Version Specific** - Use @mui/material v6 documentation for this project
3. **Code Examples** - Fetch and adapt official examples
4. **Pattern Consistency** - Follow documented patterns throughout the codebase
5. **Update Knowledge** - Your training data may be outdated - always verify with MUI MCP

**Critical Guidelines:**
- Never assume MUI API from memory - always verify with MUI MCP
- Check for breaking changes between versions
- Verify prop interfaces before using components
- Follow official styling patterns (sx prop over inline styles)
- Check RTL considerations for bilingual support
- Verify theme integration patterns
- Reference official TypeScript types

**Integration with Project Standards:**
- Use MUI MCP to verify theme palette access patterns
- Check official examples for responsive design
- Verify component prop TypeScript interfaces
- Ensure RTL support follows MUI guidelines
- Validate accessibility patterns from official docs

#### 🎨 MUI Theme System Reference

When using MUI MCP for theme documentation:
- Verify current theme palette structure
- Check theme spacing and breakpoint definitions
- Understand theme provider configuration
- Learn about theme customization patterns
- Verify RTL theme configuration
- Check dark mode implementation patterns

**Remember:** This project uses MUI v6 with custom theme configuration. Always cross-reference MUI MCP documentation with the project's `MuiThemeProvider.tsx` implementation.

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
- [ ] **MUI Components First**: MUI components used before custom implementations
- [ ] **MUI Theme Values Only**: ONLY MUI theme palette values used, NO hardcoded colors
- [ ] **Both Theme Modes**: Tested with both light and dark modes
- [ ] **Use sx Prop**: MUI `sx` prop preferred over inline styles
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
- Use MUI MCP Server to verify component usage and APIs
- Use MUI theme palette values for ALL colors
- Use MUI components first before custom implementations
- Use lazy loading for routes
- Use memoization for performance
- Use error boundaries
- Use DTOs for API communication
- Use existing patterns and conventions
- Test in both languages
- Test RTL layout
- Test both theme modes (light/dark)
- Test all breakpoints

### DON'T ❌
- Don't use class components
- Don't use `any` type
- Don't hardcode text strings
- Don't assume MUI APIs from memory - verify with MUI MCP
- Don't hardcode colors (hex, rgb, color names) - ONLY use MUI theme palette
- Don't create custom color variables outside of MUI theme
- Don't use inline styles when `sx` prop is available
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