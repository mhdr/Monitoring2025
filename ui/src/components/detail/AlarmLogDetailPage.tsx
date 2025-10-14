import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { useLanguage } from '../../hooks/useLanguage';
import { CardHeader } from '../shared/CardHeader';

const AlarmLogDetailPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: 3,
      }}
      data-id-ref="alarm-log-detail-page-container"
    >
      <Card
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
        data-id-ref="alarm-log-detail-page-card"
      >
        <CardHeader 
          title={t('alarmLogDetail')}
          dataIdRef="alarm-log-detail-page-header"
        />
        <CardContent
          sx={{
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          data-id-ref="alarm-log-detail-page-card-body"
        >
          <Typography color="text.secondary" data-id-ref="alarm-log-detail-page-placeholder">
            {t('alarmLogDetail')} page content will be added here.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AlarmLogDetailPage;
