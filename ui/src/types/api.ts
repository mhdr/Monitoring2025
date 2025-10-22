// Common types for the monitoring system API responses

export interface DashboardData {
  totalAlarms: number;
  activeAlarms: number;
  acknowledgedAlarms: number;
  criticalAlarms: number;
  warningAlarms: number;
  infoAlarms: number;
  systemStatus: 'healthy' | 'warning' | 'critical';
  lastUpdate: string;
  sensors?: SensorData[];
  recentActivity?: ActivityItem[];
}

export interface SensorData {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  lastUpdate: string;
}

export interface ActivityItem {
  id: string;
  type: 'alarm' | 'acknowledge' | 'system';
  message: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface Alarm {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'active' | 'acknowledged' | 'cleared';
  timestamp: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  acknowledgeNote?: string;
  source: string;
  category: string;
  enabled: boolean;
}

export interface AlarmLogEntry {
  id: string;
  alarmId: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  action: 'triggered' | 'acknowledged' | 'cleared' | 'disabled' | 'enabled';
  timestamp: string;
  userId?: string;
  userName?: string;
  note?: string;
  source: string;
  category: string;
}

export interface AuditTrailEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: string;
  timestamp: string;
  ipAddress: string;
  userAgent?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AlarmAcknowledgeRequest {
  note?: string;
}

export interface AlarmToggleRequest {
  enabled: boolean;
}

export interface PlotData {
  id: string;
  name: string;
  type: 'line' | 'bar' | 'area';
  dataPoints: DataPoint[];
  unit: string;
  timeRange: string;
}

export interface DataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface SchedulerJob {
  id: string;
  name: string;
  description: string;
  schedule: string; // Cron expression
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  type: string;
}

export interface ManagementSettings {
  alarmSettings: {
    autoAcknowledgeTimeoutMinutes: number;
    escalationTimeoutMinutes: number;
    maxActiveAlarms: number;
  };
  systemSettings: {
    refreshIntervalSeconds: number;
    logRetentionDays: number;
    enableNotifications: boolean;
  };
  userSettings: {
    defaultLanguage: 'en' | 'fa';
    theme: 'light' | 'dark';
    timezone: string;
  };
}

// Monitoring Groups types
export interface Group {
  id: string;
  name: string;
  nameFa?: string | null;
  parentId?: string | null;
}

/**
 * Request DTO for retrieving monitoring groups
 * No parameters - returns groups accessible to the current user
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GroupsRequestDto {
  // Empty - endpoint returns groups accessible to current user based on JWT token
}

export interface GroupsResponseDto {
  groups: Group[];
}

// Monitoring Items types

/**
 * Represents a monitoring item (sensor, actuator, etc.)
 */
export interface Item {
  /** Unique identifier for the item */
  id: string;
  /** Group ID that this item belongs to */
  groupId?: string | null;
  /** Type of monitoring item (digital/analog, input/output) */
  itemType: ItemType;
  /** Display name of the item */
  name: string;
  /** Display name of the item in Farsi */
  nameFa?: string | null;
  /** Hardware point number for communication */
  pointNumber: number;
  /** Whether to apply scaling to raw values */
  shouldScale: ShouldScaleType;
  /** Minimum raw value from the hardware */
  normMin: number;
  /** Maximum raw value from the hardware */
  normMax: number;
  /** Minimum scaled engineering value */
  scaleMin: number;
  /** Maximum scaled engineering value */
  scaleMax: number;
  /** Interval in seconds for saving current values */
  saveInterval: number;
  /** Interval in seconds for saving historical values */
  saveHistoricalInterval: number;
  /** Method for calculating values from samples */
  calculationMethod: ValueCalculationMethod;
  /** Number of samples used for calculation */
  numberOfSamples: number;
  /** Text to display when boolean value is true */
  onText?: string | null;
  /** Text to display when boolean value is true in Farsi */
  onTextFa?: string | null;
  /** Text to display when boolean value is false */
  offText?: string | null;
  /** Text to display when boolean value is false in Farsi */
  offTextFa?: string | null;
  /** Engineering unit for the value (°C, bar, etc.) */
  unit?: string | null;
  /** Engineering unit for the value in Farsi */
  unitFa?: string | null;
  /** Whether the item is disabled from data collection */
  isDisabled?: boolean | null;
  /** Interface type for communication */
  interfaceType: InterfaceType;
  /** Whether the current user can edit this item */
  isEditable: boolean;
}

/** ItemType: 1 = DigitalInput, 2 = DigitalOutput, 3 = AnalogInput, 4 = AnalogOutput */
export type ItemType = 1 | 2 | 3 | 4;

/**
 * ItemType enum values for better code readability
 */
export const ItemTypeEnum = {
  DigitalInput: 1,
  DigitalOutput: 2,
  AnalogInput: 3,
  AnalogOutput: 4,
} as const;

/** ShouldScaleType: 1 = NoScale, 2 = Scale */
export type ShouldScaleType = 1 | 2;

/** ValueCalculationMethod: 0 = Instantaneous, 1 = Average */
export type ValueCalculationMethod = 0 | 1;

/** InterfaceType: 0 = None, 1 = Sharp7, 2 = BACnet, 3 = Modbus */
export type InterfaceType = 0 | 1 | 2 | 3;

/**
 * InterfaceType enum values for better code readability
 */
export const InterfaceTypeEnum = {
  None: 0,
  Sharp7: 1,
  BACnet: 2,
  Modbus: 3,
} as const;

/**
 * Request DTO for retrieving monitoring items
 */
export interface ItemsRequestDto {
  /** Whether to include orphaned items that are not assigned to any group */
  showOrphans?: boolean;
}

/**
 * Response DTO containing monitoring items accessible to the user
 */
export interface ItemsResponseDto {
  /** List of monitoring items */
  items: Item[];
}

// Monitoring Values types
export interface MultiValue {
  itemId: string;
  value: string | null;
  time: number; // Unix timestamp (int64)
  dateTime?: string; // ReadOnly DateTime representation
}

export interface ValuesRequestDto {
  itemIds?: string[] | null; // Leave empty to get all values
}

export interface ValuesResponseDto {
  values: MultiValue[];
}

// History types for trend analysis
export interface HistoricalDataPoint {
  value: string | null; // The historical value as a string
  time: number; // Unix timestamp when the value was recorded (int64)
}

export interface HistoryRequestDto {
  itemId: string; // Identifier of the item to retrieve history for (required)
  startDate: number; // Start time as Unix seconds since epoch (UTC) (int64)
  endDate: number; // End time as Unix seconds since epoch (UTC) (int64)
}

export interface HistoryResponseDto {
  values: HistoricalDataPoint[]; // List of historical data points with values and timestamps
}

// ==================== Type Definitions ====================

// AlarmType: 1 = Notification, 2 = Safety
export type AlarmType = 1 | 2;

// AlarmPriority: 1 = Low, 2 = High
export type AlarmPriority = 1 | 2;

// CompareType: 1 = Equal, 2 = NotEqual, 3 = GreaterThan, 4 = LessThan, 5 = InRange
export type CompareType = 1 | 2 | 3 | 4 | 5;

// ControllerType: 1 = Siemens
export type ControllerType = 1;

// DataType: 1 = Byte, 2 = Word, 3 = DWord
export type DataType = 1 | 2 | 3;

// IoOperationType: 1 = Read, 2 = Write
export type IoOperationType = 1 | 2;

// LogType: 1 = Login, 2 = Logout, 3 = AddUser, 4 = EditUser, 5 = DisableUser, 6 = DeleteUser, 7 = AddGroup, 8 = EditGroup, 9 = AddItem, 10 = EditItem
export type LogType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

// AddUserErrorType: 1 = UserAlreadyExists, 2 = ValidationError
export type AddUserErrorType = 1 | 2;

// EditUserErrorType: 1 = UserNotFound, 2 = ValidationError
export type EditUserErrorType = 1 | 2;

// ==================== Monitoring Item Management DTOs ====================

export interface AddPointAsAdminRequestDto {
  itemType: ItemType;
  itemName: string;
  pointNumber: number;
  shouldScale: ShouldScaleType;
  normMin: number;
  normMax: number;
  scaleMin: number;
  scaleMax: number;
  saveInterval: number;
  saveHistoricalInterval: number;
  calculationMethod: ValueCalculationMethod;
  numberOfSamples: number;
  onText?: string | null;
  offText?: string | null;
  unit?: string | null;
  isDisabled?: boolean | null;
}

export interface EditPointRequestDto {
  id: string; // UUID
  itemType: ItemType;
  itemName?: string | null;
  onText?: string | null;
  offText?: string | null;
  unit?: string | null;
}

export interface EditPointAsAdminRequestDto {
  id: string; // UUID
  itemType: ItemType;
  itemName?: string | null;
  pointNumber: number;
  shouldScale: ShouldScaleType;
  normMin: number;
  normMax: number;
  scaleMin: number;
  scaleMax: number;
  saveInterval: number;
  saveHistoricalInterval: number;
  calculationMethod: ValueCalculationMethod;
  numberOfSamples: number;
  onText?: string | null;
  offText?: string | null;
  unit?: string | null;
  isDisabled?: boolean | null;
}

export interface EditPointResponseDto {
  isSuccessful: boolean;
}

export interface DeletePointRequestDto {
  id: string; // UUID
}

export interface MovePointRequestDto {
  pointId: string; // UUID
  parentId: string; // UUID
}

// ==================== Alarm Management DTOs ====================

export interface AlarmDto {
  id?: string | null; // UUID
  itemId?: string | null; // UUID
  alarmType?: AlarmType;
  alarmPriority?: AlarmPriority;
  compareType?: CompareType;
  isDisabled?: boolean;
  alarmDelay?: number; // int32
  message?: string | null;
  messageFa?: string | null; // Farsi/Persian message
  value1?: string | null;
  value2?: string | null;
  timeout?: number | null; // int32
  hasExternalAlarm?: boolean | null;
}

export interface AlarmsRequestDto {
  itemIds?: string[] | null; // Leave empty to get all alarms
}

export interface AlarmsResponseDto {
  data: AlarmDto[];
}

export interface AddAlarmRequestDto {
  itemId: string; // UUID
  isDisabled: boolean;
  alarmDelay: number; // int32 - seconds
  message?: string | null;
  value1?: string | null;
  value2?: string | null;
  timeout?: number | null; // int32 - seconds
  alarmType: AlarmType;
  alarmPriority: AlarmPriority;
  compareType: CompareType;
}

export interface EditAlarmRequestDto {
  id: string; // UUID
  itemId: string; // UUID
  isDisabled: boolean;
  alarmDelay: number; // int32
  message?: string | null;
  value1?: string | null;
  value2?: string | null;
  timeout?: number | null; // int32
}

export interface EditAlarmResponseDto {
  isSuccessful: boolean;
}

export interface DeleteAlarmRequestDto {
  id: string; // UUID
}

export interface ExternalAlarm {
  id: string; // UUID
  itemId: string; // UUID
  value: boolean;
  isDisabled: boolean;
}

export interface GetExternalAlarmsRequestDto {
  alarmId: string; // UUID
}

export interface BatchEditExternalAlarmsRequestDto {
  alarmId: string; // UUID
  changed?: ExternalAlarm[] | null;
  added?: ExternalAlarm[] | null;
  removed?: ExternalAlarm[] | null;
}

export interface ActiveAlarm {
  id?: string | null;
  alarmId?: string | null;
  itemId?: string | null;
  time: number; // int64 - Unix timestamp
  dateTime?: string; // ReadOnly - ISO 8601
  alarmPriority?: AlarmPriority; // Client-side enrichment from alarm configuration
}

export interface ActiveAlarmsRequestDto {
  itemIds?: string[] | null; // Leave empty to get all active alarms
}

export interface ActiveAlarmsResponseDto {
  data: ActiveAlarm[];
}

export interface AlarmHistory {
  id?: string | null;
  alarmId?: string | null;
  itemId?: string | null;
  time: number; // int64
  isActive: boolean;
  alarmLog?: string | null;
  dateTime?: string; // ReadOnly
}

export interface AlarmHistoryRequestDto {
  itemIds?: string[] | null;
  startDate: number; // int64 - Unix timestamp
  endDate: number; // int64 - Unix timestamp
}

export interface AlarmHistoryResponseDto {
  data: AlarmHistory[];
}

// ==================== User Management DTOs ====================

export interface User {
  id: string; // UUID
  userName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  roles?: string[] | null;
}

export interface GetUsersResponseDto {
  data: User[];
}

export interface AddUserRequestDto {
  userName: string; // 1-50 characters
  firstName: string; // 1-50 characters
  lastName: string; // 1-50 characters
}

export interface AddUserResponseDto {
  isSuccessful: boolean;
  error?: AddUserErrorType;
}

export interface EditUserRequestDto {
  id: string; // UUID
  userName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

export interface EditUserResponseDto {
  isSuccessful: boolean;
  error?: EditUserErrorType;
}

export interface GetUserRequestDto {
  userId?: string | null;
}

export interface GetUserResponseDto {
  id: string; // UUID
  userName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  roles?: string[] | null;
}

export interface Role {
  id: string; // UUID
  roleName?: string | null;
}

export interface GetRolesResponseDto {
  data: Role[];
}

export interface SetRolesRequestDto {
  userId: string; // UUID
  userName?: string | null;
  roles?: string[] | null;
}

export interface SetRolesResponseDto {
  isSuccessful: boolean;
}

export interface SavePermissionsRequestDto {
  userId?: string | null;
  groupPermissions?: string[] | null;
  itemPermissions?: string[] | null;
}

export interface SavePermissionsResponseDto {
  isSuccessful: boolean;
}

// ==================== Group Management DTOs ====================

export interface AddGroupRequestDto {
  name?: string | null;
  parentId?: string | null; // UUID - Null for root-level groups
}

export interface AddGroupResponseDto {
  isSuccessful: boolean;
}

export interface EditGroupRequestDto {
  id: string; // UUID
  name?: string | null;
}

export interface DeleteGroupRequestDto {
  id: string; // UUID
}

export interface MoveGroupRequestDto {
  groupId: string; // UUID
  parentId?: string | null; // UUID
}

// ==================== Controller Management DTOs ====================

export interface Controller {
  id: string; // UUID
  name?: string | null;
  ipAddress?: string | null;
  dbAddress: number; // int32
  dbStartData: number; // int32
  dbSizeData: number; // int32
  dataType: DataType;
  controllerType: ControllerType;
  isDisabled: boolean;
}

export interface GetControllersResponseDto {
  data: Controller[];
}

export interface AddControllerRequestDto {
  name?: string | null;
  ipAddress?: string | null;
  dbAddress: number; // int32
  dbStartData: number; // int32
  dbSizeData: number; // int32
  dataType: number; // int32
  controllerType: number; // int32
}

export interface AddControllerResponseDto {
  isSuccessful: boolean;
}

export interface EditControllerRequestDto {
  id: string; // UUID
  name?: string | null;
  ipAddress?: string | null;
  dbAddress: number; // int32
  dbStartData: number; // int32
  dbSizeData: number; // int32
  dataType: number; // int32
  controllerType: number; // int32
}

export interface DeleteControllerRequestDto {
  id: string; // UUID
}

export interface Map {
  id: string; // UUID
  controllerId: string; // UUID
  position: number; // int32
  bit?: number | null; // int32
  itemId: string; // UUID
}

export interface GetControllerMappingsRequestDto {
  controllerType: ControllerType;
  operationType: IoOperationType;
  controllerId?: string | null; // UUID
}

export interface BatchEditMappingsRequestDto {
  controllerId: string; // UUID
  operationType: IoOperationType;
  changed?: Map[] | null;
  added?: Map[] | null;
  removed?: Map[] | null;
}

// ==================== Job/Scheduler DTOs ====================

export interface JobDetail {
  id: string; // UUID
  itemId: string; // UUID
  value?: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GetJobTriggersRequestDto {
  // Currently unused but required for POST
}

export interface GetJobDetailsRequestDto {
  triggerId: string; // UUID
}

export interface SaveJobRequestDto {
  triggerId?: string | null; // UUID - Null for creating new jobs
  triggerName?: string | null;
  isDisabled: boolean;
  startTime?: string | null; // Time string format
  endTime?: string | null; // Time string format
  changed?: JobDetail[] | null;
  added?: JobDetail[] | null;
  removed?: JobDetail[] | null;
}

export interface DeleteJobRequestDto {
  id: string; // UUID
}

// ==================== PID Controller DTOs ====================

export interface PidController {
  id: string; // UUID
  inputItemId: string; // UUID - Process variable input
  outputItemId: string; // UUID - Control variable output
  kp: number; // double - Proportional gain
  ki: number; // double - Integral gain
  kd: number; // double - Derivative gain
  outputMin: number; // double
  outputMax: number; // double
  interval: number; // int32 - milliseconds
  isDisabled: boolean;
  setPoint?: number | null; // double
  derivativeFilterAlpha: number; // double - 0-1
  maxOutputSlewRate: number; // double - units per second
  deadZone: number; // double
  feedForward: number; // double
  isAuto: boolean; // true = automatic, false = manual
  manualValue?: number | null; // double
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GetPidControllersRequestDto {
  // Currently unused but required for POST
}

export interface EditPidControllerRequestDto {
  controller: PidController;
}

export interface EditPidSetPointRequestDto {
  pidControllerId: string; // UUID
  setPoint: number; // double
}

export interface GetPidControllerRequestDto {
  id: string; // UUID
}

// ==================== Value Operations DTOs ====================

export interface SingleValue {
  itemId?: string | null;
  value?: string | null;
  time: number; // int64 - Unix timestamp
}

export interface ValueRequestDto {
  itemId?: string | null;
}

export interface ValueResponseDto {
  value: SingleValue;
}

export interface WriteValueRequestDto {
  itemId: string; // UUID
  value?: string | null;
  time?: number | null; // int64 - Unix timestamp
}

export interface AddValueRequestDto {
  itemId: string; // UUID
  value?: string | null;
  time: number; // int64 - Unix timestamp
}

export interface WriteOrAddValueRequestDto {
  itemId: string; // UUID
  value?: string | null;
  time?: number | null; // int64 - Unix timestamp
}

// ==================== SVG Layout DTOs ====================

export interface GetSvgLayoutRequestDto {
  id: string; // UUID
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GetSvgLayoutsRequestDto {
  // Currently unused but required for POST
}

// ==================== Audit and System DTOs ====================

export interface DataDto {
  id: string; // UUID
  isUser: boolean;
  userId?: string | null; // UUID
  userName?: string | null;
  itemId?: string | null; // UUID
  actionType: LogType;
  ipAddress?: string | null;
  logValue?: string | null;
  time: number; // int64
  dateTime?: string; // ReadOnly
}

export interface AuditLogRequestDto {
  itemId?: string | null; // Optional filter by item ID
  startDate: number; // int64 - Unix timestamp
  endDate: number; // int64 - Unix timestamp
}

export interface AuditLogResponseDto {
  data: DataDto[];
}

export interface SettingsVersionResponseDto {
  version?: string | null;
  userVersion?: string | null;
}
