import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { useLanguage } from '../../hooks/useLanguage';

const AuditTrailDetailPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: 3,
      }}
      data-id-ref="audit-trail-detail-page-container"
    >
      <Card
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
        data-id-ref="audit-trail-detail-page-card"
      >
        <Box
          sx={{
            px: 2,
            py: 2,
            borderBottom: 1,
            borderColor: 'divider',
          }}
          data-id-ref="audit-trail-detail-page-card-header"
        >
          <Typography variant="h6" component="h4" data-id-ref="audit-trail-detail-page-title">
            {t('auditTrailDetail')}
          </Typography>
        </Box>
        <CardContent
          sx={{
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          data-id-ref="audit-trail-detail-page-card-body"
        >
          <Typography color="text.secondary" data-id-ref="audit-trail-detail-page-placeholder">
            {t('auditTrailDetail')} page content will be added here.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AuditTrailDetailPage;
