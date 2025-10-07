import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useBootstrapRTL } from './hooks/useBootstrapRTL';
import { useFontLoader } from './hooks/useFontLoader';
import { useLanguage } from './hooks/useLanguage';
import { useTranslation } from './hooks/useTranslation';
import { useRoutePreloader } from './hooks/useRoutePreloader';
import { useTheme } from './hooks/useTheme';
import { useAuth } from './hooks/useAuth';
import { useGlobalActiveAlarmsStream } from './hooks/useGlobalActiveAlarmsStream';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import LoadingScreen from './components/LoadingScreen';
import LazyErrorBoundary from './components/LazyErrorBoundary';
import DashboardSkeleton from './components/DashboardSkeleton';
import MonitoringPageSkeleton from './components/MonitoringPageSkeleton';
import GenericPageSkeleton from './components/GenericPageSkeleton';
import ServiceWorkerPrompt from './components/ServiceWorkerPrompt';
import './App.css';

// Lazy load page components
const LoginPage = lazy(() => import('./components/LoginPage'));
const SyncPage = lazy(() => import('./components/SyncPage'));

// Lazy load layout components
const DashboardLayout = lazy(() => import('./components/DashboardLayout'));
const DetailLayout = lazy(() => import('./components/detail/DetailLayout'));

// Lazy load dashboard page components
const Dashboard = lazy(() => import('./components/Dashboard'));
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

// Lazy load detail page components
const TrendAnalysisPage = lazy(() => import('./components/detail/TrendAnalysisPage'));
const DataTablePage = lazy(() => import('./components/detail/DataTablePage'));
const LiveMonitoringDetailPage = lazy(() => import('./components/detail/LiveMonitoringDetailPage'));
const ActiveAlarmsDetailPage = lazy(() => import('./components/detail/ActiveAlarmsDetailPage'));
const AlarmLogDetailPage = lazy(() => import('./components/detail/AlarmLogDetailPage'));
const AlarmCriteriaPage = lazy(() => import('./components/detail/AlarmCriteriaPage'));
const AuditTrailDetailPage = lazy(() => import('./components/detail/AuditTrailDetailPage'));
const ManagementDetailPage = lazy(() => import('./components/detail/ManagementDetailPage'));

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
              <Suspense fallback={<LoadingScreen skeleton={<DashboardSkeleton />} variant="skeleton" />}>
                <Dashboard />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="monitoring" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen skeleton={<MonitoringPageSkeleton />} variant="skeleton" />}>
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
              <Suspense fallback={<LoadingScreen skeleton={<GenericPageSkeleton />} variant="skeleton" />}>
                <ActiveAlarmsPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="alarm-log" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen skeleton={<GenericPageSkeleton />} variant="skeleton" />}>
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
              <Suspense fallback={<LoadingScreen skeleton={<GenericPageSkeleton />} variant="skeleton" />}>
                <SettingsPage />
              </Suspense>
            </LazyErrorBoundary>
          } />
          <Route path="profile" element={
            <LazyErrorBoundary>
              <Suspense fallback={<LoadingScreen skeleton={<GenericPageSkeleton />} variant="skeleton" />}>
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
  
  // Dynamically load Bootstrap CSS based on language direction
  useBootstrapRTL();
  
  // Dynamically load Persian fonts only when needed (Persian language active)
  useFontLoader();
  
  // Initialize and apply theme (load from localStorage and apply CSS variables)
  useTheme();
  
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
