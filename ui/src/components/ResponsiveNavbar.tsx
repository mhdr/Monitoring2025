import React, { useState } from 'react';
import type { MouseEvent } from 'react';
import { AppBar, Toolbar, IconButton, Typography, Menu, MenuItem, Divider, Box, Container } from '@mui/material';
import { Menu as MenuIcon, AccountCircle } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../hooks/useAuth';
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

  const handleLogout = () => {
    handleMenuClose();
    logout();
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
              className="sidebar-toggle-btn"
              sx={{ mr: 2, display: { lg: 'none' } }}
              data-id-ref="responsive-navbar-sidebar-toggle-btn"
            >
              <MenuIcon data-id-ref="responsive-navbar-sidebar-toggle-icon" />
            </IconButton>
          )}
          
          {/* Brand/Title */}
          <Typography
            variant="h6"
            component="div"
            className="fw-bold navbar-brand-gradient"
            sx={{ flexGrow: 1 }}
            data-id-ref="responsive-navbar-brand"
          >
            {t('monitoring')}
          </Typography>

          {/* User Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center' }} data-id-ref="responsive-navbar-user-nav">
            <IconButton
              onClick={handleMenuOpen}
              color="inherit"
              className="user-dropdown-toggle"
              aria-controls="user-menu"
              aria-haspopup="true"
              aria-expanded={Boolean(anchorEl)}
              data-id-ref="responsive-navbar-user-dropdown"
            >
              <AccountCircle sx={{ mr: 1 }} data-id-ref="responsive-navbar-user-icon" />
              <Typography 
                variant="body2" 
                component="span"
                className="text-white fw-medium"
                sx={{ display: { xs: 'none', sm: 'inline' } }}
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
                    minWidth: 200,
                  }
                }
              }}
              data-id-ref="responsive-navbar-user-menu"
            >
              <MenuItem 
                onClick={handleProfileClick}
                data-id-ref="responsive-navbar-user-profile-link"
              >
                <i className="fas fa-user me-2" aria-hidden="true" data-id-ref="responsive-navbar-user-profile-icon"></i>
                {t('profile')}
              </MenuItem>
              <MenuItem 
                onClick={handleSettingsClick}
                data-id-ref="responsive-navbar-user-settings-link"
              >
                <i className="fas fa-cog me-2" aria-hidden="true" data-id-ref="responsive-navbar-user-settings-icon"></i>
                {t('settingsMenu')}
              </MenuItem>
              <Divider data-id-ref="responsive-navbar-user-divider-1" />
              <MenuItem 
                onClick={handleForceSyncClick}
                data-id-ref="responsive-navbar-user-force-sync-link"
              >
                <i className="fas fa-sync-alt me-2" aria-hidden="true" data-id-ref="responsive-navbar-user-force-sync-icon"></i>
                {t('forceSync')}
              </MenuItem>
              <Divider data-id-ref="responsive-navbar-user-divider-2" />
              <MenuItem 
                onClick={handleLogout}
                className="text-danger"
                data-id-ref="responsive-navbar-logout-link"
              >
                <i className="fas fa-sign-out-alt me-2" aria-hidden="true" data-id-ref="responsive-navbar-logout-icon"></i>
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