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

/**
 * ComparisonMode enum for comparison memory groups
 * 1 = Analog (threshold comparison)
 * 2 = Digital (state comparison)
 */
export const ComparisonMode = {
  Analog: 1,
  Digital: 2,
} as const;

/**
 * GroupOperator enum for combining comparison groups
 * 1 = AND
 * 2 = OR
 */
export const GroupOperator = {
  And: 1,
  Or: 2,
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

/** ModbusDataType: 1 = Boolean, 2 = Int, 3 = Float */
export type ModbusDataType = 1 | 2 | 3;

/**
 * ModbusDataType enum values for better code readability
 * Backend uses Boolean=1 (single bit), Int=2 (integer register), Float=3 (floating point) for Modbus protocol
 */
export const ModbusDataTypeEnum = {
  Boolean: 1,
  Int: 2,
  Float: 3,
} as const;

/** RateCalculationMethod: 1 = SimpleDifference, 2 = MovingAverage, 3 = WeightedAverage, 4 = LinearRegression */
export type RateCalculationMethod = 1 | 2 | 3 | 4;

/**
 * RateCalculationMethod enum values for better code readability
 * Backend uses SimpleDifference=1, MovingAverage=2, WeightedAverage=3, LinearRegression=4
 * Used for derivative computation in Rate of Change Memory
 */
export const RateCalculationMethod = {
  /** Simple difference: (current - last) / deltaTime - Fast but sensitive to noise */
  SimpleDifference: 1,
  /** Moving average of derivatives over time window - Reduces noise but introduces lag */
  MovingAverage: 2,
  /** Weighted moving average with exponential decay - Balance between noise reduction and responsiveness */
  WeightedAverage: 3,
  /** Least-squares linear regression over time window - Best for noisy data, requires minimum 5 samples */
  LinearRegression: 4,
} as const;

/** RateTimeUnit: 1 = PerSecond, 60 = PerMinute, 3600 = PerHour */
export type RateTimeUnit = 1 | 60 | 3600;

/**
 * RateTimeUnit enum values for better code readability
 * Value represents multiplier from per-second to target unit
 * Backend uses PerSecond=1, PerMinute=60, PerHour=3600
 */
export const RateTimeUnit = {
  /** Rate per second (multiplier = 1) */
  PerSecond: 1,
  /** Rate per minute (multiplier = 60) */
  PerMinute: 60,
  /** Rate per hour (multiplier = 3600) */
  PerHour: 3600,
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
 * Request DTO for adding a new user
 */
export interface AddUserRequestDto {
  /** Username for the new user */
  userName: string;
  /** User's first name */
  firstName: string;
  /** User's last name */
  lastName: string;
  /** User's first name in Farsi */
  firstNameFa?: string | null;
  /** User's last name in Farsi */
  lastNameFa?: string | null;
  /** Initial password for the user */
  password: string;
}

/**
 * Response DTO for adding a new user
 */
export interface AddUserResponseDto {
  /** Whether the operation was successful */
  success: boolean;
  /** Success or error message */
  message?: string | null;
  /** Created user information */
  user?: UserInfoDto | null;
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
 * Request DTO for setting roles (alias for UpdateUserRolesRequestDto)
 */
export interface SetRolesRequestDto {
  /** User ID to set roles for */
  userId: string;
  /** List of role names to assign to the user (replaces existing roles) */
  roles: string[];
}

/**
 * Response DTO for setting roles (alias for UpdateUserRolesResponseDto)
 */
export interface SetRolesResponseDto {
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
  success: boolean;
  /** Success/error message from the server */
  message: string;
  /** Number of permissions saved */
  permissionsCount: number;
}

/**
 * Request DTO for retrieving user permissions for monitoring items
 */
export interface GetPermissionsRequestDto {
  /** User ID to retrieve permissions for */
  userId?: string | null;
}

/**
 * Response DTO for getting permissions
 */
export interface GetPermissionsResponseDto {
  /** Whether the operation was successful */
  success: boolean;
  /** Response message */
  message?: string | null;
  /** User ID */
  userId?: string | null;
  /** Username */
  userName?: string | null;
  /** List of monitoring item IDs that the user has access to */
  itemIds?: string[] | null;
  /** Total count of permissions */
  totalCount?: number;
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
 * Response model for getting the next available point number
 */
export interface GetNextPointNumberResponseDto {
  /** Indicates if the operation was successful */
  success: boolean;
  /** The next available point number */
  nextPointNumber: number;
  /** Optional message providing additional context */
  message?: string | null;
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

// ==================== Modbus Controller Management DTOs ====================

/** Endianness: 0 = None, 1 = BigEndian, 2 = LittleEndian, 3 = MidBigEndian, 4 = MidLittleEndian */
export type Endianness = 0 | 1 | 2 | 3 | 4;

/**
 * Endianness enum values for byte order in multi-byte Modbus registers
 */
export const EndiannessEnum = {
  None: 0,
  BigEndian: 1,
  LittleEndian: 2,
  MidBigEndian: 3,
  MidLittleEndian: 4,
} as const;

/** ModbusConnectionType: 1 = TCP, 2 = TcpoverRTU */
export type ModbusConnectionType = 1 | 2;

/**
 * ModbusConnectionType enum values
 */
export const ModbusConnectionTypeEnum = {
  TCP: 1,
  TcpoverRTU: 2,
} as const;

/** MyModbusType: 0 = None, 1 = ASCII, 2 = RTU */
export type MyModbusType = 0 | 1 | 2;

/**
 * MyModbusType enum values for Modbus protocol type
 */
export const MyModbusTypeEnum = {
  None: 0,
  ASCII: 1,
  RTU: 2,
} as const;

/** ModbusAddressBase: 0 = Base0, 1 = Base1, 2 = Base40001, 3 = Base40000 */
export type ModbusAddressBase = 0 | 1 | 2 | 3;

/**
 * ModbusAddressBase enum values for register address conventions
 */
export const ModbusAddressBaseEnum = {
  Base0: 0,
  Base1: 1,
  Base40001: 2,
  Base40000: 3,
} as const;

/**
 * Modbus controller configuration
 */
export interface ControllerModbus {
  id: string;
  name: string;
  ipAddress: string;
  port: number;
  startAddress: number;
  dataLength: number;
  dataType: ModbusDataType;
  endianness?: Endianness | null;
  connectionType?: ModbusConnectionType | null;
  modbusType?: MyModbusType | null;
  unitIdentifier?: number | null;
  addressBase?: ModbusAddressBase | null;
  isDisabled: boolean;
}

/**
 * Response DTO for getting Modbus controllers
 */
export interface GetModbusControllersResponseDto {
  data: ControllerModbus[];
}

/**
 * Request DTO for adding a new Modbus controller
 */
export interface AddModbusControllerRequestDto {
  name: string;
  ipAddress: string;
  port: number;
  startAddress: number;
  dataLength: number;
  dataType: number;
  endianness?: number | null;
  connectionType?: number | null;
  modbusType?: number | null;
  unitIdentifier?: number | null;
  addressBase?: number | null;
  isDisabled?: boolean;
}

/**
 * Response DTO for adding a Modbus controller
 */
export interface AddModbusControllerResponseDto {
  isSuccessful: boolean;
  controllerId?: string | null;
  errorMessage?: string | null;
}

/**
 * Request DTO for editing a Modbus controller
 */
export interface EditModbusControllerRequestDto {
  id: string;
  name: string;
  ipAddress: string;
  port: number;
  startAddress: number;
  dataLength: number;
  dataType: number;
  endianness?: number | null;
  connectionType?: number | null;
  modbusType?: number | null;
  unitIdentifier?: number | null;
  addressBase?: number | null;
  isDisabled?: boolean;
}

/**
 * Response DTO for editing a Modbus controller
 */
export interface EditModbusControllerResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
}

/**
 * Request DTO for deleting a Modbus controller
 */
export interface DeleteModbusControllerRequestDto {
  id: string;
}

/** DeleteModbusControllerErrorType: 1 = HasMappings, 2 = NotFound */
export type DeleteModbusControllerErrorType = 1 | 2;

export const DeleteModbusControllerErrorTypeEnum = {
  HasMappings: 1,
  NotFound: 2,
} as const;

/**
 * Response DTO for deleting a Modbus controller
 */
export interface DeleteModbusControllerResponseDto {
  isSuccessful: boolean;
  error?: DeleteModbusControllerErrorType | null;
  errorMessage?: string | null;
}

/**
 * Modbus mapping between controller register and monitoring item
 */
export interface MapModbus {
  id: string;
  controllerId: string;
  position: number;
  itemId: string;
  operationType?: IoOperationType | null;
}

/**
 * Request DTO for getting Modbus mappings
 */
export interface GetModbusMapsRequestDto {
  controllerId: string;
}

/**
 * Response DTO for getting Modbus mappings
 */
export interface GetModbusMapsResponseDto {
  data: MapModbus[];
}

/**
 * Modbus map item for batch operations
 */
export interface ModbusMapItem {
  id?: string | null;
  position: number;
  itemId: string;
  operationType?: number | null;
}

/**
 * Request DTO for batch editing Modbus mappings
 */
export interface BatchEditModbusMapsRequestDto {
  controllerId: string;
  changed: ModbusMapItem[];
  added: ModbusMapItem[];
  removed: string[];
}

/**
 * Response DTO for batch editing Modbus mappings
 */
export interface BatchEditModbusMapsResponseDto {
  isSuccessful: boolean;
  addedCount: number;
  changedCount: number;
  removedCount: number;
  errorMessage?: string | null;
}

/**
 * Request DTO for getting Modbus mappings by item ID
 */
export interface GetModbusMappingsByItemIdRequestDto {
  itemId: string;
}

/**
 * Modbus mapping with controller details (for item-centric view)
 */
export interface MapModbusWithController {
  id: string;
  controllerId: string;
  controllerName: string;
  ipAddress: string;
  port: number;
  position: number;
  itemId: string;
  operationType?: IoOperationType | null;
}

/**
 * Response DTO for getting Modbus mappings by item ID
 */
export interface GetModbusMappingsByItemIdResponseDto {
  data: MapModbusWithController[];
}

// ==================== Sharp7 API Types ====================

/**
 * Sharp7 controller configuration
 */
export interface ControllerSharp7 {
  id: string;
  name: string;
  ipAddress: string;
  dbAddress: number;
  dbStartData: number;
  dbSizeData: number;
  dataType: DataType;
  isDisabled: boolean;
  username?: string | null;
  password?: string | null;
}

/**
 * Response DTO for getting Sharp7 controllers
 */
export interface GetSharp7ControllersResponseDto {
  data: ControllerSharp7[];
}

/**
 * Request DTO for adding a new Sharp7 controller
 */
export interface AddSharp7ControllerRequestDto {
  name: string;
  ipAddress: string;
  dbAddress: number;
  dbStartData: number;
  dbSizeData: number;
  dataType: number;
  isDisabled?: boolean;
  username?: string | null;
  password?: string | null;
}

/**
 * Response DTO for adding a Sharp7 controller
 */
export interface AddSharp7ControllerResponseDto {
  isSuccessful: boolean;
  controllerId?: string | null;
  errorMessage?: string | null;
}

/**
 * Request DTO for editing a Sharp7 controller
 */
export interface EditSharp7ControllerRequestDto {
  id: string;
  name: string;
  ipAddress: string;
  dbAddress: number;
  dbStartData: number;
  dbSizeData: number;
  dataType: number;
  isDisabled?: boolean;
  username?: string | null;
  password?: string | null;
}

/**
 * Response DTO for editing a Sharp7 controller
 */
export interface EditSharp7ControllerResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
}

/**
 * Request DTO for deleting a Sharp7 controller
 */
export interface DeleteSharp7ControllerRequestDto {
  id: string;
}

/**
 * Response DTO for deleting a Sharp7 controller
 */
export interface DeleteSharp7ControllerResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
}

/**
 * Sharp7 mapping between controller data block and monitoring item
 */
export interface MapSharp7 {
  id: string;
  controllerId: string;
  position: number;
  bit?: number | null;
  itemId: string;
  operationType?: IoOperationType | null;
}

/**
 * Request DTO for getting Sharp7 mappings
 */
export interface GetSharp7MapsRequestDto {
  controllerId: string;
}

/**
 * Response DTO for getting Sharp7 mappings
 */
export interface GetSharp7MapsResponseDto {
  data: MapSharp7[];
}

/**
 * Sharp7 map item for batch operations
 */
export interface Sharp7MapItem {
  id?: string | null;
  position: number;
  bit?: number | null;
  itemId: string;
  operationType?: number | null;
}

/**
 * Request DTO for batch editing Sharp7 mappings
 */
export interface BatchEditSharp7MapsRequestDto {
  controllerId: string;
  changed: Sharp7MapItem[];
  added: Sharp7MapItem[];
  removed: string[];
}

/**
 * Response DTO for batch editing Sharp7 mappings
 */
export interface BatchEditSharp7MapsResponseDto {
  isSuccessful: boolean;
  addedCount: number;
  changedCount: number;
  removedCount: number;
  errorMessage?: string | null;
}

/**
 * Sharp7 mapping with controller details (for item-centric view)
 */
export interface MapSharp7WithController {
  id: string;
  controllerId: string;
  controllerName: string;
  ipAddress: string;
  dbAddress: number;
  dbStartData: number;
  dbSizeData: number;
  dataType: DataType;
  position: number;
  bit?: number | null;
  itemId: string;
  operationType?: IoOperationType | null;
}

/**
 * Request DTO for getting Sharp7 mappings by item ID
 */
export interface GetSharp7MappingsByItemIdRequestDto {
  itemId: string;
}

/**
 * Response DTO for getting Sharp7 mappings by item ID
 */
export interface GetSharp7MappingsByItemIdResponseDto {
  data: MapSharp7WithController[];
}

// ==================== Statistics API Types ====================

/**
 * Request DTO for point statistics by date range
 */
export interface PointStatsByDateRequestDto {
  itemId: string; // Item identifier
  startDate: number; // Start time as Unix seconds since epoch (UTC) (int64)
  endDate: number; // End time as Unix seconds since epoch (UTC) (int64)
  calendar?: 'jalali' | 'gregorian'; // Calendar to use for grouping daily results
}

/**
 * Daily mean value result
 */
export interface DailyMeanValue {
  date: string; // Date string in requested calendar (e.g., Jalali 1404/09/16 or Gregorian 2025/12/08)
  value: number; // Mean value for this date
  count: number; // Number of data points
}

/**
 * Response DTO for PointMeanByDate
 */
export interface PointMeanByDateResponseDto {
  success: boolean;
  dailyValues: DailyMeanValue[];
  errorMessage: string | null;
  itemId: string;
}

/**
 * Daily minimum value result
 */
export interface DailyMinValue {
  date: string;
  value: number;
  count: number;
}

/**
 * Response DTO for PointMinByDate
 */
export interface PointMinByDateResponseDto {
  success: boolean;
  dailyValues: DailyMinValue[];
  errorMessage: string | null;
  itemId: string;
}

/**
 * Daily maximum value result
 */
export interface DailyMaxValue {
  date: string;
  value: number;
  count: number;
}

/**
 * Response DTO for PointMaxByDate
 */
export interface PointMaxByDateResponseDto {
  success: boolean;
  dailyValues: DailyMaxValue[];
  errorMessage: string | null;
  itemId: string;
}

/**
 * Daily standard deviation value result
 */
export interface DailyStdValue {
  date: string;
  value: number;
  count: number;
}

/**
 * Response DTO for PointStdByDate
 */
export interface PointStdByDateResponseDto {
  success: boolean;
  dailyValues: DailyStdValue[];
  errorMessage: string | null;
  itemId: string;
}

/**
 * Daily count value result
 */
export interface DailyCountValue {
  date: string;
  count: number;
}

/**
 * Response DTO for PointCountByDate
 */
export interface PointCountByDateResponseDto {
  success: boolean;
  dailyCounts: DailyCountValue[]; // Note: property name is dailyCounts, not dailyValues
  errorMessage: string | null;
  itemId: string;
}

/**
 * Request DTO for last 24 hours statistics
 */
export interface PointStatsLast24HoursRequestDto {
  itemId: string; // Item identifier
}

/**
 * Response DTO for PointMean (last 24 hours)
 */
export interface PointMeanResponseDto {
  mean: number | null; // Mean value or null if no data
}

/**
 * Response DTO for PointMin (last 24 hours)
 */
export interface PointMinResponseDto {
  min: number | null; // Minimum value or null if no data
}

/**
 * Response DTO for PointMax (last 24 hours)
 */
export interface PointMaxResponseDto {
  max: number | null; // Maximum value or null if no data
}

/**
 * Response DTO for PointStd (last 24 hours)
 */
export interface PointStdResponseDto {
  std: number | null; // Standard deviation or null if insufficient data
}

/**
 * Response DTO for PointCount (last 24 hours)
 */
export interface PointCountResponseDto {
  count: number; // Total number of data points
}

/**
 * Request DTO for CalculateStateDuration
 */
export interface CalculateStateDurationRequestDto {
  itemId: string; // Item identifier (digital point only)
  startDate: number; // Start time as Unix seconds since epoch (UTC) (int64)
  endDate: number; // End time as Unix seconds since epoch (UTC) (int64)
  value: string; // The digital value to calculate duration for ("0" or "1")
}

/**
 * Response DTO for CalculateStateDuration
 */
export interface CalculateStateDurationResponseDto {
  success: boolean; // Indicates whether the operation was successful
  error: string | null; // Error message if the operation failed
  matchedValue: string; // The value that was matched ("0" or "1")
  totalDurationSeconds: number; // Total duration in seconds that the point held the specified value (int64)
  formattedDuration: string; // Human-readable formatted duration string (e.g., "2h 15m 30s")
  stateChangeCount: number; // Number of state changes found in the time range (int32)
  usedLastKnownState: boolean; // Indicates whether the last known state before the start date was used
}

// ==================== Modbus Gateway Types ====================

/** ModbusRegisterType: Coil=1, DiscreteInput=2, HoldingRegister=3, InputRegister=4 */
export type ModbusRegisterType = 1 | 2 | 3 | 4;

/**
 * ModbusRegisterType enum values for better code readability
 */
export const ModbusRegisterTypeEnum = {
  Coil: 1,
  DiscreteInput: 2,
  HoldingRegister: 3,
  InputRegister: 4,
} as const;

/** ModbusDataRepresentation: Int16=1, Float32=2, ScaledInteger=3 */
export type ModbusDataRepresentation = 1 | 2 | 3;

/**
 * ModbusDataRepresentation enum values for better code readability
 */
export const ModbusDataRepresentationEnum = {
  Int16: 1,
  Float32: 2,
  ScaledInteger: 3,
} as const;

/** Endianness: None=0, BigEndian=1, LittleEndian=2, MidBigEndian=3, MidLittleEndian=4 */
export type EndiannessType = 0 | 1 | 2 | 3 | 4;

/**
 * Endianness enum values for better code readability
 */
export const EndiannessTypeEnum = {
  None: 0,
  BigEndian: 1,
  LittleEndian: 2,
  MidBigEndian: 3,
  MidLittleEndian: 4,
} as const;

/**
 * Modbus Gateway configuration with status
 */
export interface ModbusGatewayConfig {
  /** Unique identifier for the gateway */
  id: string;
  /** Display name of the gateway */
  name: string;
  /** IP address to listen on */
  listenIP: string;
  /** TCP port to listen on */
  port: number;
  /** Modbus unit/slave identifier (1-247) */
  unitId: number;
  /** Whether the gateway is enabled */
  isEnabled: boolean;
  /** Number of currently connected clients */
  connectedClients: number;
  /** Timestamp of the last read request */
  lastReadTime: string | null;
  /** Timestamp of the last write request */
  lastWriteTime: string | null;
  /** Number of mappings configured */
  mappingCount: number;
  /** Number of Coil (0x) mappings */
  coilCount: number;
  /** Number of Discrete Input (1x) mappings */
  discreteInputCount: number;
  /** Number of Holding Register (4x) mappings */
  holdingRegisterCount: number;
  /** Number of Input Register (3x) mappings */
  inputRegisterCount: number;
}

/**
 * Response DTO for getting all Modbus gateways
 */
export interface GetModbusGatewaysResponseDto {
  data: ModbusGatewayConfig[];
}

/**
 * Request DTO for adding a new Modbus gateway
 */
export interface AddModbusGatewayRequestDto {
  name: string;
  listenIP: string;
  port: number;
  unitId: number;
  isEnabled: boolean;
}

/**
 * Response DTO for adding a Modbus gateway
 */
export interface AddModbusGatewayResponseDto {
  isSuccessful: boolean;
  gatewayId: string | null;
  validationErrors: GatewayValidationError[];
}

/**
 * Gateway validation error
 */
export interface GatewayValidationError {
  field: string;
  errorCode: string;
  message: string;
}

/**
 * Request DTO for editing a Modbus gateway
 */
export interface EditModbusGatewayRequestDto {
  id: string;
  name: string;
  listenIP: string;
  port: number;
  unitId: number;
  isEnabled: boolean;
}

/**
 * Response DTO for editing a Modbus gateway
 */
export interface EditModbusGatewayResponseDto {
  isSuccessful: boolean;
  validationErrors: GatewayValidationError[];
}

/**
 * Request DTO for deleting a Modbus gateway
 */
export interface DeleteModbusGatewayRequestDto {
  id: string;
}

/**
 * Response DTO for deleting a Modbus gateway
 */
export interface DeleteModbusGatewayResponseDto {
  isSuccessful: boolean;
  errorMessage: string | null;
}

/**
 * Request DTO for getting gateway mappings
 */
export interface GetModbusGatewayMappingsRequestDto {
  gatewayId: string;
}

/**
 * Modbus gateway mapping with item details
 */
export interface ModbusGatewayMapping {
  id: string;
  gatewayId: string;
  modbusAddress: number;
  registerType: ModbusRegisterType;
  itemId: string;
  itemName: string | null;
  itemNameFa: string | null;
  isEditable: boolean;
  registerCount: number;
  dataRepresentation: ModbusDataRepresentation;
  endianness: EndiannessType;
  scaleMin: number | null;
  scaleMax: number | null;
}

/**
 * Response DTO for getting gateway mappings
 */
export interface GetModbusGatewayMappingsResponseDto {
  isSuccessful: boolean;
  errorMessage: string | null;
  mappings: ModbusGatewayMapping[];
}

/**
 * Mapping edit DTO (for add/update operations)
 */
export interface ModbusGatewayMappingEdit {
  id?: string | null;
  modbusAddress: number;
  registerType: ModbusRegisterType;
  itemId: string;
  dataRepresentation: ModbusDataRepresentation;
  endianness: EndiannessType;
  scaleMin?: number | null;
  scaleMax?: number | null;
}

/**
 * Request DTO for batch editing gateway mappings
 */
export interface BatchEditModbusGatewayMappingsRequestDto {
  gatewayId: string;
  added: ModbusGatewayMappingEdit[];
  updated: ModbusGatewayMappingEdit[];
  removedIds: string[];
}

/**
 * Response DTO for batch editing gateway mappings
 */
export interface BatchEditModbusGatewayMappingsResponseDto {
  isSuccessful: boolean;
  validationErrors: GatewayValidationError[];
  addedCount: number;
  updatedCount: number;
  removedCount: number;
}

/**
 * Gateway status update from SignalR
 */
export interface GatewayStatusUpdate {
  gatewayId: string;
  name: string;
  connectedClients: number;
  lastReadTime: string | null;
  lastWriteTime: string | null;
}

// ==================== Timeout Memory DTOs ====================

/**
 * Timeout Memory configuration
 */
export interface TimeoutMemory {
  id: string; // UUID
  inputItemId: string; // UUID - Item to watch for timeout (can be any ItemType)
  outputItemId: string; // UUID - Item to write timeout status (must be DigitalOutput)
  timeout: number; // int64 - Timeout duration in seconds
}

/**
 * Request DTO for retrieving timeout memory configurations
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GetTimeoutMemoriesRequestDto {
  // Empty - no filtering parameters needed currently
}

/**
 * Response DTO containing list of timeout memory configurations
 */
export interface GetTimeoutMemoriesResponseDto {
  timeoutMemories: TimeoutMemory[];
}

/**
 * Request DTO for creating a new timeout memory configuration
 */
export interface AddTimeoutMemoryRequestDto {
  inputItemId: string; // UUID
  outputItemId: string; // UUID
  timeout: number; // int64 - must be > 0
}

/**
 * Response DTO for adding a new timeout memory configuration
 */
export interface AddTimeoutMemoryResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
  id?: string | null; // UUID of newly created timeout memory
}

/**
 * Request DTO for editing an existing timeout memory configuration
 */
export interface EditTimeoutMemoryRequestDto {
  id: string; // UUID
  inputItemId: string; // UUID
  outputItemId: string; // UUID
  timeout: number; // int64 - must be > 0
}

/**
 * Response DTO for editing a timeout memory configuration
 */
export interface EditTimeoutMemoryResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
}

