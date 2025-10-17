# Monitoring2025 UI - Copilot Instructions
**Enterprise React + TypeScript + Axios + Material-UI (MUI)**  
**Bilingual (fa/en) • RTL/LTR Support • Real-time Monitoring • .NET Core API**

---

## 📋 Quick Reference

### Critical Decision Trees

#### When to Use Which Pattern?

**State Management:**
```
Local component state? → useState/useReducer
Shared across 2-3 components? → Context API (AuthContext, LanguageContext, MonitoringContext)
Complex app state? → Context API with useReducer
Real-time streaming data? → SignalR + Context API
```

**Styling Approach:**
```
Simple styles? → MUI sx prop with theme values
Component variants? → MUI styled() with theme
Global styles? → GlobalStyles component
Dynamic runtime styles? → sx prop with conditional logic
RTL-specific? → sx prop with theme.direction check
```

**Data Fetching:**
```
REST API? → Axios (src/services/apiClient.ts)
Real-time streams? → SignalR (TODO: implement src/services/signalrClient.ts)
Auth-protected? → Axios interceptors with automatic token refresh
File uploads? → FormData with Axios
Cached data? → IndexedDB for offline/persistent storage
```

**Component Patterns:**
```
Simple UI? → Functional component with hooks
Needs error handling? → Wrap with LazyErrorBoundary + Suspense
Heavy computation? → useMemo for results
Event handlers? → useCallback to prevent re-renders
Route component? → React.lazy() + Suspense wrapper
Form? → Controlled components + validation
```

### Must-Follow Rules

| Rule | Why | Example |
|------|-----|---------|
| ⚠️ Use `t()` for all text | i18n support | `t('pages.dashboard.title')` |
| ⚠️ Use logger, not console | Prod cleanup | `logger.log('message')` |
| ⚠️ Use theme palette | Theme consistency | `theme.palette.primary.main` |
| ⚠️ No `any` type | Type safety | `unknown` with type guards |
| ⚠️ Add `data-id-ref` | Testing/debugging | `data-id-ref="login-submit-button"` |
| ⚠️ Lazy load routes | Performance | `React.lazy(() => import('./Page'))` |
| ⚠️ Use MUI components | Design system | `<Button>` before custom buttons |
| ⚠️ IndexedDB for storage | Performance/security | Never localStorage |
| ⚠️ Test both languages | i18n verification | fa and en |
| ⚠️ Test all breakpoints | Responsive design | xs, sm, md, lg, xl |

### Common Pitfalls

| ❌ Don't | ✅ Do | Why |
|---------|-------|-----|
| `console.log()` | `logger.log()` | Prod cleanup |
| `color: '#1976d2'` | `color: theme.palette.primary.main` | Theme support |
| `marginLeft: 16` | `marginInlineStart: 2` (theme.spacing) | RTL support |
| `<div onClick>` | `<Button onClick>` | Accessibility |
| `localStorage` | IndexedDB via `authStorage` | Performance |
| `any` type | `unknown` + type guard | Type safety |
| Hardcoded text | `t('key')` | i18n |
| Class components | Functional + hooks | Modern React |
| Direct state mutation | Immutable updates | State integrity |
| Inline styles | MUI `sx` prop | Theme access |

---

## 🎯 Project Overview
This is a production-grade enterprise monitoring dashboard with:
- **Real-time streaming** via SignalR
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
- **Axios**: HTTP client for REST API calls with interceptors
- **SignalR**: Real-time communication for active alarms streaming
- **Material-UI (MUI) v6**: Component library with responsive grid system (xs/sm/md/lg/xl)
- **Vite**: Build tool and dev server (port 5173)

### Code Quality Standards
⚠️ **MANDATORY: TypeScript strict mode** - All code must be fully typed
⚠️ **NO `any` type** - Use `unknown` with type guards or proper interfaces
⚠️ **NO class components** - Only functional components with hooks
⚠️ **USE MUI sx prop or styled components** - Avoid inline styles when possible
⚠️ **USE MUI theme colors** - Access via theme palette (theme.palette.primary.main, etc.)
⚠️ **MANDATORY: Element identification** - ALL elements created by AI must have `data-id-ref` attribute
⚠️ **MANDATORY: Use logger utility** - NEVER use `console.*` directly, always use logger

