/**
 * Custom hook for Bootstrap RTL/LTR support
 * 
 * ## DEPRECATED - Now Handled by Bootswatch Loader
 * 
 * This hook is now a no-op because each Bootswatch theme includes its own RTL variant.
 * The theme loader (bootswatchLoader.ts) automatically loads the correct variant:
 * - `bootstrap.min.css` for LTR (English)
 * - `bootstrap.rtl.min.css` for RTL (Persian)
 * 
 * Each Bootswatch theme (cerulean, darkly, etc.) has its own RTL version that maintains
 * the theme's colors while providing RTL layout support.
 * 
 * ## Migration Note
 * This hook is kept for backwards compatibility but does nothing.
 * The actual RTL/LTR switching is now handled in:
 * - `src/utils/bootswatchLoader.ts` - Loads theme-specific RTL/LTR variants
 * - `src/hooks/useTheme.ts` - Passes language to theme loader
 * 
 * @deprecated Use Bootswatch theme loader instead
 */
export const useBootstrapRTL = () => {
  // No-op: RTL/LTR is now handled by Bootswatch theme loader
  // Each theme has its own bootstrap.rtl.min.css variant
  
  // This hook is intentionally empty to avoid conflicts with theme-specific RTL files
};