/**
 * Request DTO for deleting a timeout memory configuration
 */
export interface DeleteTimeoutMemoryRequestDto {
  id: string; // UUID
}

/**
 * Response DTO for deleting a timeout memory configuration
 */
export interface DeleteTimeoutMemoryResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
}

// ==================== Write Action Memory DTOs ====================

export interface WriteActionMemory {
  id: string; // UUID
  name?: string | null; // Optional name for the write action memory
  outputItemId: string; // UUID - Item to write values (must be DigitalOutput or AnalogOutput)
  outputValue?: string | null; // Static value to write (used when outputValueSourceItemId is null)
  outputValueSourceItemId?: string | null; // UUID - Item to read dynamic value from (used when outputValue is null)
  duration: number; // int64 - Duration parameter for WriteOrAddValue (must be >= 0)
  isDisabled: boolean; // Whether this write action memory is disabled
}

/**
 * Request DTO for retrieving write action memory configurations
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GetWriteActionMemoriesRequestDto {
  // Empty - no filtering parameters needed currently
}

/**
 * Response DTO containing list of write action memory configurations
 */
export interface GetWriteActionMemoriesResponseDto {
  writeActionMemories: WriteActionMemory[];
}

/**
 * Request DTO for creating a new write action memory configuration
 */
export interface AddWriteActionMemoryRequestDto {
  name?: string | null;
  outputItemId: string; // UUID
  outputValue?: string | null; // Either this or outputValueSourceItemId must be provided
  outputValueSourceItemId?: string | null; // Either this or outputValue must be provided
  duration: number; // int64 - must be >= 0
  isDisabled: boolean;
}