### Logging (Development-Only)
⚠️ **CRITICAL: Always use logger utility instead of console.***
⚠️ **CRITICAL: Use logger EXTENSIVELY for debugging - logs are FREE in production (zero overhead)**
⚠️ **Production builds suppress all logs** - keeps console clean for users
⚠️ **Development mode shows all logs** - full debugging capabilities

**Philosophy: Log Everything Important**
Since logger calls are completely stripped from production builds, you should be **generous with logging** during development. There is NO performance penalty in production - the logger code is fully eliminated by tree-shaking.

**Implementation:**
- **Logger Utility**: `src/utils/logger.ts`
- **Zero Runtime Cost**: All logger calls become no-ops in production builds
- **No Bundle Impact**: Dead code elimination removes all logger code from production

**Usage:**
```typescript
// ❌ NEVER do this - appears in production
console.log('[MyComponent] Debug message');
console.error('[MyComponent] Error:', error);

// ✅ ALWAYS do this - development only
import { createLogger } from '../utils/logger';

const logger = createLogger('MyComponent');

logger.log('Debug message');       // [MyComponent] Debug message
logger.error('Error:', error);      // [MyComponent] Error: [error object]
```

**Available Methods:**
- `logger.log()` - General debug information
- `logger.info()` - Informational messages
- `logger.warn()` - Warnings that don't break functionality
- `logger.error()` - Errors that need attention
- `logger.debug()` - Detailed debug information
- `logger.table()` - Display data in table format
- `logger.group()` / `logger.groupEnd()` - Grouped logs
- `logger.time()` / `logger.timeEnd()` - Performance timing

**When to Log (Use Extensively!):**

**1. Component Lifecycle & State Changes:**
```typescript
// ✅ Log component initialization
useEffect(() => {
  logger.log('Component mounted', { props, initialState });
}, []);

// ✅ Log state updates
const handleUpdate = (newValue: string) => {
  logger.log('Updating state', { oldValue: value, newValue });
  setValue(newValue);
};

// ✅ Log cleanup
useEffect(() => {
  return () => {
    logger.log('Component unmounting, cleaning up resources');
  };
}, []);
```

**2. API Calls & Data Fetching:**
```typescript
// ✅ Log before API call
logger.log('Fetching user data', { userId });

try {
  const response = await apiClient.get(`/users/${userId}`);
  // ✅ Log success with relevant data
  logger.log('User data fetched successfully', { 
    userId, 
    userName: response.data.name,
    timestamp: Date.now() 
  });
  return response.data;
} catch (error) {
  // ✅ Log errors with context
  logger.error('Failed to fetch user data', { userId, error });
  throw error;
}
```

**3. User Interactions & Events:**
```typescript
// ✅ Log button clicks with context
const handleSubmit = () => {
  logger.log('Submit button clicked', { formData, isValid });
  // ... submit logic
};

// ✅ Log navigation
const handleNavigation = (path: string) => {
  logger.log('Navigating to', { from: location.pathname, to: path });
  navigate(path);
};

// ✅ Log form changes
const handleInputChange = (field: string, value: unknown) => {
  logger.debug('Form field changed', { field, value, formState });
  // ... update logic
};
```

**4. Context Operations & Store Updates:**
```typescript
// ✅ Log reducer actions
function monitoringReducer(state: State, action: Action): State {
  logger.log('Reducer action dispatched', { 
    type: action.type, 
    payload: action.payload,
    currentState: state 
  });
  
  switch (action.type) {
    case 'GROUPS_SUCCESS':
      logger.log('Groups loaded successfully', { count: action.payload.length });
      return { ...state, groups: action.payload };
    // ...
  }
}

// ✅ Log context value changes
useEffect(() => {
  logger.log('Context value updated', { 
    isAuthenticated, 
    userName, 
    permissions 
  });
}, [isAuthenticated, userName, permissions]);
```

