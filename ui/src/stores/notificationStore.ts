/**
 * Notification Preferences Store
 * 
 * Zustand store for managing desktop notification preferences with localStorage persistence.
 * Stores user preferences for enabling/disabling desktop notifications for alarm updates.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createLogger } from '../utils/logger';

const logger = createLogger('NotificationStore');

/**
 * Notification preferences interface
 */
export interface NotificationPreferences {
  enabled: boolean;
  lastUpdated: number;
}

/**
 * Notification store state and actions
 */
interface NotificationStore {
  preferences: NotificationPreferences;
  setEnabled: (enabled: boolean) => void;
  reset: () => void;
}

/**
 * Default notification preferences
 */
const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: false,
  lastUpdated: Date.now(),
};

/**
 * Zustand store for notification preferences with localStorage persistence
 */
export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set) => ({
      preferences: DEFAULT_PREFERENCES,
      
      /**
       * Update the enabled state of notifications
       */
      setEnabled: (enabled: boolean) => {
        logger.info('Setting notification enabled:', enabled);
        set((state) => ({
          preferences: {
            ...state.preferences,
            enabled,
            lastUpdated: Date.now(),
          },
        }));
      },
      
      /**
       * Reset preferences to default
       */
      reset: () => {
        logger.info('Resetting notification preferences');
        set({ preferences: DEFAULT_PREFERENCES });
      },
    }),
    {
      name: 'notification-preferences', // localStorage key
      version: 1, // Version for migrations
    }
  )
);

/**
 * Helper function to get notification preferences
 * @deprecated Use useNotificationStore hook directly in components
 */
export const getNotificationPreferences = (): NotificationPreferences => {
  return useNotificationStore.getState().preferences;
};

/**
 * Helper function to set enabled state
 * @deprecated Use useNotificationStore hook directly in components
 */
export const setNotificationEnabled = (enabled: boolean): void => {
  useNotificationStore.getState().setEnabled(enabled);
};

/**
 * Helper function to reset preferences
 * @deprecated Use useNotificationStore hook directly in components
 */
export const resetNotificationPreferences = (): void => {
  useNotificationStore.getState().reset();
};
