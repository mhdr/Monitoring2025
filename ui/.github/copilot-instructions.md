# 📋 Copilot Instructions for Monitoring2025 UI Project

> **Project Overview:** This is a bilingual (Persian/English) React + TypeScript monitoring application with RTL support, Redux state management, and Bootstrap UI components.

---

## 🌍 Language Support & Internationalization

### Core Requirements
- ✅ **Bilingual Support:** Persian (fa) and English (en) languages **required**
- ✅ **Primary Language:** **Persian (fa)** is the main/default language
- ✅ **Full i18n Coverage:** All UI components, text, labels, messages, and error messages must be internationalized

### Implementation Guidelines

#### i18next Configuration
- **Framework:** This project uses **i18next** for internationalization
- **Configuration:** See `src/i18n/config.ts` for setup
- **Hook Helper:** Use `src/hooks/useTranslation.ts` for accessing translations
- ⚠️ **Critical:** **NEVER hardcode text strings in components**

#### Adding New Translations
When adding new UI text or messages:

1. **Add Translation Keys** to both locale files:
   - `public/locales/fa/translation.json` (Persian)
   - `public/locales/en/translation.json` (English)

2. **Use Hierarchical Keys** for better organization:
   ```typescript
   // ✅ Good examples:
   'common.buttons.save'
   'errors.validation.required'
   'dashboard.title'
   'auth.login.submit'
   ```

3. **Access Translations** in components:
   - Use the `useTranslation` hook
   - Or use the project's custom `useTranslation` helper

#### RTL (Right-to-Left) Support
- **Implementation:** Use CSS direction properties for Persian content
- **Bootstrap RTL:** The project includes `bootstrap-rtl.css` for RTL layout support
- **Testing:** Always verify RTL layout for Persian language mode

---

## 🛠️ Technology Stack

### Frontend Framework
- **Framework:** React application with **TypeScript**
- **Component Style:** Prefer **functional components with hooks** over class components
- **State Management:** **Redux Toolkit (RTK)** for global state
- **Code Splitting:** **Lazy Loading** implemented for route-based components

### Lazy Loading & Code Splitting
- **Implementation:** This application uses React's `lazy()` and `Suspense` for code splitting
- **Strategy:** Route-based lazy loading to optimize initial bundle size
- **Benefits:** Faster initial page load, improved performance, better user experience
- **Pattern:** When adding new routes or large components:
  ```typescript
  // ✅ Good example - lazy load route components:
  const Dashboard = lazy(() => import('./components/Dashboard'));
  const LoginPage = lazy(() => import('./components/LoginPage'));
  
  // Wrap in Suspense with fallback:
  <Suspense fallback={<LoadingScreen />}>
    <Dashboard />
  </Suspense>
  ```
- **Best Practices:**
  - Use lazy loading for route components and heavy feature modules
  - Provide meaningful loading fallbacks (use `LoadingScreen` component)
  - Avoid lazy loading small, frequently-used components
  - Keep authentication and core layout components in the main bundle
  - Test lazy-loaded components to ensure proper error boundaries

### TypeScript Best Practices
- ✅ Follow TypeScript best practices and conventions
- ✅ Provide **proper typing** for all code:
  - Component props and state
  - Function parameters and return types
  - API request/response interfaces
  - Redux actions and state
- ✅ Define type definitions in `src/types/` directory
- ⚠️ Avoid using `any` type unless absolutely necessary

---

## 🎨 UI Framework & Styling

### Bootstrap Framework
- **UI Library:** **Bootstrap** for styling and layout
- **Components:** Follow Bootstrap conventions when adding new UI elements
- **Classes:** Use proper Bootstrap classes for consistent styling
- **Responsive Design:** Leverage Bootstrap's responsive utilities and grid system

### Style Files
```
src/styles/
  ├── bootstrap-ltr.css  (Left-to-Right layout)
  ├── bootstrap-rtl.css  (Right-to-Left layout)
  └── theme.css         (Centralized theme system)
```