**5. Complex Logic & Calculations:**
```typescript
// ✅ Log decision points
const calculateDiscount = (price: number, userType: string) => {
  logger.log('Calculating discount', { price, userType });
  
  if (userType === 'premium') {
    logger.log('Premium user, applying 20% discount');
    return price * 0.8;
  } else if (price > 100) {
    logger.log('Large order, applying 10% discount');
    return price * 0.9;
  }
  
  logger.log('No discount applied');
  return price;
};

// ✅ Log loop iterations for debugging
items.forEach((item, index) => {
  logger.debug('Processing item', { index, itemId: item.id, itemName: item.name });
  // ... process item
});
```

**6. Async Operations & Timing:**
```typescript
// ✅ Log async operation flow
const syncData = async () => {
  logger.time('Data sync operation');
  logger.log('Starting data sync');
  
  try {
    logger.log('Fetching groups...');
    await fetchGroups();
    logger.log('Groups fetched');
    
    logger.log('Fetching items...');
    await fetchItems();
    logger.log('Items fetched');
    
    logger.log('Data sync completed successfully');
  } catch (error) {
    logger.error('Data sync failed', { error });
  } finally {
    logger.timeEnd('Data sync operation');
  }
};
```

**7. Conditional Logic & Edge Cases:**
```typescript
// ✅ Log branches taken
if (!user) {
  logger.warn('No user found, redirecting to login');
  navigate('/login');
  return;
}

if (user.role === 'admin') {
  logger.log('Admin user detected, loading admin panel');
  loadAdminPanel();
} else {
  logger.log('Regular user, loading standard view');
  loadStandardView();
}
```

**8. Error Handling & Recovery:**
```typescript
// ✅ Log error recovery attempts
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed, attempting recovery', { error });
  
  try {
    await fallbackOperation();
    logger.log('Recovery successful');
  } catch (fallbackError) {
    logger.error('Recovery failed', { originalError: error, fallbackError });
    throw fallbackError;
  }
}
```

**9. Performance Monitoring:**
```typescript
// ✅ Log performance metrics
logger.time('Heavy calculation');
const result = performHeavyCalculation(data);
logger.timeEnd('Heavy calculation');
logger.log('Calculation result', { inputSize: data.length, resultSize: result.length });

// ✅ Log render counts for optimization
const renderCount = useRef(0);
useEffect(() => {
  renderCount.current += 1;
  logger.debug('Component rendered', { count: renderCount.current });
});
```

**10. Data Transformations:**
```typescript
// ✅ Log before/after transformations
logger.log('Transforming API response', { rawData });
const transformed = rawData.map(item => ({
  id: item.id,
  name: item.displayName,
}));
logger.log('Data transformed', { 
  originalCount: rawData.length, 
  transformedCount: transformed.length 
});
```

**Key Benefits:**
- 🚀 **Zero overhead in production** (no-op functions, tree-shaken out)
- 📦 **Smaller bundle size** (dead code elimination removes all logger code)
- 🔒 **No information leakage** in production
- 🐛 **Full debugging in development** without performance concerns
- 🏷️ **Automatic module prefixes** for organization
- 💰 **FREE logging** - no performance cost, so log generously!

**Best Practices:**
1. **Log liberally** - Since logs are removed in production, don't hold back
2. **Include context** - Log relevant variables, state, and parameters
3. **Use appropriate levels** - log/info for flow, debug for details, warn/error for problems
4. **Log entry/exit points** - Track function calls and returns
5. **Log timing** - Use time/timeEnd for performance analysis
6. **Log data shapes** - Log array lengths, object keys, data types
7. **Group related logs** - Use group/groupEnd for related operations
8. **Table for arrays** - Use logger.table() for array/object visualization

**Migration Pattern:**
1. Import logger: `import { createLogger } from '../utils/logger';`
2. Create module logger: `const logger = createLogger('ModuleName');`
3. Replace all `console.*` calls with `logger.*`
4. Remove `[ModuleName]` prefixes from messages (added automatically)
5. **Add MORE logging** where it helps understand code flow

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

### React 18 Patterns & Best Practices

#### Concurrent Features
⚠️ **USE React 18 concurrent features for better UX**

