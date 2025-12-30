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
import { SignalRProvider } from './contexts/SignalRContext';
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
const UsersPage = lazy(() => import('./components/UsersPage'));
const HolidayCalendarPage = lazy(() => import('./components/HolidayCalendarPage'));
const ModbusControllersPage = lazy(() => import('./components/ModbusControllersPage'));
const Sharp7ControllersPage = lazy(() => import('./components/Sharp7ControllersPage'));
const ModbusGatewayPage = lazy(() => import('./components/ModbusGatewayPage'));
const TimeoutMemoryManagementPage = lazy(() => import('./components/TimeoutMemoryManagementPage'));
const AverageMemoryManagementPage = lazy(() => import('./components/AverageMemoryManagementPage'));
const PIDMemoryManagementPage = lazy(() => import('./components/PIDMemoryManagementPage'));
const TotalizerMemoryManagementPage = lazy(() => import('./components/TotalizerMemoryManagementPage'));
const RateOfChangeMemoryManagementPage = lazy(() => import('./components/RateOfChangeMemoryManagementPage'));
const ScheduleMemoryManagementPage = lazy(() => import('./components/ScheduleMemoryManagementPage'));
const MemoryPage = lazy(() => import('./components/MemoryPage'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));
const TrendAnalysisPage = lazy(() => import('./components/detail/TrendAnalysisPage'));
const DataTablePage = lazy(() => import('./components/detail/DataTablePage'));
const LiveMonitoringDetailPage = lazy(() => import('./components/detail/LiveMonitoringDetailPage'));
const StatisticsPage = lazy(() => import('./pages/StatisticsPage'));
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
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <SyncPage />
              </Suspense>
            </LazyErrorBoundary>
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <DashboardLayout />
              </Suspense>
            </LazyErrorBoundary>
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard/monitoring" replace />} />
          <Route path="monitoring" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <MonitoringPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="plots" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <PlotsPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="active-alarms" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <ActiveAlarmsPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="alarm-log" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <AlarmLogPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="audit-trail" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <AuditTrailPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="disabled-alarms" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <DisabledAlarmsPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="scheduler" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <SchedulerPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="management/users" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <UsersPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="management/holiday-calendars" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <HolidayCalendarPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="management/modbus-controllers" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <ModbusControllersPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="management/sharp7-controllers" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <Sharp7ControllersPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="management/modbus-gateway" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <ModbusGatewayPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          
          {/* Memory Routes - with MemorySidebar */}
          <Route path="memory/timeout-memory" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <TimeoutMemoryManagementPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="memory/average-memory" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <AverageMemoryManagementPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="memory/pid-memory" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <PIDMemoryManagementPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="memory/totalizer-memory" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <TotalizerMemoryManagementPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="memory/rateofchange-memory" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <RateOfChangeMemoryManagementPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="memory/schedule-memory" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <ScheduleMemoryManagementPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          
          <Route path="settings" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <SettingsPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="profile" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <ProfilePage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="sync" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <SyncPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
        </Route>
        <Route path="/item-detail" element={
          <ProtectedRoute>
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <DetailLayout />
              </Suspense>
            </LazyErrorBoundary>
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/item-detail/trend-analysis" replace />} />
          <Route path="trend-analysis" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <TrendAnalysisPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="data-table" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <DataTablePage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="live-monitoring" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <LiveMonitoringDetailPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="statistics" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <StatisticsPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="alarms" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <AlarmsDetailPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="active-alarms" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <ActiveAlarmsDetailPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="alarm-log" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <AlarmLogDetailPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="audit-trail" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <AuditTrailDetailPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="management" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
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
  
  // Background data synchronization with version checking
  // - Fetches settings version on app start/page refresh
  // - Compares with persisted version from localStorage
  // - Syncs Groups, Items, and Alarms in background if version changed
  // - Updates UI smoothly without showing SyncPage
  const { triggerManualSync } = useBackgroundSync({ isAuthenticated, isAuthLoading });

  // SignalR real-time connection for active alarms and settings updates
  // - Automatically connects when authenticated, disconnects on logout
  // - Handles ReceiveActiveAlarmsUpdate for real-time alarm count updates
  // - Handles ReceiveSettingsUpdate to trigger background sync when admin pushes updates
  const { reconnect } = useSignalR(isAuthenticated, isAuthLoading, {
    onSettingsUpdate: triggerManualSync,
  });

  // Initial active alarm count fetch (one-time only)
  // - Fetches once on app start/page refresh to initialize sidebar badge
  // - SignalR handles all subsequent real-time updates
  useActiveAlarmPolling(isAuthenticated, isAuthLoading);

  // Show loading screen during language changes
  if (isLoadingLanguage) {
    return <LoadingScreen message={t('loading')} />;
  }

  return (
    <SignalRProvider reconnect={reconnect}>
      <Router>
        <AppRoutes />
        <ServiceWorkerPrompt />
      </Router>
    </SignalRProvider>
  );
}

export default App;
