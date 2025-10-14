import React from 'react';
import { Container, Card, CardContent, Box, Grid } from '@mui/material';
import SkeletonLoader from './SkeletonLoader';
import './MonitoringPageSkeleton.css';

/**
 * Monitoring Page Skeleton Screen
 * Displays placeholder content while MonitoringPage component loads
 */
const MonitoringPageSkeleton: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }} data-id-ref="monitoring-skeleton-container">
      {/* Header with Search/Filters */}
      <Box sx={{ mb: 4 }} data-id-ref="monitoring-skeleton-header">
        <SkeletonLoader variant="text" width="40%" height="2rem" className="mb-3" />
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <SkeletonLoader variant="rectangular" height="38px" />
          </Grid>
          <Grid item xs={12} md={4}>
            <SkeletonLoader variant="rectangular" height="38px" />
          </Grid>
          <Grid item xs={12} md={4}>
            <SkeletonLoader variant="rectangular" height="38px" />
          </Grid>
        </Grid>
      </Box>

      {/* Tree/Grid View */}
      <Card data-id-ref="monitoring-skeleton-tree-card">
        <CardContent>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} data-id-ref="monitoring-skeleton-toolbar">
            <SkeletonLoader variant="text" width="20%" height="1.5rem" />
            <SkeletonLoader variant="rectangular" width="150px" height="36px" />
          </Box>

          {/* Tree Items */}
          <Box data-id-ref="monitoring-skeleton-tree-items">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
              <Box
                key={item}
                className="monitoring-skeleton-item mb-2"
                sx={{ ml: `${(item % 3) * 20}px`, display: 'flex', alignItems: 'center' }}
                data-id-ref={`monitoring-skeleton-item-${item}`}
              >
                <SkeletonLoader variant="circular" width="24px" height="24px" className="me-2" />
                <SkeletonLoader variant="text" width="60%" height="1rem" />
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default MonitoringPageSkeleton;
