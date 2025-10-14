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

const ManagementPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <Container maxWidth="xl" data-id-ref="management-page-container" sx={{ py: 4 }}>
      <Card data-id-ref="management-page-card">
        <CardHeader
          data-id-ref="management-page-card-header"
          title={
            <Typography variant="h4" component="h1" data-id-ref="management-page-title">
              {t('management')}
            </Typography>
          }
        />
        <CardContent data-id-ref="management-page-card-body">
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              minHeight: 400 
            }}
          >
            <Typography color="text.secondary" data-id-ref="management-page-placeholder">
              {t('management')} page content will be added here.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default ManagementPage;