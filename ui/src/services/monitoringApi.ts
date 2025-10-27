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
  WriteOrAddValueResponseDto,
  GetItemRequestDto,
  GetItemResponseDto,
  AddItemRequestDto,
  AddItemResponseDto,
  EditItemRequestDto,
  EditItemResponseDto,
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
      
      // Store all groups data in IndexedDB when fetched
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
    
    // Store filtered groups data in IndexedDB when fetched
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
        logger.log('No stored items found, sending request without itemIds (backend will return alarms based on user permissions)');
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
        logger.log('No stored items found, sending request without itemIds (backend will return alarm history based on user permissions)');
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
export const writeOrAddValue = async (data: WriteOrAddValueRequestDto): Promise<WriteOrAddValueResponseDto> => {
  try {
    const response = await apiClient.post<WriteOrAddValueResponseDto>('/api/Monitoring/WriteOrAddValue', data);
    return response.data;
  } catch (error) {
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
