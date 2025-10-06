# Copilot Instructions: Monitoring2025 UI

**Project:** Bilingual (Persian/English) React + TypeScript monitoring app with RTL support, Redux, Bootstrap UI.

---

## 🌍 i18n (Internationalization)

**Critical Rules:**
- ⚠️ **NEVER hardcode text** - use i18next for ALL user-facing text
- Primary language: **Persian (fa)**, secondary: **English (en)**
- Add keys to BOTH: `public/locales/fa/translation.json` + `public/locales/en/translation.json`
- Use hierarchical keys: `common.buttons.save`, `errors.validation.required`
- Access via `useTranslation` hook from `src/hooks/useTranslation.ts`
- Bootstrap RTL: Use `bootstrap-rtl.css` for Persian layout
- Test RTL layout for Persian mode

---

## 🛠️ Tech Stack

- **Framework:** React + TypeScript (functional components + hooks)
- **State:** Redux Toolkit (RTK)
- **UI:** Bootstrap (responsive utilities + grid system)
- **Code Splitting:** Route-based lazy loading with `React.lazy()` + `Suspense` (use `<LoadingScreen />` fallback)
- **TypeScript:** Full typing required (props, functions, API, Redux). Define types in `src/types/`. Avoid `any`.
- **Styles:** `src/styles/` → `bootstrap-ltr.css`, `bootstrap-rtl.css`, `theme.css`

---

## 🎨 Theme System

⚠️ **CRITICAL:** NEVER hardcode colors, gradients, shadows. Use CSS custom properties from `src/styles/theme.css`.

**Architecture:**
- `src/styles/theme.css` - CSS custom properties
- `src/types/themes.ts` - TypeScript interfaces, presets (Default, Green, Purple, Orange, Red, Teal, Indigo)
- `src/utils/themeUtils.ts` - `applyTheme()`, `hexToRgb()`
- `src/hooks/useTheme.ts` - Theme management hook
- `src/store/slices/themeSlice.ts` - Redux state + localStorage

**Usage:**
```css
/* ✅ Correct */
.component { background: var(--primary-dark); color: var(--text-primary-light); }
.button { background: var(--gradient-button); box-shadow: var(--shadow-md); }

/* ❌ Wrong */
.component { background: #2c3e50; color: #ecf0f1; }
```

**Available Variables:** `--primary-dark/medium/light/lighter/darker`, `--accent-primary/hover/active`, `--text-primary-light/dark`, `--text-secondary-light/dark`, `--success/warning/error/info`, `--bg-primary-light/dark`, `--border-light/medium/dark`, `--shadow-xs/sm/md/lg/xl/2xl`, `--gradient-primary/sidebar/navbar/button/button-hover/button-disabled`

**Adding New Color:**
1. Add to `theme.css` (`:root { --new-color: #abc; --new-color-rgb: 171,193,35; }`)
2. Add to `themes.ts` interface + all presets
3. Update `applyTheme()` in `themeUtils.ts`

---

## 📊 Charts (Apache ECharts)

- **Library:** Apache ECharts 5.6.0, echarts-for-react 3.0.2
- **Component:** Use `ReactECharts` from `echarts-for-react`
- **TypeScript:** Define `EChartsOption` interfaces
- **i18n:** Internationalize titles, axes, legends, tooltips using `useTranslation`
- **RTL:** Configure text direction, legend position, tooltip alignment for Persian
- **Responsive:** Percentage-based dimensions, adjust for mobile (reduce fonts, simplify legends)
- **Performance:** Data sampling, progressive rendering, lazy load chart components
- **Pattern:**
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

---

## 📱 Responsive Design

- **Required:** All components must be fully responsive (desktop, tablet, mobile)
- **Bootstrap:** Use responsive utilities and grid system (`xs`, `sm`, `md`, `lg`, `xl`, `xxl`)
- **Test:** 1920x1080, 1366x768, 768x1024, 375x667, 414x896 viewports

---

## 🔌 Backend API

- **Server:** .NET Core ASP.NET Web API, HTTPS-only
- **Base URL:** `https://localhost:7136`
- **Swagger:** `https://localhost:7136/swagger/v1/swagger.json`
- **Auth:** JWT tokens with refresh token rotation (`src/utils/authStorage.ts`, `src/contexts/AuthContext.tsx`, `src/services/rtkApi.ts`)
- **Test Credentials:** username: `test`, password: `Password@12345` (for debugging/DevTools MCP)
- **API Client:** `src/services/rtkApi.ts` (RTK Query)

