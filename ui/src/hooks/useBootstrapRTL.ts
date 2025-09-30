import { useEffect } from 'react';
import { useLanguage } from './useLanguage';

/**
 * Custom hook to dynamically load Bootstrap CSS based on language direction
 * Loads bootstrap.rtl.min.css for Persian (RTL) and bootstrap.min.css for English (LTR)
 * Uses local Bootstrap files from node_modules
 */
export const useBootstrapRTL = () => {
  const { language } = useLanguage();

  useEffect(() => {
    const loadBootstrapCSS = async () => {
      // Remove any existing Bootstrap stylesheets
      const existingLinks = document.querySelectorAll('link[data-bootstrap]');
      existingLinks.forEach(link => link.remove());

      // Create new link element
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.setAttribute('data-bootstrap', 'true');

      if (language === 'fa') {
        // Dynamically import RTL CSS for Persian
        const rtlModule = await import('../styles/bootstrap-rtl.css?url');
        link.href = rtlModule.default;
      } else {
        // Dynamically import LTR CSS for English
        const ltrModule = await import('../styles/bootstrap-ltr.css?url');
        link.href = ltrModule.default;
      }

      // Insert at the beginning of head to allow custom styles to override
      document.head.insertBefore(link, document.head.firstChild);
    };

    loadBootstrapCSS();

    // Cleanup function
    return () => {
      const links = document.querySelectorAll('link[data-bootstrap]');
      links.forEach(link => link.remove());
    };
  }, [language]);
};
