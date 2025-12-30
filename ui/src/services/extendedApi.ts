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
  StartPIDTuningRequestDto,
  StartPIDTuningResponseDto,
  GetPIDTuningStatusRequestDto,
  GetPIDTuningStatusResponseDto,
  AbortPIDTuningRequestDto,
  AbortPIDTuningResponseDto,
  ApplyTunedParametersRequestDto,
  ApplyTunedParametersResponseDto,
  GetPidControllerRequestDto,
  // Timeout Memory types
  GetTimeoutMemoriesRequestDto,
  GetTimeoutMemoriesResponseDto,
  AddTimeoutMemoryRequestDto,
  AddTimeoutMemoryResponseDto,
  EditTimeoutMemoryRequestDto,
  EditTimeoutMemoryResponseDto,
  DeleteTimeoutMemoryRequestDto,
  DeleteTimeoutMemoryResponseDto,
  // Average Memory types
  GetAverageMemoriesRequestDto,
  GetAverageMemoriesResponseDto,
  AddAverageMemoryRequestDto,
  AddAverageMemoryResponseDto,
  EditAverageMemoryRequestDto,
  EditAverageMemoryResponseDto,
  DeleteAverageMemoryRequestDto,
  DeleteAverageMemoryResponseDto,
  // PID Memory types
  GetPIDMemoriesRequestDto,
  GetPIDMemoriesResponseDto,
  AddPIDMemoryRequestDto,
  AddPIDMemoryResponseDto,
  EditPIDMemoryRequestDto,
  EditPIDMemoryResponseDto,
  DeletePIDMemoryRequestDto,
  DeletePIDMemoryResponseDto,
  GetPotentialParentPIDsRequestDto,
  GetPotentialParentPIDsResponseDto,
  GetSvgLayoutRequestDto,
  GetSvgLayoutsRequestDto,
  AuditLogRequestDto,
  AuditLogResponseDto,
  EditPointResponseDto,
  PushUpdateRequestDto,
  PushUpdateResponseDto,
  // Modbus controller types
  GetModbusControllersResponseDto,
  AddModbusControllerRequestDto,
  AddModbusControllerResponseDto,
  EditModbusControllerRequestDto,
  EditModbusControllerResponseDto,
  DeleteModbusControllerRequestDto,
  DeleteModbusControllerResponseDto,
  GetModbusMapsRequestDto,
  GetModbusMapsResponseDto,
  BatchEditModbusMapsRequestDto,
  BatchEditModbusMapsResponseDto,
  GetModbusMappingsByItemIdRequestDto,
  GetModbusMappingsByItemIdResponseDto,
  // Sharp7 controller types
  GetSharp7ControllersResponseDto,
  AddSharp7ControllerRequestDto,
  AddSharp7ControllerResponseDto,
  EditSharp7ControllerRequestDto,
  EditSharp7ControllerResponseDto,
  DeleteSharp7ControllerRequestDto,
  DeleteSharp7ControllerResponseDto,
  GetSharp7MapsRequestDto,
  GetSharp7MapsResponseDto,
  BatchEditSharp7MapsRequestDto,
  BatchEditSharp7MapsResponseDto,
  GetSharp7MappingsByItemIdRequestDto,
  GetSharp7MappingsByItemIdResponseDto,
  // Modbus Gateway types
  GetModbusGatewaysResponseDto,
  AddModbusGatewayRequestDto,
  AddModbusGatewayResponseDto,
  EditModbusGatewayRequestDto,
  EditModbusGatewayResponseDto,
  DeleteModbusGatewayRequestDto,
  DeleteModbusGatewayResponseDto,
  GetModbusGatewayMappingsRequestDto,
  GetModbusGatewayMappingsResponseDto,
  BatchEditModbusGatewayMappingsRequestDto,
  BatchEditModbusGatewayMappingsResponseDto,
  // Totalizer Memory types
  TotalizerMemory,
  // Rate of Change Memory types
  RateOfChangeMemory,
  AddRateOfChangeMemoryRequestDto,
  AddRateOfChangeMemoryResponseDto,
  EditRateOfChangeMemoryRequestDto,
  EditRateOfChangeMemoryResponseDto,
  DeleteRateOfChangeMemoryRequestDto,
  DeleteRateOfChangeMemoryResponseDto,
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

// ==================== Timeout Memory ====================

