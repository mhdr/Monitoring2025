/**
 * Custom hook for Monitoring Context
 */

import { useContext } from 'react';
import { MonitoringContext } from '../contexts/MonitoringContext';
import type { MonitoringContextValue } from '../contexts/MonitoringContext';

/**
 * Hook for accessing monitoring context
 */
export function useMonitoring(): MonitoringContextValue {
  const context = useContext(MonitoringContext);
  
  if (!context) {
    throw new Error('useMonitoring must be used within MonitoringProvider');
  }
  
  return context;
}
