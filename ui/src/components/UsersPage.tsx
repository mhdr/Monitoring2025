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

const UsersPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <Container 
      maxWidth={false} 
      data-id-ref="users-page-container" 
      sx={{ 
        height: '100%', 
        width: '100%', 
        py: 3, 
        px: { xs: 2, sm: 3 },
      }}
    >
      <Card 
        data-id-ref="users-page-card" 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column' 
        }}
      >
        <CardHeader
          data-id-ref="users-page-card-header"
          title={
            <Typography 
              variant="h4" 
              component="h1" 
              data-id-ref="users-page-title"
            >
              {t('users')}
            </Typography>
          }
        />
        <CardContent 
          data-id-ref="users-page-card-body" 
          sx={{ 
            flex: 1, 
            overflow: 'auto' 
          }}
        >
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              minHeight: 400 
            }}
            data-id-ref="users-page-placeholder"
          >
            <Typography color="text.secondary">
              {t('users')} page content will be added here.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default UsersPage;