/**
 * Response DTO for adding a new write action memory configuration
 */
export interface AddWriteActionMemoryResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
  id?: string | null; // UUID of newly created write action memory
}

/**
 * Request DTO for editing an existing write action memory configuration
 */
export interface EditWriteActionMemoryRequestDto {
  id: string; // UUID
  name?: string | null;
  outputItemId: string; // UUID
  outputValue?: string | null;
  outputValueSourceItemId?: string | null;
  duration: number; // int64 - must be >= 0
  isDisabled: boolean;
}

/**
 * Response DTO for editing a write action memory configuration
 */
export interface EditWriteActionMemoryResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
}

/**
 * Request DTO for deleting a write action memory configuration
 */
export interface DeleteWriteActionMemoryRequestDto {
  id: string; // UUID
}

/**
 * Response DTO for deleting a write action memory configuration
 */
export interface DeleteWriteActionMemoryResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
}

// ==================== Average Memory DTOs ====================

/**
 * Moving average type for Average Memory
 */
export const MovingAverageType = {
  Simple: 0, // Simple Moving Average (SMA)
  Exponential: 1, // Exponential Moving Average (EMA)
  Weighted: 2, // Weighted Moving Average (WMA)
} as const;
export type MovingAverageType = (typeof MovingAverageType)[keyof typeof MovingAverageType];

