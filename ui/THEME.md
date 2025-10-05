# 🎨 Monitoring2025 UI Theme System

## Overview

This project uses a centralized theme system with CSS custom properties (CSS variables) for consistent styling throughout the application. All color definitions, gradients, shadows, and design tokens are consolidated in a single file: **`src/styles/theme.css`**.

## 📁 Files Structure

```
src/
├── styles/
│   └── theme.css          # ⭐ Main theme configuration file (EDIT THIS TO CHANGE COLORS)
├── main.tsx               # Theme is imported here first
└── components/
    └── *.css              # Component styles use theme variables
```

## 🎨 Current Theme

The application uses a **modern monitoring dashboard theme** with:

- **Primary Colors**: Professional dark blue/slate (`#2c3e50`, `#34495e`)
- **Accent Colors**: Vibrant light blue (`#3498db`, `#5dade2`)
- **Gradient Colors**: Purple/blue gradients for special backgrounds
- **Design Style**: Clean, professional, with smooth transitions and subtle shadows

### Color Palette Preview

| Category | Color | Hex Code | Usage |
|----------|-------|----------|-------|
| **Primary Dark** | 🔵 | `#2c3e50` | Sidebar, navbar, dark surfaces |
| **Primary Medium** | 🔵 | `#34495e` | Secondary surfaces, gradients |
| **Primary Light** | 💠 | `#3498db` | Interactive elements, links |
| **Primary Lighter** | 💙 | `#5dade2` | Hover states, highlights |
| **Gradient Purple** | 💜 | `#667eea → #764ba2` | Login page, loading screens |
| **Gradient Indigo** | 🔮 | `#4f46e5 → #667eea` | Buttons, icons |
| **Success** | 💚 | `#10b981` | Success messages |
| **Warning** | 🧡 | `#f59e0b` | Warning messages |
| **Error** | ❤️ | `#dc3545` | Error messages |
| **Info** | 🔷 | `#0ea5e9` | Info messages |

## 🔧 How to Change Colors

### Step 1: Open Theme File

Navigate to and open: **`src/styles/theme.css`**

### Step 2: Find the Color Category

The theme file is organized into sections:

```css
/* PRIMARY COLORS - Main Brand Colors */
--primary-dark: #2c3e50;        /* ← Change this value */
--primary-medium: #34495e;
--primary-light: #3498db;

/* ACCENT COLORS - Interactive Elements */
--accent-primary: #3498db;      /* ← Change this value */
--accent-hover: #2980b9;

/* GRADIENT COLORS - Special Backgrounds */
--gradient-purple-start: #667eea;  /* ← Change this value */
--gradient-purple-end: #764ba2;
```

### Step 3: Update the Hex Values

Simply replace the hex color codes with your desired colors:

```css
/* Example: Changing to a green theme */
--primary-dark: #1e4620;        /* Changed from #2c3e50 */
--primary-medium: #2d5f30;      /* Changed from #34495e */
--primary-light: #4caf50;       /* Changed from #3498db */
--accent-primary: #66bb6a;      /* Changed from #3498db */
```

### Step 4: Save and Reload

- Save the file
- The changes will automatically apply throughout the entire application
- No need to edit any other files!

## 📖 Theme Variable Reference

### Primary Colors

| Variable | Default | Description |
|----------|---------|-------------|
| `--primary-dark` | `#2c3e50` | Main sidebar, navbar, dark surfaces |
| `--primary-medium` | `#34495e` | Secondary surfaces and gradients |
| `--primary-light` | `#3498db` | Interactive elements |
| `--primary-lighter` | `#5dade2` | Hover states and highlights |
| `--primary-darker` | `#1a252f` | Borders and darker accents |

### Accent Colors

| Variable | Default | Description |
|----------|---------|-------------|
| `--accent-primary` | `#3498db` | Main accent for buttons, links, active states |
| `--accent-hover` | `#2980b9` | Hover state for accent elements |
| `--accent-active` | `#21618c` | Pressed/active state |

### Gradient Colors

| Variable | Default | Description |
|----------|---------|-------------|
| `--gradient-purple-start` | `#667eea` | Login page gradient start |
| `--gradient-purple-end` | `#764ba2` | Login page gradient end |
| `--gradient-indigo-start` | `#4f46e5` | Button gradient start |
| `--gradient-indigo-end` | `#667eea` | Button gradient end |

### Pre-configured Gradients

