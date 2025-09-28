import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import ResponsiveNavbar from './ResponsiveNavbar';
import Sidebar from './Sidebar';
import { useLanguage } from '../hooks/useLanguage';

const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { language } = useLanguage();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className={`d-flex vh-100 ${language === 'fa' ? 'flex-row-reverse' : ''}`} dir={language === 'fa' ? 'rtl' : 'ltr'}>
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      
      {/* Main Content Area */}
      <div className="flex-fill d-flex flex-column overflow-hidden">
        {/* Top Navigation */}
        <ResponsiveNavbar onToggleSidebar={toggleSidebar} />
        
        {/* Page Content */}
        <main className="flex-fill overflow-auto bg-light">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;