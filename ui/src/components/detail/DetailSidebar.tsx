import React, { useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';
import '../Sidebar.css';

interface DetailSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface MenuItem {
  path: string;
  key: string;
  icon: string;
}

const DetailSidebar: React.FC<DetailSidebarProps> = ({ isOpen, onToggle }) => {
  const { t, language } = useLanguage();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Get itemId from URL query string
  const itemId = searchParams.get('itemId');

  // Build full path with query string for each menu item
  const menuItemsWithQuery = useMemo(() => {
    const menuItems: MenuItem[] = [
      { path: '/item-detail/trend-analysis', key: 'trendAnalysis', icon: 'bi-graph-up-arrow' },
      { path: '/item-detail/data-table', key: 'dataTable', icon: 'bi-table' },
      { path: '/item-detail/live-monitoring', key: 'liveMonitoring', icon: 'bi-activity' },
      { path: '/item-detail/active-alarms', key: 'activeAlarmsDetail', icon: 'bi-exclamation-triangle-fill' },
      { path: '/item-detail/alarm-log', key: 'alarmLogDetail', icon: 'bi-journal-text' },
      { path: '/item-detail/alarm-criteria', key: 'alarmCriteria', icon: 'bi-funnel' },
      { path: '/item-detail/audit-trail', key: 'auditTrailDetail', icon: 'bi-list-check' },
      { path: '/item-detail/management', key: 'managementDetail', icon: 'bi-gear' },
    ];

    return menuItems.map((item) => ({
      ...item,
      fullPath: itemId ? `${item.path}?itemId=${itemId}` : item.path,
    }));
  }, [itemId]);

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
          data-id-ref="detail-sidebar-mobile-backdrop"
        ></div>
      )}

      {/* Sidebar */}
      <div 
        id="detail-sidebar"
        className={`sidebar ${language === 'fa' ? 'sidebar-rtl' : 'sidebar-ltr'} ${isOpen ? 'sidebar-open' : ''}`}
        dir={language === 'fa' ? 'rtl' : 'ltr'}
        data-sidebar="detail"
        style={{ backgroundColor: 'var(--primary-dark)' }}
        data-id-ref="detail-sidebar-root-container"
      >
        <div className="sidebar-header" data-id-ref="detail-sidebar-header">
          <h5 className="sidebar-title mb-0" data-id-ref="detail-sidebar-title">
            {t('itemDetailTitle')}
          </h5>
          <button
            className="btn btn-link sidebar-toggle d-lg-none p-0"
            onClick={onToggle}
            aria-label="Close sidebar"
            data-id-ref="detail-sidebar-toggle-close-btn"
          >
            <i className="bi bi-x-lg" data-id-ref="detail-sidebar-toggle-close-icon"></i>
          </button>
        </div>

        <div className="sidebar-divider" data-id-ref="detail-sidebar-divider"></div>

        <nav className="sidebar-nav" data-id-ref="detail-sidebar-nav">
          <ul className="nav flex-column" data-id-ref="detail-sidebar-nav-list">
            {menuItemsWithQuery.map((item) => (
              <li key={item.key} className="nav-item" data-id-ref={`detail-sidebar-nav-item-${item.key}`}>
                <Link
                  to={item.fullPath}
                  className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => {
                    // Close sidebar on mobile after navigation
                    if (window.innerWidth < 992) {
                      onToggle();
                    }
                  }}
                  data-id-ref={`detail-sidebar-nav-link-${item.key}`}
                >
                  <i className={item.icon} data-id-ref={`detail-sidebar-nav-icon-${item.key}`}></i>
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

export default DetailSidebar;
