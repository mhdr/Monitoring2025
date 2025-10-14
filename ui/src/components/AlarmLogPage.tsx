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

const AlarmLogPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <Container maxWidth="xl" data-id-ref="alarm-log-page-container" sx={{ py: 4 }}>
      <Card data-id-ref="alarm-log-page-card">
        <CardHeader
          data-id-ref="alarm-log-page-card-header"
          title={
            <Typography variant="h4" component="h1" data-id-ref="alarm-log-page-title">
              {t('alarmLog')}
            </Typography>
          }
        />
        <CardContent data-id-ref="alarm-log-page-card-body">
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              minHeight: 400 
            }}
          >
            <Typography color="text.secondary" data-id-ref="alarm-log-page-placeholder">
              {t('alarmLog')} page content will be added here.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default AlarmLogPage;