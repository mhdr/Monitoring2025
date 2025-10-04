import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useBootstrapRTL } from './hooks/useBootstrapRTL';
import { useLanguage } from './hooks/useLanguage';
import { useTranslation } from './hooks/useTranslation';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import LoadingScreen from './components/LoadingScreen';
import './App.css';

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

// Lazy load detail page components
const TrendAnalysisPage = lazy(() => import('./components/detail/TrendAnalysisPage'));
const DataTablePage = lazy(() => import('./components/detail/DataTablePage'));
const LiveMonitoringDetailPage = lazy(() => import('./components/detail/LiveMonitoringDetailPage'));
const ActiveAlarmsDetailPage = lazy(() => import('./components/detail/ActiveAlarmsDetailPage'));
const AlarmLogDetailPage = lazy(() => import('./components/detail/AlarmLogDetailPage'));
const AlarmCriteriaPage = lazy(() => import('./components/detail/AlarmCriteriaPage'));
const AuditTrailDetailPage = lazy(() => import('./components/detail/AuditTrailDetailPage'));
const ManagementDetailPage = lazy(() => import('./components/detail/ManagementDetailPage'));

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const { isLoadingLanguage } = useLanguage();
  const { t } = useTranslation();
  
  // Dynamically load Bootstrap CSS based on language direction
  useBootstrapRTL();

  useEffect(() => {
    // Remove initial loading screen from HTML after app initializes
    const removeInitialLoader = () => {
      const initialLoader = document.getElementById('initial-loading-screen');
      if (initialLoader) {
        initialLoader.classList.add('hide');
        setTimeout(() => {
          initialLoader.remove();
        }, 300); // Match transition duration
      }
      setIsInitialized(true);
    };

    // Wait a bit for everything to be ready
    const timer = setTimeout(removeInitialLoader, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Show loading screen during language changes
  if (isLoadingLanguage) {
    return <LoadingScreen message={t('loading')} />;
  }

  // Don't render content until initialization is complete
  if (!isInitialized) {
    return null;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<PublicRoute />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingScreen message={t('loading')} />}>
              <DashboardLayout />
            </Suspense>
          </ProtectedRoute>
        }>
          <Route index element={
            <Suspense fallback={<LoadingScreen message={t('loading')} />}>
              <Dashboard />
            </Suspense>
          } />
          <Route path="monitoring" element={
            <Suspense fallback={<LoadingScreen message={t('loading')} />}>
              <MonitoringPage />
            </Suspense>
          } />
          <Route path="plots" element={
            <Suspense fallback={<LoadingScreen message={t('loading')} />}>
              <PlotsPage />
            </Suspense>
          } />
          <Route path="active-alarms" element={
            <Suspense fallback={<LoadingScreen message={t('loading')} />}>
              <ActiveAlarmsPage />
            </Suspense>
          } />
          <Route path="alarm-log" element={
            <Suspense fallback={<LoadingScreen message={t('loading')} />}>
              <AlarmLogPage />
            </Suspense>
          } />
          <Route path="audit-trail" element={
            <Suspense fallback={<LoadingScreen message={t('loading')} />}>
              <AuditTrailPage />
            </Suspense>
          } />
          <Route path="disabled-alarms" element={
            <Suspense fallback={<LoadingScreen message={t('loading')} />}>
              <DisabledAlarmsPage />
            </Suspense>
          } />
          <Route path="scheduler" element={
            <Suspense fallback={<LoadingScreen message={t('loading')} />}>
              <SchedulerPage />
            </Suspense>
          } />
          <Route path="management" element={
            <Suspense fallback={<LoadingScreen message={t('loading')} />}>
              <ManagementPage />
            </Suspense>
          } />
        </Route>
        <Route path="/item-detail" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingScreen message={t('loading')} />}>
              <DetailLayout />
            </Suspense>
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/item-detail/trend-analysis" replace />} />
          <Route path="trend-analysis" element={
            <Suspense fallback={<LoadingScreen message={t('loading')} />}>
              <TrendAnalysisPage />
            </Suspense>
          } />
          <Route path="data-table" element={
            <Suspense fallback={<LoadingScreen message={t('loading')} />}>
              <DataTablePage />
            </Suspense>
          } />
          <Route path="live-monitoring" element={
            <Suspense fallback={<LoadingScreen message={t('loading')} />}>
              <LiveMonitoringDetailPage />
            </Suspense>
          } />
          <Route path="active-alarms" element={
            <Suspense fallback={<LoadingScreen message={t('loading')} />}>
              <ActiveAlarmsDetailPage />
            </Suspense>
          } />
          <Route path="alarm-log" element={
            <Suspense fallback={<LoadingScreen message={t('loading')} />}>
              <AlarmLogDetailPage />
            </Suspense>
          } />
          <Route path="alarm-criteria" element={
            <Suspense fallback={<LoadingScreen message={t('loading')} />}>
              <AlarmCriteriaPage />
            </Suspense>
          } />
          <Route path="audit-trail" element={
            <Suspense fallback={<LoadingScreen message={t('loading')} />}>
              <AuditTrailDetailPage />
            </Suspense>
          } />
          <Route path="management" element={
            <Suspense fallback={<LoadingScreen message={t('loading')} />}>
              <ManagementDetailPage />
            </Suspense>
          } />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
