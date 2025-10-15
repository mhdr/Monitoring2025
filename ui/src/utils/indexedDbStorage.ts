/**
 * IndexedDB Storage Utility
 * Provides a localStorage-like API with enhanced features:
 * - TTL (Time To Live) support for automatic data expiration
 * - Cross-tab synchronization via BroadcastChannel
 * - Async/await interface
 * - Automatic cleanup of expired data
 * - Better storage limits (50MB+ vs localStorage's 5-10MB)
 * - Structured storage for complex data types
 */

/**
 * Data with TTL metadata
 */
interface StoredData<T> {
  value: T;
  timestamp: number;
  ttl?: number;
  expiresAt?: number;
}

/**
 * IndexedDB configuration
 */
const DB_NAME = 'Monitoring2025';
const DB_VERSION = 1;
const STORE_NAME = 'storage';
const BROADCAST_CHANNEL_NAME = 'indexeddb-storage-sync';

/**
 * Broadcast channel for cross-tab synchronization
 */
let broadcastChannel: BroadcastChannel | null = null;

/**
 * Initialize BroadcastChannel for cross-tab sync
 */
const initBroadcastChannel = (): void => {
  if (typeof BroadcastChannel !== 'undefined' && !broadcastChannel) {
    try {
      broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      console.info('[IndexedDB] BroadcastChannel initialized for cross-tab sync');
    } catch (error) {
      console.warn('[IndexedDB] BroadcastChannel not available:', error);
    }
  }
};

/**
 * Broadcast storage change to other tabs
 */
const broadcastChange = (key: string, action: 'set' | 'remove' | 'clear'): void => {
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ key, action, timestamp: Date.now() });
    } catch (error) {
      console.warn('[IndexedDB] Failed to broadcast change:', error);
    }
  }
};

/**
 * Listen for storage changes from other tabs
 */
export const onStorageChange = (
  callback: (key: string, action: 'set' | 'remove' | 'clear') => void
): (() => void) => {
  if (!broadcastChannel) {
    initBroadcastChannel();
  }

  if (broadcastChannel) {
    const handler = (event: MessageEvent): void => {
      callback(event.data.key, event.data.action);
    };

    broadcastChannel.addEventListener('message', handler);

    // Return cleanup function
    return () => {
      broadcastChannel?.removeEventListener('message', handler);
    };
  }

  // Return no-op cleanup if BroadcastChannel not available
  return () => {};
};

/**
 * Open IndexedDB connection
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
        console.info('[IndexedDB] Object store created:', STORE_NAME);
      }
    };
  });
};

/**
 * Get item from IndexedDB
 */
export const getItem = async <T>(key: string): Promise<T | null> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const storedData = request.result as StoredData<T> | undefined;

        if (!storedData) {
          resolve(null);
          return;
        }

        // Check TTL expiration
        if (storedData.expiresAt && Date.now() > storedData.expiresAt) {
          console.info(`[IndexedDB] Data expired for key: ${key}, removing...`);
          // Remove expired data asynchronously
          removeItem(key).catch((error) =>
            console.warn('[IndexedDB] Failed to remove expired item:', error)
          );
          resolve(null);
          return;
        }

        resolve(storedData.value);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get item: ${request.error?.message}`));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Error in getItem:', error);
    return null;
  }
};

/**
 * Set item in IndexedDB with optional TTL
 */
export const setItem = async <T>(key: string, value: T, ttl?: number): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const storedData: StoredData<T> = {
      value,
      timestamp: Date.now(),
      ttl,
      expiresAt: ttl ? Date.now() + ttl : undefined,
    };

    const request = store.put(storedData, key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        broadcastChange(key, 'set');
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to set item: ${request.error?.message}`));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Error in setItem:', error);
    throw error;
  }
};

/**
 * Remove item from IndexedDB
 */
export const removeItem = async (key: string): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        broadcastChange(key, 'remove');
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to remove item: ${request.error?.message}`));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Error in removeItem:', error);
    throw error;
  }
};

/**
 * Clear all items from IndexedDB
 */
export const clear = async (): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        broadcastChange('*', 'clear');
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to clear store: ${request.error?.message}`));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Error in clear:', error);
    throw error;
  }
};

/**
 * Get all keys from IndexedDB
 */
export const getAllKeys = async (): Promise<string[]> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAllKeys();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result as string[]);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get all keys: ${request.error?.message}`));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Error in getAllKeys:', error);
    return [];
  }
};

/**
 * Clean up expired items from IndexedDB
 */
export const cleanupExpired = async (): Promise<number> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.openCursor();

    let cleanedCount = 0;
    const now = Date.now();

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null;

        if (cursor) {
          const storedData = cursor.value as StoredData<unknown>;

          if (storedData.expiresAt && now > storedData.expiresAt) {
            cursor.delete();
            cleanedCount++;
            console.info(`[IndexedDB] Cleaned up expired key: ${cursor.key}`);
          }

          cursor.continue();
        } else {
          // No more entries
          resolve(cleanedCount);
        }
      };

      request.onerror = () => {
        reject(new Error(`Failed to cleanup expired items: ${request.error?.message}`));
      };

      transaction.oncomplete = () => {
        db.close();
        if (cleanedCount > 0) {
          console.info(`[IndexedDB] Cleanup completed: removed ${cleanedCount} expired items`);
        }
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Error in cleanupExpired:', error);
    return 0;
  }
};

/**
 * Get storage size estimate (in bytes)
 */
export const getStorageEstimate = async (): Promise<{
  usage: number;
  quota: number;
  percentage: number;
}> => {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentage = quota > 0 ? (usage / quota) * 100 : 0;

      return { usage, quota, percentage };
    }

    return { usage: 0, quota: 0, percentage: 0 };
  } catch (error) {
    console.warn('[IndexedDB] Failed to get storage estimate:', error);
    return { usage: 0, quota: 0, percentage: 0 };
  }
};

/**
 * Initialize IndexedDB storage
 * Call this once on app startup
 */
export const initIndexedDB = async (): Promise<void> => {
  try {
    // Initialize database
    await openDB();
    
    // Initialize BroadcastChannel
    initBroadcastChannel();
    
    // Run initial cleanup
    await cleanupExpired();
    
    // Schedule periodic cleanup (every hour)
    setInterval(() => {
      cleanupExpired().catch((error) => 
        console.error('[IndexedDB] Auto-cleanup failed:', error)
      );
    }, 60 * 60 * 1000);
    
    console.info('[IndexedDB] Storage initialized successfully');
    
    // Log storage estimate
    const estimate = await getStorageEstimate();
    console.info('[IndexedDB] Storage estimate:', {
      usage: `${(estimate.usage / 1024 / 1024).toFixed(2)} MB`,
      quota: `${(estimate.quota / 1024 / 1024).toFixed(2)} MB`,
      percentage: `${estimate.percentage.toFixed(2)}%`,
    });
  } catch (error) {
    console.error('[IndexedDB] Failed to initialize storage:', error);
    throw error;
  }
};

/**
 * Export a localStorage-compatible interface for easier migration
 */
export const indexedDBStorage = {
  getItem,
  setItem,
  removeItem,
  clear,
  getAllKeys,
  cleanupExpired,
  getStorageEstimate,
  onStorageChange,
};

export default indexedDBStorage;
