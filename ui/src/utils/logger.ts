/**
 * Development-Only Logger Utility
 * 
 * This utility wraps console methods to only log in development mode.
 * In production builds, all log calls are no-ops (do nothing).
 * 
 * Usage:
 *   import { logger } from './utils/logger';
 *   logger.log('Debug message');
 *   logger.error('Error message');
 * 
 * Instead of:
 *   console.log('Debug message');
 *   console.error('Error message');
 */

const isDevelopment = import.meta.env.DEV;

/**
 * Logger interface matching console methods
 */
interface Logger {
  log: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  trace: (...args: unknown[]) => void;
  table: (data: unknown) => void;
  group: (label?: string) => void;
  groupCollapsed: (label?: string) => void;
  groupEnd: () => void;
  time: (label?: string) => void;
  timeEnd: (label?: string) => void;
}

/**
 * No-op function for production
 */
const noop = () => {
  // Intentionally empty - does nothing in production
};

/**
 * Development-only logger
 * In production, all methods are no-ops
 */
export const logger: Logger = isDevelopment
  ? {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug.bind(console),
      trace: console.trace.bind(console),
      table: console.table.bind(console),
      group: console.group.bind(console),
      groupCollapsed: console.groupCollapsed.bind(console),
      groupEnd: console.groupEnd.bind(console),
      time: console.time.bind(console),
      timeEnd: console.timeEnd.bind(console),
    }
  : {
      log: noop,
      info: noop,
      warn: noop,
      error: noop,
      debug: noop,
      trace: noop,
      table: noop,
      group: noop,
      groupCollapsed: noop,
      groupEnd: noop,
      time: noop,
      timeEnd: noop,
    };

/**
 * Helper to check if we're in development mode
 */
export const isDevMode = isDevelopment;

/**
 * Log only in development with a specific prefix
 * Useful for module-specific logging
 */
export const createLogger = (prefix: string): Logger => {
  if (!isDevelopment) {
    return {
      log: noop,
      info: noop,
      warn: noop,
      error: noop,
      debug: noop,
      trace: noop,
      table: noop,
      group: noop,
      groupCollapsed: noop,
      groupEnd: noop,
      time: noop,
      timeEnd: noop,
    };
  }

  return {
    log: (...args) => console.log(`[${prefix}]`, ...args),
    info: (...args) => console.info(`[${prefix}]`, ...args),
    warn: (...args) => console.warn(`[${prefix}]`, ...args),
    error: (...args) => console.error(`[${prefix}]`, ...args),
    debug: (...args) => console.debug(`[${prefix}]`, ...args),
    trace: (...args) => console.trace(`[${prefix}]`, ...args),
    table: (data) => {
      console.log(`[${prefix}]`);
      console.table(data);
    },
    group: (label) => console.group(`[${prefix}] ${label || ''}`),
    groupCollapsed: (label) => console.groupCollapsed(`[${prefix}] ${label || ''}`),
    groupEnd: console.groupEnd.bind(console),
    time: (label) => console.time(`[${prefix}] ${label || ''}`),
    timeEnd: (label) => console.timeEnd(`[${prefix}] ${label || ''}`),
  };
};
