# 📋 QWEN Instructions for Monitoring2025 UI Project

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
  └── bootstrap-rtl.css  (Right-to-Left layout)
```

---

## 📱 Responsive Design Requirements

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

### Testing & Validation
- 📱 **Responsive Testing:** Test all components on desktop and mobile viewports
- 🌐 **Language Testing:** Verify RTL/LTR layouts work correctly
- 🔐 **Auth Testing:** Test both authenticated and unauthenticated states
- 🐛 **Error Handling:** Ensure proper error messages in both languages

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
- [ ] RTL layout tested and working correctly for Persian
- [ ] Bootstrap components and classes used appropriately
- [ ] Responsive design tested on desktop and mobile viewports
- [ ] Redux state management implemented if needed
- [ ] API integration uses HTTPS and proper error handling
- [ ] Code follows existing project patterns and structure
- [ ] Component works in both authenticated and unauthenticated states (if applicable)

---

**Last Updated:** 2025-10-01