import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import type { TranslationKey } from '../utils/translations';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface MenuItem {
  path: string;
  key: TranslationKey;
  icon: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const { t, language } = useLanguage();
  const location = useLocation();

  const menuItems: MenuItem[] = [
    { path: '/dashboard/monitoring', key: 'monitoring', icon: 'bi-display' },
    { path: '/dashboard/plots', key: 'plots', icon: 'bi-graph-up' },
    { path: '/dashboard/active-alarms', key: 'activeAlarms', icon: 'bi-exclamation-triangle-fill' },
    { path: '/dashboard/alarm-log', key: 'alarmLog', icon: 'bi-journal-text' },
    { path: '/dashboard/audit-trail', key: 'auditTrail', icon: 'bi-list-check' },
    { path: '/dashboard/disabled-alarms', key: 'disabledAlarms', icon: 'bi-bell-slash' },
    { path: '/dashboard/scheduler', key: 'scheduler', icon: 'bi-calendar-event' },
    { path: '/dashboard/management', key: 'management', icon: 'bi-gear' },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="sidebar-backdrop d-lg-none" 
          onClick={onToggle}
        ></div>
      )}

      {/* Sidebar */}
      <div 
        id="main-sidebar"
        className={`sidebar ${isOpen ? 'sidebar-open' : ''} ${language === 'fa' ? 'sidebar-rtl' : 'sidebar-ltr'}`}
        dir={language === 'fa' ? 'rtl' : 'ltr'}
        data-sidebar="main"
        style={{ backgroundColor: language === 'fa' ? '#2c3e50' : '#2c3e50' }}
      >
        <div className="sidebar-header">
          <h5 className="sidebar-title mb-0">
            {t('systemTitle')} v2
          </h5>
          <button
            className="btn btn-link sidebar-toggle d-lg-none p-0"
            onClick={onToggle}
            aria-label="Close sidebar"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="sidebar-divider"></div>

        <nav className="sidebar-nav">
          <ul className="nav flex-column">
            {menuItems.map((item) => (
              <li key={item.key} className="nav-item">
                <Link
                  to={item.path}
                  className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => {
                    // Close sidebar on mobile after navigation
                    if (window.innerWidth < 992) {
                      onToggle();
                    }
                  }}
                >
                  <i className={`${item.icon} ${language === 'fa' ? 'ms-2' : 'me-2'}`}></i>
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
};

export default Sidebar;