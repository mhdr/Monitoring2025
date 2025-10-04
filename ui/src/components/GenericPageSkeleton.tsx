import React from 'react';
import SkeletonLoader from './SkeletonLoader';
import './GenericPageSkeleton.css';

/**
 * Generic Page Skeleton Screen
 * Reusable placeholder for pages without specific skeletons
 */
const GenericPageSkeleton: React.FC = () => {
  return (
    <div className="generic-skeleton" data-id-ref="generic-skeleton-container">
      <div className="container-fluid py-4">
        {/* Page Title */}
        <div className="mb-4" data-id-ref="generic-skeleton-title">
          <SkeletonLoader variant="text" width="40%" height="2.5rem" className="mb-2" />
          <SkeletonLoader variant="text" width="60%" height="1rem" />
        </div>

        {/* Main Content Card */}
        <div className="card" data-id-ref="generic-skeleton-card">
          <div className="card-body">
            {/* Content Rows */}
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="mb-4" data-id-ref={`generic-skeleton-section-${item}`}>
                <SkeletonLoader variant="text" width="30%" height="1.25rem" className="mb-2" />
                <SkeletonLoader variant="text" width="90%" height="1rem" className="mb-1" />
                <SkeletonLoader variant="text" width="80%" height="1rem" className="mb-1" />
                <SkeletonLoader variant="text" width="70%" height="1rem" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenericPageSkeleton;