---

## 🎨 Theme System & Color Management

### Overview
This application implements a **centralized theme system** using CSS custom properties (variables) for all color definitions, gradients, shadows, and design tokens. The theme system allows users to switch between multiple pre-configured color schemes without any code changes.

### Core Principle
⚠️ **CRITICAL:** **NEVER hardcode colors, gradients, or theme-related styles in component files.**

All theme-related styling must reference CSS custom properties defined in `src/styles/theme.css`.

### Theme Architecture

#### Centralized Theme Configuration
- **Theme File:** `src/styles/theme.css`
  - Contains all CSS custom properties for colors, gradients, shadows
  - Defines default values that get overridden when themes are switched
  - Well-documented with category comments for easy modification

#### Theme Presets
- **Theme Definitions:** `src/types/themes.ts`
  - TypeScript interfaces for theme structure and colors
  - Available themes: Default (Blue), Green, Purple, Orange, Red, Teal, Indigo
  - Each theme includes emoji, name, and complete color palette

#### Theme Management
- **Redux State:** `src/store/slices/themeSlice.ts`
  - Manages current theme state and persistence to localStorage
  - Actions: `initializeTheme`, `setTheme`, `resetTheme`

- **Theme Utilities:** `src/utils/themeUtils.ts`
  - `applyTheme()`: Dynamically updates CSS custom properties
  - `hexToRgb()`: Converts hex colors to RGB for rgba() usage

- **Theme Hook:** `src/hooks/useTheme.ts`
  - Custom hook to initialize and manage theme application
  - Automatically applies theme on mount and when theme changes

- **Theme Switcher:** `src/components/ThemeSwitcher.tsx`
  - User interface component for switching between themes
  - Located in user dropdown menu

### Using the Theme System

#### ✅ Correct Usage - CSS Custom Properties
Always reference theme variables instead of hardcoding colors:

```css
/* ✅ Good examples - use CSS custom properties */
.my-component {
  background: var(--primary-dark);
  color: var(--text-primary-light);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-md);
}

.my-button {
  background: var(--gradient-button);
  color: var(--text-primary-light);
}

.my-button:hover {
  background: var(--gradient-button-hover);
}
```

```tsx
/* ✅ Good examples - inline styles with theme variables */
<div style={{ backgroundColor: 'var(--primary-dark)' }}>
<span style={{ color: 'var(--text-secondary-light)' }}>
```

#### ❌ Incorrect Usage - Hardcoded Colors
**NEVER** hardcode colors in component files:

```css
/* ❌ Bad examples - hardcoded colors */
.my-component {
  background: #2c3e50;  /* Never hardcode colors */
  color: #ecf0f1;       /* Use var(--text-primary-light) instead */
}

.my-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  /* Use var(--gradient-primary) instead */
}
```

```tsx
/* ❌ Bad examples - hardcoded inline styles */
<div style={{ backgroundColor: '#2c3e50' }}>  {/* Wrong */}
<span style={{ color: '#ecf0f1' }}>            {/* Wrong */}
```

### Available Theme Variables

#### Primary Colors
```css
--primary-dark          /* Main sidebar, navbar, dark surfaces */
--primary-medium        /* Secondary surfaces */
--primary-light         /* Interactive elements */
--primary-lighter       /* Hover states, highlights */
--primary-darker        /* Pressed states */
```

#### Accent Colors
```css
--accent-primary        /* Buttons, links, active states */
--accent-hover          /* Hover states */
--accent-active         /* Pressed/active states */
```

#### Text Colors
```css
--text-primary-light    /* Primary text on dark backgrounds */
--text-secondary-light  /* Secondary text on dark backgrounds */
--text-primary-dark     /* Primary text on light backgrounds */
--text-secondary-dark   /* Secondary text on light backgrounds */
--text-muted-light      /* Muted text on dark backgrounds */
--text-muted-dark       /* Muted text on light backgrounds */
```

