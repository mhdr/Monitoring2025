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

const DisabledAlarmsPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <Container maxWidth={false} data-id-ref="disabled-alarms-page-root-container" sx={{ height: '100%', width: '100%', py: '24px', px: 0, mx: 0 }}>
      <Card data-id-ref="disabled-alarms-page-card" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardHeader
          data-id-ref="disabled-alarms-page-card-header"
          title={
            <Typography variant="h4" component="h1" data-id-ref="disabled-alarms-page-title">
              {t('disabledAlarms')}
            </Typography>
          }
        />
        <CardContent data-id-ref="disabled-alarms-page-card-body" sx={{ flex: 1, overflow: 'auto' }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              minHeight: 400 
            }}
          >
            <Typography color="text.secondary" data-id-ref="disabled-alarms-page-content-placeholder">
              {t('disabledAlarms')} page content will be added here.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default DisabledAlarmsPage;