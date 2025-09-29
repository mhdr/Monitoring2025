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