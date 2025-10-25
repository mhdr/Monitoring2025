import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useFontLoader } from './hooks/useFontLoader';
import { useLanguage } from './hooks/useLanguage';
import { useTranslation } from './hooks/useTranslation';
import { useRoutePreloader } from './hooks/useRoutePreloader';
import { useAuth } from './hooks/useAuth';
import { useSignalR } from './hooks/useSignalR';
import { useActiveAlarmCount } from './hooks/useActiveAlarmCount';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import LoadingScreen from './components/LoadingScreen';
import LazyErrorBoundary from './components/LazyErrorBoundary';
import ServiceWorkerPrompt from './components/ServiceWorkerPrompt';
import LazyRoute from './components/LazyRoute';
import './App.css';

// Lazy-loaded components
const SyncPage = React.lazy(() => import('./components/SyncPage'));
const DashboardLayout = React.lazy(() => import('./components/DashboardLayout'));
const DetailLayout = React.lazy(() => import('./components/detail/DetailLayout'));
const MonitoringPage = React.lazy(() => import('./components/MonitoringPage'));
const PlotsPage = React.lazy(() => import('./components/PlotsPage'));
const ActiveAlarmsPage = React.lazy(() => import('./components/ActiveAlarmsPage'));
const AlarmLogPage = React.lazy(() => import('./components/AlarmLogPage'));
const AuditTrailPage = React.lazy(() => import('./components/AuditTrailPage'));
const DisabledAlarmsPage = React.lazy(() => import('./components/DisabledAlarmsPage'));
const SchedulerPage = React.lazy(() => import('./components/SchedulerPage'));
const ManagementPage = React.lazy(() => import('./components/ManagementPage'));
const SettingsPage = React.lazy(() => import('./components/SettingsPage'));
const ProfilePage = React.lazy(() => import('./components/ProfilePage'));
const TrendAnalysisPage = React.lazy(() => import('./components/detail/TrendAnalysisPage'));
const DataTablePage = React.lazy(() => import('./components/detail/DataTablePage'));
const LiveMonitoringDetailPage = React.lazy(() => import('./components/detail/LiveMonitoringDetailPage'));
const ActiveAlarmsDetailPage = React.lazy(() => import('./components/detail/ActiveAlarmsDetailPage'));
const AlarmLogDetailPage = React.lazy(() => import('./components/detail/AlarmLogDetailPage'));
const AlarmCriteriaPage = React.lazy(() => import('./components/detail/AlarmCriteriaPage'));
const AuditTrailDetailPage = React.lazy(() => import('./components/detail/AuditTrailDetailPage'));
const ManagementDetailPage = React.lazy(() => import('./components/detail/ManagementDetailPage'));


/**
 * AppRoutes Component
 * Contains all routes and must be inside Router for useLocation to work
 */
const AppRoutes = () => {
  // Enable intelligent route preloading based on navigation patterns
  // This must be inside Router component to access useLocation
  useRoutePreloader();

  return (
      <Routes>
        <Route path="/login" element={<PublicRoute />} />
        <Route path="/sync" element={
          <ProtectedRoute>
            <LazyRoute component={SyncPage} />
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <LazyRoute component={DashboardLayout} />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard/monitoring" replace />} />
          <Route path="monitoring" element={<LazyRoute component={MonitoringPage} />} />
          <Route path="plots" element={<LazyRoute component={PlotsPage} />} />
          <Route path="active-alarms" element={<LazyRoute component={ActiveAlarmsPage} />} />
          <Route path="alarm-log" element={<LazyRoute component={AlarmLogPage} />} />
          <Route path="audit-trail" element={<LazyRoute component={AuditTrailPage} />} />
          <Route path="disabled-alarms" element={<LazyRoute component={DisabledAlarmsPage} />} />
          <Route path="scheduler" element={<LazyRoute component={SchedulerPage} />} />
          <Route path="management" element={<LazyRoute component={ManagementPage} />} />
          <Route path="settings" element={<LazyRoute component={SettingsPage} />} />
          <Route path="profile" element={<LazyRoute component={ProfilePage} />} />
          <Route path="sync" element={<LazyRoute component={SyncPage} />} />
        </Route>
        <Route path="/item-detail" element={
          <ProtectedRoute>
            <LazyRoute component={DetailLayout} />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/item-detail/trend-analysis" replace />} />
          <Route path="trend-analysis" element={<LazyRoute component={TrendAnalysisPage} />} />
          <Route path="data-table" element={<LazyRoute component={DataTablePage} />} />
          <Route path="live-monitoring" element={<LazyRoute component={LiveMonitoringDetailPage} />} />
          <Route path="active-alarms" element={<LazyRoute component={ActiveAlarmsDetailPage} />} />
          <Route path="alarm-log" element={<LazyRoute component={AlarmLogDetailPage} />} />
          <Route path="alarm-criteria" element={<LazyRoute component={AlarmCriteriaPage} />} />
          <Route path="audit-trail" element={<LazyRoute component={AuditTrailDetailPage} />} />
          <Route path="management" element={<LazyRoute component={ManagementDetailPage} />} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
  );
};

function App() {
  const { isLoadingLanguage } = useLanguage();
  const { t } = useTranslation();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  
  // Dynamically load Persian fonts only when needed (Persian language active)
  useFontLoader();
  
  // SignalR real-time connection for active alarms
  // Automatically connects when authenticated, disconnects on logout
  useSignalR(isAuthenticated, isAuthLoading);

  // Fetch active alarm count for sidebar badge
  // Fetches when authenticated and data is synced, refreshes periodically
  // Includes automatic retry logic with exponential backoff
  useActiveAlarmCount(isAuthenticated, isAuthLoading);

  // Show loading screen during language changes
  if (isLoadingLanguage) {
    return <LoadingScreen message={t('loading')} />;
  }

  return (
    <Router>
      <AppRoutes />
      <ServiceWorkerPrompt />
    </Router>
  );
}

export default App;
