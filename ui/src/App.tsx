import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import './App.css';

function App() {
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