#### Semantic Colors
```css
--success               /* Success state color */
--success-bg            /* Success background (10% opacity) */
--success-border        /* Success border color */
--warning               /* Warning state color */
--error                 /* Error/danger state color */
--info                  /* Info state color */
```

#### Background Colors
```css
--bg-primary-light      /* Primary light background */
--bg-secondary-light    /* Secondary light background */
--bg-primary-dark       /* Primary dark background */
--bg-secondary-dark     /* Secondary dark background */
--surface-light         /* Surface overlay light */
--surface-dark          /* Surface overlay dark */
```

#### Borders
```css
--border-light          /* Light border */
--border-medium         /* Medium border */
--border-dark           /* Dark border */
--border-focus          /* Focus state border */
```

#### Shadows
```css
--shadow-xs, --shadow-sm        /* Small shadows */
--shadow-md, --shadow-lg        /* Medium shadows */
--shadow-xl, --shadow-2xl       /* Large shadows */
--shadow-primary                /* Colored shadows */
--shadow-focus-primary          /* Focus ring shadow */
```

#### Pre-configured Gradients
```css
--gradient-primary              /* Login page, loading screens */
--gradient-sidebar              /* Sidebar background */
--gradient-navbar               /* Navbar background */
--gradient-button               /* Button background */
--gradient-button-hover         /* Button hover state */
--gradient-button-disabled      /* Disabled button */
```

### Theme System Workflow

#### How Themes Work
1. **Default Values:** `theme.css` defines default CSS custom properties
2. **User Selection:** User selects a theme via `ThemeSwitcher` component
3. **State Update:** Redux `themeSlice` updates current theme ID and saves to localStorage
4. **Apply Theme:** `useTheme` hook detects change and calls `applyTheme()`
5. **Dynamic Update:** `applyTheme()` uses `document.documentElement.style.setProperty()` to override CSS variables
6. **Instant Reflection:** All components using CSS variables automatically reflect new colors

#### Adding New Theme Colors
If you need to add a new color category:

1. **Add to `theme.css`:**
   ```css
   :root {
     --my-new-color: #abc123;
     --my-new-color-rgb: 171, 193, 35;
   }
   ```

2. **Add to TypeScript interface (`themes.ts`):**
   ```typescript
   export interface ThemeColors {
     // ... existing properties
     myNewColor: string;
   }
   ```

3. **Update all theme presets in `themes.ts`:**
   ```typescript
   const defaultTheme: Theme = {
     colors: {
       // ... existing colors
       myNewColor: '#abc123',
     },
   };
   ```

4. **Update `applyTheme()` in `themeUtils.ts`:**
   ```typescript
   export const applyTheme = (theme: Theme): void => {
     // ... existing code
     root.style.setProperty('--my-new-color', colors.myNewColor);
     root.style.setProperty('--my-new-color-rgb', hexToRgb(colors.myNewColor));
   };
   ```

### Best Practices

#### Component Styling
- ✅ **Always use CSS custom properties** for any color, gradient, or shadow
- ✅ **Use semantic color variables** (e.g., `--success`, `--error`) for consistency
- ✅ **Reference gradients** by their preset names (e.g., `--gradient-button`)
- ✅ **Use shadow variables** for consistent elevation (e.g., `--shadow-md`)
- ⚠️ **Never hardcode hex/rgb values** in component CSS or inline styles

#### Testing Themes
- 📊 **Chrome DevTools MCP:** Use to verify theme switching works correctly
- 🎨 **Visual Testing:** Test all themes to ensure your components look good in each
- 🔄 **Dynamic Switching:** Verify colors update immediately when theme changes
- 📱 **Responsive + Theme:** Test theme appearance across different viewport sizes

#### Documentation
- 📝 **Comment Purpose:** When using theme variables, add comments explaining the usage
- 🔍 **Variable Discovery:** Check `theme.css` for available variables before creating new ones

