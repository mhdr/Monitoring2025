/**
 * gRPC-related type definitions
 * Types for gRPC streaming state management and configurations
 */

import type { ActiveAlarmsRequest, ActiveAlarmsUpdate } from '../gen/monitoring_pb';
import type { StreamStatus } from '../hooks/useMonitoringStream';

/**
 * Re-export generated types for convenience
 */
export type { ActiveAlarmsRequest, ActiveAlarmsUpdate };

/**
 * Re-export stream status type
 */
export type { StreamStatus };

/**
 * Configuration for the monitoring stream
 */
export interface MonitoringStreamConfig {
  /** Client identifier for the stream */
  clientId: string;
  /** Auto-connect on mount */
  autoConnect?: boolean;
  /** Reconnect delay in milliseconds (for auto-reconnect) */
  reconnectDelay?: number;
}

/**
 * Monitoring stream metrics
 */
export interface StreamMetrics {
  /** Total number of updates received */
  totalUpdates: number;
  /** Last connection time (Unix timestamp) */
  lastConnectedAt: number | null;
  /** Last disconnection time (Unix timestamp) */
  lastDisconnectedAt: number | null;
  /** Connection uptime in milliseconds */
  uptime: number;
}

/**
 * Extended monitoring data with metadata
 */
export interface MonitoringData {
  /** Active alarms count */
  alarmCount: number;
  /** Server timestamp (Unix timestamp in milliseconds) */
  timestamp: number;
  /** Client-side received timestamp */
  receivedAt: number;
  /** Latency in milliseconds (receivedAt - timestamp) */
  latency: number;
}
