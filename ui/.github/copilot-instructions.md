# Copilot Instructions for Monitoring2025 UI Project

## Project Requirements and Guidelines

### Language Support
- This project **must support both Persian and English languages**
- **Persian language is the primary/main language**
- All UI components, text, and content should be properly internationalized
- Use the existing i18next setup for translations

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
- Server addresses:
  - HTTP: `http://localhost:5030`
  - HTTPS: `https://localhost:7136` (use HTTPS by default)
- SSL certificate is self-signed (can be trusted for development)
- API documentation available at: `https://localhost:7136/swagger/v1/swagger.json`
- Authentication uses **JWT tokens**

### Development Guidelines
- Always consider both language variants when implementing features
- Ensure proper RTL (Right-to-Left) support for Persian text
- Maintain consistent styling using Bootstrap components
- Test responsiveness on both desktop and mobile viewports
- Follow existing code patterns and project structure
- Use HTTPS endpoints by default when making API calls
- Refer to swagger.json for API endpoint documentation