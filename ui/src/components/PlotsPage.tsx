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

const PlotsPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <Container maxWidth="xl" data-id-ref="plots-page-container" sx={{ py: 4 }}>
      <Card data-id-ref="plots-page-card">
        <CardHeader
          data-id-ref="plots-page-card-header"
          title={
            <Typography variant="h4" component="h1" data-id-ref="plots-page-title">
              {t('plots')}
            </Typography>
          }
        />
        <CardContent data-id-ref="plots-page-card-body">
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              minHeight: 400 
            }}
          >
            <Typography color="text.secondary" data-id-ref="plots-page-placeholder">
              {t('plots')} page content will be added here.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default PlotsPage;