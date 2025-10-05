import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useTranslation } from './useTranslation';

/**
 * Service Worker Registration Hook
 * 
 * Manages service worker registration, updates, and offline status.
 * Provides user notifications for updates and offline mode.
 * 
 * @returns {Object} Service worker state and control functions
 */
export const useServiceWorker = () => {
  const { t } = useTranslation();
  const [offlineReady, setOfflineReady] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  // Register service worker with update handling
  const {
    needRefresh: [, setNeedRefreshFlag],
    offlineReady: [, setOfflineReadyFlag],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration: ServiceWorkerRegistration | undefined) {
      console.log('[SW] Service worker registered successfully');
      
      // Check for updates periodically (every hour)
      if (registration) {
        const intervalMS = 60 * 60 * 1000; // 1 hour
        setInterval(() => {
          console.log('[SW] Checking for updates...');
          registration.update();
        }, intervalMS);
      }
    },
    onRegisteredSW(swUrl: string, registration: ServiceWorkerRegistration | undefined) {
      console.log('[SW] Service worker registered at:', swUrl);
      
      // Robust periodic update check with offline handling
      if (registration) {
        const intervalMS = 60 * 60 * 1000; // 1 hour
        setInterval(async () => {
          // Skip if service worker is installing or browser is offline
          if (!(!registration.installing && navigator)) {
            return;
          }

          if (('connection' in navigator) && !navigator.onLine) {
            console.log('[SW] Browser is offline, skipping update check');
            return;
          }

          console.log('[SW] Checking for service worker updates...');
          try {
            const resp = await fetch(swUrl, {
              cache: 'no-store',
              headers: {
                'cache': 'no-store',
                'cache-control': 'no-cache',
              },
            });

            if (resp?.status === 200) {
              await registration.update();
              console.log('[SW] Update check completed');
            }
          } catch (error) {
            console.error('[SW] Update check failed:', error);
          }
        }, intervalMS);
      }
    },
    onRegisterError(error: Error) {
      console.error('[SW] Service worker registration failed:', error);
    },
    onNeedRefresh() {
      console.log('[SW] New content available, please refresh');
      setNeedRefresh(true);
      setNeedRefreshFlag(true);
      setUpdateAvailable(true);
    },
    onOfflineReady() {
      console.log('[SW] App is ready to work offline');
      setOfflineReady(true);
      setOfflineReadyFlag(true);
    },
  });

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('[SW] Browser is online');
    };

    const handleOffline = () => {
      console.log('[SW] Browser is offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Update the service worker and reload the page
   */
  const updateServiceWorkerAndReload = async () => {
    console.log('[SW] Updating service worker...');
    await updateServiceWorker(true); // true = reload page after update
  };

  /**
   * Close the update notification without updating
   */
  const closeUpdateNotification = () => {
    setNeedRefresh(false);
    setNeedRefreshFlag(false);
    setUpdateAvailable(false);
  };

  /**
   * Close the offline ready notification
   */
  const closeOfflineNotification = () => {
    setOfflineReady(false);
    setOfflineReadyFlag(false);
  };

  return {
    // State
    offlineReady,
    needRefresh,
    updateAvailable,
    isOnline: navigator.onLine,
    
    // Actions
    updateServiceWorkerAndReload,
    closeUpdateNotification,
    closeOfflineNotification,
    
    // Translations
    t,
  };
};
