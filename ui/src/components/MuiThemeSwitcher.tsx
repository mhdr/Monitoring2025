/**
 * MUI Theme Switcher Component
 * Allows users to change between MUI theme presets
 */

import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Collapse,
  Grid,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import {
  Palette as PaletteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguage } from '../hooks/useLanguage';
import { useMuiTheme } from '../hooks/useMuiTheme';
import type { MuiThemeConfig } from '../types/muiThemes';

/**
 * Theme Option Card
 */
interface ThemeOptionProps {
  theme: MuiThemeConfig;
  isActive: boolean;
  onSelect: () => void;
}

function ThemeOption({ theme, isActive, onSelect }: ThemeOptionProps): React.ReactElement {
  const { language } = useLanguage();
  const themeName = language === 'fa' ? theme.nameFa : theme.nameEn;

  return (
    <Card
      data-id-ref={`theme-option-${theme.id}`}
      onClick={onSelect}
      sx={{
        cursor: 'pointer',
        border: isActive ? 2 : 1,
        borderColor: isActive ? 'primary.main' : 'divider',
        bgcolor: isActive ? 'action.selected' : 'background.paper',
        transition: 'all 0.2s',
        '&:hover': {
          borderColor: 'primary.main',
          transform: 'translateY(-2px)',
          boxShadow: 3,
        },
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Typography
            variant="h5"
            component="span"
            data-id-ref={`theme-emoji-${theme.id}`}
          >
            {theme.emoji}
          </Typography>
          <Typography
            variant="body2"
            fontWeight={isActive ? 600 : 400}
            data-id-ref={`theme-name-${theme.id}`}
          >
            {themeName}
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            gap: 0.5,
            mt: 1,
          }}
        >
          <Box
            sx={{
              width: 20,
              height: 20,
              borderRadius: 1,
              bgcolor: theme.primary,
              border: 1,
              borderColor: 'divider',
            }}
            title={`Primary: ${theme.primary}`}
          />
          <Box
            sx={{
              width: 20,
              height: 20,
              borderRadius: 1,
              bgcolor: theme.secondary,
              border: 1,
              borderColor: 'divider',
            }}
            title={`Secondary: ${theme.secondary}`}
          />
        </Box>
      </CardContent>
    </Card>
  );
}

/**
 * Theme Category Section
 */
interface ThemeCategoryProps {
  category: 'light' | 'dark' | 'colorful';
  themes: MuiThemeConfig[];
  currentThemeId: string;
  onThemeSelect: (themeId: string) => void;
}

function ThemeCategory({
  category,
  themes,
  currentThemeId,
  onThemeSelect,
}: ThemeCategoryProps): React.ReactElement {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(category === 'light');

  const categoryLabels = {
    light: t('settings.theme.categories.light'),
    dark: t('settings.theme.categories.dark'),
    colorful: t('settings.theme.categories.colorful'),
  };

  return (
    <Box data-id-ref={`theme-category-${category}`} sx={{ mb: 2 }}>
      <Button
        fullWidth
        data-id-ref={`theme-category-header-${category}`}
        onClick={() => setExpanded(!expanded)}
        sx={{
          justifyContent: 'space-between',
          textTransform: 'none',
          py: 1.5,
          px: 2,
          bgcolor: 'action.hover',
          '&:hover': {
            bgcolor: 'action.selected',
          },
        }}
        endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" component="span">
            {categoryLabels[category]}
          </Typography>
          <Chip
            label={themes.length}
            size="small"
            color="primary"
            data-id-ref={`theme-count-${category}`}
          />
        </Box>
      </Button>
      <Collapse in={expanded}>
        <Box sx={{ p: 2 }}>
          <Grid container spacing={2} data-id-ref={`theme-grid-${category}`}>
            {themes.map((theme) => (
              <Grid item xs={6} sm={4} md={3} key={theme.id}>
                <ThemeOption
                  theme={theme}
                  isActive={currentThemeId === theme.id}
                  onSelect={() => onThemeSelect(theme.id)}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      </Collapse>
    </Box>
  );
}

/**
 * Main Theme Switcher Component
 */
export function MuiThemeSwitcher(): React.ReactElement {
  const { t } = useTranslation();
  const { currentThemePreset, changeTheme, getThemesByCategory } = useMuiTheme();

  const lightThemes = getThemesByCategory('light');
  const darkThemes = getThemesByCategory('dark');
  const colorfulThemes = getThemesByCategory('colorful');

  const handleThemeSelect = (themeId: string): void => {
    changeTheme(themeId as typeof currentThemePreset);
  };

  return (
    <Box data-id-ref="theme-switcher-section">
      <Box
        data-id-ref="theme-switcher-title"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 3,
        }}
      >
        <PaletteIcon color="primary" data-id-ref="theme-switcher-icon" />
        <Typography variant="h5" component="h2">
          {t('settings.theme.title')}
        </Typography>
      </Box>

      <ThemeCategory
        category="light"
        themes={lightThemes}
        currentThemeId={currentThemePreset}
        onThemeSelect={handleThemeSelect}
      />

      <ThemeCategory
        category="dark"
        themes={darkThemes}
        currentThemeId={currentThemePreset}
        onThemeSelect={handleThemeSelect}
      />

      <ThemeCategory
        category="colorful"
        themes={colorfulThemes}
        currentThemeId={currentThemePreset}
        onThemeSelect={handleThemeSelect}
      />
    </Box>
  );
}
