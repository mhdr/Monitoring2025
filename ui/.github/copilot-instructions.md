# Copilot Instructions for Monitoring2025 UI Project

## Project Requirements and Guidelines

### Language Support & Internationalization
- This project **must support both Persian (fa) and English (en) languages**
- **Persian language is the primary/main language** - all default content should be in Persian
- All UI components, text, labels, messages, error messages, and content should be properly internationalized
- Use the existing i18next setup for translations - **never hardcode text strings in components**
- Ensure proper RTL (Right-to-Left) layout support for Persian content using CSS direction properties
- When adding new text, **always add corresponding keys to both language translation files**
- Translation files are typically located in the `public/locales/` directory
- Use meaningful, hierarchical translation keys (e.g., `common.buttons.save`, `errors.validation.required`)

### Technology Stack
- This project is a **React application using TypeScript**
- Follow TypeScript best practices and provide proper typing for all code
- Use type definitions for all components, props, functions, and API responses
- This project uses **Redux Toolkit (RTK) for state management**
- Prefer functional components with hooks over class components

### UI Framework
- This project uses **Bootstrap** for styling and layout
- Follow Bootstrap conventions and components when adding new UI elements
- Ensure proper Bootstrap classes are used for responsive design

### Responsive Design
- This project **must support both desktop and mobile devices**
- All components and layouts should be fully responsive
- Test and ensure proper display across different screen sizes
- Use Bootstrap's responsive utilities and grid system

### Backend API
- The server is built with **.NET Core C# ASP.NET Web API**
- **The backend project operates in HTTPS-only mode**
- **Server address:** `https://localhost:7136`
- SSL certificate is self-signed (can be trusted for development)
- **API documentation:** Available at `https://localhost:7136/swagger/v1/swagger.json`
- **Authentication:** Uses JWT tokens for secure access

### Development Guidelines
- **Language Considerations:** Always implement features with both Persian and English support
- **RTL Support:** Ensure proper Right-to-Left layout for Persian text using CSS direction properties
- **Styling:** Maintain consistent styling using Bootstrap components and classes
- **Responsive Testing:** Test all components on both desktop and mobile viewports
- **Code Structure:** Follow existing project patterns and maintain consistency
- **API Integration:** Use HTTPS endpoints by default when making API calls
- **Documentation:** Refer to swagger.json for detailed API endpoint specifications