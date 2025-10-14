import React from 'react';
import { Container, Card, CardContent, Box, Grid } from '@mui/material';
import SkeletonLoader from './SkeletonLoader';
import './DashboardSkeleton.css';

/**
 * Dashboard Skeleton Screen
 * Displays placeholder content while Dashboard component loads
 */
const DashboardSkeleton: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }} data-id-ref="dashboard-skeleton-container">
      {/* Header Section */}
      <Box sx={{ mb: 4 }} data-id-ref="dashboard-skeleton-header">
        <SkeletonLoader variant="text" width="45%" height="2rem" className="mb-2" />
        <SkeletonLoader variant="text" width="70%" height="1.2rem" />
      </Box>

      {/* Stats Cards Row */}
      <Grid container spacing={3} sx={{ mb: 4 }} data-id-ref="dashboard-skeleton-stats-row">
        {[1, 2, 3, 4].map((item) => (
          <Grid item xs={12} sm={6} lg={3} key={item}>
            <Card data-id-ref={`dashboard-skeleton-card-${item}`}>
              <CardContent>
                <SkeletonLoader variant="text" width="75%" height="1rem" className="mb-2" />
                <SkeletonLoader variant="text" width="55%" height="2rem" className="mb-2" />
                <SkeletonLoader variant="text" width="95%" height="0.875rem" />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Main Content Area */}
      <Grid container spacing={3} data-id-ref="dashboard-skeleton-main-content">
        {/* Chart Area */}
        <Grid item xs={12} lg={8}>
          <Card data-id-ref="dashboard-skeleton-chart-card">
            <CardContent>
              <SkeletonLoader variant="text" width="55%" height="1.5rem" className="mb-3" />
              <SkeletonLoader variant="rectangular" height="300px" />
            </CardContent>
          </Card>
        </Grid>

        {/* Side Panel */}
        <Grid item xs={12} lg={4}>
          <Card data-id-ref="dashboard-skeleton-side-panel-card">
            <CardContent>
              <SkeletonLoader variant="text" width="75%" height="1.5rem" className="mb-3" />
              {[1, 2, 3, 4, 5].map((item) => (
                <Box key={item} sx={{ mb: 3 }} data-id-ref={`dashboard-skeleton-list-item-${item}`}>
                  <SkeletonLoader variant="text" width="95%" height="1rem" className="mb-1" />
                  <SkeletonLoader variant="text" width="85%" height="0.875rem" />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default DashboardSkeleton;
