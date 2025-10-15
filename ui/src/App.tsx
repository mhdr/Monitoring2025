import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useFontLoader } from './hooks/useFontLoader';
import { useLanguage } from './hooks/useLanguage';
import { useTranslation } from './hooks/useTranslation';
import { useRoutePreloader } from './hooks/useRoutePreloader';
import { useAuth } from './hooks/useAuth';
import { useGlobalActiveAlarmsStream } from './hooks/useGlobalActiveAlarmsStream';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import LoadingScreen from './components/LoadingScreen';
import LazyErrorBoundary from './components/LazyErrorBoundary';
import ServiceWorkerPrompt from './components/ServiceWorkerPrompt';
import './App.css';

// Lazy load page components with chunk names for better debugging
const SyncPage = lazy(() => import(/* webpackChunkName: "sync-page" */ './components/SyncPage'));

// Lazy load layout components - these are critical and should be loaded early
const DashboardLayout = lazy(() => import(/* webpackChunkName: "dashboard-layout" */ './components/DashboardLayout'));
const DetailLayout = lazy(() => import(/* webpackChunkName: "detail-layout" */ './components/detail/DetailLayout'));

// Lazy load dashboard page components - frequently accessed, load on demand
const Dashboard = lazy(() => import(/* webpackChunkName: "dashboard" */ './components/Dashboard'));
const MonitoringPage = lazy(() => import(/* webpackChunkName: "monitoring" */ './components/MonitoringPage'));
const PlotsPage = lazy(() => import(/* webpackChunkName: "plots" */ './components/PlotsPage'));
const ActiveAlarmsPage = lazy(() => import(/* webpackChunkName: "active-alarms" */ './components/ActiveAlarmsPage'));
const AlarmLogPage = lazy(() => import(/* webpackChunkName: "alarm-log" */ './components/AlarmLogPage'));
const AuditTrailPage = lazy(() => import(/* webpackChunkName: "audit-trail" */ './components/AuditTrailPage'));
const DisabledAlarmsPage = lazy(() => import(/* webpackChunkName: "disabled-alarms" */ './components/DisabledAlarmsPage'));
const SchedulerPage = lazy(() => import(/* webpackChunkName: "scheduler" */ './components/SchedulerPage'));
const ManagementPage = lazy(() => import(/* webpackChunkName: "management" */ './components/ManagementPage'));
const SettingsPage = lazy(() => import(/* webpackChunkName: "settings" */ './components/SettingsPage'));
const ProfilePage = lazy(() => import(/* webpackChunkName: "profile" */ './components/ProfilePage'));

// Lazy load detail page components - accessed less frequently, lower priority
const TrendAnalysisPage = lazy(() => import(/* webpackChunkName: "trend-analysis" */ './components/detail/TrendAnalysisPage'));
const DataTablePage = lazy(() => import(/* webpackChunkName: "data-table" */ './components/detail/DataTablePage'));
const LiveMonitoringDetailPage = lazy(() => import(/* webpackChunkName: "live-monitoring-detail" */ './components/detail/LiveMonitoringDetailPage'));
const ActiveAlarmsDetailPage = lazy(() => import(/* webpackChunkName: "active-alarms-detail" */ './components/detail/ActiveAlarmsDetailPage'));
const AlarmLogDetailPage = lazy(() => import(/* webpackChunkName: "alarm-log-detail" */ './components/detail/AlarmLogDetailPage'));
const AlarmCriteriaPage = lazy(() => import(/* webpackChunkName: "alarm-criteria" */ './components/detail/AlarmCriteriaPage'));
const AuditTrailDetailPage = lazy(() => import(/* webpackChunkName: "audit-trail-detail" */ './components/detail/AuditTrailDetailPage'));
const ManagementDetailPage = lazy(() => import(/* webpackChunkName: "management-detail" */ './components/detail/ManagementDetailPage'));

/**
 * AppRoutes Component
 * Contains all routes and must be inside Router for useLocation to work
 */
const AppRoutes = () => {
  const { t } = useTranslation();
  
  // Enable intelligent route preloading based on navigation patterns
  // This must be inside Router component to access useLocation
  useRoutePreloader();

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
          <Route index element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <Dashboard />
              </Suspense>
            </LazyErrorBoundary>
          } />
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
          <Route path="management" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <ManagementPage />
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
          <Route path="alarm-criteria" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                <AlarmCriteriaPage />
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
  const { isAuthenticated } = useAuth();
  
  // Dynamically load Persian fonts only when needed (Persian language active)
  useFontLoader();
  
  // Global active alarms subscription - runs automatically when authenticated
  // Updates Redux store with real-time alarm count data accessible from anywhere
  useGlobalActiveAlarmsStream(isAuthenticated);

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
