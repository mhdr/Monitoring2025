import React from 'react';
import SkeletonLoader from './SkeletonLoader';
import './MonitoringPageSkeleton.css';

/**
 * Monitoring Page Skeleton Screen
 * Displays placeholder content while MonitoringPage component loads
 */
const MonitoringPageSkeleton: React.FC = () => {
  return (
    <div className="monitoring-skeleton" data-id-ref="monitoring-skeleton-container">
      <div className="container-fluid py-4">
        {/* Header with Search/Filters */}
        <div className="mb-4" data-id-ref="monitoring-skeleton-header">
          <SkeletonLoader variant="text" width="40%" height="2rem" className="mb-3" />
          <div className="row g-2">
            <div className="col-12 col-md-4">
              <SkeletonLoader variant="rectangular" height="38px" />
            </div>
            <div className="col-12 col-md-4">
              <SkeletonLoader variant="rectangular" height="38px" />
            </div>
            <div className="col-12 col-md-4">
              <SkeletonLoader variant="rectangular" height="38px" />
            </div>
          </div>
        </div>

        {/* Tree/Grid View */}
        <div className="card" data-id-ref="monitoring-skeleton-tree-card">
          <div className="card-body">
            <div className="mb-3" data-id-ref="monitoring-skeleton-toolbar">
              <div className="d-flex justify-content-between align-items-center">
                <SkeletonLoader variant="text" width="20%" height="1.5rem" />
                <SkeletonLoader variant="rectangular" width="150px" height="36px" />
              </div>
            </div>

            {/* Tree Items */}
            <div data-id-ref="monitoring-skeleton-tree-items">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                <div
                  key={item}
                  className="monitoring-skeleton-item mb-2"
                  style={{ marginLeft: `${(item % 3) * 20}px` }}
                  data-id-ref={`monitoring-skeleton-item-${item}`}
                >
                  <div className="d-flex align-items-center">
                    <SkeletonLoader variant="circular" width="24px" height="24px" className="me-2" />
                    <SkeletonLoader variant="text" width="60%" height="1rem" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitoringPageSkeleton;