/**
 * Outlier detection method for Average Memory
 */
export const OutlierMethod = {
  None: 0,
  IQR: 1,
  ZScore: 2,
} as const;
export type OutlierMethod = (typeof OutlierMethod)[keyof typeof OutlierMethod];

/**
 * Average Memory configuration
 * Supports both multi-input averaging and time-based moving average (SMA/EMA/WMA)
 */
export interface AverageMemory {
  id: string; // UUID
  name?: string | null;
  inputItemIds: string; // JSON array of UUIDs - ["guid1", "guid2", ...]
  outputItemId: string; // UUID - Must be AnalogInput or AnalogOutput
  interval: number; // Processing interval in seconds
  isDisabled: boolean;
  weights?: string | null; // Optional JSON array of weights - [1.0, 2.0, ...]
  ignoreStale: boolean; // Whether to ignore stale inputs
  staleTimeout: number; // int64 - Maximum age for input in seconds
  enableOutlierDetection: boolean; // Whether outlier detection is enabled
  outlierMethod: OutlierMethod; // IQR or ZScore
  outlierThreshold: number; // Threshold for outlier detection
  minimumInputs: number; // Minimum valid inputs required
  // Moving Average fields (used when single input)
  averageType: MovingAverageType; // SMA, EMA, or WMA
  windowSize: number; // Number of samples for moving average (2-1000)
  alpha: number; // Smoothing factor for EMA (0.01-1.0)
  useLinearWeights: boolean; // Whether to use linear weights for WMA
}

/**
 * Request DTO for retrieving average memory configurations
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GetAverageMemoriesRequestDto {
  // Empty - no filtering parameters needed currently
}

/**
 * Response DTO containing list of average memory configurations
 */
export interface GetAverageMemoriesResponseDto {
  averageMemories: AverageMemory[];
}

/**
 * Request DTO for creating a new average memory configuration
 */
export interface AddAverageMemoryRequestDto {
  name?: string | null;
  inputItemIds: string; // JSON array - ["guid1", "guid2", ...]
  outputItemId: string; // UUID
  interval: number; // Must be > 0
  isDisabled?: boolean;
  weights?: string | null; // Optional JSON array
  ignoreStale?: boolean;
  staleTimeout?: number; // int64
  enableOutlierDetection?: boolean;
  outlierMethod?: OutlierMethod;
  outlierThreshold?: number;
  minimumInputs?: number;
  // Moving Average fields
  averageType?: MovingAverageType; // Default: Simple (0)
  windowSize?: number; // Default: 10, range 2-1000
  alpha?: number; // Default: 0.2, range 0.01-1.0
  useLinearWeights?: boolean; // Default: true
}

/**
 * Response DTO for adding a new average memory configuration
 */
export interface AddAverageMemoryResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
  id?: string | null; // UUID of newly created average memory
}

/**
 * Request DTO for editing an existing average memory configuration
 */
export interface EditAverageMemoryRequestDto {
  id: string; // UUID
  name?: string | null;
  inputItemIds: string; // JSON array
  outputItemId: string; // UUID
  interval: number; // Must be > 0
  isDisabled?: boolean;
  weights?: string | null;
  ignoreStale?: boolean;
  staleTimeout?: number; // int64
  enableOutlierDetection?: boolean;
  outlierMethod?: OutlierMethod;
  outlierThreshold?: number;
  minimumInputs?: number;
  // Moving Average fields
  averageType?: MovingAverageType; // SMA, EMA, or WMA
  windowSize?: number; // Range 2-1000
  alpha?: number; // Range 0.01-1.0
  useLinearWeights?: boolean;
}

/**
 * Response DTO for editing an average memory configuration
 */
export interface EditAverageMemoryResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
}

/**
 * Request DTO for deleting an average memory configuration
 */
export interface DeleteAverageMemoryRequestDto {
  id: string; // UUID
}

/**
 * Response DTO for deleting an average memory configuration
 */
export interface DeleteAverageMemoryResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
}

// ==================== PID Memory DTOs ====================

/**
 * PID Memory configuration
 */
export interface PIDMemory {
  id: string; // UUID
  name?: string | null;
  inputItemId: string; // UUID - Process Variable (must be AnalogInput)
  outputItemId: string; // UUID - Control Output (must be AnalogOutput)
  kp: number; // double - Proportional gain
  ki: number; // double - Integral gain
  kd: number; // double - Derivative gain
  outputMin: number; // double - Minimum output value
  outputMax: number; // double - Maximum output value
  interval: number; // int - Execution interval in seconds
  isDisabled: boolean; // bool - Whether PID is disabled
  setPoint?: number | null; // double - Static setpoint value
  setPointId?: string | null; // UUID - Dynamic setpoint item (AnalogInput/AnalogOutput)
  derivativeFilterAlpha: number; // double - Derivative filter alpha (0-1)
  maxOutputSlewRate: number; // double - Maximum output slew rate
  deadZone: number; // double - Dead zone around setpoint
  feedForward: number; // double - Feed-forward term
  isAuto: boolean; // bool - Static auto/manual mode
  isAutoId?: string | null; // UUID - Dynamic auto/manual item (DigitalInput/DigitalOutput)
  manualValue?: number | null; // double - Static manual mode value
  manualValueId?: string | null; // UUID - Dynamic manual value item (AnalogInput/AnalogOutput)
  reverseOutput: boolean; // bool - Static reverse output flag
  reverseOutputId?: string | null; // UUID - Dynamic reverse output item (DigitalInput/DigitalOutput)
  digitalOutputItemId?: string | null; // UUID - Digital output for hysteresis control (DigitalOutput)
  hysteresisHighThreshold: number; // double - High threshold for hysteresis (turn ON)
  hysteresisLowThreshold: number; // double - Low threshold for hysteresis (turn OFF)
  parentPIDId?: string | null; // UUID - Parent PID for cascaded control
  cascadeLevel: number; // int - Cascade level (0=standalone, 1=outer, 2=inner)
}

// ==================== PID Auto-Tuning ====================

/**
 * Status of a PID auto-tuning session
 */
export type TuningStatus = 0 | 1 | 2 | 3 | 4 | 5 | 6;
// Idle = 0, Initializing = 1, RelayTest = 2, AnalyzingData = 3, Completed = 4, Aborted = 5, Failed = 6

