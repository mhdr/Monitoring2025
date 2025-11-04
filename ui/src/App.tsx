import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useFontLoader } from './hooks/useFontLoader';
import { useLanguage } from './hooks/useLanguage';
import { useTranslation } from './hooks/useTranslation';
import { useRoutePreloader } from './hooks/useRoutePreloader';
import { useAuth } from './hooks/useAuth';
import { useSignalR } from './hooks/useSignalR';
import { useActiveAlarmPolling } from './hooks/useActiveAlarmPolling';
import { useBackgroundSync } from './hooks/useBackgroundSync';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import LoadingScreen from './components/LoadingScreen';
import LazyErrorBoundary from './components/LazyErrorBoundary';
import ServiceWorkerPrompt from './components/ServiceWorkerPrompt';
// Lazy-loaded route components to avoid mixing static and dynamic imports
const SyncPage = lazy(() => import('./components/SyncPage'));
const DashboardLayout = lazy(() => import('./components/DashboardLayout'));
const DetailLayout = lazy(() => import('./components/detail/DetailLayout'));
const MonitoringPage = lazy(() => import('./components/MonitoringPage'));
const PlotsPage = lazy(() => import('./components/PlotsPage'));
const ActiveAlarmsPage = lazy(() => import('./components/ActiveAlarmsPage'));
const AlarmLogPage = lazy(() => import('./components/AlarmLogPage'));
const AuditTrailPage = lazy(() => import('./components/AuditTrailPage'));
const DisabledAlarmsPage = lazy(() => import('./components/DisabledAlarmsPage'));
const SchedulerPage = lazy(() => import('./components/SchedulerPage'));
const ManagementPage = lazy(() => import('./components/ManagementPage'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));
const TrendAnalysisPage = lazy(() => import('./components/detail/TrendAnalysisPage'));
const DataTablePage = lazy(() => import('./components/detail/DataTablePage'));
const LiveMonitoringDetailPage = lazy(() => import('./components/detail/LiveMonitoringDetailPage'));
const AlarmsDetailPage = lazy(() => import('./components/detail/AlarmsDetailPage'));
const ActiveAlarmsDetailPage = lazy(() => import('./components/detail/ActiveAlarmsDetailPage'));
const AlarmLogDetailPage = lazy(() => import('./components/detail/AlarmLogDetailPage'));
const AuditTrailDetailPage = lazy(() => import('./components/detail/AuditTrailDetailPage'));
const ManagementDetailPage = lazy(() => import('./components/detail/ManagementDetailPage'));
import './App.css';

/**
 * AppRoutes Component
 * Contains all routes and must be inside Router for useLocation to work
 */
const AppRoutes = () => {
  // Enable intelligent route preloading based on navigation patterns
  // This must be inside Router component to access useLocation
  useRoutePreloader();
  const { t } = useTranslation();

  return (
      <Routes>
        <Route path="/login" element={<PublicRoute />} />
        <Route path="/sync" element={
          <ProtectedRoute>
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} /> }>
                <SyncPage />
              </Suspense>
            </LazyErrorBoundary>
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} /> }>
                <DashboardLayout />
              </Suspense>
            </LazyErrorBoundary>
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard/monitoring" replace />} />
          <Route path="monitoring" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} /> }>
                <MonitoringPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="plots" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} /> }>
                <PlotsPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="active-alarms" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} /> }>
                <ActiveAlarmsPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="alarm-log" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} /> }>
                <AlarmLogPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="audit-trail" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} /> }>
                <AuditTrailPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="disabled-alarms" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} /> }>
                <DisabledAlarmsPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="scheduler" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} /> }>
                <SchedulerPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="management" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} /> }>
                <ManagementPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="settings" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} /> }>
                <SettingsPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="profile" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} /> }>
                <ProfilePage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="sync" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} /> }>
                <SyncPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
        </Route>
        <Route path="/item-detail" element={
          <ProtectedRoute>
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} /> }>
                <DetailLayout />
              </Suspense>
            </LazyErrorBoundary>
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/item-detail/trend-analysis" replace />} />
          <Route path="trend-analysis" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} /> }>
                <TrendAnalysisPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="data-table" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} /> }>
                <DataTablePage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="live-monitoring" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} /> }>
                <LiveMonitoringDetailPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="alarms" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} /> }>
                <AlarmsDetailPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="active-alarms" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} /> }>
                <ActiveAlarmsDetailPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="alarm-log" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} /> }>
                <AlarmLogDetailPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="audit-trail" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} /> }>
                <AuditTrailDetailPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="management" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} /> }>
                <ManagementDetailPage />
              </Suspense>
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

  // Smart polling for active alarm count with SignalR fallback
  // - Fetches on app start/refresh
  // - Polls every 5 seconds
  // - Stops polling after 1 minute if SignalR is connected
  // - Resumes polling if SignalR disconnects for more than 5 seconds
  useActiveAlarmPolling(isAuthenticated, isAuthLoading);

  // Background data synchronization with version checking
  // - Fetches settings version on app start/page refresh
  // - Compares with persisted version from localStorage
  // - Syncs Groups, Items, and Alarms in background if version changed
  // - Updates UI smoothly without showing SyncPage
  useBackgroundSync({ isAuthenticated, isAuthLoading });

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
