import { useEffect } from 'react';
import { useLanguage } from './useLanguage';

/**
 * Custom hook to dynamically load Persian fonts based on language
 * 
 * ## Font Loading Strategy
 * This hook implements **language-specific font loading** for optimal performance:
 * - Loads IRANSansX fonts only when Persian (fa) language is active
 * - English users don't download unnecessary Persian font files
 * - Supports font switching when language changes
 * 
 * ## Performance Benefits
 * ✅ **Reduces initial bundle**: English users save ~150-200 KB (font files)
 * ✅ **Faster page loads**: Only load fonts when needed
 * ✅ **Better caching**: Fonts cached separately with content hash
 * ✅ **On-demand loading**: Language changes load fonts dynamically
 * 
 * ## Font Stack
 * IRANSansX Variable Font includes:
 * - Variable font with weight range 100-1000
 * - WOFF2 format (primary, best compression)
 * - WOFF format (fallback for older browsers)
 * - font-display: fallback (prevents FOIT, minimizes FOUT)
 * 
 * ## Build Output
 * In production, Vite creates:
 * - `fonts/[name]-[hash].woff2` - Variable font (primary)
 * - `fonts/[name]-[hash].woff` - Fallback format
 * - `fonts-[hash].css` - Font-face declarations
 * - `fonts-[hash].js` (~70 bytes) - Dynamic import loader
 * 
 * ## Technical Implementation
 * Uses Vite's dynamic import with `?url` parameter:
 * - `import('../styles/fonts.css?url')` - Loads font CSS URL
 * 
 * The `?url` parameter tells Vite to return the CSS file URL instead of injecting it,
 * allowing us to control when and how the fonts are loaded.
 * 
 * ## Fallback Strategy
 * When Persian fonts are not loaded (English mode), the CSS cascade falls back to:
 * - Tahoma (Windows, common in Persian systems)
 * - Arial (Universal fallback)
 * - sans-serif (Generic fallback)
 * 
 * @see {@link https://vitejs.dev/guide/assets.html#explicit-url-imports Vite URL Imports}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display MDN: font-display}
 */
export const useFontLoader = () => {
  const { language } = useLanguage();

  useEffect(() => {
    const loadPersianFonts = async () => {
      if (language === 'fa') {
        // Persian language active - load IRANSansX fonts
        
        // Check if fonts are already loaded to avoid duplicate requests
        const existingFontLink = document.querySelector('link[data-font-loader]');
        if (existingFontLink) {
          return; // Fonts already loaded
        }

        // Create link element for Persian fonts
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.setAttribute('data-font-loader', 'persian');
        
        // High priority for fonts to prevent FOUT (Flash of Unstyled Text)
        link.fetchPriority = 'high';

        // Dynamically import Persian fonts CSS
        // Vite will code-split this into a separate chunk automatically
        const fontsModule = await import('../styles/fonts.css?url');
        link.href = fontsModule.default;

        // Insert after Bootstrap CSS but before custom styles
        const bootstrapLink = document.querySelector('link[data-bootstrap]');
        if (bootstrapLink && bootstrapLink.nextSibling) {
          document.head.insertBefore(link, bootstrapLink.nextSibling);
        } else {
          // Fallback: insert at the beginning of head
          document.head.insertBefore(link, document.head.firstChild);
        }
      } else {
        // English language active - remove Persian fonts if loaded
        const fontLink = document.querySelector('link[data-font-loader]');
        if (fontLink) {
          fontLink.remove();
        }
      }
    };

    loadPersianFonts();

    // Cleanup function: Remove font CSS when component unmounts
    return () => {
      const fontLink = document.querySelector('link[data-font-loader]');
      if (fontLink) {
        fontLink.remove();
      }
    };
  }, [language]); // Re-run when language changes
};
