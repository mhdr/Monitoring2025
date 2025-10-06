/**
 * AG Grid Lazy Loader
 * Dynamically loads AG Grid Enterprise library and styles only when needed
 * This improves initial bundle size and performance
 */

// Extend Window interface for AG Grid
declare global {
  interface Window {
    agGrid?: AGGridLibrary;
  }
}

interface AGGridLibrary {
  Grid?: unknown; // Legacy constructor (not used in modern versions)
  createGrid?: (element: HTMLElement, options: unknown) => unknown; // Modern API
  LicenseManager: {
    setLicenseKey: (key: string) => void;
  };
}

// Track if AG Grid is loaded
let agGridLoaded = false;
let agGridLoadPromise: Promise<AGGridLibrary> | null = null;

// AG Grid Enterprise license key
const AG_GRID_LICENSE_KEY = 'DownloadDevTools_COM_NDEwMjM0NTgwMDAwMA==59158b5225400879a12a96634544f5b6';

/**
 * Load a script dynamically
 */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if script already exists
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = false; // Load in order
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Load a stylesheet dynamically
 * @deprecated Not used with Theming API, kept for potential future use
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function loadStylesheet(href: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if stylesheet already exists
    const existingLink = document.querySelector(`link[href="${href}"]`);
    if (existingLink) {
      resolve();
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to load stylesheet: ${href}`));
    document.head.appendChild(link);
  });
}

/**
 * Load AG Grid Enterprise library
 * Returns a promise that resolves when AG Grid is ready to use
 * Note: Since v33, themes are passed via the `theme` grid option (Theming API)
 * and no longer loaded as CSS files
 */
export async function loadAGGrid(): Promise<AGGridLibrary> {
  // If already loaded, return the cached promise
  if (agGridLoadPromise) {
    return agGridLoadPromise;
  }

  // If already loaded successfully, return immediately
  if (agGridLoaded && window.agGrid) {
    return window.agGrid;
  }

  // Create the load promise
  agGridLoadPromise = (async () => {
    try {
      // Load AG Grid Enterprise JavaScript
      // NOTE: Do NOT load ag-grid.css or ag-theme-*.css here
      // The Theming API (v33+) manages styles internally
      await loadScript('/ag/dist/ag-grid-enterprise.min.js');
      
      // Wait a bit for the library to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if agGrid is available on window
      const agGrid = window.agGrid;
      
      if (!agGrid) {
        throw new Error('AG Grid library failed to initialize');
      }

      // Set the license key
      if (agGrid.LicenseManager && agGrid.LicenseManager.setLicenseKey) {
        agGrid.LicenseManager.setLicenseKey(AG_GRID_LICENSE_KEY);
      }
      
      agGridLoaded = true;
      return agGrid;
    } catch (error) {
      // Reset the promise so we can try again
      agGridLoadPromise = null;
      throw error;
    }
  })();

  return agGridLoadPromise;
}

/**
 * Preload AG Grid to improve performance
 * This can be called early in the application lifecycle
 */
export function preloadAGGrid(): void {
  // Start loading but don't wait for it
  loadAGGrid().catch(error => {
    console.error('Failed to preload AG Grid:', error);
  });
}

/**
 * Check if AG Grid is currently loaded
 */
export function isAGGridLoaded(): boolean {
  return agGridLoaded;
}

/**
 * Load AG Grid theme stylesheet dynamically
 * @deprecated Since v33, themes are passed via the `theme` grid option (Theming API)
 * This function is kept for backward compatibility but does nothing
 */
export async function loadAGGridTheme(theme: 'alpine' | 'balham' | 'material' | 'quartz'): Promise<void> {
  console.warn(
    `[AGGrid] loadAGGridTheme is deprecated. Since v33, themes are passed via the 'theme' grid option.`,
    `Use: <AGGridWrapper theme="${theme}" /> instead.`
  );
  // No-op: Theming API handles styles internally
}

/**
 * Unload AG Grid theme stylesheet
 * @deprecated Since v33, themes are passed via the `theme` grid option (Theming API)
 * This function is kept for backward compatibility but does nothing
 */
export function unloadAGGridTheme(theme: 'alpine' | 'balham' | 'material' | 'quartz'): void {
  console.warn(
    `[AGGrid] unloadAGGridTheme("${theme}") is deprecated. Since v33, themes are managed by the Theming API.`,
    `Theme switching is automatic when you change the 'theme' prop.`
  );
  // No-op: Theming API handles cleanup internally
}
