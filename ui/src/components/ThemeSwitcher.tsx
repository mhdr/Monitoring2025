import { memo } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { setTheme } from '../store/slices/themeSlice';
import { AVAILABLE_THEMES } from '../types/themes';
import type { ThemeId } from '../types/themes';
import './ThemeSwitcher.css';

/**
 * ThemeSwitcher Component
 * 
 * Allows users to switch between available theme presets.
 * Located in the user dropdown menu alongside the language switcher.
 */
const ThemeSwitcher = memo(() => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const currentThemeId = useAppSelector((state) => state.theme.currentThemeId);

  const handleThemeChange = (themeId: ThemeId) => {
    dispatch(setTheme(themeId));
  };

  return (
    <div className="theme-switcher-section" data-id-ref="theme-switcher-section">
      <div className="theme-switcher-title" data-id-ref="theme-switcher-title">
        <i className="bi bi-palette-fill"></i>
        {t('theme.title')}
      </div>
      <div className="theme-grid" data-id-ref="theme-switcher-grid">
        {AVAILABLE_THEMES.map((theme) => (
          <button
            key={theme.id}
            type="button"
            className={`theme-option ${currentThemeId === theme.id ? 'active' : ''}`}
            onClick={() => handleThemeChange(theme.id as ThemeId)}
            aria-label={t(`theme.${theme.id}`)}
            data-id-ref={`theme-option-${theme.id}`}
          >
            <span className="theme-emoji" data-id-ref={`theme-emoji-${theme.id}`}>
              {theme.emoji}
            </span>
            <span className="theme-name" data-id-ref={`theme-name-${theme.id}`}>
              {t(`theme.${theme.id}`)}
            </span>
            <div className="theme-preview-colors" data-id-ref={`theme-preview-${theme.id}`}>
              <span
                className="theme-preview-color"
                style={{ backgroundColor: theme.colors.primaryLight }}
                data-id-ref={`theme-preview-primary-${theme.id}`}
              />
              <span
                className="theme-preview-color"
                style={{ backgroundColor: theme.colors.accentPrimary }}
                data-id-ref={`theme-preview-accent-${theme.id}`}
              />
              <span
                className="theme-preview-color"
                style={{ backgroundColor: theme.colors.gradientPurpleStart }}
                data-id-ref={`theme-preview-gradient-${theme.id}`}
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});

ThemeSwitcher.displayName = 'ThemeSwitcher';

export default ThemeSwitcher;
