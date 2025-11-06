import apiClient, { handleApiError } from './apiClient';
import type {
  GetUsersResponseDto,
  AddUserRequestDto,
  AddUserResponseDto,
  EditUserRequestDto,
  EditUserResponseDto,
  GetUserRequestDto,
  GetUserResponseDto,
  GetRolesResponseDto,
  SetRolesRequestDto,
  SetRolesResponseDto,
  SavePermissionsRequestDto,
  SavePermissionsResponseDto,
  GetPermissionsRequestDto,
  GetPermissionsResponseDto,
  GetControllersResponseDto,
  AddControllerRequestDto,
  AddControllerResponseDto,
  EditControllerRequestDto,
  DeleteControllerRequestDto,
  GetControllerMappingsRequestDto,
  BatchEditMappingsRequestDto,
  GetJobTriggersRequestDto,
  GetJobDetailsRequestDto,
  SaveJobRequestDto,
  DeleteJobRequestDto,
  GetPidControllersRequestDto,
  EditPidControllerRequestDto,
  EditPidSetPointRequestDto,
  GetPidControllerRequestDto,
  GetSvgLayoutRequestDto,
  GetSvgLayoutsRequestDto,
  AuditLogRequestDto,
  AuditLogResponseDto,
  EditPointResponseDto,
  PushUpdateRequestDto,
  PushUpdateResponseDto,
} from '../types/api';

/**
 * Extended API services for user management, controllers, jobs, etc.
 */

// ==================== User Management ====================

/**
 * Get all system users
 */
