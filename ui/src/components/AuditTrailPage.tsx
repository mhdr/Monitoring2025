import React from 'react';
import {
  Container,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Box,
} from '@mui/material';
import { useLanguage } from '../hooks/useLanguage';

const AuditTrailPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <Container maxWidth={false} data-id-ref="audit-trail-page-container" sx={{ height: '100%', width: '100%', py: '24px', px: 0, mx: 0 }}>
      <Card data-id-ref="audit-trail-page-card" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardHeader
          data-id-ref="audit-trail-page-card-header"
          title={
            <Typography variant="h4" component="h1" data-id-ref="audit-trail-page-title">
              {t('auditTrail')}
            </Typography>
          }
        />
        <CardContent data-id-ref="audit-trail-page-card-body" sx={{ flex: 1, overflow: 'auto' }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              minHeight: 400 
            }}
          >
            <Typography color="text.secondary" data-id-ref="audit-trail-page-placeholder">
              {t('auditTrail')} page content will be added here.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default AuditTrailPage;