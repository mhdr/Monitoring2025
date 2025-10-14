import React from 'react';
import { Container, Card, CardContent, Box } from '@mui/material';
import SkeletonLoader from './SkeletonLoader';
import './GenericPageSkeleton.css';

/**
 * Generic Page Skeleton Screen
 * Reusable placeholder for pages without specific skeletons
 */
const GenericPageSkeleton: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }} data-id-ref="generic-skeleton-container">
      {/* Page Title */}
      <Box sx={{ mb: 4 }} data-id-ref="generic-skeleton-title">
        <SkeletonLoader variant="text" width="40%" height="2.5rem" className="mb-2" />
        <SkeletonLoader variant="text" width="60%" height="1rem" />
      </Box>

      {/* Main Content Card */}
      <Card data-id-ref="generic-skeleton-card">
        <CardContent>
          {/* Content Rows */}
          {[1, 2, 3, 4, 5].map((item) => (
            <Box key={item} sx={{ mb: 4 }} data-id-ref={`generic-skeleton-section-${item}`}>
              <SkeletonLoader variant="text" width="30%" height="1.25rem" className="mb-2" />
              <SkeletonLoader variant="text" width="90%" height="1rem" className="mb-1" />
              <SkeletonLoader variant="text" width="80%" height="1rem" className="mb-1" />
              <SkeletonLoader variant="text" width="70%" height="1rem" />
            </Box>
          ))}
        </CardContent>
      </Card>
    </Container>
  );
};

export default GenericPageSkeleton;
