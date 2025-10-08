import React from 'react';
import { Box, Container, Card, CardHeader, CardContent, Alert, AlertTitle, Typography } from '@mui/material';
import { useLanguage } from '../hooks/useLanguage';

const ActiveAlarmsPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <Container
      maxWidth={false}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        py: 3,
      }}
      data-id-ref="active-alarms-page-container"
    >
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }} data-id-ref="active-alarms-page-row">
        <Card
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
          data-id-ref="active-alarms-page-card"
        >
          <CardHeader
            title={
              <Typography variant="h5" component="h4" data-id-ref="active-alarms-page-title">
                {t('activeAlarms')}
              </Typography>
            }
            data-id-ref="active-alarms-page-header"
          />
          <CardContent sx={{ flexGrow: 1 }} data-id-ref="active-alarms-page-body">
            <Alert severity="info" data-id-ref="active-alarms-page-alert">
              <AlertTitle data-id-ref="active-alarms-page-alert-title">
                Active Alarms Not Available
              </AlertTitle>
              <Typography variant="body2" data-id-ref="active-alarms-page-alert-message">
                Active alarms data is not currently available. The monitoring endpoints have been
                temporarily disabled as they are not yet implemented on the backend.
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default ActiveAlarmsPage;
