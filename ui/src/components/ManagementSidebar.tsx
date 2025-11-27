import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Close as CloseIcon,
  People as UsersIcon,
  SettingsEthernet as SettingsEthernetIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';

interface ManagementSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface MenuItem {
  path: string;
  key: string;
  icon: React.ReactNode;
}

const SIDEBAR_WIDTH = 280;

const ManagementSidebar: React.FC<ManagementSidebarProps> = ({ isOpen, onToggle }) => {
  const { t } = useLanguage();
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));

  const menuItems: MenuItem[] = [
    { path: '/dashboard/management/users', key: 'users', icon: <UsersIcon /> },
    { path: '/dashboard/management/modbus-controllers', key: 'modbusControllers.title', icon: <SettingsEthernetIcon /> },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      onToggle();
    }
  };

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'background.paper',
      }}
      data-id-ref="management-sidebar-root-container"
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2.5,
          py: 2,
          borderBottom: 1,
          borderColor: 'divider',
          minHeight: 64,
        }}
        data-id-ref="management-sidebar-header"
      >
        <Typography
          variant="h6"
          component="div"
          sx={{
            fontWeight: 700,
            color: 'primary.main',
            letterSpacing: 0.5,
          }}
          data-id-ref="management-sidebar-title"
        >
          {t('management')}
        </Typography>
        {isMobile && (
          <IconButton
            onClick={onToggle}
            edge="end"
            className="touch-target"
            aria-label={t('common.buttons.close')}
            size="small"
            data-id-ref="management-sidebar-toggle-close-btn"
            sx={{
              minWidth: { xs: 48, sm: 44 },
              minHeight: { xs: 48, sm: 44 },
              color: 'text.secondary',
              '&:hover': {
                color: 'primary.main',
              },
            }}
          >
            <CloseIcon data-id-ref="management-sidebar-toggle-close-icon" />
          </IconButton>
        )}
      </Box>

      <Divider data-id-ref="management-sidebar-divider" />

      {/* Navigation Menu */}
      <Box
        component="nav"
        sx={{ 
          flex: 1, 
          overflowY: 'auto',
          overflowX: 'hidden',
          py: 1,
        }}
        data-id-ref="management-sidebar-nav"
      >
        <List sx={{ px: 1 }} data-id-ref="management-sidebar-nav-list">
          {menuItems.map((item) => {
            const active = isActive(item.path);

            return (
              <ListItem
                key={item.key}
                disablePadding
                sx={{ mb: 0.5 }}
                data-id-ref={`management-sidebar-nav-item-${item.key}`}
              >
                <ListItemButton
                  onClick={() => handleNavigation(item.path)}
                  selected={active}
                  data-id-ref={`management-sidebar-nav-link-${item.key}`}
                  sx={{
                    borderRadius: 2,
                    py: 1.5,
                    px: 2,
                    transition: 'all 0.2s ease-in-out',
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'primary.contrastText',
                      },
                    },
                    '&:hover': {
                      backgroundColor: active ? 'primary.dark' : 'action.hover',
                    },
                  }}
                >
                  <ListItemIcon
                    data-id-ref={`management-sidebar-nav-icon-${item.key}`}
                    sx={{
                      minWidth: 40,
                      color: active ? 'primary.contrastText' : 'text.secondary',
                      transition: 'color 0.2s ease-in-out',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={t(item.key)}
                    data-id-ref={`management-sidebar-nav-text-${item.key}`}
                    primaryTypographyProps={{
                      fontWeight: active ? 600 : 500,
                      fontSize: '0.9rem',
                      sx: {
                        color: active ? 'primary.contrastText' : 'text.primary',
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'persistent'}
      anchor={theme.direction === 'rtl' ? 'right' : 'left'}
      open={isOpen}
      onClose={onToggle}
      data-id-ref="management-sidebar-drawer"
      sx={{
        width: isOpen ? SIDEBAR_WIDTH : 0,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: SIDEBAR_WIDTH,
          boxSizing: 'border-box',
          border: 'none',
          boxShadow: theme.shadows[4],
          position: 'absolute',
          // Use logical properties for RTL support
          insetInlineStart: 0,
          insetInlineEnd: 'auto',
        },
      }}
      ModalProps={{
        keepMounted: true, // Better mobile performance
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default ManagementSidebar;