**Suspense for Data Fetching:**
```typescript
// ✅ Wrap lazy-loaded components with Suspense
<Suspense fallback={<LoadingScreen />}>
  <LazyComponent />
</Suspense>
```

**useTransition for Non-Urgent Updates:**
```typescript
import { useTransition } from 'react';

const [isPending, startTransition] = useTransition();

// Mark low-priority updates
startTransition(() => {
  setSearchResults(newResults);
});
```

**useDeferredValue for Expensive Renders:**
```typescript
import { useDeferredValue } from 'react';

const deferredQuery = useDeferredValue(searchQuery);
// Use deferredQuery for expensive operations
```

#### Error Boundaries (Class Component Exception)
⚠️ **MANDATORY: Wrap all route components with error boundaries**

```typescript
import { LazyErrorBoundary } from './components/LazyErrorBoundary';

<LazyErrorBoundary>
  <Suspense fallback={<LoadingScreen />}>
    <YourComponent />
  </Suspense>
</LazyErrorBoundary>
```

**Error Boundary Pattern:**
- Catch errors in component tree
- Display fallback UI
- Log errors for debugging
- Provide recovery mechanism
- Never leave users with blank screen

#### Automatic Batching
React 18 automatically batches state updates in:
- Event handlers (React 17 behavior)
- Promises, setTimeout, native event handlers (NEW in React 18)

```typescript
// All updates batched automatically in React 18
fetch('/api/data').then(() => {
  setData(newData);
  setLoading(false);
  setError(null);
  // Only one re-render
});
```

#### Key React 18 Benefits for This Project
1. **Streaming SSR**: Future-ready for server components
2. **Concurrent rendering**: Better performance for real-time streams
3. **Automatic batching**: Fewer re-renders in async state updates
4. **Suspense**: Cleaner loading states
5. **Transitions**: Smooth language/theme switching

### TypeScript 5 Features & Patterns

#### Const Type Parameters (TypeScript 5.0+)
```typescript
// ✅ Preserve literal types
function createConfig<const T>(config: T) {
  return config;
}

const config = createConfig({ mode: 'light' } as const);
// config.mode is 'light', not string
```

#### Satisfies Operator (TypeScript 4.9+)
```typescript
// ✅ Type checking without widening
const theme = {
  primary: '#1976d2',
  secondary: '#dc004e',
} satisfies Record<string, string>;

// theme.primary is '#1976d2', not string
```

#### Template Literal Types for Translation Keys
```typescript
// ✅ Type-safe translation keys
type TranslationKey = `pages.${string}.${string}` | `common.${string}`;

function t(key: TranslationKey): string {
  // Type-safe translation access
}
```

#### Strict Null Checks
⚠️ **MANDATORY: Handle null/undefined explicitly**

```typescript
// ❌ Don't
const user = getUser();
user.name; // Might be null

// ✅ Do
const user = getUser();
if (user) {
  user.name;
}

// Or use optional chaining
const name = user?.name;

// Or use nullish coalescing
const name = user?.name ?? 'Guest';
```

#### Type Inference Best Practices
```typescript
// ✅ Let TypeScript infer when possible
const [count, setCount] = useState(0); // inferred as number

// ✅ Explicit types for complex cases
interface User {
  id: number;
  name: string;
}

const [user, setUser] = useState<User | null>(null);
```

### File Organization
- **Components**: `src/components/` - React components
- **Types**: `src/types/` - TypeScript interfaces and types
- **Hooks**: `src/hooks/` - Custom React hooks
- **Utils**: `src/utils/` - Helper functions
- **Styles**: `src/styles/` - Global CSS files
- **Services**: `src/services/` - API clients (Axios, SignalR)
- **Contexts**: `src/contexts/` - React Context providers for state management

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
- Client: `src/services/apiClient.ts` (Axios)
- DTOs: Define in `src/types/api.ts`, match backend DTOs exactly

⚠️ **CRITICAL: All API and SignalR DTOs are documented in Swagger JSON**
- **Swagger URL**: `https://localhost:7136/swagger/v1/swagger.json`
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