| Variable | Description |
|----------|-------------|
| `--gradient-primary` | Main background gradient (login, loading) |
| `--gradient-sidebar` | Sidebar background gradient |
| `--gradient-navbar` | Navbar background gradient |
| `--gradient-button` | Default button gradient |
| `--gradient-button-hover` | Button hover state gradient |
| `--gradient-button-disabled` | Disabled button gradient |

### Text Colors

| Variable | Default | Description |
|----------|---------|-------------|
| `--text-primary-light` | `#ecf0f1` | Primary text on dark backgrounds |
| `--text-secondary-light` | `#bdc3c7` | Secondary text on dark backgrounds |
| `--text-primary-dark` | `#213547` | Primary text on light backgrounds |
| `--text-secondary-dark` | `#64748b` | Secondary text on light backgrounds |
| `--text-muted-light` | `#9ca3af` | Muted text on dark backgrounds |
| `--text-muted-dark` | `#6b7280` | Muted text on light backgrounds |

### Semantic Colors

| Variable | Default | Description |
|----------|---------|-------------|
| `--success` | `#10b981` | Success state color |
| `--success-bg` | `rgba(16, 185, 129, 0.1)` | Success background |
| `--warning` | `#f59e0b` | Warning state color |
| `--warning-bg` | `rgba(245, 158, 11, 0.1)` | Warning background |
| `--error` | `#dc3545` | Error state color |
| `--error-bg` | `rgba(220, 53, 69, 0.1)` | Error background |
| `--info` | `#0ea5e9` | Info state color |
| `--info-bg` | `rgba(14, 165, 233, 0.1)` | Info background |

### Shadow Definitions

| Variable | Description |
|----------|-------------|
| `--shadow-xs` | Extra small shadow for subtle elevation |
| `--shadow-sm` | Small shadow |
| `--shadow-md` | Medium shadow for cards |
| `--shadow-lg` | Large shadow for modals |
| `--shadow-xl` | Extra large shadow |
| `--shadow-primary` | Colored shadow with primary color |
| `--shadow-primary-lg` | Large colored shadow |
| `--shadow-focus-primary` | Focus ring shadow (primary) |
| `--shadow-focus-error` | Focus ring shadow (error) |

### Border Radius

| Variable | Default | Description |
|----------|---------|-------------|
| `--radius-sm` | `0.375rem` | Small border radius |
| `--radius-md` | `0.5rem` | Medium border radius |
| `--radius-lg` | `0.75rem` | Large border radius |
| `--radius-xl` | `1rem` | Extra large border radius |
| `--radius-full` | `9999px` | Full rounded (circles) |

### Transitions

| Variable | Default | Description |
|----------|---------|-------------|
| `--transition-fast` | `0.15s` | Fast transition |
| `--transition-base` | `0.2s` | Base transition speed |
| `--transition-medium` | `0.3s` | Medium transition |
| `--transition-slow` | `0.5s` | Slow transition |

### Z-Index Scale

| Variable | Value | Description |
|----------|-------|-------------|
| `--z-sidebar` | `1040` | Sidebar layer |
| `--z-navbar` | `1060` | Navbar layer |
| `--z-user-dropdown` | `1061` | User dropdown layer |
| `--z-modal` | `1050` | Modal layer |
| `--z-loading-screen` | `9999` | Loading screen (top layer) |

## 🎯 Usage Examples

### In CSS Files

```css
/* Use theme variables directly */
.my-component {
  background: var(--primary-dark);
  color: var(--text-primary-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-medium) ease;
}

.my-component:hover {
  background: var(--accent-primary);
  box-shadow: var(--shadow-primary-lg);
}
```

### In React Components (Inline Styles)

```tsx
<div style={{ 
  backgroundColor: 'var(--primary-dark)',
  color: 'var(--text-primary-light)',
  borderRadius: 'var(--radius-lg)'
}}>
  Content here
</div>
```

### Using Pre-configured Gradients

```css
.login-background {
  background: var(--gradient-primary);
}

.button-primary {
  background: var(--gradient-button);
}

.button-primary:hover {
  background: var(--gradient-button-hover);
}
```

### Using Utility Classes

The theme provides utility classes for quick styling:

```html
<div class="bg-primary text-primary shadow-md gradient-sidebar">
  Styled with utility classes
</div>
```

## 🌓 Dark Mode Support

The theme automatically adjusts for dark mode based on user preferences:

```css
@media (prefers-color-scheme: dark) {
  /* Automatically uses dark mode colors */
  /* Defined in theme.css */
}
```

## 🌍 RTL (Right-to-Left) Support

The theme includes specific shadows and borders for RTL layouts:

```css
/* LTR shadow */
box-shadow: var(--shadow-sidebar);

/* RTL shadow */
box-shadow: var(--shadow-sidebar-rtl);
```