/**
 * PID Tuning Session data
 */
export interface PIDTuningSession {
  id: string;
  pidMemoryId: string;
  startTime: string;
  endTime?: string;
  status: TuningStatus;
  errorMessage?: string;
  relayAmplitude: number;
  relayHysteresis: number;
  minCycles: number;
  maxCycles: number;
  maxAmplitude: number;
  timeout: number;
  ultimatePeriod?: number;
  oscillationAmplitude?: number;
  criticalGain?: number;
  calculatedKp?: number;
  calculatedKi?: number;
  calculatedKd?: number;
  originalKp: number;
  originalKi: number;
  originalKd: number;
  confidenceScore?: number;
  notes?: string;
}

export interface StartPIDTuningRequestDto {
  pidMemoryId: string;
  relayAmplitude?: number;
  relayHysteresis?: number;
  minCycles?: number;
  maxCycles?: number;
  maxAmplitude?: number;
  timeout?: number;
}

export interface StartPIDTuningResponseDto {
  isSuccessful: boolean;
  errorMessage?: string;
}

export interface GetPIDTuningStatusRequestDto {
  pidMemoryId: string;
}

export interface GetPIDTuningStatusResponseDto {
  isSuccessful: boolean;
  session?: PIDTuningSession;
  errorMessage?: string;
}

export interface AbortPIDTuningRequestDto {
  pidMemoryId: string;
}

export interface AbortPIDTuningResponseDto {
  isSuccessful: boolean;
  errorMessage?: string;
}

export interface ApplyTunedParametersRequestDto {
  sessionId: string;
  applyKp?: boolean;
  applyKi?: boolean;
  applyKd?: boolean;
}

export interface ApplyTunedParametersResponseDto {
  isSuccessful: boolean;
  errorMessage?: string;
}

/**
 * PID Memory with enhanced item details
 */
export interface PIDMemoryWithItems extends PIDMemory {
  inputItemName?: string;
  inputItemNameFa?: string;
  inputItemType?: ItemType;
  outputItemName?: string;
  outputItemNameFa?: string;
  outputItemType?: ItemType;
  setPointItemName?: string;
  setPointItemNameFa?: string;
  setPointItemType?: ItemType;
  isAutoItemName?: string;
  isAutoItemNameFa?: string;
  isAutoItemType?: ItemType;
  manualValueItemName?: string;
  manualValueItemNameFa?: string;
  manualValueItemType?: ItemType;
  reverseOutputItemName?: string;
  reverseOutputItemNameFa?: string;
  reverseOutputItemType?: ItemType;
  digitalOutputItemName?: string;
  digitalOutputItemNameFa?: string;
  digitalOutputItemType?: ItemType;
  parentPIDName?: string; // Name of parent PID
}

// ==================== Totalizer Memory ====================

/**
 * Accumulation types for totalizer memory
 */
export const AccumulationType = {
  RateIntegration: 1,
  EventCountRising: 2,
  EventCountFalling: 3,
  EventCountBoth: 4,
} as const;
export type AccumulationType = (typeof AccumulationType)[keyof typeof AccumulationType];

/**
 * Totalizer Memory interface
 */
export interface TotalizerMemory {
  id: string; // UUID
  name?: string | null;
  inputItemId: string; // UUID - AnalogInput for rate, DigitalInput for events
  outputItemId: string; // UUID - AnalogOutput for accumulated value
  interval: number; // int - Execution interval in seconds
  isDisabled: boolean; // bool - Whether totalizer is disabled
  accumulationType: AccumulationType; // Accumulation type
  resetOnOverflow: boolean; // bool - Auto-reset on overflow
  overflowThreshold?: number | null; // double - Overflow threshold
  manualResetEnabled: boolean; // bool - Allow manual reset
  scheduledResetEnabled: boolean; // bool - Enable scheduled reset
  resetCron?: string | null; // Cron expression for scheduled reset
  lastResetTime?: string | null; // DateTime - Last reset timestamp
  accumulatedValue: number; // double - Current accumulated value
  lastInputValue?: number | null; // double - Last input for trapezoidal
  lastEventState?: boolean | null; // bool - Last state for edge detection
  units?: string | null; // Display units (kWh, m³, hours, count)
  decimalPlaces: number; // int - Decimal places for formatting
}

/**
 * Enhanced Totalizer Memory with item details
 */
export interface TotalizerMemoryWithItems extends TotalizerMemory {
  inputItemName?: string;
  inputItemNameFa?: string;
  inputItemType?: ItemType;
  outputItemName?: string;
  outputItemNameFa?: string;
  outputItemType?: ItemType;
}

/**
 * Request DTO for retrieving PID memory configurations
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GetPIDMemoriesRequestDto {
  // Empty - no filtering parameters needed currently
}

/**
 * Response DTO containing list of PID memory configurations
 */
export interface GetPIDMemoriesResponseDto {
  pidMemories: PIDMemory[];
}

/**
 * Request DTO for creating a new PID memory configuration
 */
export interface AddPIDMemoryRequestDto {
  name?: string | null;
  inputItemId: string; // UUID
  outputItemId: string; // UUID
  kp: number; // double
  ki: number; // double
  kd: number; // double
  outputMin: number; // double
  outputMax: number; // double
  interval: number; // int - must be > 0
  isDisabled: boolean; // bool
  setPoint?: number | null; // double
  setPointId?: string | null; // UUID
  derivativeFilterAlpha: number; // double (0-1)
  maxOutputSlewRate: number; // double
  deadZone: number; // double
  feedForward: number; // double
  isAuto: boolean; // bool
  isAutoId?: string | null; // UUID
  manualValue?: number | null; // double
  manualValueId?: string | null; // UUID
  reverseOutput: boolean; // bool
  reverseOutputId?: string | null; // UUID
  digitalOutputItemId?: string | null; // UUID - Digital output for hysteresis control
  hysteresisHighThreshold: number; // double - High threshold (default 75.0)
  hysteresisLowThreshold: number; // double - Low threshold (default 25.0)
  parentPIDId?: string | null; // UUID - Parent PID for cascaded control
  cascadeLevel: number; // int - Cascade level (0=standalone, 1=outer, 2=inner)
}

/**
 * Response DTO for adding a new PID memory configuration
 */
export interface AddPIDMemoryResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
  id?: string | null; // UUID of newly created PID memory
}

/**
 * Request DTO for editing an existing PID memory configuration
 */
export interface EditPIDMemoryRequestDto {
  id: string; // UUID
  name?: string | null;
  inputItemId: string; // UUID
  outputItemId: string; // UUID
  kp: number; // double
  ki: number; // double
  kd: number; // double
  outputMin: number; // double
  outputMax: number; // double
  interval: number; // int - must be > 0
  isDisabled: boolean; // bool
  setPoint?: number | null; // double
  setPointId?: string | null; // UUID
  derivativeFilterAlpha: number; // double (0-1)
  maxOutputSlewRate: number; // double
  deadZone: number; // double
  feedForward: number; // double
  isAuto: boolean; // bool
  isAutoId?: string | null; // UUID
  manualValue?: number | null; // double
  manualValueId?: string | null; // UUID
  reverseOutput: boolean; // bool
  reverseOutputId?: string | null; // UUID
  digitalOutputItemId?: string | null; // UUID - Digital output for hysteresis control
  hysteresisHighThreshold: number; // double - High threshold
  hysteresisLowThreshold: number; // double - Low threshold
  parentPIDId?: string | null; // UUID - Parent PID for cascaded control
  cascadeLevel: number; // int - Cascade level (0=standalone, 1=outer, 2=inner)
}

/**
 * Response DTO for editing a PID memory configuration
 */
export interface EditPIDMemoryResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
}

/**
 * Request DTO for deleting a PID memory configuration
 */
export interface DeletePIDMemoryRequestDto {
  id: string; // UUID
}

/**
 * Response DTO for deleting a PID memory configuration
 */
export interface DeletePIDMemoryResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
}

/**
 * Request DTO for getting potential parent PIDs for cascade control
 */
export interface GetPotentialParentPIDsRequestDto {
  currentPidId?: string | null; // UUID - Current PID ID (to exclude self)
  desiredCascadeLevel: number; // int - Desired cascade level (1 or 2)
}

/**
 * Response DTO containing list of potential parent PIDs
 */
export interface GetPotentialParentPIDsResponseDto {
  potentialParents: PotentialParentPID[];
}

/**
 * Potential parent PID for cascade control
 */
export interface PotentialParentPID {
  id: string; // UUID
  name?: string | null;
  outputItemId: string; // UUID - Output item (will become setpoint for child)
  cascadeLevel: number; // int - Cascade level of this PID
  isDisabled: boolean; // bool
}