export const getUsers = async (): Promise<GetUsersResponseDto> => {
  try {
    const response = await apiClient.get<GetUsersResponseDto>('/api/Monitoring/GetUsers');
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Add a new user to the system
 */
export const addUser = async (data: AddUserRequestDto): Promise<AddUserResponseDto> => {
  try {
    const response = await apiClient.post<AddUserResponseDto>('/api/Monitoring/AddUser', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Edit an existing user's account information
 */
export const editUser = async (data: EditUserRequestDto): Promise<EditUserResponseDto> => {
  try {
    const response = await apiClient.post<EditUserResponseDto>('/api/Monitoring/EditUser', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Get detailed information for a specific user
 */
export const getUser = async (params: GetUserRequestDto): Promise<GetUserResponseDto> => {
  try {
    const response = await apiClient.post<GetUserResponseDto>('/api/Monitoring/GetUser', params);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Get all available system roles
 */
export const getRoles = async (): Promise<GetRolesResponseDto> => {
  try {
    const response = await apiClient.get<GetRolesResponseDto>('/api/Monitoring/GetRoles');
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Assign roles to a specific user
 */
export const setRoles = async (data: SetRolesRequestDto): Promise<SetRolesResponseDto> => {
  try {
    const response = await apiClient.post<SetRolesResponseDto>('/api/Monitoring/SetRoles', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Save user permissions for accessing monitoring items
 * Groups are accessible to all users; filtering is handled client-side based on item access
 */
export const savePermissions = async (data: SavePermissionsRequestDto): Promise<SavePermissionsResponseDto> => {
  try {
    const response = await apiClient.post<SavePermissionsResponseDto>('/api/Monitoring/SavePermissions', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Get user permissions for accessing monitoring items
 * Returns the list of item IDs that the specified user has access to
 */
export const getPermissions = async (data: GetPermissionsRequestDto): Promise<GetPermissionsResponseDto> => {
  try {
    const response = await apiClient.post<GetPermissionsResponseDto>('/api/Monitoring/GetPermissions', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// ==================== Controller Management ====================

/**
 * Get all configured controllers
 */
export const getControllers = async (): Promise<GetControllersResponseDto> => {
  try {
    const response = await apiClient.post<GetControllersResponseDto>('/api/Monitoring/Controllers');
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Add a new controller
 */
export const addController = async (data: AddControllerRequestDto): Promise<AddControllerResponseDto> => {
  try {
    const response = await apiClient.post<AddControllerResponseDto>('/api/Monitoring/AddController', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Edit an existing controller
 */
export const editController = async (data: EditControllerRequestDto): Promise<EditPointResponseDto> => {
  try {
    const response = await apiClient.post<EditPointResponseDto>('/api/Monitoring/EditController', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Delete a controller
 */
export const deleteController = async (data: DeleteControllerRequestDto): Promise<EditPointResponseDto> => {
  try {
    const response = await apiClient.post<EditPointResponseDto>('/api/Monitoring/DeleteController', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Get controller mappings
 */
export const getControllerMappings = async (params: GetControllerMappingsRequestDto): Promise<{ data: unknown[] }> => {
  try {
    const response = await apiClient.post<{ data: unknown[] }>('/api/Monitoring/GetMappings', params);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Batch edit controller mappings
 */
export const batchEditMappings = async (data: BatchEditMappingsRequestDto): Promise<EditPointResponseDto> => {
  try {
    const response = await apiClient.post<EditPointResponseDto>('/api/Monitoring/BatchEditMappings', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// ==================== Job/Scheduler ====================

/**
 * Get all scheduled job triggers
 */
export const getJobTriggers = async (params: GetJobTriggersRequestDto = {}): Promise<{ data: unknown[] }> => {
  try {
    const response = await apiClient.post<{ data: unknown[] }>('/api/Monitoring/GetJobTriggers', params);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Get job details for a specific trigger
 */
export const getJobDetails = async (params: GetJobDetailsRequestDto): Promise<{ data: unknown[] }> => {
  try {
    const response = await apiClient.post<{ data: unknown[] }>('/api/Monitoring/GetJobDetails', params);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Save or update a scheduled job
 */
export const saveJob = async (data: SaveJobRequestDto): Promise<EditPointResponseDto> => {
  try {
    const response = await apiClient.post<EditPointResponseDto>('/api/Monitoring/SaveJob', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Delete a scheduled job
 */
export const deleteJob = async (data: DeleteJobRequestDto): Promise<EditPointResponseDto> => {
  try {
    const response = await apiClient.post<EditPointResponseDto>('/api/Monitoring/DeleteJob', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// ==================== PID Controller ====================

/**
 * Get all PID controllers
 */
export const getPidControllers = async (params: GetPidControllersRequestDto = {}): Promise<{ data: unknown[] }> => {
  try {
    const response = await apiClient.post<{ data: unknown[] }>('/api/Monitoring/GetPidControllers', params);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Edit a PID controller configuration
 */
export const editPidController = async (data: EditPidControllerRequestDto): Promise<EditPointResponseDto> => {
  try {
    const response = await apiClient.post<EditPointResponseDto>('/api/Monitoring/EditPidController', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Edit PID controller set point
 */
export const editPidSetPoint = async (data: EditPidSetPointRequestDto): Promise<EditPointResponseDto> => {
  try {
    const response = await apiClient.post<EditPointResponseDto>('/api/Monitoring/EditPidSetPoint', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Get a specific PID controller
 */
export const getPidController = async (params: GetPidControllerRequestDto): Promise<{ data: unknown }> => {
  try {
    const response = await apiClient.post<{ data: unknown }>('/api/Monitoring/GetPidController', params);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// ==================== SVG Layout ====================

/**
 * Get a specific SVG layout
 */
export const getSvgLayout = async (params: GetSvgLayoutRequestDto): Promise<{ data: unknown }> => {
  try {
    const response = await apiClient.post<{ data: unknown }>('/api/Monitoring/GetSvgLayout', params);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Get all enabled SVG layouts
 */
export const getSvgLayouts = async (params: GetSvgLayoutsRequestDto = {}): Promise<{ data: unknown[] }> => {
  try {
    const response = await apiClient.post<{ data: unknown[] }>('/api/Monitoring/GetSvgLayouts', params);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// ==================== Audit and System ====================

/**
 * Get audit log entries
 */
export const getAuditLog = async (params: AuditLogRequestDto): Promise<AuditLogResponseDto> => {
  try {
    const response = await apiClient.post<AuditLogResponseDto>('/api/Monitoring/AuditLog', params);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Push update notification to all clients
 * 
 * **Admin-only endpoint** that broadcasts a settings update notification to all connected SignalR clients.
 * This triggers the ReceiveSettingsUpdate client method, prompting clients to refresh their local data
 * through their own background synchronization processes.
 * 
 * @param data - Optional request containing a message for audit logging
 * @returns Promise<PushUpdateResponseDto> - Response with success status, client count, and timestamp
 * 
 * @example
 * // Simple push update without message
 * const result = await pushUpdate({});
 * console.log(`Notified ${result.clientsNotified} clients`);
 * 
 * @example
 * // Push update with audit message
 * const result = await pushUpdate({
 *   message: "Manual settings refresh after bulk configuration update"
 * });
 */
export const pushUpdate = async (data: PushUpdateRequestDto = {}): Promise<PushUpdateResponseDto> => {
  try {
    const response = await apiClient.post<PushUpdateResponseDto>('/api/Monitoring/PushUpdate', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * @deprecated Use pushUpdate instead - this endpoint will be removed in a future version
 */
export const pushUpdateAllClients = async (): Promise<EditPointResponseDto> => {
  try {
    const response = await apiClient.get<EditPointResponseDto>('/api/Monitoring/PushUpdateAllClients');
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};