## SignalR Real-Time Communication
⚠️ MANDATORY: Use SignalR for real-time streaming data
- **Backend Hub**: `MonitoringHub` at `/hubs/monitoring` endpoint
- **Hub Documentation**: GET `/api/Monitoring/SignalRHubInfo` returns complete hub metadata (methods, parameters, connection examples)
- **Message Method**: `ReceiveActiveAlarmsUpdate` receives `{ alarmCount: number, timestamp: number }`
- **Authentication**: JWT Bearer tokens via Authorization header
- **Backend**: .NET Core SignalR server, same HTTPS port (7136)
- **Context**: State managed in `MonitoringContext` with `activeAlarms` property
- **Swagger Documentation**: All SignalR DTOs and methods documented in `https://localhost:7136/swagger/v1/swagger.json`

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
- [ ] No sensitive data in IndexedDB without encryption
- [ ] No API keys or secrets in frontend code
- [ ] All forms validate input client-side AND server-side
- [ ] HTTPS enforced for all API calls
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

## � Data Persistence

### Critical Data Storage Rules
⚠️ **MANDATORY: Use IndexedDB for ALL client-side data persistence**

**DO NOT use `localStorage` or `sessionStorage`** - they have significant limitations and security concerns.

### Why IndexedDB?
1. **Larger Storage Capacity**: IndexedDB can store GBs of data vs. localStorage's 5-10MB limit
2. **Asynchronous Operations**: Non-blocking API prevents UI freezes with large datasets
3. **Structured Data**: Store complex objects, arrays, and binary data natively (no JSON.stringify/parse overhead)
4. **Transactional Integrity**: ACID-compliant transactions ensure data consistency
5. **Indexing & Querying**: Fast lookups via indexes, range queries, and cursors
6. **Better Performance**: Optimized for large-scale data operations
7. **Typed Arrays Support**: Efficient binary data storage (blobs, files, ArrayBuffers)
8. **Web Worker Compatible**: Can be accessed from service workers and web workers

### When to Use IndexedDB
✅ **MANDATORY for:**
- Authentication tokens (JWT, refresh tokens) - see `src/utils/authStorage.ts`
- User preferences and settings (theme, language, UI state)
- Offline data caching (API responses, user data)
- Draft data (unsaved forms, work-in-progress content)
- Application state persistence across sessions
- Large datasets (monitoring data, logs, historical records)
- Binary data (files, images, blobs)

### localStorage/sessionStorage Limitations
❌ **DO NOT use for:**
- Sensitive data (tokens, credentials) - synchronous, not secure
- Large datasets (>5MB) - quota exceeded errors
- Complex objects - requires JSON serialization overhead
- Binary data - inefficient base64 encoding required
- Concurrent access - no transaction support, race conditions possible
- Service worker access - not available in worker context

### Implementation Patterns

**Existing Implementation:**
This project uses IndexedDB via `src/utils/authStorage.ts` for secure token storage with:
- Automatic expiration handling (7-day rolling window)
- Transactional operations for data consistency
- Error handling and fallback mechanisms
- TypeScript-safe interfaces

**Creating New IndexedDB Stores:**
- Use `idb` library for Promise-based API
- Define TypeScript schema using `DBSchema` interface
- Implement version migrations in `upgrade` callback
- Handle opening database, putting data, and getting data
- Include error handling and TypeScript-safe interfaces

### Best Practices
1. **Use `idb` library**: Provides Promise-based API wrapper around native IndexedDB
2. **Define TypeScript schemas**: Use `DBSchema` interface for type safety
3. **Version migrations**: Handle schema changes in `upgrade` callback
4. **Error handling**: Wrap operations in try/catch, provide fallbacks
5. **Cleanup old data**: Implement TTL or periodic cleanup for expired data
6. **Indexing strategy**: Create indexes for frequently queried fields
7. **Transaction scope**: Keep transactions short, commit frequently
8. **Security**: Encrypt sensitive data before storing (use Web Crypto API)
9. **Testing**: Test quota exceeded scenarios, corrupted data recovery
10. **Service Worker**: Use for offline-first patterns and background sync

