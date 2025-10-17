import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Container,
  Card,
  CardHeader,
  CardContent,
  Alert,
  AlertTitle,
  Typography,
  CircularProgress,
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Divider,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  SignalCellularAlt as SignalIcon,
  SignalCellularConnectedNoInternet0Bar as DisconnectedIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useTranslation } from '../hooks/useTranslation';
import { useMonitoring } from '../hooks/useMonitoring';
import { getActiveAlarms } from '../services/monitoringApi';
import type { ActiveAlarm } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('ActiveAlarmsPage');

const ActiveAlarmsPage: React.FC = () => {
  const { language } = useLanguage();
  const { t } = useTranslation();
  const { state } = useMonitoring();
  const streamData = state.activeAlarms;
  const isRTL = language === 'fa';
  
  const [alarms, setAlarms] = useState<ActiveAlarm[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);

  /**
   * Fetch active alarms from API
   */
  const fetchActiveAlarms = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        logger.log('Refreshing active alarms...');
      } else {
        setLoading(true);
        logger.log('Fetching active alarms...');
      }
      
      setError(null);
      
      // Call API to get all active alarms (empty itemIds = get all)
      const response = await getActiveAlarms({});
      
      logger.log('Active alarms fetched successfully:', {
        count: response.data?.length || 0,
        data: response.data,
      });
      
      setAlarms(response.data || []);
      setLastFetchTime(Date.now());
    } catch (err) {
      logger.error('Error fetching active alarms:', err);
      setError(t('activeAlarmsPage.errorLoadingAlarms'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  /**
   * Initial fetch on mount
   */
  useEffect(() => {
    fetchActiveAlarms(false);
  }, [fetchActiveAlarms]);

  /**
   * Re-fetch when SignalR stream reports alarm count change
   * Only refetch if alarm count changed and we're not already loading
   */
  useEffect(() => {
    if (
      streamData.lastUpdate &&
      lastFetchTime &&
      streamData.lastUpdate > lastFetchTime &&
      !loading &&
      !refreshing
    ) {
      logger.log('Alarm count changed via stream, refetching active alarms...', {
        newCount: streamData.alarmCount,
        lastUpdate: streamData.lastUpdate,
        lastFetch: lastFetchTime,
      });
      fetchActiveAlarms(true);
    }
  }, [streamData.lastUpdate, streamData.alarmCount, lastFetchTime, loading, refreshing, fetchActiveAlarms]);

  /**
   * Manual refresh handler
   */
  const handleRefresh = () => {
    fetchActiveAlarms(true);
  };

  /**
   * Format timestamp to readable format
   */
  const formatTimestamp = useCallback((timestamp: number): string => {
    try {
      const date = new Date(timestamp * 1000); // Convert Unix timestamp to milliseconds
      return date.toLocaleString(isRTL ? 'fa-IR' : 'en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch (err) {
      logger.error('Error formatting timestamp:', err);
      return '-';
    }
  }, [isRTL]);

  /**
   * Format last updated time
   */
  const formattedLastUpdate = useMemo(() => {
    if (!lastFetchTime) return null;
    const date = new Date(lastFetchTime);
    return date.toLocaleTimeString(isRTL ? 'fa-IR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, [lastFetchTime, isRTL]);

  /**
   * Render stream status indicator
   */
  const renderStreamStatus = () => {
    let icon: React.ReactNode;
    let label: string;
    let color: 'success' | 'error' | 'warning' | 'info';

    switch (streamData.streamStatus) {
      case 'connected':
        icon = <SignalIcon />;
        label = t('activeAlarmsPage.streamConnected');
        color = 'success';
        break;
      case 'connecting':
        icon = <CircularProgress size={16} />;
        label = t('activeAlarmsPage.streamConnecting');
        color = 'info';
        break;
      case 'error':
        icon = <ErrorIcon />;
        label = t('activeAlarmsPage.streamError');
        color = 'error';
        break;
      case 'disconnected':
      case 'idle':
      default:
        icon = <DisconnectedIcon />;
        label = t('activeAlarmsPage.streamDisconnected');
        color = 'warning';
        break;
    }

    return (
      <Chip
        icon={icon}
        label={label}
        color={color}
        size="small"
        variant="outlined"
        data-id-ref="active-alarms-stream-status-chip"
      />
    );
  };

  return (
    <Container
      maxWidth={false}
      sx={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        py: 3,
        px: { xs: 2, sm: 3 },
      }}
      data-id-ref="active-alarms-page-container"
    >
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }} data-id-ref="active-alarms-page-content">
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
              <Typography variant="h5" component="h1" data-id-ref="active-alarms-page-title">
                {t('activeAlarmsPage.title')}
              </Typography>
            }
            action={
              <Stack direction="row" spacing={1} alignItems="center" data-id-ref="active-alarms-header-actions">
                {renderStreamStatus()}
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleRefresh}
                  disabled={loading || refreshing}
                  size="small"
                  data-id-ref="active-alarms-refresh-button"
                >
                  {refreshing ? t('activeAlarmsPage.refreshing') : t('refresh')}
                </Button>
              </Stack>
            }
            subheader={
              formattedLastUpdate ? (
                <Typography variant="caption" color="text.secondary" data-id-ref="active-alarms-last-updated">
                  {`${t('activeAlarmsPage.lastUpdated')}: ${formattedLastUpdate}`}
                </Typography>
              ) : null
            }
            data-id-ref="active-alarms-page-header"
          />
          <Divider />
          <CardContent
            sx={{
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'auto',
            }}
            data-id-ref="active-alarms-page-body"
          >
            {/* Loading State */}
            {loading && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 8,
                }}
                data-id-ref="active-alarms-loading-state"
              >
                <CircularProgress size={48} sx={{ mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  {t('activeAlarmsPage.loadingAlarms')}
                </Typography>
              </Box>
            )}

            {/* Error State */}
            {!loading && error && (
              <Alert
                severity="error"
                action={
                  <Button color="inherit" size="small" onClick={handleRefresh} data-id-ref="active-alarms-error-retry">
                    {t('activeAlarmsPage.retryLoading')}
                  </Button>
                }
                data-id-ref="active-alarms-error-alert"
              >
                <AlertTitle>{t('activeAlarmsPage.errorLoadingAlarms')}</AlertTitle>
                {error}
              </Alert>
            )}

            {/* Empty State */}
            {!loading && !error && alarms.length === 0 && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 8,
                }}
                data-id-ref="active-alarms-empty-state"
              >
                <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {t('activeAlarmsPage.noActiveAlarms')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('activeAlarmsPage.noActiveAlarmsDescription')}
                </Typography>
              </Box>
            )}

            {/* Alarms Table */}
            {!loading && !error && alarms.length > 0 && (
              <Box sx={{ flexGrow: 1 }} data-id-ref="active-alarms-table-container">
                <Box sx={{ mb: 2 }}>
                  <Chip
                    icon={<WarningIcon />}
                    label={`${alarms.length} ${t('activeAlarmsPage.alarmCount')}`}
                    color="warning"
                    data-id-ref="active-alarms-count-chip"
                  />
                </Box>
                <TableContainer component={Paper} variant="outlined" data-id-ref="active-alarms-table-wrapper">
                  <Table size="small" data-id-ref="active-alarms-table">
                    <TableHead data-id-ref="active-alarms-table-head">
                      <TableRow>
                        <TableCell data-id-ref="active-alarms-table-header-alarm-id">
                          <Typography variant="subtitle2" fontWeight="bold">
                            {t('activeAlarmsPage.alarmId')}
                          </Typography>
                        </TableCell>
                        <TableCell data-id-ref="active-alarms-table-header-item-id">
                          <Typography variant="subtitle2" fontWeight="bold">
                            {t('activeAlarmsPage.itemId')}
                          </Typography>
                        </TableCell>
                        <TableCell data-id-ref="active-alarms-table-header-triggered-at">
                          <Typography variant="subtitle2" fontWeight="bold">
                            {t('activeAlarmsPage.triggeredAt')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody data-id-ref="active-alarms-table-body">
                      {alarms.map((alarm, index) => (
                        <TableRow
                          key={alarm.id || `alarm-${index}`}
                          hover
                          data-id-ref={`active-alarm-row-${index}`}
                        >
                          <TableCell data-id-ref={`active-alarm-id-${index}`}>
                            <Typography variant="body2" fontFamily="monospace">
                              {alarm.alarmId || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell data-id-ref={`active-alarm-item-id-${index}`}>
                            <Typography variant="body2" fontFamily="monospace">
                              {alarm.itemId || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell data-id-ref={`active-alarm-time-${index}`}>
                            <Typography variant="body2">{formatTimestamp(alarm.time)}</Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default ActiveAlarmsPage;