## 📊 Chart Colors (ECharts)

The theme includes a color palette specifically for data visualizations:

```css
--chart-color-1: #3498db;  /* Blue */
--chart-color-2: #e74c3c;  /* Red */
--chart-color-3: #2ecc71;  /* Green */
--chart-color-4: #f39c12;  /* Orange */
--chart-color-5: #9b59b6;  /* Purple */
--chart-color-6: #1abc9c;  /* Turquoise */
--chart-color-7: #34495e;  /* Dark gray */
--chart-color-8: #e67e22;  /* Dark orange */
```

**Usage in ECharts:**

```typescript
const option: EChartsOption = {
  color: [
    'var(--chart-color-1)',
    'var(--chart-color-2)',
    'var(--chart-color-3)',
    // ...
  ],
  // ... rest of chart config
};
```

## 🚀 Advanced Customization

### Creating Custom Gradients

You can create custom gradients using the existing color variables:

```css
/* In your component CSS */
.custom-gradient {
  background: linear-gradient(
    135deg, 
    var(--primary-dark) 0%, 
    var(--accent-primary) 100%
  );
}
```

### Adding New Theme Variables

To add new variables, edit `theme.css`:

```css
:root {
  /* Your custom variables */
  --my-custom-color: #ff6b6b;
  --my-custom-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
}
```

Then use them in your components:

```css
.my-component {
  background: var(--my-custom-color);
  box-shadow: var(--my-custom-shadow);
}
```

## 🎨 Popular Theme Examples

### Green Theme

```css
--primary-dark: #1e4620;
--primary-medium: #2d5f30;
--primary-light: #4caf50;
--primary-lighter: #66bb6a;
--accent-primary: #8bc34a;
--accent-hover: #7cb342;
```

### Purple Theme

```css
--primary-dark: #4a148c;
--primary-medium: #6a1b9a;
--primary-light: #9c27b0;
--primary-lighter: #ba68c8;
--accent-primary: #e040fb;
--accent-hover: #d500f9;
```

### Orange Theme

```css
--primary-dark: #e65100;
--primary-medium: #ef6c00;
--primary-light: #ff9800;
--primary-lighter: #ffb74d;
--accent-primary: #ffa726;
--accent-hover: #fb8c00;
```

### Red Theme

```css
--primary-dark: #b71c1c;
--primary-medium: #c62828;
--primary-light: #f44336;
--primary-lighter: #ef5350;
--accent-primary: #ff5252;
--accent-hover: #ff1744;
```

## 🧪 Testing Your Theme

After making changes:

1. **Save** the `theme.css` file
2. **Refresh** your browser (Ctrl+F5 or Cmd+Shift+R)
3. **Check all pages**:
   - Login page
   - Dashboard
   - Sidebar navigation
   - Buttons and forms
   - Charts and visualizations
4. **Test both languages** (Persian/English)
5. **Test both light/dark modes**
6. **Test on mobile devices**

## 📝 Best Practices

### DO ✅

- Use theme variables for all colors
- Test changes in both LTR and RTL modes
- Test in both light and dark modes
- Keep color contrasts accessible (WCAG AA minimum)
- Document any custom variables you add

### DON'T ❌

- Hardcode colors directly in components
- Use inline hex values
- Modify colors without testing both language modes
- Ignore accessibility guidelines
- Create duplicate variables

## 🐛 Troubleshooting

### Colors Not Updating

1. Hard refresh the browser (Ctrl+F5 or Cmd+Shift+R)
2. Clear browser cache
3. Check if theme.css is imported in `main.tsx`
4. Verify CSS syntax is correct (no missing semicolons)

### Colors Look Different on Some Pages

1. Check if the component has inline styles overriding theme
2. Verify the component CSS imports are after theme.css
3. Look for `!important` flags that might override theme

### Dark Mode Not Working

1. Check browser/OS dark mode preference
2. Verify `@media (prefers-color-scheme: dark)` section in theme.css
3. Test with browser DevTools (toggle prefers-color-scheme)

## 📚 Additional Resources

- [CSS Custom Properties (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [Color Accessibility Guide](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [Color Palette Generator](https://coolors.co/)
- [Gradient Generator](https://cssgradient.io/)

## 📞 Support

If you encounter issues or have questions about the theme system:

1. Check this documentation first
2. Review the comments in `theme.css`
3. Test with browser DevTools
4. Ask the development team

---

**Last Updated:** 2025-01-05  
**Theme Version:** 1.0.0  
**Maintained By:** Monitoring2025 UI Team
