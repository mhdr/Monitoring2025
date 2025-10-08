import { memo, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { setTheme } from '../store/slices/themeSlice';
import { AVAILABLE_THEMES, getThemesByCategory } from '../types/themes';
import type { ThemeId } from '../types/themes';
import './ThemeSwitcher.css';

/**
 * ThemeSwitcher Component
 * 
 * Allows users to switch between Bootswatch themes.
 * Located in the user dropdown menu alongside the language switcher.
 * Themes are grouped by category: Light, Dark, and Colorful.
 */
const ThemeSwitcher = memo(() => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const currentThemeId = useAppSelector((state) => state.theme.currentThemeId);
  const [expandedCategory, setExpandedCategory] = useState<string | null>('light');

  const handleThemeChange = (themeId: ThemeId) => {
    dispatch(setTheme(themeId));
  };

  const toggleCategory = (category: string) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  const lightThemes = getThemesByCategory('light');
  const darkThemes = getThemesByCategory('dark');
  const colorfulThemes = getThemesByCategory('colorful');

  const renderThemeButton = (theme: typeof AVAILABLE_THEMES[0]) => (
    <button
      key={theme.id}
      type="button"
      className={`theme-option ${currentThemeId === theme.id ? 'active' : ''}`}
      onClick={() => handleThemeChange(theme.id as ThemeId)}
      aria-label={t(theme.nameKey)}
      title={theme.description}
      data-id-ref={`theme-option-${theme.id}`}
    >
      <span className="theme-emoji" data-id-ref={`theme-emoji-${theme.id}`}>
        {theme.emoji}
      </span>
      <span className="theme-name" data-id-ref={`theme-name-${theme.id}`}>
        {t(theme.nameKey)}
      </span>
    </button>
  );

  return (
    <div className="theme-switcher-section" data-id-ref="theme-switcher-section">
      <div className="theme-switcher-title" data-id-ref="theme-switcher-title">
        <i className="bi bi-palette-fill" data-id-ref="theme-switcher-icon"></i>
        <span data-id-ref="theme-switcher-text">{t('theme.title')}</span>
      </div>
      
      {/* Light Themes */}
      <div className="theme-category" data-id-ref="theme-category-light">
        <button
          type="button"
          className="theme-category-header"
          onClick={() => toggleCategory('light')}
          data-id-ref="theme-category-header-light"
        >
          <i
            className={`bi bi-chevron-${expandedCategory === 'light' ? 'down' : 'right'}`}
            data-id-ref="theme-category-chevron-light"
          ></i>
          <span data-id-ref="theme-category-title-light">{t('theme.categories.light')}</span>
          <span className="theme-count" data-id-ref="theme-count-light">
            ({lightThemes.length})
          </span>
        </button>
        {expandedCategory === 'light' && (
          <div className="theme-grid" data-id-ref="theme-grid-light">
            {lightThemes.map(renderThemeButton)}
          </div>
        )}
      </div>

      {/* Dark Themes */}
      <div className="theme-category" data-id-ref="theme-category-dark">
        <button
          type="button"
          className="theme-category-header"
          onClick={() => toggleCategory('dark')}
          data-id-ref="theme-category-header-dark"
        >
          <i
            className={`bi bi-chevron-${expandedCategory === 'dark' ? 'down' : 'right'}`}
            data-id-ref="theme-category-chevron-dark"
          ></i>
          <span data-id-ref="theme-category-title-dark">{t('theme.categories.dark')}</span>
          <span className="theme-count" data-id-ref="theme-count-dark">
            ({darkThemes.length})
          </span>
        </button>
        {expandedCategory === 'dark' && (
          <div className="theme-grid" data-id-ref="theme-grid-dark">
            {darkThemes.map(renderThemeButton)}
          </div>
        )}
      </div>

      {/* Colorful Themes */}
      <div className="theme-category" data-id-ref="theme-category-colorful">
        <button
          type="button"
          className="theme-category-header"
          onClick={() => toggleCategory('colorful')}
          data-id-ref="theme-category-header-colorful"
        >
          <i
            className={`bi bi-chevron-${expandedCategory === 'colorful' ? 'down' : 'right'}`}
            data-id-ref="theme-category-chevron-colorful"
          ></i>
          <span data-id-ref="theme-category-title-colorful">{t('theme.categories.colorful')}</span>
          <span className="theme-count" data-id-ref="theme-count-colorful">
            ({colorfulThemes.length})
          </span>
        </button>
        {expandedCategory === 'colorful' && (
          <div className="theme-grid" data-id-ref="theme-grid-colorful">
            {colorfulThemes.map(renderThemeButton)}
          </div>
        )}
      </div>
    </div>
  );
});

ThemeSwitcher.displayName = 'ThemeSwitcher';

export default ThemeSwitcher;
