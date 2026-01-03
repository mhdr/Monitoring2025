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
  // Write Action Memory types
  GetWriteActionMemoriesRequestDto,
  GetWriteActionMemoriesResponseDto,
  AddWriteActionMemoryRequestDto,
  AddWriteActionMemoryResponseDto,
  EditWriteActionMemoryRequestDto,
  EditWriteActionMemoryResponseDto,
  DeleteWriteActionMemoryRequestDto,
  DeleteWriteActionMemoryResponseDto,
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
  // Schedule Memory types
  ScheduleMemory,
  AddScheduleMemoryRequestDto,
  AddScheduleMemoryResponseDto,
  EditScheduleMemoryRequestDto,
  EditScheduleMemoryResponseDto,
  DeleteScheduleMemoryRequestDto,
  DeleteScheduleMemoryResponseDto,
  // Holiday Calendar types
  HolidayCalendar,
  AddHolidayCalendarRequestDto,
  AddHolidayCalendarResponseDto,
  EditHolidayCalendarRequestDto,
  EditHolidayCalendarResponseDto,
  DeleteHolidayCalendarRequestDto,
  DeleteHolidayCalendarResponseDto,
  // Comparison Memory types
  ComparisonMemory,
  GetComparisonMemoriesRequestDto,
  GetComparisonMemoriesResponseDto,
  AddComparisonMemoryRequestDto,
  AddComparisonMemoryResponseDto,
  EditComparisonMemoryRequestDto,
  EditComparisonMemoryResponseDto,
  DeleteComparisonMemoryRequestDto,
  DeleteComparisonMemoryResponseDto,
  // Statistical Memory types
  StatisticalMemory,
  GetStatisticalMemoriesRequestDto,
  GetStatisticalMemoriesResponseDto,
  AddStatisticalMemoryRequestDto,
  AddStatisticalMemoryResponseDto,
  EditStatisticalMemoryRequestDto,
  EditStatisticalMemoryResponseDto,
  DeleteStatisticalMemoryRequestDto,
  DeleteStatisticalMemoryResponseDto,
  // Formula Memory types
  FormulaMemory,
  GetFormulaMemoriesRequestDto,
  GetFormulaMemoriesResponseDto,
  AddFormulaMemoryRequestDto,
  AddFormulaMemoryResponseDto,
  EditFormulaMemoryRequestDto,
  EditFormulaMemoryResponseDto,
  DeleteFormulaMemoryRequestDto,
  DeleteFormulaMemoryResponseDto,
  TestFormulaExpressionRequestDto,
  TestFormulaExpressionResponseDto,
  // IF Memory types
  IfMemory,
  GetIfMemoriesRequestDto,
  GetIfMemoriesResponseDto,
  AddIfMemoryRequestDto,
  AddIfMemoryResponseDto,
  EditIfMemoryRequestDto,
  EditIfMemoryResponseDto,
  DeleteIfMemoryRequestDto,
  DeleteIfMemoryResponseDto,
  TestIfConditionRequestDto,
  TestIfConditionResponseDto,
  // Deadband Memory types
  DeadbandMemory,
  GetDeadbandMemoriesRequestDto,
  GetDeadbandMemoriesResponseDto,
  AddDeadbandMemoryRequestDto,
  AddDeadbandMemoryResponseDto,
  EditDeadbandMemoryRequestDto,
  EditDeadbandMemoryResponseDto,
  DeleteDeadbandMemoryRequestDto,
  DeleteDeadbandMemoryResponseDto,
  // Min/Max Selector Memory types
  MinMaxSelectorMemory,
  GetMinMaxSelectorMemoriesRequestDto,
  GetMinMaxSelectorMemoriesResponseDto,
  AddMinMaxSelectorMemoryRequestDto,
  AddMinMaxSelectorMemoryResponseDto,
  EditMinMaxSelectorMemoryRequestDto,
  EditMinMaxSelectorMemoryResponseDto,
  DeleteMinMaxSelectorMemoryRequestDto,
  DeleteMinMaxSelectorMemoryResponseDto,
  // Global Variables types
  GlobalVariable,
  GlobalVariableType,
  GetGlobalVariablesRequestDto,
  GetGlobalVariablesResponseDto,
  AddGlobalVariableRequestDto,
  AddGlobalVariableResponseDto,
  EditGlobalVariableRequestDto,
  EditGlobalVariableResponseDto,
  DeleteGlobalVariableRequestDto,
  DeleteGlobalVariableResponseDto,
  GetGlobalVariableUsageRequestDto,
  GetGlobalVariableUsageResponseDto,
  MemoryUsage,
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

