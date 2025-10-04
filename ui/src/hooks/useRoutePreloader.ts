import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { preloadRoute, preloadRoutesDelayed } from '../utils/routePreloader';

/**
 * Custom hook for intelligent route preloading
 * Preloads routes based on current location and navigation patterns
 */
export const useRoutePreloader = () => {
  const location = useLocation();

  /**
   * Preload dashboard-related routes when user is on login page
   */
  const preloadDashboardRoutes = useCallback(() => {
    preloadRoute('DashboardLayout', () => import('../components/DashboardLayout'));
    preloadRoute('Dashboard', () => import('../components/Dashboard'));
    
    // Preload frequently accessed pages with a delay
    preloadRoutesDelayed([
      { name: 'MonitoringPage', loader: () => import('../components/MonitoringPage') },
      { name: 'ActiveAlarmsPage', loader: () => import('../components/ActiveAlarmsPage') },
    ], 1000);
  }, []);

  /**
   * Preload detail-related routes when on dashboard
   */
  const preloadDetailRoutes = useCallback(() => {
    preloadRoutesDelayed([
      { name: 'DetailLayout', loader: () => import('../components/detail/DetailLayout') },
      { name: 'TrendAnalysisPage', loader: () => import('../components/detail/TrendAnalysisPage') },
    ], 2000);
  }, []);

  /**
   * Preload monitoring-related routes
   */
  const preloadMonitoringRoutes = useCallback(() => {
    preloadRoutesDelayed([
      { name: 'LiveMonitoringDetailPage', loader: () => import('../components/detail/LiveMonitoringDetailPage') },
      { name: 'DataTablePage', loader: () => import('../components/detail/DataTablePage') },
    ], 1500);
  }, []);

  /**
   * Preload alarm-related routes
   */
  const preloadAlarmRoutes = useCallback(() => {
    preloadRoutesDelayed([
      { name: 'AlarmLogPage', loader: () => import('../components/AlarmLogPage') },
      { name: 'AlarmLogDetailPage', loader: () => import('../components/detail/AlarmLogDetailPage') },
      { name: 'AlarmCriteriaPage', loader: () => import('../components/detail/AlarmCriteriaPage') },
    ], 1500);
  }, []);

  // Preload routes based on current location
  useEffect(() => {
    if (location.pathname === '/login') {
      // User is on login - preload dashboard routes
      preloadDashboardRoutes();
    } else if (location.pathname.startsWith('/dashboard')) {
      // User is on dashboard - preload detail views
      preloadDetailRoutes();
      
      // Preload specific routes based on dashboard page
      if (location.pathname.includes('monitoring')) {
        preloadMonitoringRoutes();
      } else if (location.pathname.includes('alarm')) {
        preloadAlarmRoutes();
      }
    }
  }, [location.pathname, preloadDashboardRoutes, preloadDetailRoutes, preloadMonitoringRoutes, preloadAlarmRoutes]);

  return {
    preloadDashboardRoutes,
    preloadDetailRoutes,
    preloadMonitoringRoutes,
    preloadAlarmRoutes,
  };
};
