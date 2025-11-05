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
 * No parameters - backend returns all groups, client-side filtering is applied based on ItemPermissions
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GroupsRequestDto {
  // Empty - backend returns all groups, client filters based on accessible items
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
  /** Whether to save values on change */
  saveOnChange?: SaveOnChange | null;
  /** The range threshold for triggering save on change (percentage or absolute value) */
  saveOnChangeRange?: number | null;
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
  /** Whether calibration is enabled for this item */
  isCalibrationEnabled?: boolean | null;
  /** Calibration coefficient A (multiplier) in the formula: calibrated_value = A * raw_value + B */
  calibrationA?: number | null;
  /** Calibration coefficient B (offset) in the formula: calibrated_value = A * raw_value + B */
  calibrationB?: number | null;
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

/** ShouldScaleType: 1 = Yes (On), 2 = No (Off) - Backend uses Yes/No naming */
export type ShouldScaleType = 1 | 2;

/**
 * ShouldScaleType enum values for better code readability
 * Backend uses Yes=1 (scaling enabled), No=2 (scaling disabled)
 */
export const ShouldScaleTypeEnum = {
  Yes: 1,
  No: 2,
} as const;

/** ValueCalculationMethod: 0 = LastValue, 1 = Average - Backend uses these names */
export type ValueCalculationMethod = 0 | 1;

/**
 * ValueCalculationMethod enum values for better code readability
 * Backend uses LastValue=0, Average=1 (Mean is just Average)
 */
export const ValueCalculationMethodEnum = {
  LastValue: 0,
  Average: 1,
} as const;

/** SaveOnChange: 0 = Default, 1 = On, 2 = Off */
export type SaveOnChange = 0 | 1 | 2;

/**
 * SaveOnChange enum values for better code readability
 */
export const SaveOnChangeEnum = {
  Default: 0,
  On: 1,
  Off: 2,
} as const;

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

/** AlarmType: 1 = Comparative (threshold/value-based), 2 = Timeout (time-based) */
export type AlarmType = 1 | 2;

/**
 * AlarmType enum values for better code readability
 * Backend uses Comparative=1 (threshold-based alarms), Timeout=2 (time-based alarms)
 */
export const AlarmTypeEnum = {
  Comparative: 1,
  Timeout: 2,
} as const;

/** AlarmPriority: 1 = Warning, 2 = Alarm (Critical) */
export type AlarmPriority = 1 | 2;

/**
 * AlarmPriority enum values for better code readability
 * Backend uses Warning=1 (lower priority), Alarm=2 (critical priority)
 */
export const AlarmPriorityEnum = {
  Warning: 1,
  Alarm: 2,
} as const;

/** 
 * CompareType: 1 = Equal, 2 = NotEqual, 3 = Higher, 4 = Lower, 5 = Between
 * Note: GreaterOrEqual, LessOrEqual, and OutOfRange have been removed from the backend
 */
export type CompareType = 1 | 2 | 3 | 4 | 5;

/**
 * CompareType enum values for better code readability
 * Backend uses Equal=1, NotEqual=2, Higher=3, Lower=4, Between=5
 * 
 * Breaking change from previous version:
 * - Old Equal (0) → New Equal (1)
 * - Old NotEqual (1) → New NotEqual (2)
 * - Old Greater (2) → New Higher (3)
 * - Old Less (4) → New Lower (4)
 * - Old Between (6) → New Between (5)
 * - Removed: GreaterOrEqual (3), LessOrEqual (5), OutOfRange (7)
 */
export const CompareTypeEnum = {
  Equal: 1,
  NotEqual: 2,
  Higher: 3,
  Lower: 4,
  Between: 5,
} as const;

/** ControllerType: 1 = Siemens */
export type ControllerType = 1;

/**
 * ControllerType enum values for better code readability
 */
export const ControllerTypeEnum = {
  Siemens: 1,
} as const;

/** DataType: 1 = Bit, 2 = Real, 3 = Integer */
export type DataType = 1 | 2 | 3;

/**
 * DataType enum values for better code readability
 * Backend uses Bit=1 (boolean), Real=2 (floating point), Integer=3 (whole numbers)
 */
export const DataTypeEnum = {
  Bit: 1,
  Real: 2,
  Integer: 3,
} as const;

/** IoOperationType: 1 = Read, 2 = Write */
export type IoOperationType = 1 | 2;

/**
 * IoOperationType enum values for better code readability
 */
export const IoOperationTypeEnum = {
  Read: 1,
  Write: 2,
} as const;

/** BACnetObjectType: 1 = AnalogInput, 2 = AnalogOutput */
export type BACnetObjectType = 1 | 2;

/**
 * BACnetObjectType enum values for better code readability
 * Backend uses AnalogInput=1, AnalogOutput=2 for BACnet protocol objects
 */
export const BACnetObjectTypeEnum = {
  AnalogInput: 1,
  AnalogOutput: 2,
} as const;

/** ModbusDataType: 1 = Boolean, 2 = Int */
export type ModbusDataType = 1 | 2;

/**
 * ModbusDataType enum values for better code readability
 * Backend uses Boolean=1 (single bit), Int=2 (integer register) for Modbus protocol
 */
export const ModbusDataTypeEnum = {
  Boolean: 1,
  Int: 2,
} as const;

// LogType: Based on backend enum - EditPoint=1, EditAlarm=2, Login=3, Logout=4, EditGroup=5, AddAlarm=6, DeleteAlarm=7, AddExternalAlarm=8, DeleteExternalAlarm=9, EditExternalAlarm=10, AddPoint=11, DeletePoint=12, DeleteGroup=13, AddGroup=14, EditUser=15, AddUser=16, DeleteUser=17, EditRole=18, AddRole=19, DeleteRole=20
export type LogType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20;

/**
 * LogType enum values for better code readability
 * Matches backend enum exactly
 */
export const LogTypeEnum = {
  EditPoint: 1,
  EditAlarm: 2,
  Login: 3,
  Logout: 4,
  EditGroup: 5,
  AddAlarm: 6,
  DeleteAlarm: 7,
  AddExternalAlarm: 8,
  DeleteExternalAlarm: 9,
  EditExternalAlarm: 10,
  AddPoint: 11,
  DeletePoint: 12,
  DeleteGroup: 13,
  AddGroup: 14,
  EditUser: 15,
  AddUser: 16,
  DeleteUser: 17,
  EditRole: 18,
  AddRole: 19,
  DeleteRole: 20,
} as const;

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

export interface DeleteItemResponseDto {
  isSuccess: boolean; // Note: Backend uses 'isSuccess' not 'isSuccessful'
}

export interface MovePointRequestDto {
  pointId: string; // UUID
  parentId: string; // UUID
}

export interface MovePointResponseDto {
  isSuccessful: boolean;
  message?: string | null;
}

export interface MoveGroupRequestDto {
  groupId: string; // UUID - The ID of the group to move
  parentId?: string | null; // UUID - The ID of the new parent group (null for root level)
}

export interface MoveGroupResponseDto {
  isSuccessful: boolean;
  message?: string | null;
  error?: number; // MoveGroupErrorType: 0=Success, 1=GroupNotFound, 2=ParentNotFound, 3=CircularReference, 4=SameParent, 5=UnknownError
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
  data: {
    data: AlarmDto[];
  };
}

/**
 * Request DTO for adding a new alarm to a monitoring item
 * All fields match backend AddAlarmRequestDto exactly
 */
export interface AddAlarmRequestDto {
  /** ID of the monitoring item to add the alarm to (required) */
  itemId: string; // UUID
  /** Whether the alarm is disabled (won't trigger notifications) */
  isDisabled: boolean;
  /** Delay in seconds before the alarm triggers after condition is met (0-3600 seconds) */
  alarmDelay: number; // int32 - seconds
  /** Custom message to display when the alarm triggers (max 500 characters) */
  message?: string | null;
  /** Custom message to display when the alarm triggers in Farsi/Persian (max 500 characters) */
  messageFa?: string | null;
  /** First comparison value for the alarm condition (threshold or lower bound, max 100 characters) */
  value1?: string | null;
  /** Second comparison value for range-based alarm conditions (upper bound for Between comparisons, max 100 characters) */
  value2?: string | null;
  /** Optional timeout in seconds for automatic alarm acknowledgment (0-86400 seconds = 24 hours) */
  timeout?: number | null; // int32 - seconds
  /** Type of alarm: Comparative (1) for threshold-based, Timeout (2) for time-based (required) */
  alarmType: AlarmType;
  /** Priority level: Warning (1) or Alarm/Critical (2) (required) */
  alarmPriority: AlarmPriority;
  /** Comparison operation: Equal (1), NotEqual (2), Higher (3), Lower (4), Between (5) (required) */
  compareType: CompareType;
}

/**
 * Response DTO for adding an alarm operation
 * Indicates success/failure and provides the new alarm ID on success
 */
export interface AddAlarmResponseDto {
  /** Indicates whether the alarm was successfully added */
  success: boolean;
  /** Descriptive message about the operation result */
  message?: string | null;
  /** The unique identifier of the newly created alarm (only present on successful creation) */
  alarmId?: string | null; // UUID
}

export interface EditAlarmRequestDto {
  /** Unique identifier of the alarm to edit */
  id: string; // UUID
  /** ID of the monitoring item this alarm belongs to */
  itemId: string; // UUID
  /** Whether the alarm is disabled (won't trigger notifications) */
  isDisabled?: boolean;
  /** Delay in seconds before the alarm triggers after condition is met (prevents false alarms from transient conditions, range: 0-3600) */
  alarmDelay?: number; // int32, range: 0-3600
  /** Custom message to display when the alarm triggers (English) */
  message?: string | null; // maxLength: 500
  /** Custom message to display when the alarm triggers (Farsi) */
  messageFa?: string | null; // maxLength: 500
  /** First comparison value for the alarm condition (threshold or lower bound) */
  value1?: string | null; // maxLength: 100
  /** Second comparison value for range-based alarm conditions (upper bound for Between/OutOfRange comparisons) */
  value2?: string | null; // maxLength: 100
  /** Timeout duration in seconds - required for AlarmType 2 (Timeout-based alarms). Specifies how long to wait without data updates before triggering. Not used for AlarmType 1 (Comparative). Range: 0-86400 */
  timeout?: number | null; // int32, range: 0-86400
  /** Alarm type: Comparative (1) or Timeout (2) - REQUIRED */
  alarmType: AlarmType;
  /** Alarm priority: Warning (1) or Alarm (2) - REQUIRED */
  alarmPriority: AlarmPriority;
  /** Comparison type: Equal (1), NotEqual (2), Higher (3), Lower (4), Between (5) - REQUIRED */
  compareType: CompareType;
}

/** Possible error types for alarm editing operations */
export const EditAlarmErrorType = {
  None: 0,
  AlarmNotFound: 1,
  ItemNotFound: 2,
  InvalidParameters: 3,
  InsufficientPermissions: 4,
} as const;

export type EditAlarmErrorType = typeof EditAlarmErrorType[keyof typeof EditAlarmErrorType];

export interface EditAlarmResponseDto {
  /** Indicates whether the alarm was successfully updated */
  success: boolean;
  /** Descriptive message about the operation result */
  message?: string | null;
  /** Error type if the operation failed */
  error?: EditAlarmErrorType;
}

export interface DeleteAlarmRequestDto {
  id: string; // UUID
}

export interface DeleteAlarmResponseDto {
  success: boolean;
  message?: string;
}

/**
 * External alarm edit model for batch edit operations
 * Used in BatchEditExternalAlarmsRequestDto for add, update, and delete operations
 */
export interface ExternalAlarmEdit {
  id: string; // UUID - For new items use '00000000-0000-0000-0000-000000000000', backend will generate actual ID
  itemId: string; // UUID - The monitoring item ID to write to when alarm triggers
  value: boolean; // The value to write when this external alarm is triggered
  isDisabled: boolean; // Whether this external alarm is disabled
}

/**
 * Legacy external alarm model - deprecated in favor of ExternalAlarmEdit
 * @deprecated Use ExternalAlarmEdit instead
 */
export interface ExternalAlarm {
  id: string; // UUID
  itemId: string; // UUID
  value: boolean;
  isDisabled: boolean;
}

export interface GetExternalAlarmsRequestDto {
  alarmId: string; // UUID
}

/**
 * External alarm information returned from GetExternalAlarms API
 * Represents an external alarm configuration with all details
 */
export interface ExternalAlarmInfo {
  id?: string | null; // UUID - Unique identifier for the external alarm
  alarmId?: string | null; // UUID - The parent alarm ID that this external alarm belongs to
  itemId?: string | null; // UUID - The monitoring item ID associated with this external alarm
  value?: boolean; // The output value to write when this external alarm is triggered
  isDisabled?: boolean; // Indicates whether this external alarm is currently disabled
}

/**
 * Response model for GetExternalAlarms API
 * Contains the list of external alarm configurations for a parent alarm
 */
export interface GetExternalAlarmsResponseDto {
  success?: boolean; // Indicates whether the operation was successful
  message?: string | null; // Optional message providing additional information
  externalAlarms?: ExternalAlarmInfo[] | null; // List of external alarm configurations
}

/**
 * Request model for batch editing external alarm configurations
 * Supports adding, updating, and removing external alarms in a single operation
 * All arrays are required - use empty arrays [] when no changes of that type exist
 */
export interface BatchEditExternalAlarmsRequestDto {
  alarmId: string; // UUID - The parent alarm ID for which external alarms are being edited
  changed: ExternalAlarmEdit[]; // List of external alarms that have been modified (use [] if none)
  added: ExternalAlarmEdit[]; // List of new external alarms to add (use [] if none)
  removed: ExternalAlarmEdit[]; // List of external alarms to remove (use [] if none)
}

// ============================================================================
// External Alarm Individual Operations (Future API Endpoints)
// ============================================================================

/**
 * Request model for adding a new external alarm configuration
 * External alarms allow one alarm to trigger outputs on other monitoring items
 */
export interface AddExternalAlarmRequestDto {
  /** The parent alarm ID that will trigger this external alarm */
  alarmId: string; // UUID - REQUIRED
  /** The monitoring item ID to write to when the parent alarm triggers */
  itemId: string; // UUID - REQUIRED
  /** The value to write to the target item when alarm triggers */
  value: boolean; // REQUIRED
  /** Whether this external alarm is disabled (won't execute when parent alarm triggers) */
  isDisabled?: boolean;
}

/**
 * Response model for adding an external alarm
 * Indicates success/failure and provides the new external alarm ID on success
 */
export interface AddExternalAlarmResponseDto {
  /** Indicates whether the external alarm was successfully added */
  success: boolean;
  /** Descriptive message about the operation result */
  message?: string | null;
  /** The unique identifier of the newly created external alarm (only present on successful creation) */
  externalAlarmId?: string | null; // UUID
}

/**
 * Request model for updating an existing external alarm configuration
 */
export interface UpdateExternalAlarmRequestDto {
  /** Unique identifier of the external alarm to update */
  id: string; // UUID - REQUIRED
  /** The parent alarm ID (optional - include if changing the parent) */
  alarmId?: string | null; // UUID
  /** The monitoring item ID to write to when alarm triggers */
  itemId?: string | null; // UUID
  /** The value to write to the target item when alarm triggers */
  value?: boolean | null;
  /** Whether this external alarm is disabled */
  isDisabled?: boolean | null;
}

/**
 * Response model for updating an external alarm
 * Indicates success/failure of the update operation
 */
export interface UpdateExternalAlarmResponseDto {
  /** Indicates whether the external alarm was successfully updated */
  success: boolean;
  /** Descriptive message about the operation result */
  message?: string | null;
}

/**
 * Request model for removing an external alarm configuration
 */
export interface RemoveExternalAlarmRequestDto {
  /** Unique identifier of the external alarm to remove */
  id: string; // UUID - REQUIRED
}

/**
 * Response model for removing an external alarm
 * Indicates success/failure of the removal operation
 */
export interface RemoveExternalAlarmResponseDto {
  /** Indicates whether the external alarm was successfully removed */
  success: boolean;
  /** Descriptive message about the operation result */
  message?: string | null;
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
  /** Page number for pagination (1-based index). Defaults to 1 if not provided. */
  page?: number | null;
  /** Number of records per page. Defaults to 100 if not provided. Maximum 1000. */
  pageSize?: number | null;
}

export interface AlarmHistoryResponseDto {
  data: AlarmHistory[];
  /** Current page number (1-based index) */
  page: number;
  /** Number of records per page */
  pageSize: number;
  /** Total number of alarm history entries matching the filter criteria */
  totalCount: number;
  /** Total number of pages available */
  totalPages: number;
}

// ==================== Settings Version DTOs ====================

/**
 * Response DTO containing system settings version information.
 * Used to determine when clients should refresh cached settings data.
 */
export interface SettingsVersionResponseDto {
  /**
   * Global system settings version that changes when system-wide configuration is updated.
   * Example: "1.0.2024.01"
   */
  version?: string | null;
  /**
   * User-specific settings version that changes when that user's settings or permissions are modified.
   * Example: "1.0.2024.01.user123"
   */
  userVersion?: string | null;
}

// ==================== User Management DTOs ====================

/**
 * User information DTO
 */
export interface UserInfoDto {
  /** User ID */
  id?: string | null;
  /** Username */
  userName?: string | null;
  /** First name */
  firstName?: string | null;
  /** Last name */
  lastName?: string | null;
  /** First name in Farsi */
  firstNameFa?: string | null;
  /** Last name in Farsi */
  lastNameFa?: string | null;
  /** User roles */
  roles?: string[] | null;
  /** Whether user account is disabled/locked */
  isDisabled: boolean;
}

/**
 * Role information DTO
 */
export interface RoleInfoDto {
  /** Role ID */
  id?: string | null;
  /** Role name */
  name?: string | null;
  /** Number of users with this role */
  userCount: number;
}

/**
 * Request DTO for getting list of users with optional filtering
 */
export interface GetUsersRequestDto {
  /** Optional search term to filter users by username or name */
  searchTerm?: string | null;
  /** Optional role filter to get users with specific role */
  role?: string | null;
  /** Include disabled/locked users in results (default: true) */
  includeDisabled?: boolean;
  /** Page number for pagination (1-based, default: 1) */
  page?: number;
  /** Page size for pagination (default: 50, max: 500) */
  pageSize?: number;
}

/**
 * Response DTO for getting list of users
 */
export interface GetUsersResponseDto {
  /** Whether the operation was successful */
  success: boolean;
  /** List of users */
  users?: UserInfoDto[] | null;
  /** Total count of users (before pagination) */
  totalCount: number;
  /** Current page number */
  page: number;
  /** Page size */
  pageSize: number;
  /** Total number of pages */
  totalPages: number;
  /** Error message if operation failed */
  errorMessage?: string | null;
}

/**
 * Request DTO for getting a single user by ID
 */
export interface GetUserRequestDto {
  /** User ID to retrieve */
  userId: string;
}

/**
 * Response DTO for getting a single user
 */
export interface GetUserResponseDto {
  /** Whether the operation was successful */
  success: boolean;
  /** User information */
  user?: UserInfoDto | null;
  /** Error message if operation failed */
  errorMessage?: string | null;
}

/**
 * Request DTO for editing a user's information
 */
export interface EditUserRequestDto {
  /** User ID to edit */
  userId: string;
  /** User's first name */
  firstName: string;
  /** User's last name */
  lastName: string;
  /** User's first name in Farsi */
  firstNameFa?: string | null;
  /** User's last name in Farsi */
  lastNameFa?: string | null;
  /** Username (cannot be changed if already exists) */
  userName: string;
}

/**
 * Response DTO for editing a user
 */
export interface EditUserResponseDto {
  /** Whether the operation was successful */
  success: boolean;
  /** Success or error message */
  message?: string | null;
  /** Updated user information */
  user?: UserInfoDto | null;
}

/**
 * Request DTO for deleting a user
 */
export interface DeleteUserRequestDto {
  /** User ID to delete */
  userId: string;
}

/**
 * Response DTO for deleting a user
 */
export interface DeleteUserResponseDto {
  /** Whether the operation was successful */
  success: boolean;
  /** Success or error message */
  message?: string | null;
}

/**
 * Request DTO for updating a user's roles
 */
export interface UpdateUserRolesRequestDto {
  /** User ID to update roles for */
  userId: string;
  /** List of role names to assign to the user (replaces existing roles) */
  roles: string[];
}

/**
 * Response DTO for updating user roles
 */
export interface UpdateUserRolesResponseDto {
  /** Whether the operation was successful */
  success: boolean;
  /** Success or error message */
  message?: string | null;
  /** Updated list of user's roles */
  roles?: string[] | null;
}

/**
 * Request DTO for setting a new password for a user (admin only)
 */
export interface SetUserPasswordRequestDto {
  /** User ID to set password for */
  userId: string;
  /** New password */
  newPassword: string;
}

/**
 * Response DTO for setting user password
 */
export interface SetUserPasswordResponseDto {
  /** Whether the operation was successful */
  success: boolean;
  /** Success or error message */
  message?: string | null;
}

/**
 * Request DTO for resetting user password to default
 */
export interface ResetPasswordRequestDto {
  /** Username of the account to reset password for */
  userName: string;
}

/**
 * Response DTO for resetting user password
 */
export interface ResetPasswordResponseDto {
  /** Indicates whether the password reset operation succeeded */
  isSuccessful: boolean;
  /** Optional human-readable message describing the result */
  message?: string | null;
  /** Optional list of error details when the operation failed */
  errors?: string[] | null;
}

/**
 * Request DTO for toggling user enabled/disabled status
 */
export interface ToggleUserStatusRequestDto {
  /** User ID to toggle status for */
  userId: string;
  /** Whether to disable (true) or enable (false) the user */
  disable: boolean;
}

/**
 * Response DTO for toggling user status
 */
export interface ToggleUserStatusResponseDto {
  /** Whether the operation was successful */
  success: boolean;
  /** Success or error message */
  message?: string | null;
  /** Current user status */
  isDisabled: boolean;
}

/**
 * Response DTO for getting all available roles
 */
export interface GetRolesResponseDto {
  /** Whether the operation was successful */
  success: boolean;
  /** List of available roles */
  roles?: RoleInfoDto[] | null;
  /** Error message if operation failed */
  errorMessage?: string | null;
}

/**
 * Request DTO for registering/creating a new user
 */
export interface RegisterRequestDto {
  /** User's first name */
  firstName: string;
  /** User's last name */
  lastName: string;
  /** User's first name in Farsi */
  firstNameFa: string;
  /** User's last name in Farsi */
  lastNameFa: string;
  /** Username */
  userName: string;
  /** User's password */
  password: string;
  /** Confirm password */
  confirmPassword: string;
}

/**
 * Request DTO for saving user permissions for monitoring items
 */
export interface SavePermissionsRequestDto {
  /** User ID to save permissions for */
  userId?: string | null;
  /** List of monitoring item IDs that the user should have access to */
  itemPermissions?: string[] | null;
}

/**
 * Response DTO for saving permissions
 */
export interface SavePermissionsResponseDto {
  /** Whether the operation was successful */
  isSuccessful: boolean;
}

// ==================== Group Management DTOs ====================

/**
 * Types of errors that can occur when adding a group
 */
export const AddGroupErrorType = {
  None: 0,
  InvalidName: 1,
  DuplicateName: 2,
  ParentNotFound: 3,
} as const;

export type AddGroupErrorType = (typeof AddGroupErrorType)[keyof typeof AddGroupErrorType];

/**
 * Request model for creating a new monitoring group
 */
export interface AddGroupRequestDto {
  /** Name of the monitoring group in English (required, 1-100 characters) */
  name: string;
  /** Name of the monitoring group in Farsi (optional, 1-100 characters) */
  nameFa?: string | null;
  /** ID of the parent group for hierarchical organization. Leave null for root-level groups. */
  parentId?: string | null; // UUID
}

/**
 * Response model for adding a new monitoring group
 */
export interface AddGroupResponseDto {
  /** Indicates whether the group was created successfully */
  success: boolean;
  /** Descriptive message about the operation result */
  message?: string | null;
  /** ID of the newly created group */
  groupId?: string | null; // UUID
  /** Error type if operation failed */
  error?: AddGroupErrorType;
}

export interface EditGroupRequestDto {
  id: string; // UUID
  name?: string | null;
  nameFa?: string | null;
}

export interface EditGroupResponseDto {
  /** Indicates whether the group was updated successfully */
  success: boolean;
  /** Descriptive message about the operation result */
  message?: string | null;
  /** Error type if operation failed */
  error?: number | null;
}

export interface DeleteGroupRequestDto {
  id: string; // UUID
}

export interface DeleteGroupResponseDto {
  success: boolean;
  message?: string | null;
  error?: number | null;
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
  duration?: number | null; // int64 - Duration in seconds for how long the value should persist or be valid
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
  duration?: number | null; // int64 - Duration in seconds for how long the value should persist or be valid
}

export interface WriteOrAddValueResponseDto {
  isSuccess: boolean;
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

/**
 * Request DTO for retrieving audit log entries within a date range
 * Supports pagination with page/pageSize parameters
 */
export interface AuditLogRequestDto {
  /** Optional item ID (GUID format) to filter audit logs for a specific monitoring item. Leave null to get logs for all items. */
  itemId?: string | null;
  /** Start date as Unix timestamp (seconds since epoch) to filter logs from. Must be a positive value. */
  startDate: number; // int64
  /** End date as Unix timestamp (seconds since epoch) to filter logs until. Must be a positive value and >= startDate. */
  endDate: number; // int64
  /** Page number for pagination (1-based index). Defaults to 1 if not provided. */
  page?: number | null;
  /** Number of records per page. Defaults to 50 if not provided. Maximum 500. */
  pageSize?: number | null;
}

/**
 * Response DTO containing paginated audit log entries for system activities
 */
export interface AuditLogResponseDto {
  /** List of audit log entries matching the request criteria */
  data: DataDto[];
  /** Current page number (1-based index) */
  page: number;
  /** Number of records per page */
  pageSize: number;
  /** Total number of audit log entries matching the filter criteria */
  totalCount: number;
  /** Total number of pages available */
  totalPages: number;
}

export interface SettingsVersionResponseDto {
  version?: string | null;
  userVersion?: string | null;
}

// ==================== GetItem/EditItem DTOs ====================

/**
 * Request DTO for retrieving a single monitoring item by ID
 */
export interface GetItemRequestDto {
  /** Unique identifier of the monitoring item to retrieve */
  itemId: string;
}

/**
 * Response DTO containing a single monitoring item with all its properties
 */
export interface GetItemResponseDto {
  /** Indicates whether the operation was successful */
  success: boolean;
  /** Error message if the operation failed */
  errorMessage?: string | null;
  /** The monitoring item data */
  data?: MonitoringItem | null;
}

/**
 * Represents a complete monitoring item with all its properties (same as Item but from GetItem endpoint)
 */
export interface MonitoringItem {
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
  /** Whether to save values on change */
  saveOnChange?: SaveOnChange | null;
  /** The range threshold for triggering save on change (percentage or absolute value) */
  saveOnChangeRange?: number | null;
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
  /** Whether calibration is enabled for this item */
  isCalibrationEnabled?: boolean | null;
  /** Calibration coefficient A (multiplier) in the formula: calibrated_value = A * raw_value + B */
  calibrationA?: number | null;
  /** Calibration coefficient B (offset) in the formula: calibrated_value = A * raw_value + B */
  calibrationB?: number | null;
  /** Interface type for communication */
  interfaceType: InterfaceType;
  /** Whether the current user can edit this item */
  isEditable: boolean;
}

// ==================== Item Creation DTOs ====================

/**
 * Types of errors that can occur during item creation
 */
export const AddItemErrorType = {
  None: 0,
  InvalidPointNumber: 1,
  DuplicatePointNumber: 2,
  ValidationError: 3,
  Unauthorized: 4,
} as const;

export type AddItemErrorType = typeof AddItemErrorType[keyof typeof AddItemErrorType];

/**
 * Request model for adding a new monitoring item
 */
export interface AddItemRequestDto {
  /** Type of monitoring item (digital/analog, input/output) */
  itemType: ItemType;
  /** Display name of the monitoring item (1-200 characters) */
  itemName: string;
  /** Display name of the monitoring item in Farsi (0-200 characters) */
  itemNameFa?: string | null;
  /** Physical point number for controller mapping (0-2147483647, must be unique) */
  pointNumber: number;
  /** Whether to apply scaling to raw values (1=On, 2=Off) */
  shouldScale: ShouldScaleType;
  /** Minimum value of the normalized range (before scaling) */
  normMin: number;
  /** Maximum value of the normalized range (before scaling) */
  normMax: number;
  /** Minimum value of the scaled range (after scaling) */
  scaleMin: number;
  /** Maximum value of the scaled range (after scaling) */
  scaleMax: number;
  /** Interval in seconds for saving current values (0-2147483647) */
  saveInterval: number;
  /** Interval in seconds for saving historical values (0-2147483647) */
  saveHistoricalInterval: number;
  /** Method for calculating values from samples (0=LastValue, 1=Average) */
  calculationMethod: ValueCalculationMethod;
  /** Number of samples to use for value calculation (1-2147483647) */
  numberOfSamples: number;
  /** Whether to save values on change (0=Default, 1=On, 2=Off) */
  saveOnChange?: SaveOnChange | null;
  /** The range threshold for triggering save on change (percentage or absolute value) */
  saveOnChangeRange?: number | null;
  /** Text to display when digital value is ON/true (0-100 characters) */
  onText?: string | null;
  /** Text to display when digital value is ON/true in Farsi (0-100 characters) */
  onTextFa?: string | null;
  /** Text to display when digital value is OFF/false (0-100 characters) */
  offText?: string | null;
  /** Text to display when digital value is OFF/false in Farsi (0-100 characters) */
  offTextFa?: string | null;
  /** Unit of measurement for the value (0-50 characters) */
  unit?: string | null;
  /** Unit of measurement for the value in Farsi (0-50 characters) */
  unitFa?: string | null;
  /** Indicates if the monitoring item is disabled */
  isDisabled: boolean;
  /** Whether calibration is enabled for this item */
  isCalibrationEnabled?: boolean | null;
  /** Calibration coefficient A (multiplier) in the formula: calibrated_value = A * raw_value + B */
  calibrationA?: number | null;
  /** Calibration coefficient B (offset) in the formula: calibrated_value = A * raw_value + B */
  calibrationB?: number | null;
  /** Interface type for communication protocol (0=None, 1=Sharp7, 2=BACnet, 3=Modbus) */
  interfaceType: InterfaceType;
  /** Indicates if the item allows value writes from users */
  isEditable: boolean;
  /** Optional parent group ID to assign the item to a group upon creation */
  parentGroupId?: string | null;
}

/**
 * Response model for adding a new monitoring item
 */
export interface AddItemResponseDto {
  /** Indicates if the add operation was successful */
  success: boolean;
  /** Detailed message about the operation result */
  message?: string | null;
  /** The unique identifier of the newly created monitoring item */
  itemId?: string | null;
  /** Error type if operation failed */
  error?: AddItemErrorType;
}

/**
 * Request DTO for editing a monitoring item's complete configuration
 */
export interface EditItemRequestDto {
  /** Unique identifier of the monitoring item to edit */
  id: string;
  /** Type of monitoring item (digital/analog, input/output) */
  itemType: ItemType;
  /** Display name of the monitoring item (1-200 characters) */
  itemName: string;
  /** Display name of the monitoring item in Farsi (1-200 characters) */
  itemNameFa?: string | null;
  /** Physical point number for controller mapping (0-2147483647) */
  pointNumber: number;
  /** Whether to apply scaling to raw values */
  shouldScale: ShouldScaleType;
  /** Minimum value of the normalized range (before scaling) */
  normMin: number;
  /** Maximum value of the normalized range (before scaling) */
  normMax: number;
  /** Minimum value of the scaled range (after scaling) */
  scaleMin: number;
  /** Maximum value of the scaled range (after scaling) */
  scaleMax: number;
  /** Interval in seconds for saving current values (0-2147483647) */
  saveInterval: number;
  /** Interval in seconds for saving historical values (0-2147483647) */
  saveHistoricalInterval: number;
  /** Method for calculating values from samples */
  calculationMethod: ValueCalculationMethod;
  /** Number of samples to use for value calculation (1-2147483647) */
  numberOfSamples: number;
  /** Whether to save values on change */
  saveOnChange?: SaveOnChange | null;
  /** The range threshold for triggering save on change (percentage or absolute value) */
  saveOnChangeRange?: number | null;
  /** Text to display when digital value is ON/true (0-100 characters) */
  onText?: string | null;
  /** Text to display when digital value is ON/true in Farsi (0-100 characters) */
  onTextFa?: string | null;
  /** Text to display when digital value is OFF/false (0-100 characters) */
  offText?: string | null;
  /** Text to display when digital value is OFF/false in Farsi (0-100 characters) */
  offTextFa?: string | null;
  /** Unit of measurement for the value (0-50 characters) */
  unit?: string | null;
  /** Unit of measurement for the value in Farsi (0-50 characters) */
  unitFa?: string | null;
  /** Indicates if the monitoring item is disabled */
  isDisabled: boolean;
  /** Whether calibration is enabled for this item */
  isCalibrationEnabled?: boolean | null;
  /** Calibration coefficient A (multiplier) in the formula: calibrated_value = A * raw_value + B */
  calibrationA?: number | null;
  /** Calibration coefficient B (offset) in the formula: calibrated_value = A * raw_value + B */
  calibrationB?: number | null;
  /** Interface type for communication protocol (None=0, Sharp7=1, BACnet=2, Modbus=3) */
  interfaceType: InterfaceType;
  /** Whether the current user can send and set value for this point */
  isEditable: boolean;
}

/**
 * Types of errors that can occur during item editing
 */
export const EditItemErrorType = {
  None: 0,
  InvalidPointNumber: 1,
  DuplicatePointNumber: 2,
  ValidationError: 3,
  Unauthorized: 4,
} as const;

export type EditItemErrorType = typeof EditItemErrorType[keyof typeof EditItemErrorType];

/**
 * Response DTO for editing a monitoring item
 */
export interface EditItemResponseDto {
  /** Indicates if the edit operation was successful */
  success: boolean;
  /** Detailed message about the operation result */
  message?: string | null;
  /** Error type if the operation failed */
  error?: EditItemErrorType;
}

// ==================== Push Update ====================

/**
 * Request DTO for triggering a settings update notification to all connected clients
 */
export interface PushUpdateRequestDto {
  /** Optional message describing the update reason for audit logging purposes */
  message?: string | null;
}

/**
 * Response DTO for settings update notification push operation
 */
export interface PushUpdateResponseDto {
  /** Indicates whether the update notification was successfully broadcasted */
  success: boolean;
  /** Descriptive message about the operation result */
  message?: string | null;
  /** Number of connected clients that received the update notification */
  clientsNotified: number;
  /** Timestamp when the notification was sent (Unix timestamp in seconds) */
  timestamp: number;
}
