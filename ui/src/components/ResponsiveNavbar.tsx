import React, { useState } from 'react';
import type { MouseEvent } from 'react';
import { AppBar, Toolbar, IconButton, Typography, Menu, MenuItem, Divider, Box, Container } from '@mui/material';
import { 
  Menu as MenuIcon, 
  AccountCircle, 
  Person as PersonIcon,
  Settings as SettingsIcon,
  Sync as SyncIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../hooks/useAuth';
import MonitoringLogo from './shared/MonitoringLogo';
import './ResponsiveNavbar.css';

interface ResponsiveNavbarProps {
  onToggleSidebar?: () => void;
}

const ResponsiveNavbar: React.FC<ResponsiveNavbarProps> = ({ onToggleSidebar }) => {
  const { t, language } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
  };

  const handleProfileClick = () => {
    handleMenuClose();
    navigate('/dashboard/profile');
  };

  const handleSettingsClick = () => {
    handleMenuClose();
    navigate('/dashboard/settings');
  };

  const handleForceSyncClick = () => {
    handleMenuClose();
    navigate(`/dashboard/sync?force=true&redirect=${encodeURIComponent(window.location.pathname)}`);
  };

  const getUserDisplayName = () => {
    // Use Persian names if language is Persian and they are available
    if (language === 'fa') {
      if (user?.firstNameFa && user?.lastNameFa) {
        return `${user.firstNameFa} ${user.lastNameFa}`;
      }
      if (user?.firstNameFa) {
        return user.firstNameFa;
      }
      if (user?.lastNameFa) {
        return user.lastNameFa;
      }
    }
    
    // Use English names or fall back to English if Persian is not available
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) {
      return user.firstName;
    }
    if (user?.lastName) {
      return user.lastName;
    }
    
    return user?.userName || '';
  };

  return (
    <AppBar 
      position="static" 
      className="custom-navbar shadow"
      elevation={0}
      data-id-ref="responsive-navbar-root"
    >
      <Container maxWidth={false} data-id-ref="responsive-navbar-container">
        <Toolbar disableGutters sx={{ minHeight: '50px !important', padding: 0 }}>
          {/* Sidebar Toggle Button */}
          {onToggleSidebar && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="Toggle sidebar"
              onClick={onToggleSidebar}
              className="sidebar-toggle-btn touch-target"
              sx={{ 
                mr: 2, 
                display: { lg: 'none' },
                minWidth: { xs: 48, sm: 44 },
                minHeight: { xs: 48, sm: 44 },
              }}
              data-id-ref="responsive-navbar-sidebar-toggle-btn"
            >
              <MenuIcon data-id-ref="responsive-navbar-sidebar-toggle-icon" />
            </IconButton>
          )}
          
          {/* Brand/Logo */}
          <Box
            onClick={() => navigate('/dashboard/monitoring')}
            sx={{ 
              flexGrow: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              cursor: 'pointer',
              transition: 'opacity 0.2s ease',
              '&:hover': {
                opacity: 0.8,
              },
            }}
            data-id-ref="responsive-navbar-brand"
          >
            <MonitoringLogo 
              size={45} 
              animated={true}
              data-id-ref="responsive-navbar-logo"
            />
            <Typography
              variant="h6"
              component="div"
              className="navbar-brand-gradient"
              sx={{ 
                fontWeight: 700,
                background: (theme) => `linear-gradient(45deg, ${theme.palette.common.white}, ${theme.palette.primary.light})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                display: { xs: 'none', sm: 'block' }
              }}
              data-id-ref="responsive-navbar-brand-text"
            >
              {t('monitoring')}
            </Typography>
          </Box>

          {/* User Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center' }} data-id-ref="responsive-navbar-user-nav">
            <IconButton
              onClick={handleMenuOpen}
              color="inherit"
              className="user-dropdown-toggle touch-target"
              aria-controls="user-menu"
              aria-haspopup="true"
              aria-expanded={Boolean(anchorEl)}
              sx={{
                minWidth: { xs: 48, sm: 44 },
                minHeight: { xs: 48, sm: 44 },
                paddingX: { xs: 1.5, sm: 1 },
              }}
              data-id-ref="responsive-navbar-user-dropdown"
            >
              <AccountCircle 
                sx={{ mr: 1 }} 
                data-id-ref="responsive-navbar-user-icon" 
              />
              <Typography 
                variant="body2" 
                component="span"
                sx={{ 
                  display: { xs: 'none', sm: 'inline' },
                  color: 'common.white',
                  fontWeight: 500
                }}
                data-id-ref="responsive-navbar-user-dropdown-title"
              >
                {getUserDisplayName()}
              </Typography>
            </IconButton>

            <Menu
              id="user-menu"
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              className="user-dropdown"
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              slotProps={{
                paper: {
                  elevation: 8,
                  sx: {
                    mt: 1.5,
                    minWidth: { xs: 180, sm: 200 },
                    maxWidth: { xs: 'calc(100vw - 32px)', sm: 'none' },
                  }
                }
              }}
              data-id-ref="responsive-navbar-user-menu"
            >
              <MenuItem 
                onClick={handleProfileClick}
                className="touch-target"
                sx={{
                  minHeight: { xs: 48, sm: 44 },
                  px: { xs: 2, sm: 2 },
                  py: { xs: 1.5, sm: 1 },
                }}
                data-id-ref="responsive-navbar-user-profile-link"
              >
                <PersonIcon 
                  sx={{ mr: 1.5, fontSize: 20 }} 
                  aria-hidden="true" 
                  data-id-ref="responsive-navbar-user-profile-icon"
                />
                {t('profile')}
              </MenuItem>
              <MenuItem 
                onClick={handleSettingsClick}
                className="touch-target"
                sx={{
                  minHeight: { xs: 48, sm: 44 },
                  px: { xs: 2, sm: 2 },
                  py: { xs: 1.5, sm: 1 },
                }}
                data-id-ref="responsive-navbar-user-settings-link"
              >
                <SettingsIcon 
                  sx={{ mr: 1.5, fontSize: 20 }} 
                  aria-hidden="true" 
                  data-id-ref="responsive-navbar-user-settings-icon"
                />
                {t('settingsMenu')}
              </MenuItem>
              <Divider data-id-ref="responsive-navbar-user-divider-1" />
              <MenuItem 
                onClick={handleForceSyncClick}
                className="touch-target"
                sx={{
                  minHeight: { xs: 48, sm: 44 },
                  px: { xs: 2, sm: 2 },
                  py: { xs: 1.5, sm: 1 },
                }}
                data-id-ref="responsive-navbar-user-force-sync-link"
              >
                <SyncIcon 
                  sx={{ mr: 1.5, fontSize: 20 }} 
                  aria-hidden="true" 
                  data-id-ref="responsive-navbar-user-force-sync-icon"
                />
                {t('forceSync')}
              </MenuItem>
              <Divider data-id-ref="responsive-navbar-user-divider-2" />
              <MenuItem 
                onClick={handleLogout}
                className="touch-target"
                sx={{ 
                  color: 'error.main',
                  minHeight: { xs: 48, sm: 44 },
                  px: { xs: 2, sm: 2 },
                  py: { xs: 1.5, sm: 1 },
                }}
                data-id-ref="responsive-navbar-logout-link"
              >
                <LogoutIcon 
                  sx={{ mr: 1.5, fontSize: 20 }} 
                  aria-hidden="true" 
                  data-id-ref="responsive-navbar-logout-icon"
                />
                {t('logout')}
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default ResponsiveNavbar;