// ============================================================================
// Statistical Memory Types
// ============================================================================

/**
 * Window type for statistical calculations
 * - Rolling: Sliding window that always maintains WindowSize samples
 * - Tumbling: Batch window that resets after WindowSize samples are collected
 */
export const StatisticalWindowType = {
  /** Rolling/sliding window: continuously slides, always maintains WindowSize samples */
  Rolling: 1,
  /** Tumbling/batch window: collects WindowSize samples, calculates, then resets */
  Tumbling: 2,
} as const;
export type StatisticalWindowType = (typeof StatisticalWindowType)[keyof typeof StatisticalWindowType];

/**
 * Percentile configuration for custom percentile outputs
 */
export interface PercentileConfig {
  /** Percentile value (0-100). Common values: 50 (median), 90, 95, 99 */
  percentile: number;
  /** Output item ID to write the calculated percentile value */
  outputItemId: string; // UUID
}

/**
 * Statistical Memory for computing statistical metrics over a configurable window
 */
export interface StatisticalMemory {
  id: string; // UUID
  name?: string | null;
  inputItemId: string; // UUID - Input item to collect samples from
  interval: number; // int - Execution interval in seconds
  isDisabled: boolean; // bool - Whether statistical memory is disabled
  
  // Window configuration
  windowSize: number; // int - Number of samples (10-10000)
  windowType: StatisticalWindowType; // Rolling or Tumbling window
  minSamples: number; // int - Minimum samples before calculating stats
  
  // Optional output items (all nullable)
  outputMinItemId?: string | null; // UUID - Output for minimum value
  outputMaxItemId?: string | null; // UUID - Output for maximum value
  outputAvgItemId?: string | null; // UUID - Output for average value
  outputStdDevItemId?: string | null; // UUID - Output for standard deviation
  outputRangeItemId?: string | null; // UUID - Output for range (max - min)
  outputMedianItemId?: string | null; // UUID - Output for median
  outputCVItemId?: string | null; // UUID - Output for Coefficient of Variation
  
  // Percentile configuration (JSON array)
  percentilesConfig: string; // JSON array of PercentileConfig
  
  // State tracking
  currentBatchCount: number; // int - Current batch count for tumbling window
  lastResetTime?: number | null; // long - Unix epoch seconds of last reset
}

/**
 * Request DTO for retrieving statistical memory configurations
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GetStatisticalMemoriesRequestDto {
  // Empty - no filtering parameters needed
}

/**
 * Response DTO containing list of statistical memory configurations
 */
export interface GetStatisticalMemoriesResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
  statisticalMemories?: StatisticalMemory[] | null;
}

/**
 * Request DTO for creating a new statistical memory configuration
 */
export interface AddStatisticalMemoryRequestDto {
  name?: string | null;
  inputItemId: string; // UUID
  interval: number; // int - must be > 0
  isDisabled?: boolean;
  
  // Window configuration
  windowSize: number; // int - 10-10000
  windowType: StatisticalWindowType;
  minSamples?: number; // int - at least 2
  
  // Optional output items
  outputMinItemId?: string | null;
  outputMaxItemId?: string | null;
  outputAvgItemId?: string | null;
  outputStdDevItemId?: string | null;
  outputRangeItemId?: string | null;
  outputMedianItemId?: string | null;
  outputCVItemId?: string | null;
  
  // Percentile configuration
  percentilesConfig?: string;
}

/**
 * Response DTO for adding a statistical memory
 */
export interface AddStatisticalMemoryResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
  id?: string | null; // UUID of created statistical memory
}

/**
 * Request DTO for editing an existing statistical memory configuration
 */
export interface EditStatisticalMemoryRequestDto {
  id: string; // UUID
  name?: string | null;
  inputItemId: string; // UUID
  interval: number; // int - must be > 0
  isDisabled?: boolean;
  
  // Window configuration
  windowSize: number; // int - 10-10000
  windowType: StatisticalWindowType;
  minSamples?: number; // int - at least 2
  
  // Optional output items
  outputMinItemId?: string | null;
  outputMaxItemId?: string | null;
  outputAvgItemId?: string | null;
  outputStdDevItemId?: string | null;
  outputRangeItemId?: string | null;
  outputMedianItemId?: string | null;
  outputCVItemId?: string | null;
  
  // Percentile configuration
  percentilesConfig?: string;
  
  // State tracking (usually not edited directly)
  currentBatchCount?: number;
  lastResetTime?: number | null;
}

/**
 * Response DTO for editing a statistical memory
 */
export interface EditStatisticalMemoryResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
}

/**
 * Request DTO for deleting a statistical memory
 */
export interface DeleteStatisticalMemoryRequestDto {
  id: string; // UUID
}

/**
 * Response DTO for deleting a statistical memory
 */
export interface DeleteStatisticalMemoryResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
}

// ============================================================================
// FORMULA MEMORY TYPES
// ============================================================================

/**
 * Formula/Expression Memory for evaluating custom mathematical expressions using NCalc.
 * Supports multiple analog inputs mapped to variable aliases and outputs computed result.
 */
export interface FormulaMemory {
  id: string; // UUID
  name?: string | null;
  expression: string; // NCalc expression using [alias] syntax for variables
  variableAliases: string; // JSON object mapping alias -> item GUID
  outputItemId: string; // UUID - Output item for computed result
  interval: number; // int - Evaluation interval in seconds
  isDisabled: boolean;
  decimalPlaces: number; // int - Decimal places for formatting (0-10)
  units?: string | null; // Display units (e.g., "°C", "kW")
  description?: string | null; // Description of the formula
  expressionHash?: string | null; // SHA256 hash for cache invalidation
  lastEvaluationTime?: number | null; // Unix epoch seconds
  lastError?: string | null; // Last evaluation error message
  
  // Resolved item names for display
  outputItemName?: string | null;
  outputItemNameFa?: string | null;
}

/**
 * Variable alias mapping for display in UI
 */
export interface VariableAlias {
  alias: string;
  itemId: string;
  itemName?: string | null;
  itemNameFa?: string | null;
}

/**
 * Request DTO for retrieving formula memory configurations
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GetFormulaMemoriesRequestDto {
  // Empty - no filtering parameters needed
}

/**
 * Response DTO containing list of formula memory configurations
 */
export interface GetFormulaMemoriesResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
  formulaMemories?: FormulaMemory[] | null;
}

/**
 * Request DTO for creating a new formula memory configuration
 */
export interface AddFormulaMemoryRequestDto {
  name?: string | null;
  expression: string; // NCalc expression
  variableAliases: string; // JSON object {"alias": "guid", ...}
  outputItemId: string; // UUID
  interval: number; // int - must be > 0
  isDisabled?: boolean;
  decimalPlaces?: number; // int - 0-10, default 2
  units?: string | null;
  description?: string | null;
}

/**
 * Response DTO for adding a formula memory
 */
export interface AddFormulaMemoryResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
  id?: string | null; // UUID of created formula memory
}

/**
 * Request DTO for editing an existing formula memory configuration
 */
export interface EditFormulaMemoryRequestDto {
  id: string; // UUID
  name?: string | null;
  expression: string;
  variableAliases: string;
  outputItemId: string; // UUID
  interval: number; // int - must be > 0
  isDisabled?: boolean;
  decimalPlaces?: number;
  units?: string | null;
  description?: string | null;
}

/**
 * Response DTO for editing a formula memory
 */
export interface EditFormulaMemoryResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
}

/**
 * Request DTO for deleting a formula memory
 */
export interface DeleteFormulaMemoryRequestDto {
  id: string; // UUID
}

/**
 * Response DTO for deleting a formula memory
 */
export interface DeleteFormulaMemoryResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
}

/**
 * Request DTO for testing/previewing a formula expression
 */
export interface TestFormulaExpressionRequestDto {
  expression: string; // NCalc expression to evaluate
  variableAliases?: VariableAlias[]; // List of variable alias to item ID mappings
}

/**
 * Response DTO for testing a formula expression
 */
export interface TestFormulaExpressionResponseDto {
  isSuccessful: boolean;
  result?: number | null; // Computed result if successful
  errorMessage?: string | null;
}

// ============================================================================
// IF Memory Types
// ============================================================================

/**
 * Output type for IF Memory determining how values are written.
 */
export enum IfMemoryOutputType {
  /** Digital mode: Output is clamped to 0 (false/off) or 1 (true/on) */
  Digital = 0,
  /** Analog mode: Output value is written directly as a numeric value */
  Analog = 1,
}

/**
 * Represents a conditional branch within an IF memory.
 * Branches are evaluated in order by their Order property.
 */
