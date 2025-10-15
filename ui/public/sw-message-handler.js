/**
 * Custom Service Worker - Message Handler
 * 
 * Extends the auto-generated Service Worker from vite-plugin-pwa
 * to handle cache invalidation messages from the client.
 * 
 * This file is imported by the generated Service Worker to add custom logic.
 */

// Listen for messages from clients
self.addEventListener('message', (event) => {
  const { type, endpoints, cacheName } = event.data || {};

  if (type === 'CLEAR_API_CACHE') {
    handleClearApiCache(endpoints, cacheName, event);
  }
});

/**
 * Handle CLEAR_API_CACHE message
 * Removes specific API endpoints from the cache
 * @param {string[] | undefined} endpoints - API endpoints to clear
 * @param {string | undefined} cacheName - Cache name to target
 * @param {ExtendableMessageEvent} event - Message event
 */
async function handleClearApiCache(endpoints, cacheName, event) {
  try {
    const targetCacheName = cacheName || 'api-cache';
    const cache = await caches.open(targetCacheName);

    if (endpoints && endpoints.length > 0) {
      // Clear specific endpoints
      const baseUrl = 'https://localhost:7136';
      const deletePromises = endpoints.map(endpoint => {
        const url = `${baseUrl}${endpoint}`;
        console.log('[SW] Clearing cache for:', url);
        return cache.delete(url, { ignoreVary: true, ignoreSearch: true });
      });

      await Promise.all(deletePromises);
      console.log(`[SW] Cleared ${endpoints.length} API endpoints from cache`);
    } else {
      // Clear entire API cache
      const keys = await cache.keys();
      const apiKeys = keys.filter(request => 
        request.url.includes('/api/')
      );

      await Promise.all(
        apiKeys.map(request => cache.delete(request))
      );
      
      console.log(`[SW] Cleared ${apiKeys.length} API requests from cache`);
    }

    // Send success response back to client
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ success: true });
    }
  } catch (error) {
    console.error('[SW] Failed to clear API cache:', error);
    
    // Send error response back to client
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
}

/**
 * Clean up old caches on activation
 * This runs when a new Service Worker activates
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated - cache coordination ready');
  
  // Claim all clients immediately
  event.waitUntil(
    self.clients.claim().then(() => {
      console.log('[SW] Claimed all clients');
    })
  );
});

console.log('[SW] Custom message handler loaded');
