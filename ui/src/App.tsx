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
import SyncPage from './components/SyncPage';
import DashboardLayout from './components/DashboardLayout';
import DetailLayout from './components/detail/DetailLayout';
import MonitoringPage from './components/MonitoringPage';
import PlotsPage from './components/PlotsPage';
import ActiveAlarmsPage from './components/ActiveAlarmsPage';
import AlarmLogPage from './components/AlarmLogPage';
import AuditTrailPage from './components/AuditTrailPage';
import DisabledAlarmsPage from './components/DisabledAlarmsPage';
import SchedulerPage from './components/SchedulerPage';
import ManagementPage from './components/ManagementPage';
import SettingsPage from './components/SettingsPage';
import ProfilePage from './components/ProfilePage';
import TrendAnalysisPage from './components/detail/TrendAnalysisPage';
import DataTablePage from './components/detail/DataTablePage';
import LiveMonitoringDetailPage from './components/detail/LiveMonitoringDetailPage';
import ActiveAlarmsDetailPage from './components/detail/ActiveAlarmsDetailPage';
import AlarmLogDetailPage from './components/detail/AlarmLogDetailPage';
import AlarmCriteriaPage from './components/detail/AlarmCriteriaPage';
import AuditTrailDetailPage from './components/detail/AuditTrailDetailPage';
import ManagementDetailPage from './components/detail/ManagementDetailPage';
import './App.css';

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
            <LazyErrorBoundary>
              <SyncPage />
            </LazyErrorBoundary>
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <LazyErrorBoundary>
              <DashboardLayout />
            </LazyErrorBoundary>
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard/monitoring" replace />} />
          <Route path="monitoring" element={
            <LazyErrorBoundary>
              <MonitoringPage />
            </LazyErrorBoundary>
          } />
          <Route path="plots" element={
            <LazyErrorBoundary>
              <PlotsPage />
            </LazyErrorBoundary>
          } />
          <Route path="active-alarms" element={
            <LazyErrorBoundary>
              <ActiveAlarmsPage />
            </LazyErrorBoundary>
          } />
          <Route path="alarm-log" element={
            <LazyErrorBoundary>
              <AlarmLogPage />
            </LazyErrorBoundary>
          } />
          <Route path="audit-trail" element={
            <LazyErrorBoundary>
              <AuditTrailPage />
            </LazyErrorBoundary>
          } />
          <Route path="disabled-alarms" element={
            <LazyErrorBoundary>
              <DisabledAlarmsPage />
            </LazyErrorBoundary>
          } />
          <Route path="scheduler" element={
            <LazyErrorBoundary>
              <SchedulerPage />
            </LazyErrorBoundary>
          } />
          <Route path="management" element={
            <LazyErrorBoundary>
              <ManagementPage />
            </LazyErrorBoundary>
          } />
          <Route path="settings" element={
            <LazyErrorBoundary>
              <SettingsPage />
            </LazyErrorBoundary>
          } />
          <Route path="profile" element={
            <LazyErrorBoundary>
              <ProfilePage />
            </LazyErrorBoundary>
          } />
          <Route path="sync" element={
            <LazyErrorBoundary>
              <SyncPage />
            </LazyErrorBoundary>
          } />
        </Route>
        <Route path="/item-detail" element={
          <ProtectedRoute>
            <LazyErrorBoundary>
              <DetailLayout />
            </LazyErrorBoundary>
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/item-detail/trend-analysis" replace />} />
          <Route path="trend-analysis" element={
            <LazyErrorBoundary>
              <TrendAnalysisPage />
            </LazyErrorBoundary>
          } />
          <Route path="data-table" element={
            <LazyErrorBoundary>
              <DataTablePage />
            </LazyErrorBoundary>
          } />
          <Route path="live-monitoring" element={
            <LazyErrorBoundary>
              <LiveMonitoringDetailPage />
            </LazyErrorBoundary>
          } />
          <Route path="active-alarms" element={
            <LazyErrorBoundary>
              <ActiveAlarmsDetailPage />
            </LazyErrorBoundary>
          } />
          <Route path="alarm-log" element={
            <LazyErrorBoundary>
              <AlarmLogDetailPage />
            </LazyErrorBoundary>
          } />
          <Route path="alarm-criteria" element={
            <LazyErrorBoundary>
              <AlarmCriteriaPage />
            </LazyErrorBoundary>
          } />
          <Route path="audit-trail" element={
            <LazyErrorBoundary>
              <AuditTrailDetailPage />
            </LazyErrorBoundary>
          } />
          <Route path="management" element={
            <LazyErrorBoundary>
              <ManagementDetailPage />
            </LazyErrorBoundary>
          } />
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