### Migration from localStorage/sessionStorage
If you find existing code using localStorage/sessionStorage:
1. Create IndexedDB store with appropriate schema
2. Migrate existing data to IndexedDB
3. Update all read/write operations to use IndexedDB API
4. Remove localStorage/sessionStorage calls
5. Test thoroughly including offline scenarios

### Performance Considerations
- **Batch operations**: Use transactions to group multiple operations
- **Lazy loading**: Open database connection only when needed
- **Cursor iteration**: For large result sets, use cursors instead of getAll()
- **Index optimization**: Create compound indexes for multi-field queries
- **Blob storage**: Store large binary data directly, avoid base64 encoding

## 🐛 Error Handling

### Error Handling Requirements
⚠️ **MANDATORY: Comprehensive error handling**

### Error Boundary Pattern
⚠️ **CRITICAL: All route components must be wrapped with error boundaries**

```typescript
import { LazyErrorBoundary } from './components/LazyErrorBoundary';
import { Suspense } from 'react';
import { LoadingScreen } from './components/LoadingScreen';

// ✅ Proper error boundary usage
<LazyErrorBoundary>
  <Suspense fallback={<LoadingScreen />}>
    <YourRouteComponent />
  </Suspense>
</LazyErrorBoundary>
```

**Error Boundary Best Practices:**
- Display user-friendly error messages (translated)
- Log errors for debugging (use logger utility)
- Provide recovery actions (reload, go back)
- Show contact support option for critical errors
- Never expose stack traces to users

### Axios Error Handling

```typescript
// ✅ Proper API call error handling with Axios
const handleSubmit = async (data: UserFormData) => {
  try {
    const result = await apiClient.put('/api/users', data);
    logger.log('User updated successfully:', result.data);
    
    // Show success message
    showNotification(t('messages.success.userUpdated'));
  } catch (err) {
    logger.error('Failed to update user:', err);
    
    // Check if Axios error
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      
      if (status === 400) {
        // Validation error
        showNotification(t('errors.validation.invalid'), 'error');
      } else if (status === 401) {
        // Auth error (should be auto-handled by Axios interceptors)
        showNotification(t('errors.auth.unauthorized'), 'error');
      } else if (status === 500) {
        // Server error
        showNotification(t('errors.server.internal'), 'error');
      } else {
        // Other HTTP error
        showNotification(t('errors.api.failed'), 'error');
      }
    } else {
      // Network or other error
      showNotification(t('errors.network.failed'), 'error');
    }
  }
};

// ✅ Display error in UI with loading state
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const loadData = async () => {
  setLoading(true);
  setError(null);
  try {
    const response = await apiClient.get('/api/data');
    setData(response.data);
  } catch (err) {
    if (axios.isAxiosError(err)) {
      setError(err.response?.data?.message || t('errors.api.failed'));
    } else {
      setError(t('errors.network.failed'));
    }
  } finally {
    setLoading(false);
  }
};

{error && (
  <Alert severity="error">
    {error}
  </Alert>
)}
```

**Axios Error Types:**
- **400 Bad Request**: Validation errors
- **401 Unauthorized**: Auth token expired (auto-handled by interceptors)
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource doesn't exist
- **500 Internal Server Error**: Server-side error
- **Network Error**: No response from server (err.response is undefined)

### SignalR Stream Error Handling

```typescript
// ✅ Proper SignalR connection error handling
const useSignalRConnection = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  const connect = useCallback(async () => {
    setConnectionState('CONNECTING');
    setError(null);
    
    try {
      const connection = new signalR.HubConnectionBuilder()
        .withUrl('https://localhost:7136/hubs/monitoring', {
          accessTokenFactory: () => getAccessToken() || ''
        })
        .withAutomaticReconnect()
        .build();
      
      connectionRef.current = connection;
      
      // Subscribe to messages
      connection.on('ReceiveActiveAlarmsUpdate', (data) => {
        updateActiveAlarms(data.alarmCount, data.timestamp);
      });
      
      await connection.start();
      setConnectionState('CONNECTED');
      logger.log('SignalR connected successfully');
      
    } catch (err) {
      logger.error('SignalR connection error:', err);
      setError(t('errors.signalr.connectionFailed'));
      setConnectionState('ERROR');
      
      // Exponential backoff retry
      setTimeout(() => connect(), 5000);
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (connectionRef.current) {
      await connectionRef.current.stop();
      setConnectionState('DISCONNECTED');
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { connectionState, error, connect, disconnect };
};
```