### Common Pitfalls to Avoid

❌ **Hardcoding Colors**
```css
/* Wrong */
.card { background: #2c3e50; }

/* Correct */
.card { background: var(--primary-dark); }
```

❌ **Inline RGB Values**
```tsx
/* Wrong */
<div style={{ backgroundColor: 'rgba(44, 62, 80, 0.8)' }}>

/* Correct */
<div style={{ backgroundColor: 'rgba(var(--primary-dark-rgb), 0.8)' }}>
```

❌ **Creating Local Color Variables**
```css
/* Wrong - don't create component-specific color variables */
.my-component {
  --local-blue: #3498db; /* Don't do this */
  background: var(--local-blue);
}

/* Correct - use centralized theme variables */
.my-component {
  background: var(--primary-light);
}
```

❌ **Bootstrap Color Classes with Hardcoded Styles**
```tsx
/* Wrong - mixing Bootstrap classes with hardcoded colors */
<button className="btn" style={{ background: '#667eea' }}>

/* Correct - use theme variables with Bootstrap */
<button className="btn" style={{ background: 'var(--gradient-button)' }}>
```

### Theme System Reference Files
```
src/
├── styles/
│   └── theme.css                    # CSS custom properties definition
├── types/
│   └── themes.ts                    # Theme interfaces and presets
├── utils/
│   └── themeUtils.ts                # Theme application utilities
├── hooks/
│   └── useTheme.ts                  # Theme management hook
├── store/
│   └── slices/
│       └── themeSlice.ts            # Redux theme state
└── components/
    └── ThemeSwitcher.tsx            # Theme switcher UI component
```

---

## � Charts & Data Visualization

### Apache ECharts Integration
- **Charting Library:** **Apache ECharts** for data visualization and interactive charts
- **React Wrapper:** **echarts-for-react** for React component integration
- **Version:** ECharts 5.6.0, echarts-for-react 3.0.2

### Implementation Guidelines

#### Using ECharts Components
- **Wrapper Component:** Use `ReactECharts` from `echarts-for-react` for all chart implementations
- **Type Safety:** Define TypeScript interfaces for chart options and data structures
- **Performance:** Use ECharts' built-in performance optimization features for large datasets

#### Chart Configuration Best Practices
```typescript
// ✅ Good example - using echarts-for-react:
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

const option: EChartsOption = {
  // Chart configuration
  xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed'] },
  yAxis: { type: 'value' },
  series: [{ data: [120, 200, 150], type: 'line' }]
};

<ReactECharts 
  option={option}
  data-id-ref="dashboard-line-chart"
  style={{ height: '400px', width: '100%' }}
/>
```

#### RTL Support for Charts
- **Text Direction:** Configure ECharts text elements to support RTL for Persian language
- **Legend Position:** Adjust legend placement for RTL layouts
- **Tooltip Direction:** Ensure tooltips display correctly in both LTR and RTL modes
- **Axis Labels:** Consider text alignment for Persian axis labels

#### Responsive Charts
- **Container Sizing:** Use percentage-based dimensions or flex layouts for chart containers
- **Resize Handling:** echarts-for-react automatically handles window resize events
- **Mobile Optimization:** Adjust chart options for smaller screens (reduce font sizes, simplify legends)
- **Breakpoint-Based Options:** Consider using different chart configurations for different screen sizes

#### Chart Internationalization
- **Translatable Elements:** All chart titles, axis labels, legends, and tooltips must be internationalized
- **Number Formatting:** Use appropriate number formatters for Persian (fa) and English (en) locales
- **Date Formatting:** Apply locale-specific date formats in time-series charts
- **Pattern:**
  ```typescript
  // ✅ Good example - internationalized chart:
  const { t } = useTranslation();
  
  const option: EChartsOption = {
    title: { text: t('charts.temperature.title') },
    xAxis: { name: t('charts.axes.time') },
    yAxis: { name: t('charts.axes.temperature') },
    // ... other configuration
  };
  ```

