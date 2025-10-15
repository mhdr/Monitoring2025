import { useCallback, useRef } from 'react';

/**
 * Hook for prefetching URLs on hover to improve navigation performance
 * 
 * When a user hovers over a button/link, this hook dynamically adds a <link rel="prefetch"> tag
 * to start loading the target page's resources BEFORE the user clicks.
 * 
 * This significantly reduces perceived load time for new tabs since the browser
 * will have already started downloading resources during the hover time (typically 100-500ms).
 * 
 * @example
 * const prefetchUrl = useUrlPrefetch();
 * 
 * <IconButton
 *   onMouseEnter={() => prefetchUrl('/item-detail/trend-analysis?itemId=123')}
 *   onClick={() => window.open('/item-detail/trend-analysis?itemId=123', '_blank')}
 * >
 *   <OpenInNew />
 * </IconButton>
 */
export const useUrlPrefetch = () => {
  // Track which URLs we've already added prefetch links for
  const prefetchedUrls = useRef<Set<string>>(new Set());

  /**
   * Add a prefetch link for the given URL
   * Uses rel="prefetch" for low-priority resource loading that won't block the current page
   */
  const prefetchUrl = useCallback((url: string) => {
    // Skip if we've already added a prefetch link for this URL
    if (prefetchedUrls.current.has(url)) {
      return;
    }

    try {
      // Create prefetch link element
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      link.as = 'document'; // Hint that this is an HTML document
      
      // Add to document head
      document.head.appendChild(link);
      
      // Track that we've added this URL
      prefetchedUrls.current.add(url);
      
      // Optional: Remove the link after prefetch completes to keep DOM clean
      // However, keeping it doesn't hurt and ensures the cache entry persists
      link.onload = () => {
        // Prefetch successful - resources are now in browser cache
        console.debug(`Prefetched: ${url}`);
      };
      
      link.onerror = () => {
        // Prefetch failed - remove from tracking so it can be retried
        console.warn(`Failed to prefetch: ${url}`);
        prefetchedUrls.current.delete(url);
      };
    } catch (error) {
      console.error('Failed to create prefetch link:', error);
    }
  }, []);

  return prefetchUrl;
};