**SignalR Error Scenarios:**
- **Connection Failed**: Network issue or server down → Retry with exponential backoff
- **Unauthorized**: Invalid JWT token → Redirect to login
- **Disconnected**: Connection lost → Automatic reconnection
- **Message Error**: Invalid message format → Log and continue
- **Hub Method Error**: Server-side error → Show user notification

### Form Validation Error Handling

```typescript
// ✅ Proper form error handling
const [formErrors, setFormErrors] = useState<Record<string, string>>({});

const validateForm = (data: FormData): boolean => {
  const errors: Record<string, string> = {};
  
  if (!data.email) {
    errors.email = t('validation.required', { field: t('fields.email') });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = t('validation.email.invalid');
  }
  
  if (!data.password || data.password.length < 8) {
    errors.password = t('validation.password.minLength', { min: 8 });
  }
  
  setFormErrors(errors);
  return Object.keys(errors).length === 0;
};

// Display errors
<TextField
  error={!!formErrors.email}
  helperText={formErrors.email}
  inputProps={{
    'aria-invalid': !!formErrors.email,
    'aria-describedby': formErrors.email ? 'email-error' : undefined,
  }}
/>
```

### Error Notification Patterns

```typescript
// ✅ Centralized error notification
const showErrorNotification = (error: unknown, fallbackKey = 'errors.unknown') => {
  let message: string;
  
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else if ('status' in error) {
    message = t(`errors.http.${error.status}`, { defaultValue: t(fallbackKey) });
  } else {
    message = t(fallbackKey);
  }
  
  // Use MUI Snackbar or Alert
  enqueueSnackbar(message, { variant: 'error' });
};
```

### Error Logging Best Practices

```typescript
// ✅ Structured error logging
logger.error('Operation failed:', {
  operation: 'updateUser',
  userId: user.id,
  error: err,
  timestamp: new Date().toISOString(),
  userAgent: navigator.userAgent,
});

// ❌ Don't log sensitive data
logger.error('Auth failed:', {
  password: 'secret123', // NEVER log passwords
  token: 'jwt...', // NEVER log tokens
});
```

### Global Error Boundary
- Wrap all route components with `LazyErrorBoundary`
- Use `Suspense` with `LoadingScreen` fallback
- Provide user-friendly error messages
- Log errors for debugging
- Offer recovery actions

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
3. **Live JavaScript**: Use `evaluate_script` to inspect Context state, auth tokens, theme, language settings
4. **State Inspection**: Take snapshot first, then use `evaluate_script` with element UID to inspect React component props/state

#### 👤 User Behavior Simulation

**Comprehensive User Journey Testing:**
⚠️ **MANDATORY: Test complete user workflows** including bilingual scenarios

**Key Testing Scenarios:**
1. **Authentication Flow**: Navigate to login, take snapshot, fill form with UIDs, click submit, wait for redirect
2. **Bilingual Testing**: Click language switcher, take screenshots for RTL verification, test form inputs in both languages
3. **Real-Time Monitoring**: Navigate to monitoring page, use `evaluate_script` to test SignalR streaming connection state
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
4. **SignalR Streaming**: Use `evaluate_script` to monitor streaming metrics (messages received, latency, errors)
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
├── contexts/     # Auth, Language, Monitoring
├── hooks/        # Custom hooks
├── i18n/         # i18n config
├── services/     # API clients (apiClient.ts, signalrClient.ts TODO)
├── styles/       # Global styles
├── types/        # TypeScript types
└── utils/        # Helpers

public/locales/   # fa/, en/
```

## ✅ Pre-Commit Checklist

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
- [ ] **Context API**: Use Context for shared state across components
- [ ] **Local State**: Use useState/useReducer for component-level state
- [ ] **No Direct Mutation**: Use immutable update patterns
- [ ] **State Minimal**: Keep only necessary data in state
- [ ] **IndexedDB**: Use for persistent client-side storage

### API & Backend Integration
- [ ] **HTTPS Only**: All API calls use `https://localhost:7136`
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

