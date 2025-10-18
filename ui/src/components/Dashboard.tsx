import React from 'react';
import Grid from '@mui/material/Grid';
import {
  Container,
  Card,
  CardHeader,
  CardContent,
  Alert,
  AlertTitle,
  Chip,
  CircularProgress,
  Typography,
  Button,
  Box,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Circle as CircleIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import { StreamStatus } from '../contexts/MonitoringContext';
import { signalRManager } from '../services/signalrClient';

const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  const { state } = useMonitoring();
  
  // Get real-time active alarms data from SignalR stream
  const { alarmCount, lastUpdate, streamStatus: status, streamError: error } = state.activeAlarms;
  
  // Reconnect function for SignalR
  const reconnect = async () => {
    try {
      await signalRManager.reconnect();
    } catch (err) {
      console.error('Failed to reconnect SignalR:', err);
    }
  };

  return (
    <Container maxWidth="xl" data-id-ref="dashboard-main-container" sx={{ py: 4 }}>
      <Card data-id-ref="dashboard-main-card">
        <CardHeader 
          data-id-ref="dashboard-header"
          title={
            <Typography variant="h4" component="h1" data-id-ref="dashboard-title">
              {t('dashboard')}
            </Typography>
          }
        />
        <CardContent data-id-ref="dashboard-body">
          {/* SignalR Connection Status Alert */}
          {status === StreamStatus.ERROR && (
            <Alert 
              severity="error" 
              data-id-ref="dashboard-signalr-error-alert"
              sx={{ mb: 3 }}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={reconnect}
                  data-id-ref="dashboard-signalr-reconnect-button"
                  startIcon={<RefreshIcon />}
                >
                  {t('common.retry')}
                </Button>
              }
            >
              <AlertTitle data-id-ref="dashboard-signalr-error-heading">
                {t('common.error')}
              </AlertTitle>
              <Typography variant="body2" data-id-ref="dashboard-signalr-error-text">
                {error}
              </Typography>
            </Alert>
          )}
          
          {status === StreamStatus.CONNECTING && (
            <Alert 
              severity="info" 
              data-id-ref="dashboard-signalr-connecting-alert"
              sx={{ mb: 3 }}
              icon={<CircularProgress size={20} />}
            >
              Connecting to monitoring service...
            </Alert>
          )}

          <Grid container spacing={3} data-id-ref="dashboard-stats-row" sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, md: 3 }} data-id-ref="dashboard-total-alarms-col">
              <Card 
                data-id-ref="dashboard-total-alarms-card"
                sx={{ 
                  bgcolor: 'secondary.main',
                  color: 'secondary.contrastText',
                  height: '100%'
                }}
              >
                <CardContent data-id-ref="dashboard-total-alarms-card-body">
                  <Typography variant="h6" component="h2" data-id-ref="dashboard-total-alarms-title">
                    Total Alarms
                  </Typography>
                  <Typography variant="h2" data-id-ref="dashboard-total-alarms-value">
                    -
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }} data-id-ref="dashboard-active-alarms-col">
              <Card 
                data-id-ref="dashboard-active-alarms-card"
                sx={{ 
                  bgcolor: status === StreamStatus.CONNECTED ? 'error.main' : 'secondary.main',
                  color: status === StreamStatus.CONNECTED ? 'error.contrastText' : 'secondary.contrastText',
                  height: '100%'
                }}
              >
                <CardContent data-id-ref="dashboard-active-alarms-card-body">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="h6" component="h2" data-id-ref="dashboard-active-alarms-title">
                      Active Alarms
                    </Typography>
                    {status === StreamStatus.CONNECTED && (
                      <Chip 
                        icon={<CircleIcon sx={{ fontSize: '0.5rem' }} />}
                        label="LIVE" 
                        color="success"
                        size="small"
                        data-id-ref="dashboard-active-alarms-live-badge"
                      />
                    )}
                  </Box>
                  <Typography variant="h2" data-id-ref="dashboard-active-alarms-value">
                    {status === StreamStatus.CONNECTING ? (
                      <CircularProgress size={40} color="inherit" />
                    ) : status === StreamStatus.CONNECTED ? (
                      alarmCount
                    ) : (
                      '-'
                    )}
                  </Typography>
                  {lastUpdate && (
                    <Typography 
                      variant="caption" 
                      sx={{ opacity: 0.7 }}
                      data-id-ref="dashboard-active-alarms-last-update"
                    >
                      Last update: {new Date(lastUpdate).toLocaleTimeString()}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }} data-id-ref="dashboard-warning-alarms-col">
              <Card 
                data-id-ref="dashboard-warning-alarms-card"
                sx={{ 
                  bgcolor: 'secondary.main',
                  color: 'secondary.contrastText',
                  height: '100%'
                }}
              >
                <CardContent data-id-ref="dashboard-warning-alarms-card-body">
                  <Typography variant="h6" component="h2" data-id-ref="dashboard-warning-alarms-title">
                    Warning Alarms
                  </Typography>
                  <Typography variant="h2" data-id-ref="dashboard-warning-alarms-value">
                    -
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }} data-id-ref="dashboard-sensors-col">
              <Card 
                data-id-ref="dashboard-sensors-card"
                sx={{ 
                  bgcolor: 'secondary.main',
                  color: 'secondary.contrastText',
                  height: '100%'
                }}
              >
                <CardContent data-id-ref="dashboard-sensors-card-body">
                  <Typography variant="h6" component="h2" data-id-ref="dashboard-sensors-title">
                    Sensors
                  </Typography>
                  <Typography variant="h2" data-id-ref="dashboard-sensors-value">
                    -
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          <Grid container spacing={3} data-id-ref="dashboard-activity-status-row">
            <Grid size={{ xs: 12, md: 8 }} data-id-ref="dashboard-recent-activity-col">
              <Card data-id-ref="dashboard-recent-activity-card">
                <CardHeader 
                  data-id-ref="dashboard-recent-activity-header"
                  title={
                    <Typography variant="h6" component="h2" data-id-ref="dashboard-recent-activity-title">
                      Recent Activity
                    </Typography>
                  }
                />
                <CardContent data-id-ref="dashboard-recent-activity-body">
                  <Alert severity="info" data-id-ref="dashboard-recent-activity-alert">
                    No recent activity available at this time.
                  </Alert>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }} data-id-ref="dashboard-system-status-col">
              <Card data-id-ref="dashboard-system-status-card">
                <CardHeader 
                  data-id-ref="dashboard-system-status-header"
                  title={
                    <Typography variant="h6" component="h2" data-id-ref="dashboard-system-status-title">
                      System Status
                    </Typography>
                  }
                />
                <CardContent data-id-ref="dashboard-system-status-body">
                  <Box sx={{ mb: 3 }} data-id-ref="dashboard-signalr-connection-status">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2">SignalR Connection:</Typography>
                      <Chip 
                        color={
                          status === StreamStatus.CONNECTED ? 'success' :
                          status === StreamStatus.CONNECTING ? 'warning' :
                          status === StreamStatus.ERROR ? 'error' :
                          'default'
                        }
                        data-id-ref="dashboard-signalr-status-badge"
                        icon={
                          status === StreamStatus.CONNECTED ? <CheckCircleIcon /> :
                          status === StreamStatus.CONNECTING ? <CircularProgress size={16} /> :
                          status === StreamStatus.ERROR ? <CancelIcon /> :
                          undefined
                        }
                        label={status.toUpperCase()}
                        size="small"
                      />
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'center', mb: 2 }} data-id-ref="dashboard-system-status-text">
                    <Typography variant="body2" component="span">
                      System Status:{' '}
                    </Typography>
                    <Chip 
                      label="UNKNOWN"
                      color="default"
                      size="small"
                      data-id-ref="dashboard-system-status-badge"
                    />
                  </Box>
                  <Box data-id-ref="dashboard-system-status-updated">
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      data-id-ref="dashboard-system-status-updated-text"
                    >
                      Last updated: {lastUpdate ? new Date(lastUpdate).toLocaleString() : 'Not available'}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Container>
  );
};

export default Dashboard;