#### Performance Considerations
- **Large Datasets:** Use ECharts' data sampling and progressive rendering for large datasets
- **Lazy Loading:** Consider lazy loading chart components for pages with multiple charts
- **Update Strategy:** Use `notMerge` and `lazyUpdate` options appropriately when updating chart data
- **Memory Management:** Clean up chart instances properly when components unmount

#### Chart Types & Usage
Common chart types used in monitoring applications:
- **Line Charts:** Time-series data, trends over time
- **Bar Charts:** Comparisons, categorical data
- **Pie/Donut Charts:** Proportional data, status distributions
- **Gauge Charts:** Real-time metrics, thresholds
- **Heatmaps:** Matrix data, correlation visualization
- **Scatter Plots:** Relationship analysis, outlier detection

#### ECharts Resources
- **Official Documentation:** https://echarts.apache.org/en/index.html
- **echarts-for-react:** https://github.com/hustcc/echarts-for-react
- **Examples Gallery:** https://echarts.apache.org/examples/en/index.html
- **API Reference:** https://echarts.apache.org/en/api.html

### Testing Charts
- 📊 **Visual Testing:** Use Chrome DevTools MCP to verify chart rendering
- 🌐 **RTL Testing:** Verify chart layout in Persian language mode
- 📱 **Responsive Testing:** Test charts across different viewport sizes
- ⚡ **Performance Testing:** Monitor chart rendering performance with large datasets
- 🔄 **Data Updates:** Test chart updates when data changes (real-time monitoring)

---

## �📱 Responsive Design Requirements

### Device Support
- ✅ **Desktop:** Full desktop browser support
- ✅ **Mobile:** Full mobile device support
- ✅ **Tablet:** Intermediate screen sizes

### Implementation Guidelines
- All components and layouts **must be fully responsive**
- Test and ensure proper display across **different screen sizes**
- Use **Bootstrap's responsive utilities** and **grid system**
- Consider breakpoints: `xs`, `sm`, `md`, `lg`, `xl`, `xxl`

### Testing Checklist
- [ ] Desktop view (1920x1080 and above)
- [ ] Laptop view (1366x768, 1440x900)
- [ ] Tablet view (768x1024)
- [ ] Mobile view (375x667, 414x896)

---

## 🔌 Backend API Integration

### Server Configuration
- **Framework:** **.NET Core C# ASP.NET Web API**
- **Protocol:** **HTTPS-only mode** (no HTTP support)
- **Base URL:** `https://localhost:7136`
- **SSL Certificate:** Self-signed certificate (can be trusted for development)

### API Documentation
- **Swagger Endpoint:** `https://localhost:7136/swagger/v1/swagger.json`
- **Interactive Docs:** Available at `https://localhost:7136/swagger`
- **Reference:** Always refer to Swagger documentation for detailed endpoint specifications

### Authentication
- **Method:** JWT (JSON Web Tokens)
- **Storage:** See `src/utils/authStorage.ts` for token management
- **Context:** Authentication logic in `src/contexts/AuthContext.tsx`
- **Redux:** Auth state managed in `src/store/slices/authSlice.ts`

### Development & Debugging Authentication
For debugging purposes (such as testing with Chrome DevTools MCP), use these test credentials:
- **Username:** `test`
- **Password:** `Password@12345`
- **Purpose:** These credentials are specifically for development testing, UI debugging, and automated testing workflows
- **Usage:** Use when logging into the application during debugging sessions, Chrome DevTools MCP testing, or when verifying authentication flows

### API Service
```
src/services/
  └── api.ts  (API client and request handlers)
```

---

## 📐 Development Guidelines

### Language & Internationalization
- 🌐 **Always implement features with both Persian and English support**
- 🔄 **RTL Support:** Ensure proper Right-to-Left layout for Persian text
- 📝 **No Hardcoded Text:** All user-facing text must use i18next translations
- ✅ **Test Both Languages:** Verify functionality in both language modes