export interface ConditionalBranch {
  id: string; // Unique identifier for tracking
  order: number; // Evaluation order (0-based, lower = first)
  condition: string; // NCalc condition expression using [alias] syntax
  outputValue: number; // Value to output when condition is true
  hysteresis: number; // Optional hysteresis for analog comparisons (default 0)
  name?: string | null; // Optional label for UI display
}

/**
 * IF Memory for evaluating conditional expressions with IF/ELSE IF/ELSE branching logic.
 * Evaluates NCalc conditions in order and outputs the value of the first matching branch.
 */
export interface IfMemory {
  id: string; // UUID
  name?: string | null;
  branches: string; // JSON array of ConditionalBranch objects
  defaultValue: number; // ELSE value when no branch matches
  variableAliases: string; // JSON object mapping alias -> item GUID
  outputItemId: string; // UUID - Output item for result
  outputType: IfMemoryOutputType; // Digital (0/1) or Analog (numeric)
  interval: number; // int - Evaluation interval in seconds
  isDisabled: boolean;
  description?: string | null;

  // Resolved item names for display
  outputItemName?: string | null;
  outputItemNameFa?: string | null;
}

/**
 * Request DTO for retrieving IF memory configurations
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GetIfMemoriesRequestDto {
  // Empty - no filtering parameters needed
}

/**
 * Response DTO containing list of IF memory configurations
 */
export interface GetIfMemoriesResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
  ifMemories?: IfMemory[] | null;
}

/**
 * Request DTO for creating a new IF memory configuration
 */
export interface AddIfMemoryRequestDto {
  name?: string | null;
  branches: string; // JSON array of ConditionalBranch objects
  defaultValue?: number; // Default 0
  variableAliases: string; // JSON object {"alias": "guid", ...}
  outputItemId: string; // UUID
  outputType?: number; // 0 = Digital, 1 = Analog (default 0)
  interval?: number; // int - must be > 0, default 1
  isDisabled?: boolean;
  description?: string | null;
}

/**
 * Response DTO for adding an IF memory
 */
export interface AddIfMemoryResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
  id?: string | null; // UUID of created IF memory
}

/**
 * Request DTO for editing an existing IF memory configuration
 */
export interface EditIfMemoryRequestDto {
  id: string; // UUID
  name?: string | null;
  branches: string;
  defaultValue?: number;
  variableAliases: string;
  outputItemId: string; // UUID
  outputType?: number;
  interval?: number;
  isDisabled?: boolean;
  description?: string | null;
}

/**
 * Response DTO for editing an IF memory
 */
export interface EditIfMemoryResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
}

/**
 * Request DTO for deleting an IF memory
 */
export interface DeleteIfMemoryRequestDto {
  id: string; // UUID
}

/**
 * Response DTO for deleting an IF memory
 */
export interface DeleteIfMemoryResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
}

/**
 * Request DTO for testing/previewing an IF condition expression
 */
export interface TestIfConditionRequestDto {
  condition: string; // NCalc condition expression to evaluate
  variableAliases?: VariableAlias[]; // List of variable alias to item ID mappings
}

/**
 * Response DTO for testing an IF condition expression
 */
export interface TestIfConditionResponseDto {
  isSuccessful: boolean;
  result?: boolean | null; // Boolean condition result if successful
  errorMessage?: string | null;
}

// ============================================================================
// Deadband Memory Types
// ============================================================================

/**
 * Deadband type for analog value filtering
 * - Absolute: Output changes only when |current - lastOutput| exceeds threshold
 * - Percentage: Output changes when difference exceeds threshold % of input range
 * - RateOfChange: Output changes when rate (units/sec) exceeds threshold
 */
export const DeadbandType = {
  /** Absolute deadband: output changes only when |current - lastOutput| > deadband */
  Absolute: 0,
  /** Percentage deadband: output changes only when |current - lastOutput| > (deadband% × span) */
  Percentage: 1,
  /** Rate of change deadband: output changes only when |current - lastInput| / elapsedSeconds > deadband */
  RateOfChange: 2,
} as const;
export type DeadbandType = (typeof DeadbandType)[keyof typeof DeadbandType];

/**
 * Deadband/Hysteresis Memory for reducing output chatter from noisy inputs
 * 
 * For analog inputs: Uses value-based deadband (Absolute/Percentage/RateOfChange)
 * For digital inputs: Uses time-based stability filtering (debounce)
 */
export interface DeadbandMemory {
  id: string; // UUID
  name?: string | null;
  inputItemId: string; // UUID - Input item (analog or digital)
  outputItemId: string; // UUID - Output item (must match input type category)
  interval: number; // int - Processing interval in seconds
  isDisabled: boolean; // bool
  
  // Analog deadband settings
  deadband: number; // double - Deadband threshold value
  deadbandType: DeadbandType; // Absolute, Percentage, or RateOfChange
  inputMin: number; // double - Min value of input range (for percentage)
  inputMax: number; // double - Max value of input range (for percentage)
  
  // Digital stability settings
  stabilityTime: number; // double - Stability time in seconds for digital debounce
  
  // State fields
  lastOutputValue?: number | null; // double - Last written output value
  lastInputValue?: number | null; // double - Last input value
  lastChangeTime?: number | null; // long - Unix epoch seconds when input last changed
  pendingDigitalState?: boolean | null; // bool - Pending digital state
  lastTimestamp?: number | null; // long - Unix epoch seconds of last processing
}

/**
 * Extended Deadband Memory with resolved item names for UI display
 */
export interface DeadbandMemoryWithItems extends DeadbandMemory {
  inputItemName?: string;
  inputItemNameFa?: string;
  inputItemType?: ItemType;
  outputItemName?: string;
  outputItemNameFa?: string;
  outputItemType?: ItemType;
}

/**
 * Request DTO for retrieving deadband memory configurations
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GetDeadbandMemoriesRequestDto {
  // Empty - no filtering parameters needed
}

/**
 * Response DTO containing list of deadband memory configurations
 */
export interface GetDeadbandMemoriesResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
  deadbandMemories?: DeadbandMemory[] | null;
}

/**
 * Request DTO for creating a new deadband memory configuration
 */
export interface AddDeadbandMemoryRequestDto {
  name?: string | null;
  inputItemId: string; // UUID
  outputItemId: string; // UUID
  interval: number; // int - must be > 0
  isDisabled?: boolean;
  
  // Analog deadband settings
  deadband?: number; // double - threshold value
  deadbandType?: DeadbandType; // 0=Absolute, 1=Percentage, 2=RateOfChange
  inputMin?: number; // double - for percentage calculation
  inputMax?: number; // double - for percentage calculation
  
  // Digital stability settings
  stabilityTime?: number; // double - seconds
}

/**
 * Response DTO for adding a deadband memory
 */
export interface AddDeadbandMemoryResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
  id?: string | null; // UUID of created deadband memory
}

/**
 * Request DTO for editing an existing deadband memory configuration
 */
export interface EditDeadbandMemoryRequestDto {
  id: string; // UUID
  name?: string | null;
  inputItemId: string; // UUID
  outputItemId: string; // UUID
  interval: number; // int - must be > 0
  isDisabled?: boolean;
  
  // Analog deadband settings
  deadband?: number;
  deadbandType?: DeadbandType;
  inputMin?: number;
  inputMax?: number;
  
  // Digital stability settings
  stabilityTime?: number;
}

/**
 * Response DTO for editing a deadband memory
 */
export interface EditDeadbandMemoryResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
}

/**
 * Request DTO for deleting a deadband memory
 */
export interface DeleteDeadbandMemoryRequestDto {
  id: string; // UUID
}

/**
 * Response DTO for deleting a deadband memory
 */
export interface DeleteDeadbandMemoryResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
}

// ============================================================================
// MIN/MAX SELECTOR MEMORY TYPES
// ============================================================================

/**
 * Selection mode for Min/Max Selector Memory
 */
export type MinMaxSelectionMode = 1 | 2; // 1 = Minimum, 2 = Maximum

export const MinMaxSelectionModeEnum = {
  Minimum: 1 as MinMaxSelectionMode,
  Maximum: 2 as MinMaxSelectionMode,
} as const;

/**
 * Failover behavior when inputs are detected as bad/invalid
 */
export type MinMaxFailoverMode = 1 | 2 | 3; // 1 = IgnoreBad, 2 = FallbackToOpposite, 3 = HoldLastGood

export const MinMaxFailoverModeEnum = {
  IgnoreBad: 1 as MinMaxFailoverMode,
  FallbackToOpposite: 2 as MinMaxFailoverMode,
  HoldLastGood: 3 as MinMaxFailoverMode,
} as const;