/**
 * Get all timeout memory configurations
 */
export const getTimeoutMemories = async (params: GetTimeoutMemoriesRequestDto = {}): Promise<GetTimeoutMemoriesResponseDto> => {
  try {
    const response = await apiClient.post<GetTimeoutMemoriesResponseDto>('/api/Monitoring/GetTimeoutMemories', params);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Add a new timeout memory configuration
 */
export const addTimeoutMemory = async (data: AddTimeoutMemoryRequestDto): Promise<AddTimeoutMemoryResponseDto> => {
  try {
    const response = await apiClient.post<AddTimeoutMemoryResponseDto>('/api/Monitoring/AddTimeoutMemory', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Edit an existing timeout memory configuration
 */
export const editTimeoutMemory = async (data: EditTimeoutMemoryRequestDto): Promise<EditTimeoutMemoryResponseDto> => {
  try {
    const response = await apiClient.post<EditTimeoutMemoryResponseDto>('/api/Monitoring/EditTimeoutMemory', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Delete a timeout memory configuration
 */
export const deleteTimeoutMemory = async (data: DeleteTimeoutMemoryRequestDto): Promise<DeleteTimeoutMemoryResponseDto> => {
  try {
    const response = await apiClient.post<DeleteTimeoutMemoryResponseDto>('/api/Monitoring/DeleteTimeoutMemory', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// ==================== Average Memory ====================

/**
 * Get all average memory configurations
 */
export const getAverageMemories = async (params: GetAverageMemoriesRequestDto = {}): Promise<GetAverageMemoriesResponseDto> => {
  try {
    const response = await apiClient.post<GetAverageMemoriesResponseDto>('/api/Monitoring/GetAverageMemories', params);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Add a new average memory configuration
 */
export const addAverageMemory = async (data: AddAverageMemoryRequestDto): Promise<AddAverageMemoryResponseDto> => {
  try {
    const response = await apiClient.post<AddAverageMemoryResponseDto>('/api/Monitoring/AddAverageMemory', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Edit an existing average memory configuration
 */
export const editAverageMemory = async (data: EditAverageMemoryRequestDto): Promise<EditAverageMemoryResponseDto> => {
  try {
    const response = await apiClient.post<EditAverageMemoryResponseDto>('/api/Monitoring/EditAverageMemory', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Delete an average memory configuration
 */
export const deleteAverageMemory = async (data: DeleteAverageMemoryRequestDto): Promise<DeleteAverageMemoryResponseDto> => {
  try {
    const response = await apiClient.post<DeleteAverageMemoryResponseDto>('/api/Monitoring/DeleteAverageMemory', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// ==================== PID Memory ====================

/**
 * Get all PID memory configurations
 */
export const getPIDMemories = async (params: GetPIDMemoriesRequestDto = {}): Promise<GetPIDMemoriesResponseDto> => {
  try {
    const response = await apiClient.post<GetPIDMemoriesResponseDto>('/api/Monitoring/GetPIDMemories', params);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Add a new PID memory configuration
 */
export const addPIDMemory = async (data: AddPIDMemoryRequestDto): Promise<AddPIDMemoryResponseDto> => {
  try {
    const response = await apiClient.post<AddPIDMemoryResponseDto>('/api/Monitoring/AddPIDMemory', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Edit an existing PID memory configuration
 */
export const editPIDMemory = async (data: EditPIDMemoryRequestDto): Promise<EditPIDMemoryResponseDto> => {
  try {
    const response = await apiClient.post<EditPIDMemoryResponseDto>('/api/Monitoring/EditPIDMemory', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Delete a PID memory configuration
 */
export const deletePIDMemory = async (data: DeletePIDMemoryRequestDto): Promise<DeletePIDMemoryResponseDto> => {
  try {
    const response = await apiClient.post<DeletePIDMemoryResponseDto>('/api/Monitoring/DeletePIDMemory', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Get potential parent PIDs for cascade control configuration
 */
export const getPotentialParentPIDs = async (data: GetPotentialParentPIDsRequestDto): Promise<GetPotentialParentPIDsResponseDto> => {
  try {
    const response = await apiClient.post<GetPotentialParentPIDsResponseDto>('/api/Monitoring/GetPotentialParentPIDs', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Start PID auto-tuning using Ziegler-Nichols relay feedback method
 */
export const startPIDTuning = async (data: StartPIDTuningRequestDto): Promise<StartPIDTuningResponseDto> => {
  try {
    const response = await apiClient.post<StartPIDTuningResponseDto>('/api/Monitoring/StartPIDTuning', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Get current status of PID auto-tuning session
 */
export const getPIDTuningStatus = async (data: GetPIDTuningStatusRequestDto): Promise<GetPIDTuningStatusResponseDto> => {
  try {
    const response = await apiClient.post<GetPIDTuningStatusResponseDto>('/api/Monitoring/GetPIDTuningStatus', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Abort an active PID auto-tuning session
 */
export const abortPIDTuning = async (data: AbortPIDTuningRequestDto): Promise<AbortPIDTuningResponseDto> => {
  try {
    const response = await apiClient.post<AbortPIDTuningResponseDto>('/api/Monitoring/AbortPIDTuning', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Apply calculated PID gains from a completed tuning session
 */
export const applyTunedParameters = async (data: ApplyTunedParametersRequestDto): Promise<ApplyTunedParametersResponseDto> => {
  try {
    const response = await apiClient.post<ApplyTunedParametersResponseDto>('/api/Monitoring/ApplyTunedParameters', data);
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

// ==================== Modbus Controller Management ====================

/**
 * Get all Modbus controllers
 */
export const getModbusControllers = async (): Promise<GetModbusControllersResponseDto> => {
  try {
    const response = await apiClient.post<GetModbusControllersResponseDto>('/api/Monitoring/ModbusControllers');
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Add a new Modbus controller
 */
export const addModbusController = async (data: AddModbusControllerRequestDto): Promise<AddModbusControllerResponseDto> => {
  try {
    const response = await apiClient.post<AddModbusControllerResponseDto>('/api/Monitoring/AddModbusController', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Edit an existing Modbus controller
 */
export const editModbusController = async (data: EditModbusControllerRequestDto): Promise<EditModbusControllerResponseDto> => {
  try {
    const response = await apiClient.post<EditModbusControllerResponseDto>('/api/Monitoring/EditModbusController', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Delete a Modbus controller
 */
export const deleteModbusController = async (data: DeleteModbusControllerRequestDto): Promise<DeleteModbusControllerResponseDto> => {
  try {
    const response = await apiClient.post<DeleteModbusControllerResponseDto>('/api/Monitoring/DeleteModbusController', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Get Modbus mappings for a specific controller
 */
export const getModbusMaps = async (data: GetModbusMapsRequestDto): Promise<GetModbusMapsResponseDto> => {
  try {
    const response = await apiClient.post<GetModbusMapsResponseDto>('/api/Monitoring/GetModbusMaps', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Batch edit Modbus mappings (add, update, delete)
 */
export const batchEditModbusMaps = async (data: BatchEditModbusMapsRequestDto): Promise<BatchEditModbusMapsResponseDto> => {
  try {
    const response = await apiClient.post<BatchEditModbusMapsResponseDto>('/api/Monitoring/BatchEditModbusMaps', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Get all Modbus mappings for a specific item (supports multiple mappings per item)
 */
export const getModbusMappingsByItemId = async (data: GetModbusMappingsByItemIdRequestDto): Promise<GetModbusMappingsByItemIdResponseDto> => {
  try {
    const response = await apiClient.post<GetModbusMappingsByItemIdResponseDto>('/api/Monitoring/GetModbusMappingsByItemId', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// ==================== Sharp7 Controller Management ====================

/**
 * Get all Sharp7 controllers
 */
export const getSharp7Controllers = async (): Promise<GetSharp7ControllersResponseDto> => {
  try {
    const response = await apiClient.post<GetSharp7ControllersResponseDto>('/api/Monitoring/GetControllers', {
      controllerType: 2 // Sharp7 controller type
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Add a new Sharp7 controller
 */
export const addSharp7Controller = async (data: AddSharp7ControllerRequestDto): Promise<AddSharp7ControllerResponseDto> => {
  try {
    const response = await apiClient.post<AddSharp7ControllerResponseDto>('/api/Monitoring/AddController', {
      ...data,
      controllerType: 2 // Sharp7 controller type
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Edit an existing Sharp7 controller
 */
export const editSharp7Controller = async (data: EditSharp7ControllerRequestDto): Promise<EditSharp7ControllerResponseDto> => {
  try {
    const response = await apiClient.post<EditSharp7ControllerResponseDto>('/api/Monitoring/EditController', {
      ...data,
      controllerType: 2 // Sharp7 controller type
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Delete a Sharp7 controller
 */
export const deleteSharp7Controller = async (data: DeleteSharp7ControllerRequestDto): Promise<DeleteSharp7ControllerResponseDto> => {
  try {
    const response = await apiClient.post<DeleteSharp7ControllerResponseDto>('/api/Monitoring/DeleteController', {
      ...data,
      controllerType: 2 // Sharp7 controller type
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Get Sharp7 mappings for a specific controller
 */
export const getSharp7Maps = async (data: GetSharp7MapsRequestDto): Promise<GetSharp7MapsResponseDto> => {
  try {
    const response = await apiClient.post<GetSharp7MapsResponseDto>('/api/Monitoring/GetMappings', {
      ...data,
      controllerType: 2 // Sharp7 controller type
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Batch edit Sharp7 mappings (add, update, delete)
 */
export const batchEditSharp7Maps = async (data: BatchEditSharp7MapsRequestDto): Promise<BatchEditSharp7MapsResponseDto> => {
  try {
    const response = await apiClient.post<BatchEditSharp7MapsResponseDto>('/api/Monitoring/BatchEditMappings', {
      ...data,
      controllerType: 2 // Sharp7 controller type
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Get Sharp7 mappings by item ID
 */
export const getSharp7MappingsByItemId = async (data: GetSharp7MappingsByItemIdRequestDto): Promise<GetSharp7MappingsByItemIdResponseDto> => {
  try {
    const response = await apiClient.post<GetSharp7MappingsByItemIdResponseDto>('/api/Monitoring/GetSharp7MappingsByItemId', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// ==================== Modbus Gateway ====================

/**
 * Get all Modbus gateway configurations with status
 */
export const getModbusGateways = async (): Promise<GetModbusGatewaysResponseDto> => {
  try {
    const response = await apiClient.post<GetModbusGatewaysResponseDto>('/api/Monitoring/GetModbusGateways', {});
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Add a new Modbus gateway configuration
 */
export const addModbusGateway = async (data: AddModbusGatewayRequestDto): Promise<AddModbusGatewayResponseDto> => {
  try {
    const response = await apiClient.post<AddModbusGatewayResponseDto>('/api/Monitoring/AddModbusGateway', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Edit an existing Modbus gateway configuration
 */
export const editModbusGateway = async (data: EditModbusGatewayRequestDto): Promise<EditModbusGatewayResponseDto> => {
  try {
    const response = await apiClient.post<EditModbusGatewayResponseDto>('/api/Monitoring/EditModbusGateway', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Delete a Modbus gateway configuration
 */
export const deleteModbusGateway = async (data: DeleteModbusGatewayRequestDto): Promise<DeleteModbusGatewayResponseDto> => {
  try {
    const response = await apiClient.post<DeleteModbusGatewayResponseDto>('/api/Monitoring/DeleteModbusGateway', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Get mappings for a specific Modbus gateway
 */
export const getModbusGatewayMappings = async (data: GetModbusGatewayMappingsRequestDto): Promise<GetModbusGatewayMappingsResponseDto> => {
  try {
    const response = await apiClient.post<GetModbusGatewayMappingsResponseDto>('/api/Monitoring/GetModbusGatewayMappings', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Batch edit Modbus gateway mappings (add, update, delete)
 */
export const batchEditModbusGatewayMappings = async (data: BatchEditModbusGatewayMappingsRequestDto): Promise<BatchEditModbusGatewayMappingsResponseDto> => {
  try {
    const response = await apiClient.post<BatchEditModbusGatewayMappingsResponseDto>('/api/Monitoring/BatchEditModbusGatewayMappings', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// ==================== Totalizer Memory Management ====================

/**
 * Get all totalizer memory configurations
 */
export const getTotalizerMemories = async (params: {} = {}): Promise<{ isSuccessful: boolean; errorMessage?: string; totalizerMemories: TotalizerMemory[] }> => {
  try {
    const response = await apiClient.post<{ isSuccessful: boolean; errorMessage?: string; totalizerMemories: TotalizerMemory[] }>(
      '/api/Monitoring/GetTotalizerMemories',
      params
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Add a new totalizer memory configuration
 */
export const addTotalizerMemory = async (data: {
  name?: string;
  inputItemId: string;
  outputItemId: string;
  interval: number;
  isDisabled: boolean;
  accumulationType: number;
  resetOnOverflow: boolean;
  overflowThreshold?: number;
  manualResetEnabled: boolean;
  scheduledResetEnabled: boolean;
  resetCron?: string;
  units?: string;
  decimalPlaces: number;
}): Promise<{ isSuccessful: boolean; errorMessage?: string; id?: string }> => {
  try {
    const response = await apiClient.post<{ isSuccessful: boolean; errorMessage?: string; id?: string }>(
      '/api/Monitoring/AddTotalizerMemory',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Edit an existing totalizer memory configuration
 */
export const editTotalizerMemory = async (data: {
  id: string;
  name?: string;
  inputItemId: string;
  outputItemId: string;
  interval: number;
  isDisabled: boolean;
  accumulationType: number;
  resetOnOverflow: boolean;
  overflowThreshold?: number;
  manualResetEnabled: boolean;
  scheduledResetEnabled: boolean;
  resetCron?: string;
  accumulatedValue: number;
  lastInputValue?: number;
  lastEventState?: boolean;
  lastResetTime?: string;
  units?: string;
  decimalPlaces: number;
}): Promise<{ isSuccessful: boolean; errorMessage?: string }> => {
  try {
    const response = await apiClient.post<{ isSuccessful: boolean; errorMessage?: string }>(
      '/api/Monitoring/EditTotalizerMemory',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Delete a totalizer memory configuration
 */
export const deleteTotalizerMemory = async (data: { id: string }): Promise<{ isSuccessful: boolean; errorMessage?: string }> => {
  try {
    const response = await apiClient.post<{ isSuccessful: boolean; errorMessage?: string }>(
      '/api/Monitoring/DeleteTotalizerMemory',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Reset a totalizer memory to zero
 */
export const resetTotalizerMemory = async (data: {
  id: string;
  preserveInDatabase?: boolean;
}): Promise<{ isSuccessful: boolean; errorMessage?: string }> => {
  try {
    const response = await apiClient.post<{ isSuccessful: boolean; errorMessage?: string }>(
      '/api/Monitoring/ResetTotalizerMemory',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// ==========================================
// Rate of Change Memory API Functions
// ==========================================

/**
 * Get all rate of change memory configurations
 */
export const getRateOfChangeMemories = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  params: Record<string, unknown> = {}
): Promise<{
  isSuccessful: boolean;
  errorMessage?: string | null;
  rateOfChangeMemories?: RateOfChangeMemory[] | null;
}> => {
  try {
    const response = await apiClient.post<{
      isSuccessful: boolean;
      errorMessage?: string | null;
      rateOfChangeMemories?: RateOfChangeMemory[] | null;
    }>('/api/Monitoring/GetRateOfChangeMemories', params);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Add a new rate of change memory configuration
 */
export const addRateOfChangeMemory = async (
  data: AddRateOfChangeMemoryRequestDto
): Promise<AddRateOfChangeMemoryResponseDto> => {
  try {
    const response = await apiClient.post<AddRateOfChangeMemoryResponseDto>(
      '/api/Monitoring/AddRateOfChangeMemory',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Edit an existing rate of change memory configuration
 */
export const editRateOfChangeMemory = async (
  data: EditRateOfChangeMemoryRequestDto
): Promise<EditRateOfChangeMemoryResponseDto> => {
  try {
    const response = await apiClient.post<EditRateOfChangeMemoryResponseDto>(
      '/api/Monitoring/EditRateOfChangeMemory',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Delete a rate of change memory configuration
 */
export const deleteRateOfChangeMemory = async (
  data: DeleteRateOfChangeMemoryRequestDto
): Promise<DeleteRateOfChangeMemoryResponseDto> => {
  try {
    const response = await apiClient.post<DeleteRateOfChangeMemoryResponseDto>(
      '/api/Monitoring/DeleteRateOfChangeMemory',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Reset a rate of change memory state (clears baseline, samples, and alarm state)
 */
export const resetRateOfChangeMemory = async (data: {
  id: string;
}): Promise<{ isSuccessful: boolean; errorMessage?: string | null }> => {
  try {
    const response = await apiClient.post<{ isSuccessful: boolean; errorMessage?: string | null }>(
      '/api/Monitoring/ResetRateOfChangeMemory',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};
