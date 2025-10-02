import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import ResponsiveNavbar from './ResponsiveNavbar';
import Sidebar from './Sidebar';
import { useLanguage } from '../hooks/useLanguage';
import './DashboardLayout.css';

const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { language } = useLanguage();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div
      className={`dashboard-container d-flex vh-100 ${language === 'fa' ? 'flex-row-reverse' : ''}`}
      dir={language === 'fa' ? 'rtl' : 'ltr'}
      data-id-ref="dashboard-layout-root-container"
    >
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} data-id-ref="dashboard-layout-sidebar-component" />

      {/* Main Content Area */}
      <div
        className={`flex-fill d-flex flex-column overflow-hidden ${language === 'fa' ? 'main-content-rtl' : 'main-content-ltr'}`}
        data-id-ref="dashboard-layout-main-content-area"
      >
        {/* Top Navigation */}
        <ResponsiveNavbar onToggleSidebar={toggleSidebar} data-id-ref="dashboard-layout-navbar-component" />

        {/* Page Content */}
        <main className="flex-fill overflow-auto bg-light" data-id-ref="dashboard-layout-page-content-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;