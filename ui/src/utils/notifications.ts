/**
 * Desktop Notifications Utility
 * 
 * Provides browser notification capabilities for alarm events.
 * Handles permission requests, notification display, and state management.
 */

import { createLogger } from './logger';

const logger = createLogger('notifications');

/**
 * Notification permission states
 */
export type NotificationPermissionState = 'granted' | 'denied' | 'default';

/**
 * Notification options for alarm events
 */
export interface AlarmNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
}

/**
 * Check if browser supports notifications
 */
export const isNotificationSupported = (): boolean => {
  return 'Notification' in window;
};

/**
 * Get current notification permission state
 */
export const getNotificationPermission = (): NotificationPermissionState => {
  if (!isNotificationSupported()) {
    logger.warn('Notification API not supported in this browser');
    return 'denied';
  }
  
  return Notification.permission as NotificationPermissionState;
};

/**
 * Request notification permission from user
 * Returns promise that resolves to permission state
 */
export const requestNotificationPermission = async (): Promise<NotificationPermissionState> => {
  if (!isNotificationSupported()) {
    logger.warn('Cannot request notification permission - API not supported');
    return 'denied';
  }
  
  try {
    logger.log('Requesting notification permission...');
    const permission = await Notification.requestPermission();
    logger.log('Notification permission result:', permission);
    return permission as NotificationPermissionState;
  } catch (error) {
    logger.error('Failed to request notification permission:', error);
    return 'denied';
  }
};

/**
 * Check if notifications are enabled (permission granted)
 */
export const areNotificationsEnabled = (): boolean => {
  return getNotificationPermission() === 'granted';
};

/**
 * Show desktop notification for alarm event
 * Only displays if permission is granted
 */
export const showAlarmNotification = (options: AlarmNotificationOptions): Notification | null => {
  if (!isNotificationSupported()) {
    logger.warn('Cannot show notification - API not supported');
    return null;
  }
  
  if (!areNotificationsEnabled()) {
    logger.warn('Cannot show notification - permission not granted');
    return null;
  }
  
  try {
    logger.log('Showing alarm notification:', { title: options.title, tag: options.tag });
    
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/icons/alarm-icon.png',
      tag: options.tag || 'alarm-notification',
      requireInteraction: options.requireInteraction ?? false,
      silent: options.silent ?? false,
      badge: '/icons/badge-icon.png',
    });
    
    // Auto-close after 10 seconds if not requireInteraction
    if (!options.requireInteraction) {
      setTimeout(() => {
        notification.close();
      }, 10000);
    }
    
    // Log when notification is clicked
    notification.onclick = () => {
      logger.log('Notification clicked:', options.tag);
      window.focus();
      notification.close();
    };
    
    // Log when notification is closed
    notification.onclose = () => {
      logger.log('Notification closed:', options.tag);
    };
    
    // Log errors
    notification.onerror = (error) => {
      logger.error('Notification error:', error);
    };
    
    return notification;
  } catch (error) {
    logger.error('Failed to show notification:', error);
    return null;
  }
};

/**
 * Format alarm notification message
 */
export const formatAlarmNotificationMessage = (
  alarmCount: number,
  highestPriority: 1 | 2 | null,
  t: (key: string, params?: Record<string, unknown>) => string
): AlarmNotificationOptions => {
  const priorityText = highestPriority === 2 
    ? t('alarms.priority.high') 
    : highestPriority === 1 
      ? t('alarms.priority.low') 
      : t('alarms.priority.unknown');
  
  const title = alarmCount === 1
    ? t('notifications.alarm.single', { priority: priorityText })
    : t('notifications.alarm.multiple', { count: alarmCount, priority: priorityText });
  
  const body = alarmCount === 1
    ? t('notifications.alarm.singleBody')
    : t('notifications.alarm.multipleBody', { count: alarmCount });
  
  return {
    title,
    body,
    tag: 'active-alarms',
    requireInteraction: highestPriority === 2, // High priority alarms require user interaction
    silent: false,
  };
};
