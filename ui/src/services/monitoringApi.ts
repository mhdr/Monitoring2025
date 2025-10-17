import apiClient, { handleApiError } from './apiClient';
import { storeMonitoringResponseData, getStoredItemIds } from '../utils/monitoringStorage';
import { createLogger } from '../utils/logger';
import type {
  GroupsResponseDto,
  ItemsRequestDto,
  ItemsResponseDto,
  ValuesRequestDto,
  ValuesResponseDto,
  HistoryRequestDto,
  HistoryResponseDto,
  AddPointAsAdminRequestDto,
  EditPointRequestDto,
  EditPointAsAdminRequestDto,
  EditPointResponseDto,
  DeletePointRequestDto,
  MovePointRequestDto,
  AlarmsRequestDto,
  AlarmsResponseDto,
  AddAlarmRequestDto,
  EditAlarmRequestDto,
  EditAlarmResponseDto,
  DeleteAlarmRequestDto,
  GetExternalAlarmsRequestDto,
  BatchEditExternalAlarmsRequestDto,
  ActiveAlarmsRequestDto,
  ActiveAlarmsResponseDto,
  AlarmHistoryRequestDto,
  AlarmHistoryResponseDto,
  AddGroupRequestDto,
  AddGroupResponseDto,
  EditGroupRequestDto,
  DeleteGroupRequestDto,
  MoveGroupRequestDto,
  ValueRequestDto,
  ValueResponseDto,
  WriteValueRequestDto,
  AddValueRequestDto,
  WriteOrAddValueRequestDto,
} from '../types/api';

const logger = createLogger('MonitoringAPI');

/**
 * Monitoring API services
 */

/**
 * Get monitoring groups accessible to the current user
 * No parameters required - returns groups based on JWT token permissions
 */
