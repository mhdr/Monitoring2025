import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Language as LanguageIcon,
  CheckCircle as CheckCircleIcon,
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  NotificationsOff as NotificationsOffIcon,
} from '@mui/icons-material';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguage } from '../hooks/useLanguage';
import { MuiThemeSwitcher } from './MuiThemeSwitcher';
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from '../utils/monitoringStorage';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  showAlarmNotification,
  formatAlarmNotificationMessage,
} from '../utils/notifications';

/**
 * SettingsPage Component
 * 
 * Displays user settings including language preferences and theme selection.
 * Accessible from the user dropdown menu.
 */
const SettingsPage = (): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <Box data-id-ref="settings-page-root" sx={{ height: '100%', width: '100%', py: '24px', px: 0, mx: 0 }}>
      <Container maxWidth={false} data-id-ref="settings-page-container">
        <Box data-id-ref="settings-page-header" sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <SettingsIcon color="primary" data-id-ref="settings-page-title-icon" />
            <Typography variant="h4" component="h1" data-id-ref="settings-page-title">
              {t('settings.pageTitle')}
            </Typography>
          </Box>
          <Typography
            variant="body1"
            color="text.secondary"
            data-id-ref="settings-page-description"
          >
            {t('settings.pageDescription')}
          </Typography>
        </Box>

        <Grid container spacing={3} data-id-ref="settings-page-content-row">
          {/* Language Settings */}
          <Grid size={12} data-id-ref="settings-page-language-col">
            <Card elevation={2} data-id-ref="settings-page-language-card">
              <CardContent data-id-ref="settings-page-language-card-body">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <LanguageIcon color="primary" data-id-ref="settings-page-language-icon" />
                  <Typography
                    variant="h5"
                    component="h2"
                    data-id-ref="settings-page-language-card-title"
                  >
                    {t('settings.language.sectionTitle')}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 3 }}
                  data-id-ref="settings-page-language-description"
                >
                  {t('settings.language.sectionDescription')}
                </Typography>
                <Box data-id-ref="settings-page-language-switcher-section">
                  <LanguageOptions />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Theme Settings */}
          <Grid size={12} data-id-ref="settings-page-theme-col">
            <Card elevation={2} data-id-ref="settings-page-theme-card">
              <CardContent data-id-ref="settings-page-theme-card-body">
                <MuiThemeSwitcher />
              </CardContent>
            </Card>
          </Grid>

          {/* Notification Settings */}
          <Grid size={12} data-id-ref="settings-page-notification-col">
            <Card elevation={2} data-id-ref="settings-page-notification-card">
              <CardContent data-id-ref="settings-page-notification-card-body">
                <NotificationSettings />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

/**
 * LanguageOptions Component
 * 
 * Displays language selection options for Persian and English.
 */
const LanguageOptions = (): React.ReactElement => {
  const { t } = useTranslation();
  const { language, changeLanguage } = useLanguage();

  return (
    <Grid container spacing={2} data-id-ref="settings-language-options-grid">
      <Grid size={{ xs: 12, sm: 6 }}>
        <Button
          fullWidth
          variant={language === 'fa' ? 'contained' : 'outlined'}
          onClick={() => changeLanguage('fa')}
          aria-label="فارسی"
          data-id-ref="settings-language-option-fa"
          sx={{
            p: 2,
            justifyContent: 'flex-start',
            textTransform: 'none',
            height: 'auto',
          }}
          startIcon={
            <Typography variant="h4" component="span" data-id-ref="settings-language-flag-fa">
              🇮🇷
            </Typography>
          }
          endIcon={
            language === 'fa' ? (
              <CheckCircleIcon data-id-ref="settings-language-check-fa" />
            ) : null
          }
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              flex: 1,
            }}
            data-id-ref="settings-language-info-fa"
          >
            <Typography variant="h6" component="span" data-id-ref="settings-language-name-fa">
              فارسی
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              data-id-ref="settings-language-desc-fa"
            >
              {t('settings.language.persianDescription')}
            </Typography>
          </Box>
        </Button>
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <Button
          fullWidth
          variant={language === 'en' ? 'contained' : 'outlined'}
          onClick={() => changeLanguage('en')}
          aria-label="English"
          data-id-ref="settings-language-option-en"
          sx={{
            p: 2,
            justifyContent: 'flex-start',
            textTransform: 'none',
            height: 'auto',
          }}
          startIcon={
            <Typography variant="h4" component="span" data-id-ref="settings-language-flag-en">
              🇬🇧
            </Typography>
          }
          endIcon={
            language === 'en' ? (
              <CheckCircleIcon data-id-ref="settings-language-check-en" />
            ) : null
          }
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              flex: 1,
            }}
            data-id-ref="settings-language-info-en"
          >
            <Typography variant="h6" component="span" data-id-ref="settings-language-name-en">
              English
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              data-id-ref="settings-language-desc-en"
            >
              {t('settings.language.englishDescription')}
            </Typography>
          </Box>
        </Button>
      </Grid>
    </Grid>
  );
};

/**
 * NotificationSettings Component
 * 
 * Manages desktop notification preferences including:
 * - Enable/disable toggle
 * - Permission request
 * - Test notification button
 */
