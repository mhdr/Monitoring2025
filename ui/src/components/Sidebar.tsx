import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { useActiveAlarms } from '../hooks/useRedux';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface MenuItem {
  path: string;
  key: string;
  icon: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const { t, language } = useLanguage();
  const location = useLocation();
  const { alarmCount, streamStatus } = useActiveAlarms();

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
          data-id-ref="sidebar-mobile-backdrop"
        ></div>
      )}

      {/* Sidebar */}
      <div 
        id="main-sidebar"
        className={`sidebar ${language === 'fa' ? 'sidebar-rtl' : 'sidebar-ltr'} ${isOpen ? 'sidebar-open' : ''}`}
        dir={language === 'fa' ? 'rtl' : 'ltr'}
        data-sidebar="main"
        style={{ backgroundColor: 'var(--primary-dark)' }}
        data-id-ref="sidebar-root-container"
      >
        <div className="sidebar-header" data-id-ref="sidebar-header">
          <h5 className="sidebar-title mb-0" data-id-ref="sidebar-title">
            {t('systemTitle')}
          </h5>
          <button
            className="btn btn-link sidebar-toggle d-lg-none p-0"
            onClick={onToggle}
            aria-label="Close sidebar"
            data-id-ref="sidebar-toggle-close-btn"
          >
            <i className="bi bi-x-lg" data-id-ref="sidebar-toggle-close-icon"></i>
          </button>
        </div>

        <div className="sidebar-divider" data-id-ref="sidebar-divider"></div>

        <nav className="sidebar-nav" data-id-ref="sidebar-nav">
          <ul className="nav flex-column" data-id-ref="sidebar-nav-list">
            {menuItems.map((item) => (
              <li key={item.key} className="nav-item" data-id-ref={`sidebar-nav-item-${item.key}`}>
                <Link
                  to={item.path}
                  className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => {
                    // Close sidebar on mobile after navigation
                    if (window.innerWidth < 992) {
                      onToggle();
                    }
                  }}
                  data-id-ref={`sidebar-nav-link-${item.key}`}
                >
                  <i className={item.icon} data-id-ref={`sidebar-nav-icon-${item.key}`}></i>
                  {t(item.key)}
                  {/* Show live alarm count badge for active alarms menu item */}
                  {item.key === 'activeAlarms' && streamStatus === 'connected' && alarmCount > 0 && (
                    <span 
                      className="badge bg-danger ms-2 rounded-pill"
                      data-id-ref="sidebar-active-alarms-badge"
                      title={`${alarmCount} active alarms`}
                    >
                      {alarmCount}
                    </span>
                  )}
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