export const getGroups = async (): Promise<GroupsResponseDto> => {
  try {
    const response = await apiClient.post<GroupsResponseDto>('/api/Monitoring/Groups', {});
    // Store groups data in IndexedDB when fetched
    return storeMonitoringResponseData.storeGroupsResponse(response.data);
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Get monitoring items accessible to the current user
 * 
 * @param params - Request parameters
 * @param params.showOrphans - Whether to include orphaned items not assigned to any group
 * @returns Promise<ItemsResponseDto> - List of accessible monitoring items
 * 
 * @example
 * // Get items for current user (no orphans)
 * const items = await getItems({ showOrphans: false });
 * 
 * @example
 * // Get items including orphans
 * const itemsWithOrphans = await getItems({ showOrphans: true });
 */
export const getItems = async (params: ItemsRequestDto = { showOrphans: false }): Promise<ItemsResponseDto> => {
  try {
    const response = await apiClient.post<ItemsResponseDto>('/api/Monitoring/Items', params);
    // Store items data in IndexedDB when fetched
    return storeMonitoringResponseData.storeItemsResponse(response.data);
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Get all monitoring items with admin privileges (bypasses user permissions)
 * 
 * @param params - Request parameters
 * @param params.showOrphans - Whether to include orphaned items not assigned to any group
 * @returns Promise<ItemsResponseDto> - Complete list of monitoring items
 * 
 * @example
 * // Admin: Get all items in the system
 * const allItems = await getItemsAsAdmin({ showOrphans: true });
 * 
 * @example
 * // Admin: Get all items without orphans
 * const items = await getItemsAsAdmin({ showOrphans: false });
 * 
 * @throws {AxiosError} - Returns 400 if validation error, 401 if unauthorized
 */
export const getItemsAsAdmin = async (params: ItemsRequestDto = { showOrphans: false }): Promise<ItemsResponseDto> => {
  try {
    const response = await apiClient.post<ItemsResponseDto>('/api/Monitoring/ItemsAsAdmin', params);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Get current values for monitoring items
 * Automatically extracts itemIds from stored items in IndexedDB if not provided
 */
export const getValues = async (params?: ValuesRequestDto): Promise<ValuesResponseDto> => {
  try {
    // Build request body
    const body: ValuesRequestDto = {};
    
    // If itemIds are explicitly provided, use them
    if (params?.itemIds && params.itemIds.length > 0) {
      body.itemIds = params.itemIds;
      logger.log('Using provided itemIds for getValues', { count: params.itemIds.length });
    } else {
      // Otherwise, extract itemIds from stored items in IndexedDB using utility method
      const itemIds = await getStoredItemIds();
      if (itemIds && itemIds.length > 0) {
        body.itemIds = itemIds;
        logger.log('Using itemIds from utility for getValues', { count: itemIds.length });
      } else {
        logger.warn('No stored items found in IndexedDB for getValues, sending request without itemIds');
      }
    }
    
    const response = await apiClient.post<ValuesResponseDto>('/api/Monitoring/Values', body);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Get current value for a single monitoring item
 */
export const getValue = async (params: ValueRequestDto): Promise<ValueResponseDto> => {
  try {
    const response = await apiClient.post<ValueResponseDto>('/api/Monitoring/Value', params);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Get historical data for a monitoring item within a date range
 */
export const getHistory = async (params: HistoryRequestDto): Promise<HistoryResponseDto> => {
  try {
    const response = await apiClient.post<HistoryResponseDto>('/api/Monitoring/History', params);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// ==================== Item Management ====================

/**
 * Add a new monitoring point (admin only)
 */
export const addPointAsAdmin = async (data: AddPointAsAdminRequestDto): Promise<EditPointResponseDto> => {
  try {
    const response = await apiClient.post<EditPointResponseDto>('/api/Monitoring/AddPointAsAdmin', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Edit a monitoring point's basic metadata
 */
export const editPoint = async (data: EditPointRequestDto): Promise<EditPointResponseDto> => {
  try {
    const response = await apiClient.post<EditPointResponseDto>('/api/Monitoring/EditPoint', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Edit a monitoring point's full configuration (admin only)
 */
export const editPointAsAdmin = async (data: EditPointAsAdminRequestDto): Promise<EditPointResponseDto> => {
  try {
    const response = await apiClient.post<EditPointResponseDto>('/api/Monitoring/EditPointAsAdmin', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Delete a monitoring point
 */
export const deletePoint = async (data: DeletePointRequestDto): Promise<EditPointResponseDto> => {
  try {
    const response = await apiClient.post<EditPointResponseDto>('/api/Monitoring/DeletePoint', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Move a monitoring point to a different group
 */
export const movePoint = async (data: MovePointRequestDto): Promise<EditPointResponseDto> => {
  try {
    const response = await apiClient.post<EditPointResponseDto>('/api/Monitoring/MovePoint', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// ==================== Alarm Management ====================

/**
 * Get configured alarms for specified monitoring items
 * Automatically extracts itemIds from stored items in IndexedDB if not provided
 */
export const getAlarms = async (params?: AlarmsRequestDto): Promise<AlarmsResponseDto> => {
  try {
    // Build request body
    const body: AlarmsRequestDto = {};
    
    // If itemIds are explicitly provided, use them
    if (params?.itemIds && params.itemIds.length > 0) {
      body.itemIds = params.itemIds;
      logger.log('Using provided itemIds for getAlarms', { count: params.itemIds.length });
    } else {
      // Otherwise, extract itemIds from stored items in IndexedDB using utility method
      const itemIds = await getStoredItemIds();
      if (itemIds && itemIds.length > 0) {
        body.itemIds = itemIds;
        logger.log('Using itemIds from utility for getAlarms', { count: itemIds.length });
      } else {
        logger.warn('No stored items found in IndexedDB, sending request without itemIds');
      }
      // If no stored items, send empty object (backend will return alarms based on user permissions)
    }
    
    const response = await apiClient.post<AlarmsResponseDto>('/api/Monitoring/Alarms', body);
    logger.log('Alarms fetched successfully', { alarmsCount: response.data.data?.length || 0 });
    
    // Store alarms data in IndexedDB when fetched
    return storeMonitoringResponseData.storeAlarmsResponse(response.data);
  } catch (error) {
    logger.error('Failed to fetch alarms', error);
    handleApiError(error);
  }
};

/**
 * Get currently active alarms
 * Automatically extracts itemIds from stored items in IndexedDB if not provided
 */
export const getActiveAlarms = async (params?: ActiveAlarmsRequestDto): Promise<ActiveAlarmsResponseDto> => {
  try {
    // Build request body
    const body: ActiveAlarmsRequestDto = {};
    
    // If itemIds are explicitly provided, use them
    if (params?.itemIds && params.itemIds.length > 0) {
      body.itemIds = params.itemIds;
      logger.log('Using provided itemIds for getActiveAlarms', { count: params.itemIds.length });
    } else {
      // Otherwise, extract itemIds from stored items in IndexedDB using utility method
      const itemIds = await getStoredItemIds();
      if (itemIds && itemIds.length > 0) {
        body.itemIds = itemIds;
        logger.log('Using itemIds from utility for getActiveAlarms', { count: itemIds.length });
      } else {
        logger.warn('No stored items found in IndexedDB for getActiveAlarms, sending request without itemIds');
      }
    }
    
    const response = await apiClient.post<ActiveAlarmsResponseDto>('/api/Monitoring/ActiveAlarms', body);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Get historical alarm data
 * Automatically extracts itemIds from stored items in IndexedDB if not provided
 */
export const getAlarmHistory = async (params: AlarmHistoryRequestDto): Promise<AlarmHistoryResponseDto> => {
  try {
    // Build request body with required date fields
    const body: AlarmHistoryRequestDto = {
      startDate: params.startDate,
      endDate: params.endDate,
    };
    
    // If itemIds are explicitly provided, use them
    if (params.itemIds && params.itemIds.length > 0) {
      body.itemIds = params.itemIds;
      logger.log('Using provided itemIds for getAlarmHistory', { count: params.itemIds.length });
    } else {
      // Otherwise, extract itemIds from stored items in IndexedDB using utility method
      const itemIds = await getStoredItemIds();
      if (itemIds && itemIds.length > 0) {
        body.itemIds = itemIds;
        logger.log('Using itemIds from utility for getAlarmHistory', { count: itemIds.length });
      } else {
        logger.warn('No stored items found in IndexedDB for getAlarmHistory, sending request without itemIds');
      }
    }
    
    const response = await apiClient.post<AlarmHistoryResponseDto>('/api/Monitoring/HistoryAlarms', body);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Add a new alarm configuration
 */
export const addAlarm = async (data: AddAlarmRequestDto): Promise<EditPointResponseDto> => {
  try {
    const response = await apiClient.post<EditPointResponseDto>('/api/Monitoring/AddAlarm', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Edit an existing alarm configuration
 */
export const editAlarm = async (data: EditAlarmRequestDto): Promise<EditAlarmResponseDto> => {
  try {
    const response = await apiClient.post<EditAlarmResponseDto>('/api/Monitoring/EditAlarm', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Delete an alarm configuration
 */
export const deleteAlarm = async (data: DeleteAlarmRequestDto): Promise<EditPointResponseDto> => {
  try {
    const response = await apiClient.post<EditPointResponseDto>('/api/Monitoring/DeleteAlarm', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Get external alarms for a specific alarm
 */
export const getExternalAlarms = async (params: GetExternalAlarmsRequestDto): Promise<{ data: unknown[] }> => {
  try {
    const response = await apiClient.post<{ data: unknown[] }>('/api/Monitoring/GetExternalAlarms', params);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Batch edit external alarms
 */
export const batchEditExternalAlarms = async (data: BatchEditExternalAlarmsRequestDto): Promise<EditPointResponseDto> => {
  try {
    const response = await apiClient.post<EditPointResponseDto>('/api/Monitoring/BatchEditExternalAlarms', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// ==================== Group Management ====================

/**
 * Add a new monitoring group
 */
export const addGroup = async (data: AddGroupRequestDto): Promise<AddGroupResponseDto> => {
  try {
    const response = await apiClient.post<AddGroupResponseDto>('/api/Monitoring/AddGroup', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Edit an existing monitoring group
 */
export const editGroup = async (data: EditGroupRequestDto): Promise<EditPointResponseDto> => {
  try {
    const response = await apiClient.post<EditPointResponseDto>('/api/Monitoring/EditGroup', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Delete a monitoring group
 */
export const deleteGroup = async (data: DeleteGroupRequestDto): Promise<EditPointResponseDto> => {
  try {
    const response = await apiClient.post<EditPointResponseDto>('/api/Monitoring/DeleteGroup', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Move a group to a different parent
 */
export const moveGroup = async (data: MoveGroupRequestDto): Promise<EditPointResponseDto> => {
  try {
    const response = await apiClient.post<EditPointResponseDto>('/api/Monitoring/MoveGroup', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// ==================== Value Operations ====================

/**
 * Write a value directly to a controller
 */
export const writeValue = async (data: WriteValueRequestDto): Promise<EditPointResponseDto> => {
  try {
    const response = await apiClient.post<EditPointResponseDto>('/api/Monitoring/WriteValue', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Add a new value to the system
 */
export const addValue = async (data: AddValueRequestDto): Promise<EditPointResponseDto> => {
  try {
    const response = await apiClient.post<EditPointResponseDto>('/api/Monitoring/AddValue', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Write a value to controller or add it if write fails
 */
export const writeOrAddValue = async (data: WriteOrAddValueRequestDto): Promise<EditPointResponseDto> => {
  try {
    const response = await apiClient.post<EditPointResponseDto>('/api/Monitoring/WriteOrAddValue', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};