/**
 * Min/Max Selector Memory for selecting the minimum or maximum value from multiple analog inputs.
 * Supports 2-16 inputs with configurable selection mode and failover strategies.
 */
export interface MinMaxSelectorMemory {
  id: string; // UUID
  name?: string | null;
  inputItemIds: string; // JSON array of input item GUIDs ["guid1", "guid2", ...]
  outputItemId: string; // UUID - Output for selected value
  selectedIndexOutputItemId?: string | null; // UUID - Optional output for which input (1-16) was selected
  selectionMode: MinMaxSelectionMode; // 1 = Minimum, 2 = Maximum
  failoverMode: MinMaxFailoverMode; // 1 = IgnoreBad, 2 = FallbackToOpposite, 3 = HoldLastGood
  interval: number; // int - Execution interval in seconds
  isDisabled: boolean;
  lastSelectedIndex?: number | null; // int - Last selected input index (1-based)
  lastSelectedValue?: number | null; // double - Last selected value
}

/**
 * Request DTO for retrieving min/max selector memory configurations
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GetMinMaxSelectorMemoriesRequestDto {
  // Empty - no filtering parameters needed
}

/**
 * Response DTO containing list of min/max selector memory configurations
 */
export interface GetMinMaxSelectorMemoriesResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
  minMaxSelectorMemories?: MinMaxSelectorMemory[] | null;
}

/**
 * Request DTO for creating a new min/max selector memory configuration
 */
export interface AddMinMaxSelectorMemoryRequestDto {
  name?: string | null;
  inputItemIds: string; // JSON array of input item GUIDs (2-16 items)
  outputItemId: string; // UUID
  selectedIndexOutputItemId?: string | null; // UUID - Optional
  selectionMode: MinMaxSelectionMode;
  failoverMode: MinMaxFailoverMode;
  interval: number; // int - must be > 0
  isDisabled?: boolean;
}

/**
 * Response DTO for adding a min/max selector memory
 */
export interface AddMinMaxSelectorMemoryResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
  id?: string | null; // UUID of created memory
}

/**
 * Request DTO for editing an existing min/max selector memory configuration
 */
export interface EditMinMaxSelectorMemoryRequestDto {
  id: string; // UUID
  name?: string | null;
  inputItemIds: string; // JSON array of input item GUIDs (2-16 items)
  outputItemId: string; // UUID
  selectedIndexOutputItemId?: string | null; // UUID - Optional
  selectionMode: MinMaxSelectionMode;
  failoverMode: MinMaxFailoverMode;
  interval: number; // int - must be > 0
  isDisabled?: boolean;
}

/**
 * Response DTO for editing a min/max selector memory
 */
export interface EditMinMaxSelectorMemoryResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
}

/**
 * Request DTO for deleting a min/max selector memory
 */
export interface DeleteMinMaxSelectorMemoryRequestDto {
  id: string; // UUID
}

/**
 * Response DTO for deleting a min/max selector memory
 */
export interface DeleteMinMaxSelectorMemoryResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
}

// Schedule Memory Types

/**
 * Override expiration mode for manual override behavior
 */
export enum OverrideExpirationMode {
  /**
   * Override expires after a specified duration in minutes
   */
  TimeBased = 1,
  
  /**
   * Override remains active until the next schedule change or manual deactivation
   */
  EventBased = 2
}

/**
 * Priority levels for schedule blocks to resolve conflicts
 * Higher priority blocks take precedence when schedules overlap
 */
export enum SchedulePriority {
  /**
   * Low priority - can be overridden by any higher priority
   */
  Low = 1,
  
  /**
   * Normal priority - default for most schedules
   */
  Normal = 2,
  
  /**
   * High priority - takes precedence over normal schedules
   */
  High = 3,
  
  /**
   * Critical priority - highest precedence, for emergency or demand response
   */
  Critical = 4
}

/**
 * Behavior when EndTime is null in a schedule block
 */
export enum NullEndTimeBehavior {
  /**
   * Use memory's default value when EndTime is null (block activates then immediately reverts to default)
   */
  UseDefault = 1,
  
  /**
   * Extend block to end of day (23:59:59) when EndTime is null
   */
  ExtendToEndOfDay = 2
}

/**
 * Days of the week for schedule block configuration
 */
export enum ScheduleDayOfWeek {
  Sunday = 0,
  Monday = 1,
  Tuesday = 2,
  Wednesday = 3,
  Thursday = 4,
  Friday = 5,
  Saturday = 6
}
/**
 * A time block within a schedule that defines when a specific output value should be active
 */
export interface ScheduleBlock {
  id: string;
  scheduleMemoryId: string;
  dayOfWeek: ScheduleDayOfWeek;
  startTime: string;
  endTime?: string | null;
  priority: SchedulePriority;
  nullEndTimeBehavior?: NullEndTimeBehavior;
  analogOutputValue?: number | null;
  digitalOutputValue?: boolean | null;
  description?: string | null;
}

/**
 * Schedule Memory for generating setpoints or outputs based on time schedules
 */
export interface ScheduleMemory {
  id: string;
  name?: string | null;
  outputItemId: string;
  interval: number;
  isDisabled: boolean;
  holidayCalendarId?: string | null;
  holidayCalendarName?: string | null;
  defaultAnalogValue?: number | null;
  defaultDigitalValue?: boolean | null;
  manualOverrideActive: boolean;
  manualOverrideAnalogValue?: number | null;
  manualOverrideDigitalValue?: boolean | null;
  overrideExpirationMode: OverrideExpirationMode;
  overrideDurationMinutes: number;
  overrideActivationTime?: string | null;
  lastActiveBlockId?: string | null;
  scheduleBlocks?: ScheduleBlock[] | null;
}

/**
 * DTO for adding a schedule block
 */
export interface AddScheduleBlockDto {
  dayOfWeek: number;
  startTime: string;
  endTime?: string | null;
  priority: number;
  nullEndTimeBehavior?: number;
  analogOutputValue?: number | null;
  digitalOutputValue?: boolean | null;
  description?: string | null;
}

/**
 * Holiday Calendar for managing holiday dates
 */
export interface HolidayCalendar {
  id: string;
  name: string;
  description?: string | null;
  dates?: HolidayDate[] | null;
}

/**
 * Individual holiday date
 */
export interface HolidayDate {
  id: string;
  holidayCalendarId: string;
  date: string;
  description?: string | null;
}

/**
 * DTO for adding a holiday date
 */
export interface AddHolidayDateDto {
  date: string;
  description?: string | null;
}
/**
 * Request DTO for getting schedule memories
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GetScheduleMemoriesRequestDto {}

/**
 * Response DTO for getting schedule memories
 */
export interface GetScheduleMemoriesResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
  scheduleMemories?: ScheduleMemory[] | null;
}

/**
 * Request DTO for adding a schedule memory
 */
export interface AddScheduleMemoryRequestDto {
  name?: string | null;
  outputItemId: string;
  interval: number;
  isDisabled?: boolean;
  holidayCalendarId?: string | null;
  defaultAnalogValue?: number | null;
  defaultDigitalValue?: boolean | null;
  overrideExpirationMode?: number;
  overrideDurationMinutes?: number;
  scheduleBlocks?: AddScheduleBlockDto[] | null;
}

/**
 * Response DTO for adding a schedule memory
 */
export interface AddScheduleMemoryResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
  id?: string | null;
}

/**
 * Request DTO for editing a schedule memory
 */
export interface EditScheduleMemoryRequestDto {
  id: string;
  name?: string | null;
  outputItemId: string;
  interval: number;
  isDisabled?: boolean;
  holidayCalendarId?: string | null;
  defaultAnalogValue?: number | null;
  defaultDigitalValue?: boolean | null;
  overrideExpirationMode?: number;
  overrideDurationMinutes?: number;
  scheduleBlocks?: AddScheduleBlockDto[] | null;
}

/**
 * Response DTO for editing a schedule memory
 */
export interface EditScheduleMemoryResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
}

/**
 * Request DTO for deleting a schedule memory
 */
export interface DeleteScheduleMemoryRequestDto {
  id: string;
}

/**
 * Response DTO for deleting a schedule memory
 */
export interface DeleteScheduleMemoryResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
}

/**
 * Request DTO for setting schedule override
 */
export interface SetScheduleOverrideRequestDto {
  id: string;
  activate: boolean;
  analogValue?: number | null;
  digitalValue?: boolean | null;
}

/**
 * Response DTO for setting schedule override
 */
export interface SetScheduleOverrideResponseDto {
  isSuccessful: boolean;
  errorMessage?: string | null;
}