### Styling & UI Consistency
- 🎨 **Bootstrap First:** Use Bootstrap components and classes for all UI elements
- 📏 **Consistent Design:** Follow existing design patterns and component styles
- 🔍 **Custom Styles:** Place custom CSS in component-specific `.css` files
- 🌓 **Theme Support:** Consider future theme/dark mode support

### Code Quality & Structure
- 📂 **Follow Patterns:** Maintain consistency with existing project structure
- 🔧 **Reuse Components:** Check for existing components before creating new ones
- 📦 **Proper Imports:** Use absolute imports via TypeScript path aliases
- 🧹 **Clean Code:** Remove unused imports, variables, and commented-out code

### HTML/JSX Element Identification
- 🔖 **data-id-ref Attribute:** **MANDATORY** - Every HTML/JSX element you create must include a `data-id-ref` attribute with a unique, descriptive value
- 🎯 **Naming Convention:** Use kebab-case with hierarchical structure: `component-name-element-type-purpose`
- 🤖 **AI Agent Integration:** These attributes enable AI agents, automated testing tools, and debugging utilities to reliably reference and interact with DOM elements
- 📋 **Examples:**
  ```tsx
  // ✅ Good examples:
  <button data-id-ref="login-form-submit-button">Login</button>
  <input data-id-ref="user-profile-email-input" type="email" />
  <div data-id-ref="dashboard-stats-card-container">...</div>
  <nav data-id-ref="sidebar-main-navigation">...</nav>
  ```
- ⚠️ **Uniqueness:** Each `data-id-ref` value must be unique within the component scope
- 🔍 **Purpose:** These identifiers serve as stable selectors for:
  - Automated testing (E2E tests, integration tests)
  - AI agent interactions (Chrome DevTools MCP, automated workflows)
  - Debugging and element inspection
  - Accessibility auditing tools
  - Analytics and user behavior tracking

### Testing & Validation
- 📱 **Responsive Testing:** Test all components on desktop and mobile viewports
- 🌐 **Language Testing:** Verify RTL/LTR layouts work correctly
- 🔐 **Auth Testing:** Test both authenticated and unauthenticated states
- 🐛 **Error Handling:** Ensure proper error messages in both languages

### Development Server Configuration

#### Port Management
- **Default Port:** `5173` (Vite development server)
- **Backend API Port:** `7136` (HTTPS)

#### Critical: Port 5173 Usage Rules
⚠️ **MANDATORY - Port Consistency for CORS:**

If port `5173` is already in use when attempting to start the development server:
- ✅ **DO NOT start the server on a different port** (e.g., 5174, 5175)
- ✅ **REASON:** The backend API is configured with CORS policies that **only allow `https://localhost:5173`**
- ✅ **ACTION:** Assume the developer already has the server running on port `5173` and use that instance
- ✅ **TESTING:** Connect Chrome DevTools MCP to `https://localhost:5173` directly
- ✅ **VERIFICATION:** Use `list_network_requests` to confirm the server is responding correctly

#### Port Conflict Resolution Workflow
1. **If you see "Port 5173 is in use":**
   - Do NOT run `npm run dev` again
   - Do NOT accept an alternate port (5174, 5175, etc.)
   - Inform the user: "The development server is already running on port 5173"
   - Proceed with testing/debugging using `https://localhost:5173`

2. **If the developer explicitly asks to restart the server:**
   - First, help them terminate any existing Vite processes
   - Then start the server on the default port 5173
   - Verify the server started successfully

#### CORS Configuration Context
- The backend API (`https://localhost:7136`) is configured to accept requests from `https://localhost:5173` only
- Using a different port will result in CORS errors:
  - `Access-Control-Allow-Origin` header will block requests
  - API calls will fail with CORS policy violations
  - Authentication and data fetching will not work
- **Never suggest using alternate ports** when port 5173 is occupied

