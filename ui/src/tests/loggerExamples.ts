/**
 * Logger Test Examples
 * 
 * This file demonstrates the development-only logger in action.
 * Run in development mode to see output, build for production to see no output.
 */

import { logger, createLogger, isDevMode } from '../utils/logger';

// ===========================================
// Example 1: Basic Logger
// ===========================================

export function testBasicLogger() {
  logger.log('This is a log message');
  logger.info('This is an info message');
  logger.warn('This is a warning message');
  logger.error('This is an error message');
  logger.debug('This is a debug message');
}

// ===========================================
// Example 2: Module-Specific Logger
// ===========================================

const authLogger = createLogger('AuthService');
const apiLogger = createLogger('ApiClient');

export function testModuleLoggers() {
  // These will show: [AuthService] message
  authLogger.log('User logged in');
  authLogger.info('Session extended');
  authLogger.warn('Token expires soon');
  authLogger.error('Authentication failed');

  // These will show: [ApiClient] message
  apiLogger.log('Making API request');
  apiLogger.info('Response received');
  apiLogger.warn('Slow response time');
  apiLogger.error('Network error');
}

// ===========================================
// Example 3: Conditional Logging
// ===========================================

export function testConditionalLogging() {
  // Check if we're in development mode
  if (isDevMode) {
    logger.log('Running in development mode');
  }

  // Alternative: logger handles this automatically
  // This is more concise and recommended
  logger.log('This only appears in development');
}

// ===========================================
// Example 4: Complex Data Logging
// ===========================================

const dataLogger = createLogger('DataService');

export function testComplexData() {
  const user = {
    id: 123,
    name: 'John Doe',
    email: 'john@example.com',
    roles: ['admin', 'user']
  };

  const apiResponse = {
    status: 200,
    data: { count: 42, items: ['a', 'b', 'c'] },
    timestamp: new Date().toISOString()
  };

  // Log objects directly
  dataLogger.log('User object:', user);
  dataLogger.info('API response:', apiResponse);

  // Use table for structured data
  dataLogger.table([user, { id: 456, name: 'Jane Doe', email: 'jane@example.com', roles: ['user'] }]);
}

// ===========================================
// Example 5: Error Logging with Stack Traces
// ===========================================

const errorLogger = createLogger('ErrorHandler');

export function testErrorLogging() {
  try {
    throw new Error('Something went wrong!');
  } catch (error) {
    // Error objects include stack traces automatically
    errorLogger.error('Caught an error:', error);
    
    // Additional context
    errorLogger.error('Error during data fetch:', {
      endpoint: '/api/users',
      method: 'GET',
      error: error
    });
  }
}

// ===========================================
// Example 6: Performance Timing
// ===========================================

const perfLogger = createLogger('Performance');

export async function testPerformanceTiming() {
  perfLogger.time('dataFetch');
  
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  perfLogger.timeEnd('dataFetch'); // Logs: [Performance] dataFetch: 1000ms
}

// ===========================================
// Example 7: Grouped Logs
// ===========================================

const groupLogger = createLogger('UserActions');

export function testGroupedLogs() {
  groupLogger.group('User Login Flow');
  groupLogger.log('Step 1: Validate credentials');
  groupLogger.log('Step 2: Fetch user data');
  groupLogger.log('Step 3: Set authentication state');
  groupLogger.groupEnd();

  groupLogger.groupCollapsed('API Request Details');
  groupLogger.log('URL: /api/login');
  groupLogger.log('Method: POST');
  groupLogger.log('Headers:', { 'Content-Type': 'application/json' });
  groupLogger.groupEnd();
}

// ===========================================
// Example 8: Comparison - Before & After
// ===========================================

// ❌ OLD WAY (appears in production)
export function oldLogging() {
  console.log('[MyComponent] Component mounted');
  console.error('[MyComponent] Error:', new Error('test'));
}

// ✅ NEW WAY (development only)
const componentLogger = createLogger('MyComponent');

export function newLogging() {
  componentLogger.log('Component mounted');
  componentLogger.error('Error:', new Error('test'));
}

// ===========================================
// Run All Tests (Development Only)
// ===========================================

export function runAllLoggerTests() {
  logger.log('='.repeat(50));
  logger.log('LOGGER TESTS - Development Only');
  logger.log('='.repeat(50));

  logger.group('Test Suite');
  
  logger.log('\n1. Basic Logger');
  testBasicLogger();

  logger.log('\n2. Module-Specific Loggers');
  testModuleLoggers();

  logger.log('\n3. Conditional Logging');
  testConditionalLogging();

  logger.log('\n4. Complex Data');
  testComplexData();

  logger.log('\n5. Error Logging');
  testErrorLogging();

  logger.log('\n6. Performance Timing');
  testPerformanceTiming().catch(err => logger.error('Timing test failed:', err));

  logger.log('\n7. Grouped Logs');
  testGroupedLogs();

  logger.log('\n8. Comparison (Old vs New)');
  oldLogging();
  newLogging();

  logger.groupEnd();

  logger.log('='.repeat(50));
  logger.log('All tests complete. Check console output above.');
  logger.log('Build for production to see all logs disappear!');
  logger.log('='.repeat(50));
}

// To run these tests, import and call in your component:
// import { runAllLoggerTests } from './tests/loggerExamples';
// runAllLoggerTests();
