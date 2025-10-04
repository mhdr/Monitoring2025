/**
 * Route Preloader Utility
 * 
 * Preloads lazy-loaded route components to improve navigation performance.
 * Implements intelligent prefetching based on user navigation patterns.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PreloadableComponent = () => Promise<any>;

// Cache to track which routes have been preloaded
const preloadedRoutes = new Set<string>();

/**
 * Preload a single lazy-loaded component
 * @param routeName - Unique identifier for the route
 * @param componentLoader - The lazy import function
 */
export const preloadRoute = (routeName: string, componentLoader: PreloadableComponent): void => {
  // Skip if already preloaded
  if (preloadedRoutes.has(routeName)) {
    return;
  }

  // Mark as preloading
  preloadedRoutes.add(routeName);

  // Trigger the dynamic import
  componentLoader().catch((error) => {
    console.error(`Failed to preload route: ${routeName}`, error);
    // Remove from cache so it can be retried
    preloadedRoutes.delete(routeName);
  });
};

/**
 * Preload multiple routes
 * @param routes - Array of route configurations
 */
export const preloadRoutes = (routes: Array<{ name: string; loader: PreloadableComponent }>): void => {
  routes.forEach(({ name, loader }) => {
    preloadRoute(name, loader);
  });
};

/**
 * Preload routes with a delay (useful for non-critical routes)
 * @param routes - Array of route configurations
 * @param delayMs - Delay in milliseconds before starting preload
 */
export const preloadRoutesDelayed = (
  routes: Array<{ name: string; loader: PreloadableComponent }>,
  delayMs: number = 2000
): void => {
  setTimeout(() => {
    preloadRoutes(routes);
  }, delayMs);
};

/**
 * Check if a route has been preloaded
 * @param routeName - Unique identifier for the route
 */
export const isRoutePreloaded = (routeName: string): boolean => {
  return preloadedRoutes.has(routeName);
};

/**
 * Clear the preload cache (useful for testing)
 */
export const clearPreloadCache = (): void => {
  preloadedRoutes.clear();
};
