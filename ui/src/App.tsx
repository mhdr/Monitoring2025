import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useBootstrapRTL } from './hooks/useBootstrapRTL';
import { useLanguage } from './hooks/useLanguage';
import { useTranslation } from './hooks/useTranslation';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './components/Dashboard';
import MonitoringPage from './components/MonitoringPage';
import PlotsPage from './components/PlotsPage';
import ActiveAlarmsPage from './components/ActiveAlarmsPage';
import AlarmLogPage from './components/AlarmLogPage';
import AuditTrailPage from './components/AuditTrailPage';
import DisabledAlarmsPage from './components/DisabledAlarmsPage';
import SchedulerPage from './components/SchedulerPage';
import ManagementPage from './components/ManagementPage';
import LoadingScreen from './components/LoadingScreen';
import './App.css';

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
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="monitoring" element={<MonitoringPage />} />
          <Route path="plots" element={<PlotsPage />} />
          <Route path="active-alarms" element={<ActiveAlarmsPage />} />
          <Route path="alarm-log" element={<AlarmLogPage />} />
          <Route path="audit-trail" element={<AuditTrailPage />} />
          <Route path="disabled-alarms" element={<DisabledAlarmsPage />} />
          <Route path="scheduler" element={<SchedulerPage />} />
          <Route path="management" element={<ManagementPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
