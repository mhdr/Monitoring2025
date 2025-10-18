/**
 * Notification Preferences Storage
 * 
 * Manages notification settings persistence in IndexedDB.
 * Stores user preferences for desktop notifications.
 */

import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import { createLogger } from './logger';

const logger = createLogger('NotificationStorage');

const DB_NAME = 'notification_preferences';
const DB_VERSION = 1;
const STORE_NAME = 'preferences';
const PREFERENCES_KEY = 'notification_settings';

/**
 * Notification preferences interface
 */
export interface NotificationPreferences {
  enabled: boolean;
  lastUpdated: number;
}

/**
 * Database schema for notification preferences
 */
interface NotificationDB extends DBSchema {
  preferences: {
    key: string;
    value: NotificationPreferences;
  };
}

/**
 * Initialize and open the notification preferences database
 */
async function openNotificationDB(): Promise<IDBPDatabase<NotificationDB>> {
  try {
    const db = await openDB<NotificationDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
          logger.log('Created notification preferences object store');
        }
      },
    });
    return db;
  } catch (error) {
    logger.error('Failed to open notification preferences database:', error);
    throw error;
  }
}

/**
 * Get notification preferences from IndexedDB
 * Returns default preferences if none exist
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const db = await openNotificationDB();
    const preferences = await db.get(STORE_NAME, PREFERENCES_KEY);
    
    if (preferences) {
      logger.log('Retrieved notification preferences from IndexedDB:', preferences);
      return preferences;
    }
    
    // Return default preferences if none exist
    const defaultPreferences: NotificationPreferences = {
      enabled: false,
      lastUpdated: Date.now(),
    };
    
    logger.log('No preferences found, returning defaults:', defaultPreferences);
    return defaultPreferences;
  } catch (error) {
    logger.error('Failed to get notification preferences:', error);
    
    // Return safe defaults on error
    return {
      enabled: false,
      lastUpdated: Date.now(),
    };
  }
}

/**
 * Save notification preferences to IndexedDB
 */
export async function saveNotificationPreferences(preferences: NotificationPreferences): Promise<void> {
  try {
    const db = await openNotificationDB();
    
    // Update timestamp
    const updatedPreferences: NotificationPreferences = {
      ...preferences,
      lastUpdated: Date.now(),
    };
    
    await db.put(STORE_NAME, updatedPreferences, PREFERENCES_KEY);
    logger.log('Saved notification preferences to IndexedDB:', updatedPreferences);
  } catch (error) {
    logger.error('Failed to save notification preferences:', error);
    throw error;
  }
}

/**
 * Check if notifications are enabled by user preference
 * This checks both the stored preference AND browser permission
 */
export async function areNotificationsEnabledByUser(): Promise<boolean> {
  try {
    const preferences = await getNotificationPreferences();
    const enabled = preferences.enabled;
    
    logger.log('Notification enabled status:', { 
      userPreference: enabled, 
      browserPermission: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported' 
    });
    
    return enabled;
  } catch (error) {
    logger.error('Failed to check notification enabled status:', error);
    return false;
  }
}

/**
 * Enable notifications (save preference)
 */
export async function enableNotifications(): Promise<void> {
  try {
    await saveNotificationPreferences({ enabled: true, lastUpdated: Date.now() });
    logger.log('Notifications enabled');
  } catch (error) {
    logger.error('Failed to enable notifications:', error);
    throw error;
  }
}

/**
 * Disable notifications (save preference)
 */
export async function disableNotifications(): Promise<void> {
  try {
    await saveNotificationPreferences({ enabled: false, lastUpdated: Date.now() });
    logger.log('Notifications disabled');
  } catch (error) {
    logger.error('Failed to disable notifications:', error);
    throw error;
  }
}

/**
 * Toggle notifications on/off
 */
export async function toggleNotifications(): Promise<boolean> {
  try {
    const preferences = await getNotificationPreferences();
    const newEnabledState = !preferences.enabled;
    
    await saveNotificationPreferences({ 
      enabled: newEnabledState, 
      lastUpdated: Date.now() 
    });
    
    logger.log('Toggled notifications:', { from: preferences.enabled, to: newEnabledState });
    return newEnabledState;
  } catch (error) {
    logger.error('Failed to toggle notifications:', error);
    throw error;
  }
}
