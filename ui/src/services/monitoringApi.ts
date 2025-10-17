import apiClient, { handleApiError } from './apiClient';
import { storeMonitoringResponseData } from '../utils/monitoringStorage';
import type {
  GroupsRequestDto,
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

/**
 * Monitoring API services
 */

/**
 * Get monitoring groups accessible to the current user
 */
export const getGroups = async (params: GroupsRequestDto = {}): Promise<GroupsResponseDto> => {
  try {
    const response = await apiClient.post<GroupsResponseDto>('/api/Monitoring/Groups', params);
    // Store groups data in IndexedDB when fetched
    return storeMonitoringResponseData.storeGroupsResponse(response.data);
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Get monitoring items accessible to the current user
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
 * Get monitoring items as admin (bypasses user permissions)
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
 */
export const getValues = async (params?: ValuesRequestDto): Promise<ValuesResponseDto> => {
  try {
    // If params is undefined or itemIds is null/undefined, send empty object (get all values)
    const body: ValuesRequestDto = {};
    if (params?.itemIds && params.itemIds.length > 0) {
      body.itemIds = params.itemIds;
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
 */
export const getAlarms = async (params?: AlarmsRequestDto): Promise<AlarmsResponseDto> => {
  try {
    // If params is undefined or itemIds is null/undefined, send empty object (get all alarms)
    const body: AlarmsRequestDto = {};
    if (params?.itemIds && params.itemIds.length > 0) {
      body.itemIds = params.itemIds;
    }
    const response = await apiClient.post<AlarmsResponseDto>('/api/Monitoring/Alarms', body);
    // Store alarms data in IndexedDB when fetched
    return storeMonitoringResponseData.storeAlarmsResponse(response.data);
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Get currently active alarms
 */
export const getActiveAlarms = async (params?: ActiveAlarmsRequestDto): Promise<ActiveAlarmsResponseDto> => {
  try {
    // If params is undefined or itemIds is null/undefined, send empty object (get all active alarms)
    const body: ActiveAlarmsRequestDto = {};
    if (params?.itemIds && params.itemIds.length > 0) {
      body.itemIds = params.itemIds;
    }
    const response = await apiClient.post<ActiveAlarmsResponseDto>('/api/Monitoring/ActiveAlarms', body);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Get historical alarm data
 */
export const getAlarmHistory = async (params: AlarmHistoryRequestDto): Promise<AlarmHistoryResponseDto> => {
  try {
    const response = await apiClient.post<AlarmHistoryResponseDto>('/api/Monitoring/HistoryAlarms', params);
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
