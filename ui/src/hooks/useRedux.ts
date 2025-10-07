/**
 * Typed Redux hooks for use throughout the application
 * These hooks provide proper TypeScript types for dispatch and state
 */
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from '../store';

/**
 * Typed useDispatch hook
 * Use this instead of plain useDispatch
 */
export const useAppDispatch: () => AppDispatch = useDispatch;

/**
 * Typed useSelector hook
 * Use this instead of plain useSelector
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

/**
 * Custom hook to access active alarms data from Redux store
 * This data is automatically updated by the global gRPC stream subscription
 * 
 * @returns Active alarms state including count, last update time, connection status, and error
 * 
 * @example
 * ```tsx
 * function AlarmBadge() {
 *   const { alarmCount, lastUpdate, streamStatus } = useActiveAlarms();
 *   
 *   return (
 *     <div>
 *       <span className="badge bg-danger">{alarmCount}</span>
 *       {streamStatus === 'connected' && <span>🟢 Live</span>}
 *     </div>
 *   );
 * }
 * ```
 */
export const useActiveAlarms = () => {
  return useAppSelector((state) => state.monitoring.activeAlarms);
};
