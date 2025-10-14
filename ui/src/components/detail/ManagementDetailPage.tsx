import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { useLanguage } from '../../hooks/useLanguage';

const ManagementDetailPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: 3,
      }}
      data-id-ref="management-detail-page-container"
    >
      <Card
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
        data-id-ref="management-detail-page-card"
      >
        <Box
          sx={{
            px: 2,
            py: 2,
            borderBottom: 1,
            borderColor: 'divider',
          }}
          data-id-ref="management-detail-page-card-header"
        >
          <Typography variant="h6" component="h4" data-id-ref="management-detail-page-title">
            {t('managementDetail')}
          </Typography>
        </Box>
        <CardContent
          sx={{
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          data-id-ref="management-detail-page-card-body"
        >
          <Typography color="text.secondary" data-id-ref="management-detail-page-placeholder">
            {t('managementDetail')} page content will be added here.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ManagementDetailPage;
