import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Language as LanguageIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguage } from '../hooks/useLanguage';
import { MuiThemeSwitcher } from './MuiThemeSwitcher';

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
          <Grid item xs={12} data-id-ref="settings-page-language-col">
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
          <Grid item xs={12} data-id-ref="settings-page-theme-col">
            <Card elevation={2} data-id-ref="settings-page-theme-card">
              <CardContent data-id-ref="settings-page-theme-card-body">
                <MuiThemeSwitcher />
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
      <Grid item xs={12} sm={6}>
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
      <Grid item xs={12} sm={6}>
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

export default SettingsPage;
