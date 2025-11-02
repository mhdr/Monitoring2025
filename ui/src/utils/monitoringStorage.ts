/**
 * Monitoring Storage Helper
 * 
 * Re-exports from monitoringStore for backward compatibility.
 * Uses Zustand + localStorage instead of IndexedDB.
 */

import type { Group, Item, AlarmDto } from '../types/api';

export { 
  monitoringStorageHelpers,
  StreamStatus,
  type StreamStatus as StreamStatusType
} from '../stores/monitoringStore';

export type { NotificationPreferences } from '../stores/notificationStore';

export const storeMonitoringResponseData = {
  storeGroupsResponse: async (groupsData: { groups: Group[] }): Promise<{ groups: Group[] }> => {
    const { monitoringStorageHelpers: helpers } = await import('../stores/monitoringStore');
    await helpers.setStoredGroups(groupsData.groups);
    return groupsData;
  },
  
  storeItemsResponse: async (itemsData: { items: Item[] }): Promise<{ items: Item[] }> => {
    const { monitoringStorageHelpers: helpers } = await import('../stores/monitoringStore');
    await helpers.setStoredItems(itemsData.items);
    return itemsData;
  },
  
  storeAlarmsResponse: async (alarmsData: { data: { data: AlarmDto[] } }): Promise<{ data: { data: AlarmDto[] } }> => {
    const { monitoringStorageHelpers: helpers } = await import('../stores/monitoringStore');
    await helpers.setStoredAlarms(alarmsData.data.data);
    return alarmsData;
  },
};

export const getStoredItemIds = async (): Promise<string[]> => {
  const { monitoringStorageHelpers: helpers } = await import('../stores/monitoringStore');
  const items = await helpers.getStoredItems();
  return items ? items.map(item => item.id) : [];
};

export const initAutoCleanup = (): void => {
  // No-op: localStorage doesn't need cleanup like IndexedDB did
};

export const isDataSynced = async (): Promise<boolean> => {
  const { useMonitoringStore } = await import('../stores/monitoringStore');
  return useMonitoringStore.getState().isDataSynced;
};

export const getStorageEstimate = async (): Promise<{ usage: number; quota: number }> => {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
    };
  }
  return { usage: 0, quota: 0 };
};