## 🔐 Authentication & Security

⚠️ **CRITICAL:** This project implements **Refresh Token Rotation** following OAuth 2.0 best practices.

**Features:**
- **Automatic Token Refresh:** RTK Query interceptor automatically refreshes expired tokens
- **Token Rotation:** Old refresh tokens are invalidated when used
- **Mutex Protection:** Prevents concurrent refresh requests using `async-mutex`
- **Secure Storage:** Tokens stored in localStorage (persistent) or sessionStorage (session-only)

**Key Files:**
- `src/services/rtkApi.ts` - Token refresh interceptor with mutex
- `src/utils/authStorage.ts` - Token storage management
- `src/contexts/AuthContext.tsx` - Authentication state
- `REFRESH_TOKEN_ROTATION.md` - Complete documentation

**How It Works:**
1. User logs in → Both access token and refresh token stored
2. API request with expired token → 401 response
3. Interceptor automatically calls refresh endpoint with stored tokens
4. Backend returns new access token + new refresh token (rotation!)
5. Old refresh token is now invalid (prevents replay attacks)
6. Original request is retried with new token
7. User experiences seamless authentication (no interruption)

**Important:**
- Never manually handle token refresh in components
- RTK Query's `baseQueryWithAuth` handles it automatically
- Failed refresh triggers automatic logout and redirect to login
- See `REFRESH_TOKEN_ROTATION.md` for detailed documentation

---

## 📐 Development Guidelines

**Language & i18n:**
- Always implement both Persian + English support
- Ensure RTL layout for Persian text
- Never hardcode text - use i18next translations
- Test both language modes

**Styling:**
- Bootstrap first for all UI elements
- Follow existing design patterns
- Custom CSS in component-specific `.css` files
- Use theme system variables

**Code Quality:**
- Follow existing project structure
- Reuse components before creating new ones
- Full TypeScript typing (avoid `any`)
- Clean code - remove unused imports/variables

**Element Identification (MANDATORY):**
- Every HTML/JSX element MUST have `data-id-ref` attribute
- Format: `component-name-element-type-purpose` (kebab-case)
- Purpose: AI agents, testing, debugging, automation
- Examples: `<button data-id-ref="login-form-submit-button">`, `<input data-id-ref="user-profile-email-input">`

**Testing:**
- Responsive: desktop + mobile viewports
- Language: RTL/LTR layouts
- Auth: authenticated + unauthenticated states
- Errors: proper messages in both languages

**Dev Server Ports:**
- Frontend: `5173` (Vite), Backend: `7136` (HTTPS)
- ⚠️ **CRITICAL:** If port 5173 is in use, DO NOT use alternate port (CORS restricted to 5173 only)
- If "Port 5173 is in use": assume server running, use existing instance at `https://localhost:5173`
- Never suggest alternate ports - backend CORS only allows 5173

**Chrome DevTools MCP (MANDATORY for debugging):**
- Auto-launches fresh Chrome instance for reliable debugging
- Use for: UI/layout, performance traces, console errors, network inspection, RTL testing, responsive testing, state verification
- Tools: `navigate_page`, `take_screenshot`, `take_snapshot`, `evaluate_script`, `list_console_messages`, `list_network_requests`, `resize_page`, `performance_start_trace/stop_trace`
- Workflow: Navigate → Interact → Inspect → Capture → Verify
- Test RTL/LTR, responsive layouts, API calls to `https://localhost:7136`

---

## 📁 Project Structure

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

public/locales/        # Translation files (fa/, en/)
```

---

## ✅ Checklist

- [ ] TypeScript types for props, functions, API
- [ ] Translation keys in both `fa/translation.json` + `en/translation.json`
- [ ] No hardcoded text
- [ ] RTL layout tested (Chrome DevTools MCP)
- [ ] Bootstrap components used
- [ ] Responsive tested (Chrome DevTools MCP)
- [ ] Redux state if needed
- [ ] HTTPS API + error handling (verify with DevTools MCP)
- [ ] Follows existing patterns
- [ ] Auth states tested (if applicable)
- [ ] Theme system: CSS variables only, no hardcoded colors
- [ ] Theme system: verified across all themes
- [ ] Charts (if applicable): i18n, responsive, RTL-compatible
- [ ] DevTools MCP: real browser test, console check, performance