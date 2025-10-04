import React from 'react';
import SkeletonLoader from './SkeletonLoader';
import './DashboardSkeleton.css';

/**
 * Dashboard Skeleton Screen
 * Displays placeholder content while Dashboard component loads
 */
const DashboardSkeleton: React.FC = () => {
  return (
    <div className="dashboard-skeleton" data-id-ref="dashboard-skeleton-container">
      <div className="container-fluid py-4">
        {/* Header Section */}
        <div className="mb-4" data-id-ref="dashboard-skeleton-header">
          <SkeletonLoader variant="text" width="30%" height="2rem" className="mb-2" />
          <SkeletonLoader variant="text" width="50%" height="1.2rem" />
        </div>

        {/* Stats Cards Row */}
        <div className="row g-3 mb-4" data-id-ref="dashboard-skeleton-stats-row">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="col-12 col-sm-6 col-lg-3">
              <div className="card" data-id-ref={`dashboard-skeleton-card-${item}`}>
                <div className="card-body">
                  <SkeletonLoader variant="text" width="60%" height="1rem" className="mb-2" />
                  <SkeletonLoader variant="text" width="40%" height="2rem" className="mb-2" />
                  <SkeletonLoader variant="text" width="80%" height="0.875rem" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="row g-3" data-id-ref="dashboard-skeleton-main-content">
          {/* Chart Area */}
          <div className="col-12 col-lg-8">
            <div className="card" data-id-ref="dashboard-skeleton-chart-card">
              <div className="card-body">
                <SkeletonLoader variant="text" width="40%" height="1.5rem" className="mb-3" />
                <SkeletonLoader variant="rectangular" height="300px" />
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="col-12 col-lg-4">
            <div className="card" data-id-ref="dashboard-skeleton-side-panel-card">
              <div className="card-body">
                <SkeletonLoader variant="text" width="60%" height="1.5rem" className="mb-3" />
                {[1, 2, 3, 4, 5].map((item) => (
                  <div key={item} className="mb-3" data-id-ref={`dashboard-skeleton-list-item-${item}`}>
                    <SkeletonLoader variant="text" width="90%" height="1rem" className="mb-1" />
                    <SkeletonLoader variant="text" width="70%" height="0.875rem" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;