// ==================== Write Action Memory ====================

/**
 * Get all write action memory configurations
 */
export const getWriteActionMemories = async (params: GetWriteActionMemoriesRequestDto = {}): Promise<GetWriteActionMemoriesResponseDto> => {
  try {
    const response = await apiClient.post<GetWriteActionMemoriesResponseDto>('/api/Monitoring/GetWriteActionMemories', params);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Add a new write action memory configuration
 */
export const addWriteActionMemory = async (data: AddWriteActionMemoryRequestDto): Promise<AddWriteActionMemoryResponseDto> => {
  try {
    const response = await apiClient.post<AddWriteActionMemoryResponseDto>('/api/Monitoring/AddWriteActionMemory', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Edit an existing write action memory configuration
 */
export const editWriteActionMemory = async (data: EditWriteActionMemoryRequestDto): Promise<EditWriteActionMemoryResponseDto> => {
  try {
    const response = await apiClient.post<EditWriteActionMemoryResponseDto>('/api/Monitoring/EditWriteActionMemory', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Delete a write action memory configuration
 */
export const deleteWriteActionMemory = async (data: DeleteWriteActionMemoryRequestDto): Promise<DeleteWriteActionMemoryResponseDto> => {
  try {
    const response = await apiClient.post<DeleteWriteActionMemoryResponseDto>('/api/Monitoring/DeleteWriteActionMemory', data);
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

// ==========================================
// Schedule Memory API Functions
// ==========================================

/**
 * Get all schedule memory configurations
 */
export const getScheduleMemories = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  params: Record<string, unknown> = {}
): Promise<{
  isSuccessful: boolean;
  errorMessage?: string | null;
  scheduleMemories?: ScheduleMemory[] | null;
}> => {
  try {
    const response = await apiClient.post<{
      isSuccessful: boolean;
      errorMessage?: string | null;
      scheduleMemories?: ScheduleMemory[] | null;
    }>('/api/Monitoring/GetScheduleMemories', params);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Add a new schedule memory configuration
 */
export const addScheduleMemory = async (
  data: AddScheduleMemoryRequestDto
): Promise<AddScheduleMemoryResponseDto> => {
  try {
    const response = await apiClient.post<AddScheduleMemoryResponseDto>(
      '/api/Monitoring/AddScheduleMemory',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Edit an existing schedule memory configuration
 */
export const editScheduleMemory = async (
  data: EditScheduleMemoryRequestDto
): Promise<EditScheduleMemoryResponseDto> => {
  try {
    const response = await apiClient.post<EditScheduleMemoryResponseDto>(
      '/api/Monitoring/EditScheduleMemory',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Delete a schedule memory configuration
 */
export const deleteScheduleMemory = async (
  data: DeleteScheduleMemoryRequestDto
): Promise<DeleteScheduleMemoryResponseDto> => {
  try {
    const response = await apiClient.post<DeleteScheduleMemoryResponseDto>(
      '/api/Monitoring/DeleteScheduleMemory',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// ==========================================
// Holiday Calendar API Functions
// ==========================================

/**
 * Get all holiday calendars
 */
export const getHolidayCalendars = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  params: Record<string, unknown> = {}
): Promise<{
  isSuccessful: boolean;
  errorMessage?: string | null;
  holidayCalendars?: HolidayCalendar[] | null;
}> => {
  try {
    const response = await apiClient.post<{
      isSuccessful: boolean;
      errorMessage?: string | null;
      holidayCalendars?: HolidayCalendar[] | null;
    }>('/api/Monitoring/GetHolidayCalendars', params);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Add a new holiday calendar
 */
export const addHolidayCalendar = async (
  data: AddHolidayCalendarRequestDto
): Promise<AddHolidayCalendarResponseDto> => {
  try {
    const response = await apiClient.post<AddHolidayCalendarResponseDto>(
      '/api/Monitoring/AddHolidayCalendar',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Edit an existing holiday calendar
 */
export const editHolidayCalendar = async (
  data: EditHolidayCalendarRequestDto
): Promise<EditHolidayCalendarResponseDto> => {
  try {
    const response = await apiClient.post<EditHolidayCalendarResponseDto>(
      '/api/Monitoring/EditHolidayCalendar',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Delete a holiday calendar
 */
export const deleteHolidayCalendar = async (
  data: DeleteHolidayCalendarRequestDto
): Promise<DeleteHolidayCalendarResponseDto> => {
  try {
    const response = await apiClient.post<DeleteHolidayCalendarResponseDto>(
      '/api/Monitoring/DeleteHolidayCalendar',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// ==================== Comparison Memory ====================

/**
 * Get all comparison memory configurations
 */
export const getComparisonMemories = async (
  params: GetComparisonMemoriesRequestDto = {}
): Promise<GetComparisonMemoriesResponseDto> => {
  try {
    const response = await apiClient.post<GetComparisonMemoriesResponseDto>(
      '/api/Monitoring/GetComparisonMemories',
      params
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Add a new comparison memory configuration
 */
export const addComparisonMemory = async (
  data: AddComparisonMemoryRequestDto
): Promise<AddComparisonMemoryResponseDto> => {
  try {
    const response = await apiClient.post<AddComparisonMemoryResponseDto>(
      '/api/Monitoring/AddComparisonMemory',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Edit an existing comparison memory configuration
 */
export const editComparisonMemory = async (
  data: EditComparisonMemoryRequestDto
): Promise<EditComparisonMemoryResponseDto> => {
  try {
    const response = await apiClient.post<EditComparisonMemoryResponseDto>(
      '/api/Monitoring/EditComparisonMemory',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Delete a comparison memory configuration
 */
export const deleteComparisonMemory = async (
  data: DeleteComparisonMemoryRequestDto
): Promise<DeleteComparisonMemoryResponseDto> => {
  try {
    const response = await apiClient.post<DeleteComparisonMemoryResponseDto>(
      '/api/Monitoring/DeleteComparisonMemory',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// ==================== Statistical Memory ====================

/**
 * Get all statistical memory configurations
 */
export const getStatisticalMemories = async (
  params: GetStatisticalMemoriesRequestDto = {}
): Promise<GetStatisticalMemoriesResponseDto> => {
  try {
    const response = await apiClient.post<GetStatisticalMemoriesResponseDto>(
      '/api/Monitoring/GetStatisticalMemories',
      params
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Add a new statistical memory configuration
 */
export const addStatisticalMemory = async (
  data: AddStatisticalMemoryRequestDto
): Promise<AddStatisticalMemoryResponseDto> => {
  try {
    const response = await apiClient.post<AddStatisticalMemoryResponseDto>(
      '/api/Monitoring/AddStatisticalMemory',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Edit an existing statistical memory configuration
 */
export const editStatisticalMemory = async (
  data: EditStatisticalMemoryRequestDto
): Promise<EditStatisticalMemoryResponseDto> => {
  try {
    const response = await apiClient.post<EditStatisticalMemoryResponseDto>(
      '/api/Monitoring/EditStatisticalMemory',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Delete a statistical memory configuration
 */
export const deleteStatisticalMemory = async (
  data: DeleteStatisticalMemoryRequestDto
): Promise<DeleteStatisticalMemoryResponseDto> => {
  try {
    const response = await apiClient.post<DeleteStatisticalMemoryResponseDto>(
      '/api/Monitoring/DeleteStatisticalMemory',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// ==================== Formula Memory ====================

/**
 * Get all formula memory configurations
 */
export const getFormulaMemories = async (
  params: GetFormulaMemoriesRequestDto = {}
): Promise<GetFormulaMemoriesResponseDto> => {
  try {
    const response = await apiClient.post<GetFormulaMemoriesResponseDto>(
      '/api/Monitoring/GetFormulaMemories',
      params
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Add a new formula memory configuration
 */
export const addFormulaMemory = async (
  data: AddFormulaMemoryRequestDto
): Promise<AddFormulaMemoryResponseDto> => {
  try {
    const response = await apiClient.post<AddFormulaMemoryResponseDto>(
      '/api/Monitoring/AddFormulaMemory',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Edit an existing formula memory configuration
 */
export const editFormulaMemory = async (
  data: EditFormulaMemoryRequestDto
): Promise<EditFormulaMemoryResponseDto> => {
  try {
    const response = await apiClient.post<EditFormulaMemoryResponseDto>(
      '/api/Monitoring/EditFormulaMemory',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Delete a formula memory configuration
 */
export const deleteFormulaMemory = async (
  data: DeleteFormulaMemoryRequestDto
): Promise<DeleteFormulaMemoryResponseDto> => {
  try {
    const response = await apiClient.post<DeleteFormulaMemoryResponseDto>(
      '/api/Monitoring/DeleteFormulaMemory',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Test/preview a formula expression with provided variable values
 */
export const testFormulaExpression = async (
  data: TestFormulaExpressionRequestDto
): Promise<TestFormulaExpressionResponseDto> => {
  try {
    const response = await apiClient.post<TestFormulaExpressionResponseDto>(
      '/api/Monitoring/TestFormulaExpression',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// ==================== IF Memory ====================

/**
 * Get all IF memory configurations
 */
export const getIfMemories = async (
  params: GetIfMemoriesRequestDto = {}
): Promise<GetIfMemoriesResponseDto> => {
  try {
    const response = await apiClient.post<GetIfMemoriesResponseDto>(
      '/api/Monitoring/GetIfMemories',
      params
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Add a new IF memory configuration
 */
export const addIfMemory = async (
  data: AddIfMemoryRequestDto
): Promise<AddIfMemoryResponseDto> => {
  try {
    const response = await apiClient.post<AddIfMemoryResponseDto>(
      '/api/Monitoring/AddIfMemory',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Edit an existing IF memory configuration
 */
export const editIfMemory = async (
  data: EditIfMemoryRequestDto
): Promise<EditIfMemoryResponseDto> => {
  try {
    const response = await apiClient.post<EditIfMemoryResponseDto>(
      '/api/Monitoring/EditIfMemory',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Delete an IF memory configuration
 */
export const deleteIfMemory = async (
  data: DeleteIfMemoryRequestDto
): Promise<DeleteIfMemoryResponseDto> => {
  try {
    const response = await apiClient.post<DeleteIfMemoryResponseDto>(
      '/api/Monitoring/DeleteIfMemory',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Test/preview an IF condition expression with current variable values
 */
export const testIfCondition = async (
  data: TestIfConditionRequestDto
): Promise<TestIfConditionResponseDto> => {
  try {
    const response = await apiClient.post<TestIfConditionResponseDto>(
      '/api/Monitoring/TestIfCondition',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// ==========================================
// Deadband Memory API Functions
// ==========================================

/**
 * Get all deadband memory configurations
 */
export const getDeadbandMemories = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  params: GetDeadbandMemoriesRequestDto = {}
): Promise<GetDeadbandMemoriesResponseDto> => {
  try {
    const response = await apiClient.post<GetDeadbandMemoriesResponseDto>(
      '/api/Monitoring/GetDeadbandMemories',
      params
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Add a new deadband memory configuration
 */
export const addDeadbandMemory = async (
  data: AddDeadbandMemoryRequestDto
): Promise<AddDeadbandMemoryResponseDto> => {
  try {
    const response = await apiClient.post<AddDeadbandMemoryResponseDto>(
      '/api/Monitoring/AddDeadbandMemory',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Edit an existing deadband memory configuration
 */
export const editDeadbandMemory = async (
  data: EditDeadbandMemoryRequestDto
): Promise<EditDeadbandMemoryResponseDto> => {
  try {
    const response = await apiClient.post<EditDeadbandMemoryResponseDto>(
      '/api/Monitoring/EditDeadbandMemory',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Delete a deadband memory configuration
 */
export const deleteDeadbandMemory = async (
  data: DeleteDeadbandMemoryRequestDto
): Promise<DeleteDeadbandMemoryResponseDto> => {
  try {
    const response = await apiClient.post<DeleteDeadbandMemoryResponseDto>(
      '/api/Monitoring/DeleteDeadbandMemory',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// ==========================================
// Min/Max Selector Memory API Functions
// ==========================================

/**
 * Get all min/max selector memory configurations
 */
export const getMinMaxSelectorMemories = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  params: GetMinMaxSelectorMemoriesRequestDto = {}
): Promise<GetMinMaxSelectorMemoriesResponseDto> => {
  try {
    const response = await apiClient.post<GetMinMaxSelectorMemoriesResponseDto>(
      '/api/Monitoring/GetMinMaxSelectorMemories',
      params
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Add a new min/max selector memory configuration
 */
export const addMinMaxSelectorMemory = async (
  data: AddMinMaxSelectorMemoryRequestDto
): Promise<AddMinMaxSelectorMemoryResponseDto> => {
  try {
    const response = await apiClient.post<AddMinMaxSelectorMemoryResponseDto>(
      '/api/Monitoring/AddMinMaxSelectorMemory',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Edit an existing min/max selector memory configuration
 */
export const editMinMaxSelectorMemory = async (
  data: EditMinMaxSelectorMemoryRequestDto
): Promise<EditMinMaxSelectorMemoryResponseDto> => {
  try {
    const response = await apiClient.post<EditMinMaxSelectorMemoryResponseDto>(
      '/api/Monitoring/EditMinMaxSelectorMemory',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Delete a min/max selector memory configuration
 */
export const deleteMinMaxSelectorMemory = async (
  data: DeleteMinMaxSelectorMemoryRequestDto
): Promise<DeleteMinMaxSelectorMemoryResponseDto> => {
  try {
    const response = await apiClient.post<DeleteMinMaxSelectorMemoryResponseDto>(
      '/api/Monitoring/DeleteMinMaxSelectorMemory',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// Re-export types for convenience
export type { ComparisonMemory, StatisticalMemory, FormulaMemory, IfMemory, DeadbandMemory, MinMaxSelectorMemory };

// ==========================================
// Global Variables API Functions
// ==========================================

/**
 * Get all global variables with their current values
 */
export const getGlobalVariables = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  params: GetGlobalVariablesRequestDto = {}
): Promise<GetGlobalVariablesResponseDto> => {
  try {
    const response = await apiClient.post<GetGlobalVariablesResponseDto>(
      '/api/GlobalVariables/GetGlobalVariables',
      params
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Add a new global variable
 */
export const addGlobalVariable = async (
  data: AddGlobalVariableRequestDto
): Promise<AddGlobalVariableResponseDto> => {
  try {
    const response = await apiClient.post<AddGlobalVariableResponseDto>(
      '/api/GlobalVariables/AddGlobalVariable',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Edit an existing global variable
 */
export const editGlobalVariable = async (
  data: EditGlobalVariableRequestDto
): Promise<EditGlobalVariableResponseDto> => {
  try {
    const response = await apiClient.post<EditGlobalVariableResponseDto>(
      '/api/GlobalVariables/EditGlobalVariable',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Delete a global variable
 */
export const deleteGlobalVariable = async (
  data: DeleteGlobalVariableRequestDto
): Promise<DeleteGlobalVariableResponseDto> => {
  try {
    const response = await apiClient.post<DeleteGlobalVariableResponseDto>(
      '/api/GlobalVariables/DeleteGlobalVariable',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Get global variable usage information
 */
export const getGlobalVariableUsage = async (
  data: GetGlobalVariableUsageRequestDto
): Promise<GetGlobalVariableUsageResponseDto> => {
  try {
    const response = await apiClient.post<GetGlobalVariableUsageResponseDto>(
      '/api/GlobalVariables/GetGlobalVariableUsage',
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// Re-export GlobalVariable types for convenience
export type { GlobalVariable, GlobalVariableType, MemoryUsage };
