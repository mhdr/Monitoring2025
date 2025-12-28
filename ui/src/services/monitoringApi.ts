import apiClient, { handleApiError } from './apiClient';
import { storeMonitoringResponseData, getStoredItemIds } from '../utils/monitoringStorage';
import { authStorageHelpers } from '../utils/authStorage';
import { createLogger } from '../utils/logger';
import type {
  Group,
  Item,
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
  DeleteItemResponseDto,
  MovePointRequestDto,
  AlarmsRequestDto,
  AlarmsResponseDto,
  AddAlarmRequestDto,
  AddAlarmResponseDto,
  EditAlarmRequestDto,
  EditAlarmResponseDto,
  DeleteAlarmRequestDto,
  DeleteAlarmResponseDto,
  GetExternalAlarmsRequestDto,
  GetExternalAlarmsResponseDto,
  BatchEditExternalAlarmsRequestDto,
  AddExternalAlarmRequestDto,
  AddExternalAlarmResponseDto,
  UpdateExternalAlarmRequestDto,
  UpdateExternalAlarmResponseDto,
  RemoveExternalAlarmRequestDto,
  RemoveExternalAlarmResponseDto,
  ActiveAlarmsRequestDto,
  ActiveAlarmsResponseDto,
  AlarmHistoryRequestDto,
  AlarmHistoryResponseDto,
  AddGroupRequestDto,
  AddGroupResponseDto,
  EditGroupRequestDto,
  EditGroupResponseDto,
  DeleteGroupRequestDto,
  DeleteGroupResponseDto,
  MoveGroupRequestDto,
  MoveGroupResponseDto,
  ValueRequestDto,
  ValueResponseDto,
  WriteValueRequestDto,
  AddValueRequestDto,
  WriteOrAddValueRequestDto,
  WriteOrAddValueResponseDto,
  GetItemRequestDto,
  GetItemResponseDto,
  AddItemRequestDto,
  AddItemResponseDto,
  GetNextPointNumberResponseDto,
  EditItemRequestDto,
  EditItemResponseDto,
  SettingsVersionResponseDto,
  PointStatsByDateRequestDto,
  PointMeanByDateResponseDto,
  PointMinByDateResponseDto,
  PointMaxByDateResponseDto,
  PointStdByDateResponseDto,
  PointCountByDateResponseDto,
  PointStatsLast24HoursRequestDto,
  PointMeanResponseDto,
  PointMinResponseDto,
  PointMaxResponseDto,
  PointStdResponseDto,
  PointCountResponseDto,
  CalculateStateDurationRequestDto,
  CalculateStateDurationResponseDto,
} from '../types/api';

const logger = createLogger('MonitoringAPI');

/**
 * Monitoring API services
 */

/**
 * Get monitoring groups accessible to the current user
 * 
 * Returns groups filtered based on client-side logic:
 * - Admin users: See all groups (no filtering) for group and item management
 * - Regular users: Groups that contain items the user has access to (based on ItemPermissions)
 * - Parent groups of accessible groups (hierarchical access)
 * - Backend returns all groups; filtering is performed on the client side
 * 
 * @returns Promise<GroupsResponseDto> - Filtered list of accessible groups (or all groups for admin)
 */
