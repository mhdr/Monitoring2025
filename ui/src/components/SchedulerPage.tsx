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

const SchedulerPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <Container maxWidth="xl" data-id-ref="scheduler-page-container" sx={{ py: 4 }}>
      <Card data-id-ref="scheduler-page-card">
        <CardHeader
          data-id-ref="scheduler-page-card-header"
          title={
            <Typography variant="h4" component="h1" data-id-ref="scheduler-page-title">
              {t('scheduler')}
            </Typography>
          }
        />
        <CardContent data-id-ref="scheduler-page-card-body">
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              minHeight: 400 
            }}
          >
            <Typography color="text.secondary" data-id-ref="scheduler-page-placeholder">
              {t('scheduler')} page content will be added here.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default SchedulerPage;