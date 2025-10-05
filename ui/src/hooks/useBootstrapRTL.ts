import { useEffect } from 'react';
import { useLanguage } from './useLanguage';

/**
 * Custom hook to dynamically load Bootstrap CSS based on language direction
 * 
 * ## CSS Code Splitting Strategy
 * This hook implements **optimized CSS code splitting** for Bootstrap variants:
 * - Loads `bootstrap-rtl.css` for Persian (RTL) - 231 KB (30.7 KB gzipped)
 * - Loads `bootstrap-ltr.css` for English (LTR) - 231 KB (30.7 KB gzipped)
 * 
 * ## Performance Benefits
 * ✅ **Reduces initial bundle**: Only the needed CSS variant is downloaded (~231 KB saved)
 * ✅ **Faster page loads**: Users don't download unused CSS
 * ✅ **Better caching**: Each variant cached separately with content hash
 * ✅ **On-demand switching**: Language changes load the other variant dynamically
 * 
 * ## Build Output
 * In production, Vite creates separate chunks:
 * - `bootstrap-rtl-[hash].css` - RTL variant
 * - `bootstrap-ltr-[hash].css` - LTR variant
 * - `bootstrap-rtl-[hash].js` (~70 bytes) - Dynamic import loader
 * - `bootstrap-ltr-[hash].js` (~70 bytes) - Dynamic import loader
 * 
 * ## Technical Implementation
 * Uses Vite's dynamic import with `?url` query parameter:
 * - `import('../styles/bootstrap-rtl.css?url')` - Loads RTL CSS URL
 * - `import('../styles/bootstrap-ltr.css?url')` - Loads LTR CSS URL
 * 
 * The `?url` parameter tells Vite to return the CSS file URL instead of injecting it,
 * allowing us to control when and how the CSS is loaded.
 * 
 * @see {@link https://vitejs.dev/guide/assets.html#explicit-url-imports Vite URL Imports}
 */
export const useBootstrapRTL = () => {
  const { language } = useLanguage();

  useEffect(() => {
    const loadBootstrapCSS = async () => {
      // Remove any existing Bootstrap stylesheets to prevent conflicts
      const existingLinks = document.querySelectorAll('link[data-bootstrap]');
      existingLinks.forEach(link => link.remove());

      // Create new link element for the CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.setAttribute('data-bootstrap', 'true');
      
      // High priority for faster rendering (supported in modern browsers)
      link.fetchPriority = 'high';

      // Dynamically import the correct CSS variant based on language
      // Vite will code-split these into separate chunks automatically
      if (language === 'fa') {
        // Persian (RTL) - Right-to-Left layout
        const rtlModule = await import('../styles/bootstrap-rtl.css?url');
        link.href = rtlModule.default;
      } else {
        // English (LTR) - Left-to-Right layout
        const ltrModule = await import('../styles/bootstrap-ltr.css?url');
        link.href = ltrModule.default;
      }

      // Insert at the beginning of head to allow custom styles to override Bootstrap
      document.head.insertBefore(link, document.head.firstChild);
    };

    loadBootstrapCSS();

    // Cleanup function: Remove Bootstrap CSS when component unmounts
    // This prevents memory leaks and style conflicts
    return () => {
      const links = document.querySelectorAll('link[data-bootstrap]');
      links.forEach(link => link.remove());
    };
  }, [language]); // Re-run when language changes
};
