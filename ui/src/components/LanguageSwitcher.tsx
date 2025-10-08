import React from 'react';
import { Button, Typography } from '@mui/material';
import { Language as LanguageIcon } from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';

const LanguageSwitcher: React.FC = () => {
  const { language, changeLanguage, t } = useLanguage();

  const toggleLanguage = (): void => {
    const newLang = language === 'fa' ? 'en' : 'fa';
    changeLanguage(newLang);
  };

  return (
    <Button
      variant="contained"
      size="small"
      onClick={toggleLanguage}
      title={`Switch to ${language === 'fa' ? 'English' : 'فارسی'}`}
      data-id-ref="language-switcher-root-button"
      sx={{
        position: 'fixed',
        top: 16,
        right: language === 'en' ? 16 : 'auto',
        left: language === 'fa' ? 16 : 'auto',
        zIndex: 1200,
        borderRadius: 8,
        px: 2,
        py: 1,
        boxShadow: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <Typography
        variant="body2"
        component="span"
        fontWeight={500}
        data-id-ref="language-switcher-label"
      >
        {t('languageSwitch')}
      </Typography>
      <LanguageIcon fontSize="small" data-id-ref="language-switcher-icon" />
    </Button>
  );
};

export default LanguageSwitcher;