#### Development Server Best Practices
- ✅ Check if server is already running before attempting to start it
- ✅ Use the existing running instance on port 5173
- ✅ If testing is needed, connect to the already-running server
- ✅ If server issues occur, help debug the existing instance rather than starting a new one
- ⚠️ Avoid running multiple Vite instances simultaneously

### Chrome DevTools MCP Integration
**MANDATORY** for UI debugging and testing - This project has Chrome DevTools MCP available for real-time browser debugging and performance analysis.

#### Core Capabilities
Chrome DevTools MCP provides AI-powered access to Chrome's debugging surface, removing the "blindfold" that prevents AI from seeing rendered output, console logs, and network activity.

#### When to Use Chrome DevTools MCP
- 🎨 **UI/Layout Issues:** Inspect DOM, CSS, and visual rendering problems
- ⚡ **Performance Analysis:** Record traces, analyze page load times, and identify bottlenecks
- 🐛 **Runtime Debugging:** Check console errors, evaluate JavaScript in browser context
- 🌐 **Network Inspection:** Analyze API requests/responses, check HTTPS calls to backend
- 📱 **Responsive Testing:** Verify layouts across different viewport sizes programmatically
- 🔄 **RTL/LTR Testing:** Validate Persian and English layouts in real browser environment
- 🎯 **User Interactions:** Test click handlers, form submissions, and navigation flows
- 📊 **State Verification:** Inspect Redux state, component props, and runtime values

#### Available Tools
- **Performance Tools:** `performance_start_trace`, `performance_stop_trace`, `performance_analyze_insight`
- **Network Tools:** `list_network_requests`, `get_network_request` (verify API calls to `https://localhost:7136`)
- **Debugging Tools:** `evaluate_script`, `list_console_messages`, `take_screenshot`, `take_snapshot`
- **Navigation Tools:** `navigate_page`, `new_page`, `list_pages`, `close_page`, `wait_for`
- **Interaction Tools:** `click`, `fill`, `fill_form`, `hover`, `drag`, `upload_file`, `handle_dialog`
- **Emulation Tools:** `emulate_network`, `emulate_cpu`, `resize_page` (test responsive design)

#### Browser Instance Strategy
**RECOMMENDED APPROACH:** Always start a fresh Chrome instance for DevTools MCP sessions.

**Why Fresh Instances:**
- ✅ **Reliability:** Connecting to existing Chrome instances frequently fails or reports MCP as unavailable
- ✅ **Clean State:** Fresh instances eliminate interference from existing tabs, extensions, or cached data
- ✅ **Consistency:** Provides a predictable, isolated testing environment
- ✅ **Session Control:** Full control over browser state without unexpected side effects

**Implementation:**
- Chrome DevTools MCP will automatically launch a new Chrome browser instance for each debugging session
- This ensures stable connections and reliable tool availability
- The new instance is isolated from your regular browsing sessions

#### Usage Workflow
1. **Launch Fresh Browser:** Chrome DevTools MCP automatically starts a new, isolated Chrome instance for debugging
2. **Navigate to App:** Use `navigate_page` to open `https://localhost:5173` (Vite dev server)
3. **Perform Actions:** Use interaction tools to test user flows
4. **Inspect State:** Use `evaluate_script` to check runtime values, Redux state
5. **Capture Evidence:** Use `take_screenshot` or `take_snapshot` to document issues
6. **Analyze Performance:** Use trace tools to identify slow rendering or API calls
7. **Check Console:** Use `list_console_messages` to catch JavaScript errors

#### Best Practices
- ✅ **Verify Before Changes:** Use DevTools MCP to understand actual browser behavior before fixing issues
- ✅ **Test After Changes:** Immediately verify fixes in real browser using MCP tools
- ✅ **Responsive Verification:** Use `resize_page` to test mobile/tablet/desktop layouts
- ✅ **API Validation:** Use network tools to verify HTTPS calls and JWT authentication
- ✅ **Performance First:** Run performance traces to ensure changes don't degrade UX
- ✅ **RTL Testing:** Navigate to Persian mode and verify layout with screenshots
- ⚠️ **Privacy Warning:** DevTools MCP exposes all browser content - avoid sharing sensitive data