export const getGroups = async (): Promise<GroupsResponseDto> => {
  try {
    // Fetch all groups from backend (no server-side filtering)
    const allGroupsResponse = await apiClient.post<GroupsResponseDto>('/api/Monitoring/Groups', {});
    
    // Check if current user has admin role
    const currentUser = await authStorageHelpers.getStoredUser();
    const hasAdminRole = currentUser?.roles?.some(role => 
      role.toLowerCase() === 'admin' || role.toLowerCase() === 'administrator'
    ) ?? false;
    
    // If user has admin role, return all groups without filtering
    if (hasAdminRole) {
      logger.log('Admin user detected - returning all groups without filtering:', {
        totalGroups: allGroupsResponse.data.groups.length,
        userRoles: currentUser?.roles || [],
      });
      
      const adminResponse: GroupsResponseDto = {
        groups: allGroupsResponse.data.groups
      };
      
      // Store all groups data in Zustand store (persisted to localStorage) when fetched
      return storeMonitoringResponseData.storeGroupsResponse(adminResponse);
    }
    
    // Regular user - apply client-side filtering based on ItemPermissions
    
    // Fetch accessible items to determine which groups to show
    const accessibleItemsResponse = await apiClient.post<ItemsResponseDto>('/api/Monitoring/Items', { showOrphans: true });
    
    // Get set of group IDs that contain accessible items
    const accessibleGroupIds = new Set<string>();
    
    // Add groups that contain accessible items
    accessibleItemsResponse.data.items.forEach((item: Item) => {
      if (item.groupId) {
        accessibleGroupIds.add(item.groupId);
      }
    });
    
    // Add parent groups recursively for hierarchical access
    const addParentGroups = (groupId: string) => {
      const group = allGroupsResponse.data.groups.find((g: Group) => g.id === groupId);
      if (group && group.parentId && !accessibleGroupIds.has(group.parentId)) {
        accessibleGroupIds.add(group.parentId);
        addParentGroups(group.parentId); // Recursive call for hierarchy
      }
    };
    
    // Walk up the hierarchy for each accessible group
    Array.from(accessibleGroupIds).forEach(groupId => addParentGroups(groupId));
    
    // Filter groups to only include accessible ones
    const filteredGroups = allGroupsResponse.data.groups.filter((group: Group) => 
      accessibleGroupIds.has(group.id)
    );
    
    logger.log('Regular user groups filtering result:', {
      totalGroups: allGroupsResponse.data.groups.length,
      accessibleItems: accessibleItemsResponse.data.items.length,
      accessibleGroupIds: Array.from(accessibleGroupIds),
      filteredGroups: filteredGroups.length,
      userRoles: currentUser?.roles || [],
    });
    
    const response: GroupsResponseDto = {
      groups: filteredGroups
    };
    
    // Store filtered groups data in Zustand store (persisted to localStorage) when fetched
    return storeMonitoringResponseData.storeGroupsResponse(response);
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
    // Store items data in Zustand store (persisted to localStorage) when fetched
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
 * Automatically extracts itemIds from stored items in Zustand store if not provided
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
      // Otherwise, extract itemIds from stored items in Zustand store using utility method
      const itemIds = await getStoredItemIds();
      if (itemIds && itemIds.length > 0) {
        body.itemIds = itemIds;
        logger.log('Using itemIds from utility for getValues', { count: itemIds.length });
      } else {
        logger.log('No stored items found, sending request without itemIds (backend will return data based on user permissions)');
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
export const deletePoint = async (data: DeletePointRequestDto): Promise<DeleteItemResponseDto> => {
  try {
    const response = await apiClient.post<DeleteItemResponseDto>('/api/Monitoring/DeleteItem', data);
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
 * Automatically extracts itemIds from stored items in Zustand store if not provided
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
      // Otherwise, extract itemIds from stored items in Zustand store using utility method
      const itemIds = await getStoredItemIds();
      if (itemIds && itemIds.length > 0) {
        body.itemIds = itemIds;
        logger.log('Using itemIds from utility for getAlarms', { count: itemIds.length });
      } else {
        logger.log('No stored items found, sending request without itemIds (backend will return alarms based on user permissions)');
      }
      // If no stored items, send empty object (backend will return alarms based on user permissions)
    }
    
    const response = await apiClient.post<AlarmsResponseDto>('/api/Monitoring/Alarms', body);
    logger.log('Alarms fetched successfully', { alarmsCount: response.data.data?.data?.length || 0 });
    
    // Store alarms data in Zustand store (persisted to localStorage) when fetched
    return storeMonitoringResponseData.storeAlarmsResponse(response.data);
  } catch (error) {
    logger.error('Failed to fetch alarms', error);
    handleApiError(error);
  }
};

/**
 * Get currently active alarms
 * Automatically extracts itemIds from stored items in Zustand store if not provided
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
      // Otherwise, extract itemIds from stored items in Zustand store using utility method
      const itemIds = await getStoredItemIds();
      if (itemIds && itemIds.length > 0) {
        body.itemIds = itemIds;
        logger.log('Using itemIds from utility for getActiveAlarms', { count: itemIds.length });
      } else {
        logger.log('No stored items found, sending request without itemIds (backend will return active alarms based on user permissions)');
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
 * Automatically extracts itemIds from stored items in Zustand store if not provided
 * Supports pagination through page and pageSize parameters (default page=1, pageSize=100, max pageSize=1000)
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
      // Otherwise, extract itemIds from stored items in Zustand store using utility method
      const itemIds = await getStoredItemIds();
      if (itemIds && itemIds.length > 0) {
        body.itemIds = itemIds;
        logger.log('Using itemIds from utility for getAlarmHistory', { count: itemIds.length });
      } else {
        logger.log('No stored items found, sending request without itemIds (backend will return alarm history based on user permissions)');
      }
    }
    
    // Add pagination parameters if provided
    if (params.page !== undefined && params.page !== null) {
      body.page = params.page;
    }
    if (params.pageSize !== undefined && params.pageSize !== null) {
      body.pageSize = params.pageSize;
    }
    
    logger.log('Fetching alarm history with pagination', { 
      startDate: params.startDate, 
      endDate: params.endDate,
      page: body.page || 1,
      pageSize: body.pageSize || 100,
    });
    
    // Backend returns wrapped response: { success: boolean, data: AlarmHistoryResponseDto, message: string }
    const response = await apiClient.post<{ success: boolean; data: AlarmHistoryResponseDto; message: string }>(
      '/api/Monitoring/HistoryAlarms', 
      body
    );
    
    // Extract the actual response data from the wrapped response
    const actualData = response.data.data;
    
    logger.log('Alarm history fetched successfully', {
      page: actualData.page,
      pageSize: actualData.pageSize,
      totalCount: actualData.totalCount,
      totalPages: actualData.totalPages,
      itemsInCurrentPage: actualData.data?.length || 0,
    });
    
    return actualData;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Add a new alarm configuration to a monitoring item
 * Creates a new alarm with specified type, priority, and comparison logic
 * 
 * @param data - AddAlarmRequestDto with itemId, alarm type, priority, compare type, etc.
 * @returns Promise<AddAlarmResponseDto> - Success status, message, and new alarm ID
 */
export const addAlarm = async (data: AddAlarmRequestDto): Promise<AddAlarmResponseDto> => {
  try {
    logger.log('Adding new alarm:', { 
      itemId: data.itemId, 
      alarmType: data.alarmType, 
      alarmPriority: data.alarmPriority,
      compareType: data.compareType,
      isDisabled: data.isDisabled,
    });
    
    const response = await apiClient.post<AddAlarmResponseDto>('/api/Monitoring/AddAlarm', data);
    
    logger.log('Alarm added successfully:', { 
      success: response.data.success,
      alarmId: response.data.alarmId,
      message: response.data.message,
    });
    
    return response.data;
  } catch (error) {
    logger.error('Failed to add alarm:', error);
    handleApiError(error);
  }
};

/**
 * Edit an existing alarm configuration
 * 
 * Updates the complete configuration of an existing alarm including:
 * - Enabled/disabled state
 * - Alarm delay (time before triggering after condition is met)
 * - Custom alarm message (English and Farsi)
 * - Comparison values (Value1, Value2) for alarm conditions
 * - Acknowledgment timeout
 * 
 * Validates:
 * - The alarm exists in the system
 * - The associated monitoring item exists
 * - All input parameters are within valid ranges
 * 
 * Creates an audit log entry with before/after values for all changed properties.
 * 
 * @param data - Edit alarm request containing alarm ID and updated configuration properties
 * @returns Promise<EditAlarmResponseDto> - Response with success flag, message, and error type
 * @throws {ApiError} - Validation error, unauthorized, forbidden, not found, or server error
 * 
 * @example
 * // Edit alarm with bilingual messages
 * const result = await editAlarm({
 *   id: "550e8400-e29b-41d4-a716-446655440000",
 *   itemId: "550e8400-e29b-41d4-a716-446655440001",
 *   isDisabled: false,
 *   alarmDelay: 5,
 *   message: "Temperature exceeded maximum threshold",
 *   messageFa: "دمای محیط از حد مجاز بیشتر است",
 *   value1: "75.5",
 *   value2: "100.0",
 *   timeout: 300
 * });
 * 
 * @example
 * // Disable an alarm
 * const result = await editAlarm({
 *   id: "550e8400-e29b-41d4-a716-446655440000",
 *   itemId: "550e8400-e29b-41d4-a716-446655440001",
 *   isDisabled: true
 * });
 */
export const editAlarm = async (data: EditAlarmRequestDto): Promise<EditAlarmResponseDto> => {
  try {
    const response = await apiClient.post<EditAlarmResponseDto>('/api/Monitoring/EditAlarm', data);
    logger.log('Alarm edited successfully:', { alarmId: data.id, success: response.data.success });
    return response.data;
  } catch (error) {
    logger.error('Failed to edit alarm:', { alarmId: data.id, error });
    handleApiError(error);
  }
};

/**
 * Delete an alarm configuration
 */
export const deleteAlarm = async (data: DeleteAlarmRequestDto): Promise<DeleteAlarmResponseDto> => {
  try {
    const response = await apiClient.post<DeleteAlarmResponseDto>('/api/Monitoring/DeleteAlarm', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Get external alarms for a specific alarm
 * 
 * Retrieves all external alarm configurations that are linked to a parent alarm.
 * External alarms allow one alarm condition to trigger outputs on other monitoring items in the system.
 * 
 * @param params - GetExternalAlarmsRequestDto containing the alarm ID
 * @returns Promise<GetExternalAlarmsResponseDto> - Response with success status, message, and external alarms list
 * 
 * @example
 * const result = await getExternalAlarms({ alarmId: '550e8400-e29b-41d4-a716-446655440000' });
 * if (result.success) {
 *   console.log(`Retrieved ${result.externalAlarms?.length || 0} external alarm(s)`);
 * }
 */
export const getExternalAlarms = async (params: GetExternalAlarmsRequestDto): Promise<GetExternalAlarmsResponseDto> => {
  try {
    const response = await apiClient.post<GetExternalAlarmsResponseDto>('/api/Monitoring/GetExternalAlarms', params);
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

/**
 * Add a new external alarm configuration
 * 
 * Creates a new external alarm that triggers when the parent alarm activates.
 * External alarms allow cascading alarm actions to write values to other monitoring items.
 * 
 * @param data - AddExternalAlarmRequestDto with alarmId, itemId, value, and isDisabled flag
 * @returns Promise<AddExternalAlarmResponseDto> - Success status, message, and new external alarm ID
 * 
 * @example
 * const result = await addExternalAlarm({
 *   alarmId: '550e8400-e29b-41d4-a716-446655440000',
 *   itemId: '550e8400-e29b-41d4-a716-446655440001',
 *   value: true,
 *   isDisabled: false
 * });
 * 
 * @note This endpoint is planned for future implementation. Currently use batchEditExternalAlarms.
 */
export const addExternalAlarm = async (data: AddExternalAlarmRequestDto): Promise<AddExternalAlarmResponseDto> => {
  try {
    logger.log('Adding new external alarm:', { 
      alarmId: data.alarmId, 
      itemId: data.itemId,
      value: data.value,
      isDisabled: data.isDisabled,
    });
    
    const response = await apiClient.post<AddExternalAlarmResponseDto>('/api/Monitoring/AddExternalAlarm', data);
    
    logger.log('External alarm added successfully:', { 
      success: response.data.success,
      externalAlarmId: response.data.externalAlarmId,
      message: response.data.message,
    });
    
    return response.data;
  } catch (error) {
    logger.error('Failed to add external alarm:', error);
    handleApiError(error);
  }
};

/**
 * Update an existing external alarm configuration
 * 
 * Updates the configuration of an existing external alarm including:
 * - Target item ID
 * - Output value to write
 * - Enabled/disabled state
 * 
 * @param data - UpdateExternalAlarmRequestDto with external alarm ID and updated properties
 * @returns Promise<UpdateExternalAlarmResponseDto> - Success status and message
 * 
 * @example
 * const result = await updateExternalAlarm({
 *   id: '550e8400-e29b-41d4-a716-446655440002',
 *   itemId: '550e8400-e29b-41d4-a716-446655440003',
 *   value: false,
 *   isDisabled: true
 * });
 * 
 * @note This endpoint is planned for future implementation. Currently use batchEditExternalAlarms.
 */
export const updateExternalAlarm = async (data: UpdateExternalAlarmRequestDto): Promise<UpdateExternalAlarmResponseDto> => {
  try {
    logger.log('Updating external alarm:', { 
      id: data.id,
      itemId: data.itemId,
      value: data.value,
      isDisabled: data.isDisabled,
    });
    
    const response = await apiClient.post<UpdateExternalAlarmResponseDto>('/api/Monitoring/UpdateExternalAlarm', data);
    
    logger.log('External alarm updated successfully:', { 
      success: response.data.success,
      message: response.data.message,
    });
    
    return response.data;
  } catch (error) {
    logger.error('Failed to update external alarm:', { externalAlarmId: data.id, error });
    handleApiError(error);
  }
};

/**
 * Remove an external alarm configuration
 * 
 * Permanently deletes an external alarm from the system.
 * This operation cannot be undone.
 * 
 * @param data - RemoveExternalAlarmRequestDto containing the external alarm ID to remove
 * @returns Promise<RemoveExternalAlarmResponseDto> - Success status and message
 * 
 * @example
 * const result = await removeExternalAlarm({ 
 *   id: '550e8400-e29b-41d4-a716-446655440002' 
 * });
 * 
 * @note This endpoint is planned for future implementation. Currently use batchEditExternalAlarms.
 */
export const removeExternalAlarm = async (data: RemoveExternalAlarmRequestDto): Promise<RemoveExternalAlarmResponseDto> => {
  try {
    logger.log('Removing external alarm:', { id: data.id });
    
    const response = await apiClient.post<RemoveExternalAlarmResponseDto>('/api/Monitoring/RemoveExternalAlarm', data);
    
    logger.log('External alarm removed successfully:', { 
      success: response.data.success,
      message: response.data.message,
    });
    
    return response.data;
  } catch (error) {
    logger.error('Failed to remove external alarm:', { externalAlarmId: data.id, error });
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
export const editGroup = async (data: EditGroupRequestDto): Promise<EditGroupResponseDto> => {
  try {
    const response = await apiClient.post<EditGroupResponseDto>('/api/Monitoring/EditGroup', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Delete a monitoring group
 */
export const deleteGroup = async (data: DeleteGroupRequestDto): Promise<DeleteGroupResponseDto> => {
  try {
    const response = await apiClient.post<DeleteGroupResponseDto>('/api/Monitoring/DeleteGroup', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Move a group to a different parent
 */
export const moveGroup = async (data: MoveGroupRequestDto): Promise<MoveGroupResponseDto> => {
  try {
    const response = await apiClient.post<MoveGroupResponseDto>('/api/Monitoring/MoveGroup', data);
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
export const writeOrAddValue = async (data: WriteOrAddValueRequestDto): Promise<WriteOrAddValueResponseDto> => {
  try {
    // Backend returns wrapped response: { success: boolean, data: WriteOrAddValueResponseDto, message: string }
    const response = await apiClient.post<{ success: boolean; data: WriteOrAddValueResponseDto; message: string }>(
      '/api/Monitoring/WriteOrAddValue', 
      data
    );
    
    // Extract the actual response data from the wrapped response
    const actualData = response.data.data;
    
    logger.log('Write or add value completed successfully', {
      itemId: data.itemId,
      value: data.value,
      isSuccess: actualData.isSuccess,
      message: response.data.message,
    });
    
    return actualData;
  } catch (error) {
    logger.error('Failed to write or add value', {
      itemId: data.itemId,
      value: data.value,
      error,
    });
    handleApiError(error);
  }
};

/**
 * Get a single monitoring item by ID with all its properties
 * The user must have access to the item either through admin privileges or explicit item permissions
 */
export const getItem = async (itemId: string): Promise<GetItemResponseDto> => {
  const logger = createLogger('MonitoringAPI:getItem');
  try {
    logger.log('Fetching item details', { itemId });
    
    const response = await apiClient.post<GetItemResponseDto>('/api/Monitoring/GetItem', {
      itemId,
    } as GetItemRequestDto);
    
    logger.log('Item fetched successfully', { itemId, success: response.data.success });
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch item', { itemId, error });
    handleApiError(error);
  }
};

// Helper function to convert camelCase to PascalCase
const toPascalCase = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Helper function to transform object keys from camelCase to PascalCase
const toPascalCaseObject = (obj: unknown): unknown => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toPascalCaseObject);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const pascalKey = toPascalCase(key);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result[pascalKey] = toPascalCaseObject((obj as any)[key]);
    }
  }
  return result;
};

/**
 * Edit a monitoring item's complete configuration
 * Validates that the point number is unique across all items (except the current item being edited)
 * Creates an audit log entry for the modification
 */
export const editItem = async (data: EditItemRequestDto): Promise<EditItemResponseDto> => {
  const logger = createLogger('MonitoringAPI:editItem');
  try {
    logger.log('Editing item', { itemId: data.id, itemName: data.itemName });
    
    // Convert camelCase to PascalCase for .NET API
    const pascalCaseData = toPascalCaseObject(data);
    
    // Send the request directly without wrapping - the controller expects [FromBody] EditItemRequestDto
    logger.log('Sending PascalCase request payload:', pascalCaseData);
    
    const response = await apiClient.post<EditItemResponseDto>('/api/Monitoring/EditItem', pascalCaseData);
    
    logger.log('Item edited successfully', { 
      itemId: data.id, 
      success: response.data.success,
      message: response.data.message 
    });
    
    return response.data;
  } catch (error) {
    logger.error('Failed to edit item', { itemId: data.id, error });
    handleApiError(error);
  }
};

/**
 * Get the next available point number for a new monitoring item
 * Retrieves the maximum point number currently in use and returns the next available number (max + 1)
 * Returns 1 if no items exist in the system
 */
export const getNextPointNumber = async (): Promise<GetNextPointNumberResponseDto> => {
  const logger = createLogger('MonitoringAPI:getNextPointNumber');
  try {
    logger.log('Fetching next available point number');
    
    const response = await apiClient.post<GetNextPointNumberResponseDto>('/api/Monitoring/NextNumber', {});
    
    logger.log('Next point number retrieved successfully', { 
      nextPointNumber: response.data.nextPointNumber,
      success: response.data.success 
    });
    
    return response.data;
  } catch (error) {
    logger.error('Failed to get next point number', { error });
    handleApiError(error);
  }
};

/**
 * Add a new monitoring item to the system
 * Creates a new monitoring item with all configuration properties
 * Validates that the point number is unique across all items
 * Creates an audit log entry for the creation
 * Optionally assigns the item to a parent group upon creation
 */
export const addItem = async (data: AddItemRequestDto): Promise<AddItemResponseDto> => {
  const logger = createLogger('MonitoringAPI:addItem');
  try {
    logger.log('Adding item', { itemName: data.itemName, pointNumber: data.pointNumber });
    
    // Convert camelCase to PascalCase for .NET API
    const pascalCaseData = toPascalCaseObject(data);
    
    // Send the request directly without wrapping - the controller expects [FromBody] AddItemRequestDto
    logger.log('Sending PascalCase request payload:', pascalCaseData);
    
    const response = await apiClient.post<AddItemResponseDto>('/api/Monitoring/AddItem', pascalCaseData);
    
    logger.log('Item added successfully', { 
      itemName: data.itemName,
      success: response.data.success,
      itemId: response.data.itemId,
      message: response.data.message 
    });
    
    return response.data;
  } catch (error) {
    logger.error('Failed to add item', { itemName: data.itemName, error });
    handleApiError(error);
  }
};

/**
 * Get system settings version information for the current user
 * Retrieves version information to help clients determine when to refresh cached settings data.
 * 
 * The Version field represents the global system settings version that changes when system-wide
 * configuration is updated. The UserVersion field is user-specific and changes when that user's
 * settings or permissions are modified.
 * 
 * Clients should store these values and compare them on subsequent requests to detect changes.
 * 
 * @returns Promise<SettingsVersionResponseDto> - Version information for cache management
 */
export const getSettingsVersion = async (): Promise<SettingsVersionResponseDto> => {
  const logger = createLogger('MonitoringAPI:getSettingsVersion');
  try {
    logger.log('Fetching settings version');
    
    const response = await apiClient.get<SettingsVersionResponseDto>('/api/Monitoring/SettingsVersion');
    
    logger.log('Settings version retrieved successfully', { 
      version: response.data.version,
      userVersion: response.data.userVersion
    });
    
    return response.data;
  } catch (error) {
    logger.error('Failed to get settings version', error);
    handleApiError(error);
  }
};

// ==================== Statistics API Functions ====================

/**
 * Get point mean by date range
 * @param params - Request parameters with itemId, startDate, and endDate
 * @returns Promise<PointMeanByDateResponseDto> - Mean value or null
 */
export const getPointMeanByDate = async (params: PointStatsByDateRequestDto): Promise<PointMeanByDateResponseDto> => {
  try {
    logger.log('Fetching point mean by date', params);
    
    const response = await apiClient.post<PointMeanByDateResponseDto>('/api/Monitoring/PointMeanByDate', params);
    
    logger.log('Point mean retrieved successfully', { success: response.data.success, count: response.data.dailyValues?.length });
    
    return response.data;
  } catch (error) {
    logger.error('Failed to get point mean by date', error);
    handleApiError(error);
  }
};

/**
 * Get point minimum by date range
 * @param params - Request parameters with itemId, startDate, and endDate
 * @returns Promise<PointMinByDateResponseDto> - Minimum value or null
 */
export const getPointMinByDate = async (params: PointStatsByDateRequestDto): Promise<PointMinByDateResponseDto> => {
  try {
    logger.log('Fetching point min by date', params);
    
    const response = await apiClient.post<PointMinByDateResponseDto>('/api/Monitoring/PointMinByDate', params);
    
    logger.log('Point min retrieved successfully', { success: response.data.success, count: response.data.dailyValues?.length });
    
    return response.data;
  } catch (error) {
    logger.error('Failed to get point min by date', error);
    handleApiError(error);
  }
};

/**
 * Get point maximum by date range
 * @param params - Request parameters with itemId, startDate, and endDate
 * @returns Promise<PointMaxByDateResponseDto> - Maximum value or null
 */
export const getPointMaxByDate = async (params: PointStatsByDateRequestDto): Promise<PointMaxByDateResponseDto> => {
  try {
    logger.log('Fetching point max by date', params);
    
    const response = await apiClient.post<PointMaxByDateResponseDto>('/api/Monitoring/PointMaxByDate', params);
    
    logger.log('Point max retrieved successfully', { success: response.data.success, count: response.data.dailyValues?.length });
    
    return response.data;
  } catch (error) {
    logger.error('Failed to get point max by date', error);
    handleApiError(error);
  }
};

/**
 * Get point standard deviation by date range
 * @param params - Request parameters with itemId, startDate, and endDate
 * @returns Promise<PointStdByDateResponseDto> - Standard deviation or null
 */
export const getPointStdByDate = async (params: PointStatsByDateRequestDto): Promise<PointStdByDateResponseDto> => {
  try {
    logger.log('Fetching point std by date', params);
    
    const response = await apiClient.post<PointStdByDateResponseDto>('/api/Monitoring/PointStdByDate', params);
    
    logger.log('Point std retrieved successfully', { success: response.data.success, count: response.data.dailyValues?.length });
    
    return response.data;
  } catch (error) {
    logger.error('Failed to get point std by date', error);
    handleApiError(error);
  }
};

/**
 * Get point count by date range
 * @param params - Request parameters with itemId, startDate, and endDate
 * @returns Promise<PointCountByDateResponseDto> - Total count
 */
export const getPointCountByDate = async (params: PointStatsByDateRequestDto): Promise<PointCountByDateResponseDto> => {
  try {
    logger.log('Fetching point count by date', params);
    
    const response = await apiClient.post<PointCountByDateResponseDto>('/api/Monitoring/PointCountByDate', params);
    
    logger.log('Point count retrieved successfully', { success: response.data.success, count: response.data.dailyCounts?.length });
    
    return response.data;
  } catch (error) {
    logger.error('Failed to get point count by date', error);
    handleApiError(error);
  }
};

/**
 * Get point mean for last 24 hours
 * @param params - Request parameters with itemId
 * @returns Promise<PointMeanResponseDto> - Mean value or null
 */
export const getPointMean = async (params: PointStatsLast24HoursRequestDto): Promise<PointMeanResponseDto> => {
  try {
    logger.log('Fetching point mean (24h)', params);
    
    const response = await apiClient.post<PointMeanResponseDto>('/api/Monitoring/PointMean', params);
    
    logger.log('Point mean (24h) retrieved successfully', { mean: response.data.mean });
    
    return response.data;
  } catch (error) {
    logger.error('Failed to get point mean (24h)', error);
    handleApiError(error);
  }
};

/**
 * Get point minimum for last 24 hours
 * @param params - Request parameters with itemId
 * @returns Promise<PointMinResponseDto> - Minimum value or null
 */
export const getPointMin = async (params: PointStatsLast24HoursRequestDto): Promise<PointMinResponseDto> => {
  try {
    logger.log('Fetching point min (24h)', params);
    
    const response = await apiClient.post<PointMinResponseDto>('/api/Monitoring/PointMin', params);
    
    logger.log('Point min (24h) retrieved successfully', { min: response.data.min });
    
    return response.data;
  } catch (error) {
    logger.error('Failed to get point min (24h)', error);
    handleApiError(error);
  }
};

/**
 * Get point maximum for last 24 hours
 * @param params - Request parameters with itemId
 * @returns Promise<PointMaxResponseDto> - Maximum value or null
 */
export const getPointMax = async (params: PointStatsLast24HoursRequestDto): Promise<PointMaxResponseDto> => {
  try {
    logger.log('Fetching point max (24h)', params);
    
    const response = await apiClient.post<PointMaxResponseDto>('/api/Monitoring/PointMax', params);
    
    logger.log('Point max (24h) retrieved successfully', { max: response.data.max });
    
    return response.data;
  } catch (error) {
    logger.error('Failed to get point max (24h)', error);
    handleApiError(error);
  }
};

/**
 * Get point standard deviation for last 24 hours
 * @param params - Request parameters with itemId
 * @returns Promise<PointStdResponseDto> - Standard deviation or null
 */
export const getPointStd = async (params: PointStatsLast24HoursRequestDto): Promise<PointStdResponseDto> => {
  try {
    logger.log('Fetching point std (24h)', params);
    
    const response = await apiClient.post<PointStdResponseDto>('/api/Monitoring/PointStd', params);
    
    logger.log('Point std (24h) retrieved successfully', { std: response.data.std });
    
    return response.data;
  } catch (error) {
    logger.error('Failed to get point std (24h)', error);
    handleApiError(error);
  }
};

/**
 * Get point count for last 24 hours
 * @param params - Request parameters with itemId
 * @returns Promise<PointCountResponseDto> - Total count
 */
export const getPointCount = async (params: PointStatsLast24HoursRequestDto): Promise<PointCountResponseDto> => {
  try {
    logger.log('Fetching point count (24h)', params);
    
    const response = await apiClient.post<PointCountResponseDto>('/api/Monitoring/PointCount', params);
    
    logger.log('Point count (24h) retrieved successfully', { count: response.data.count });
    
    return response.data;
  } catch (error) {
    logger.error('Failed to get point count (24h)', error);
    handleApiError(error);
  }
};

/**
 * Calculate state duration for digital points
 * @param params - Request parameters with itemId, startDate, and endDate
 * @returns Promise<CalculateStateDurationResponseDto> - State duration statistics
 */
export const calculateStateDuration = async (params: CalculateStateDurationRequestDto): Promise<CalculateStateDurationResponseDto> => {
  try {
    logger.log('Calculating state duration', params);

    // State-duration queries over long ranges (e.g., 30 days) scan two monthly Mongo collections
    // and can legitimately take longer than the global 10s axios timeout. Give this endpoint a
    // higher ceiling so the UI does not abort and leave the digital charts empty.
    const response = await apiClient.post<CalculateStateDurationResponseDto>(
      '/api/Monitoring/CalculateStateDuration',
      params,
      { timeout: 60000 }
    );
    
    logger.log('State duration calculated successfully', {
      success: response.data.success,
      totalDurationSeconds: response.data.totalDurationSeconds,
      matchedValue: response.data.matchedValue,
    });
    
    return response.data;
  } catch (error) {
    logger.error('Failed to calculate state duration', error);
    handleApiError(error);
  }
};