## 🔧 Common Troubleshooting

### MUI Theme Issues

**Problem**: Colors not updating when theme changes
```typescript
// ❌ Don't - hardcoded color persists
<Box sx={{ color: '#1976d2' }}>

// ✅ Do - use theme palette
<Box sx={{ color: 'primary.main' }}>
```

**Problem**: RTL layout not working
```typescript
// ❌ Don't - hardcoded direction
<Box sx={{ marginLeft: 2 }}>

// ✅ Do - use logical properties
<Box sx={{ marginInlineStart: 2 }}>
```

### Axios API Issues

**Problem**: API call not triggering UI update
```typescript
// ❌ Don't - not updating state after API call
onClick={() => apiClient.get('/api/data')}

// ✅ Do - properly handle async and update state
onClick={async () => {
  try {
    setLoading(true);
    const response = await apiClient.get('/api/data');
    setData(response.data);
  } catch (err) {
    // Handle error
    setError(err);
  } finally {
    setLoading(false);
  }
}}
```

**Problem**: Token refresh loop
- Check `apiClient.ts` - ensure refresh mutex working
- Verify refresh endpoint returns new tokens
- Check browser console for 401 loops
- Ensure Axios interceptors are properly configured

### SignalR Stream Issues

**Problem**: Stream not connecting
- Verify backend SignalR server running on port 7136
- Check CORS settings allow SignalR connections
- Verify SSL certificates trusted
- Check browser console for connection errors

**Problem**: Stream memory leak
```typescript
// ❌ Don't - forgetting cleanup
useEffect(() => {
  connect();
}, []);

// ✅ Do - always cleanup
useEffect(() => {
  connect();
  return () => {
    disconnect();
  };
}, [disconnect]);
```

### i18n Issues

**Problem**: Translations not showing
- Verify translation key exists in both `fa` and `en` files
- Check browser console for missing key warnings
- Ensure `useTranslation()` hook used correctly

**Problem**: RTL not applying
- Check `LanguageContext` - verify direction set
- Ensure MUI theme receives `direction: 'rtl'`
- Clear browser cache if styles cached

### Build/Bundling Issues

**Problem**: Build fails with type errors
- Run `npm run type-check` to isolate issues
- Check `tsconfig.json` strict mode settings
- Verify all imports have proper types

**Problem**: Bundle size too large
- Check `npm run build -- --report` for large chunks
- Verify lazy loading for route components
- Check for duplicate dependencies in bundle

### Performance Issues

**Problem**: Slow re-renders
```typescript
// ❌ Don't - recreating functions
const handleClick = () => { /* ... */ };

// ✅ Do - memoize callbacks
const handleClick = useCallback(() => {
  /* ... */
}, [deps]);
```

**Problem**: Slow chart rendering
```typescript
// ❌ Don't - recalculating options every render
const options = getChartOptions();

// ✅ Do - memoize expensive calculations
const options = useMemo(() => getChartOptions(), [deps]);
```

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
- Use MUI MCP Server to verify component usage and APIs
- Use MUI theme palette values for ALL colors
- Use MUI components first before custom implementations
- Use Axios for all REST API calls
- Use IndexedDB for client-side data persistence
- Use Context API for shared state management
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
- Don't use `console.*` directly - use logger utility instead
- Don't assume MUI APIs from memory - verify with MUI MCP
- Don't hardcode colors (hex, rgb, color names) - ONLY use MUI theme palette
- Don't create custom color variables outside of MUI theme
- Don't use inline styles when `sx` prop is available
- Don't use alternate ports
- Don't skip error handling
- Don't forget loading states
- Don't use localStorage/sessionStorage - use IndexedDB instead
- Don't forget to clean up streams/subscriptions
- Don't skip RTL testing
- Don't skip responsive testing
- Don't skip theme compatibility testing
- Don't log sensitive data (passwords, tokens, etc.)
- Don't use outdated Protobuf patterns (v1)