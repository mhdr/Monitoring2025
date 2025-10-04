import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import ResponsiveNavbar from '../ResponsiveNavbar';
import DetailSidebar from './DetailSidebar';
import { useLanguage } from '../../hooks/useLanguage';
import '../DashboardLayout.css';

const DetailLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Mirror DashboardLayout behavior to avoid permanent opacity:0 (blank page)
  const [isReady, setIsReady] = useState(false);
  const { language } = useLanguage();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Mark layout as ready after mount to trigger CSS fade-in
  useEffect(() => {
    setIsReady(true);
  }, []);

  return (
    <div
      className={`dashboard-container d-flex vh-100 ${language === 'fa' ? 'flex-row-reverse' : ''} ${isReady ? 'dashboard-ready' : ''}`}
      dir={language === 'fa' ? 'rtl' : 'ltr'}
      data-id-ref="detail-layout-root-container"
    >
      {/* Detail Sidebar */}
      <DetailSidebar isOpen={sidebarOpen} onToggle={toggleSidebar} data-id-ref="detail-layout-sidebar-component" />

      {/* Main Content Area */}
      <div
        className={`flex-fill d-flex flex-column overflow-hidden ${language === 'fa' ? 'main-content-rtl' : 'main-content-ltr'}`}
        data-id-ref="detail-layout-main-content-area"
      >
        {/* Top Navigation */}
        <ResponsiveNavbar onToggleSidebar={toggleSidebar} data-id-ref="detail-layout-navbar-component" />

        {/* Page Content */}
        <main className="flex-fill overflow-auto bg-light" data-id-ref="detail-layout-page-content-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DetailLayout;