#### Example Use Cases
```typescript
// Test login flow with real browser
1. navigate_page → https://localhost:5173
2. fill_form → username/password fields
3. click → login button
4. list_console_messages → check for errors
5. evaluate_script → verify auth token in Redux store
6. take_screenshot → document successful login

// Debug RTL layout issue
1. navigate_page → app with Persian language
2. resize_page → mobile viewport (375x667)
3. take_screenshot → capture RTL layout
4. evaluate_script → inspect Bootstrap RTL classes
5. take_snapshot → get full DOM for analysis

// Performance optimization
1. navigate_page → dashboard page
2. performance_start_trace
3. [wait for page load]
4. performance_stop_trace
5. performance_analyze_insight → get optimization recommendations
```

#### Integration with Development Workflow
- 🔍 **Debug Phase:** Use DevTools MCP to investigate reported bugs in real browser
- ✏️ **Implementation Phase:** Test UI changes immediately in live browser
- ✅ **Validation Phase:** Verify fixes across viewports and language modes
- 📊 **Optimization Phase:** Analyze performance and refine based on real metrics

**Remember:** Chrome DevTools MCP transforms AI from a "blind" code generator into an active debugging partner that can see, test, and verify changes in a real browser environment.

### API Integration Best Practices
- 🔒 **Always use HTTPS endpoints** when making API calls
- 📄 **Refer to swagger.json** for endpoint specifications
- ⚙️ **Type Safety:** Define TypeScript interfaces for all API requests/responses
- 🚨 **Error Handling:** Implement proper error handling for all API calls
- 🔄 **Loading States:** Show appropriate loading indicators during API calls

---

## 📁 Project Structure Reference

```
src/
├── components/        # React components
├── contexts/          # React contexts (Auth, Language)
├── hooks/             # Custom React hooks
├── i18n/              # Internationalization configuration
├── services/          # API services and external integrations
├── store/             # Redux store and slices
├── styles/            # Global styles and Bootstrap variants
├── types/             # TypeScript type definitions
└── utils/             # Utility functions and helpers

public/
└── locales/           # Translation files
    ├── fa/            # Persian translations
    └── en/            # English translations
```

---

## ✅ Quick Checklist for New Features

Before submitting any new feature or component:

- [ ] TypeScript types defined for all props, functions, and API calls
- [ ] Translation keys added to both `fa/translation.json` and `en/translation.json`
- [ ] No hardcoded text strings in components
- [ ] RTL layout tested and working correctly for Persian (use Chrome DevTools MCP)
- [ ] Bootstrap components and classes used appropriately
- [ ] Responsive design tested on desktop and mobile viewports (use Chrome DevTools MCP)
- [ ] Redux state management implemented if needed
- [ ] API integration uses HTTPS and proper error handling (verify with Chrome DevTools MCP network tools)
- [ ] Code follows existing project patterns and structure
- [ ] Component works in both authenticated and unauthenticated states (if applicable)
- [ ] **Theme System:** No hardcoded colors, gradients, or shadows - all theme-related styles use CSS custom properties from `theme.css`
- [ ] **Theme System:** Component appearance verified across all available themes (Default, Green, Purple, Orange, Red, Teal, Indigo)
- [ ] **Theme System:** New theme colors (if added) properly defined in `themes.ts`, `theme.css`, and `themeUtils.ts`
- [ ] **Charts (if applicable):** ECharts options are internationalized, responsive, and RTL-compatible
- [ ] **Charts (if applicable):** Chart performance tested with representative data volumes
- [ ] **Chrome DevTools MCP verification:** Test in real browser, check console for errors, validate performance

---

**Last Updated:** 2025-10-01