const NotificationSettings = (): React.ReactElement => {
  const { t } = useTranslation();
  const [preferences, setPreferences] = useState<NotificationPreferences>({ enabled: false, lastUpdated: Date.now() });
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Load preferences and check permission on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await getNotificationPreferences();
        setPreferences(prefs);
        
        if (isNotificationSupported()) {
          setPermission(getNotificationPermission());
        }
      } catch (error) {
        console.error('Failed to load notification preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPreferences();
  }, []);

  // Handle toggle enable/disable
  const handleToggle = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newEnabled = event.target.checked;
    
    try {
      const updatedPrefs: NotificationPreferences = {
        enabled: newEnabled,
        lastUpdated: Date.now(),
      };
      
      await saveNotificationPreferences(updatedPrefs);
      setPreferences(updatedPrefs);
      
      setSnackbar({
        open: true,
        message: newEnabled ? t('notifications.permission.enabled') : t('notifications.permission.disabled'),
        severity: 'success',
      });
    } catch (error) {
      console.error('Failed to save notification preference:', error);
      setSnackbar({
        open: true,
        message: t('common.error'),
        severity: 'error',
      });
    }
  };

  // Handle permission request
  const handleRequestPermission = async () => {
    try {
      const result = await requestNotificationPermission();
      setPermission(result);
      
      if (result === 'granted') {
        setSnackbar({
          open: true,
          message: t('notifications.permission.enabled'),
          severity: 'success',
        });
        
        // Auto-enable notifications when permission granted
        const updatedPrefs: NotificationPreferences = {
          enabled: true,
          lastUpdated: Date.now(),
        };
        await saveNotificationPreferences(updatedPrefs);
        setPreferences(updatedPrefs);
      } else if (result === 'denied') {
        setSnackbar({
          open: true,
          message: t('notifications.permission.denied'),
          severity: 'error',
        });
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      setSnackbar({
        open: true,
        message: t('common.error'),
        severity: 'error',
      });
    }
  };

  // Handle test notification
  const handleTestNotification = () => {
    if (permission !== 'granted') {
      setSnackbar({
        open: true,
        message: t('notifications.permission.denied'),
        severity: 'error',
      });
      return;
    }
    
    const testNotification = formatAlarmNotificationMessage(1, 2, t);
    showAlarmNotification(testNotification);
    
    setSnackbar({
      open: true,
      message: t('settings.notifications.testSent'),
      severity: 'info',
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (isLoading) {
    return <Typography>{t('loading')}</Typography>;
  }

  const isSupported = isNotificationSupported();
  const canEnable = isSupported && permission === 'granted';

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        {preferences.enabled && permission === 'granted' ? (
          <NotificationsActiveIcon color="primary" data-id-ref="settings-page-notification-icon-active" />
        ) : (
          <NotificationsOffIcon color="disabled" data-id-ref="settings-page-notification-icon-off" />
        )}
        <Typography
          variant="h5"
          component="h2"
          data-id-ref="settings-page-notification-card-title"
        >
          {t('settings.notifications.sectionTitle')}
        </Typography>
      </Box>
      
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 3 }}
        data-id-ref="settings-page-notification-description"
      >
        {t('settings.notifications.sectionDescription')}
      </Typography>

      {!isSupported && (
        <Alert severity="warning" sx={{ mb: 2 }} data-id-ref="settings-notification-unsupported">
          {t('settings.notifications.unsupported')}
        </Alert>
      )}

      {isSupported && permission === 'denied' && (
        <Alert severity="error" sx={{ mb: 2 }} data-id-ref="settings-notification-denied">
          {t('notifications.permission.denied')}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Enable/Disable Toggle */}
        <FormControlLabel
          control={
            <Switch
              checked={preferences.enabled}
              onChange={handleToggle}
              disabled={!canEnable}
              data-id-ref="settings-notification-toggle"
            />
          }
          label={
            <Box>
              <Typography variant="body1" data-id-ref="settings-notification-toggle-label">
                {preferences.enabled ? t('settings.notifications.enabled') : t('settings.notifications.disabled')}
              </Typography>
              <Typography variant="body2" color="text.secondary" data-id-ref="settings-notification-toggle-hint">
                {t('settings.notifications.enableHint')}
              </Typography>
            </Box>
          }
          data-id-ref="settings-notification-toggle-control"
        />

        {/* Permission Status & Request Button */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="body2" color="text.secondary" data-id-ref="settings-notification-permission-status">
            {t('settings.notifications.permissionStatus')}: {
              permission === 'granted' ? t('settings.notifications.permissionGranted') :
              permission === 'denied' ? t('settings.notifications.permissionDenied') :
              t('settings.notifications.permissionDefault')
            }
          </Typography>
          
          {permission !== 'granted' && isSupported && (
            <Button
              variant="outlined"
              onClick={handleRequestPermission}
              startIcon={<NotificationsIcon />}
              data-id-ref="settings-notification-request-permission"
              sx={{ alignSelf: 'flex-start' }}
            >
              {t('settings.notifications.requestPermission')}
            </Button>
          )}
        </Box>

        {/* Test Notification Button */}
        {permission === 'granted' && (
          <Button
            variant="outlined"
            onClick={handleTestNotification}
            startIcon={<NotificationsActiveIcon />}
            disabled={!preferences.enabled}
            data-id-ref="settings-notification-test"
            sx={{ alignSelf: 'flex-start' }}
          >
            {t('settings.notifications.testNotification')}
          </Button>
        )}
      </Box>

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        data-id-ref="settings-notification-snackbar"
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
          data-id-ref="settings-notification-snackbar-alert"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default SettingsPage;
