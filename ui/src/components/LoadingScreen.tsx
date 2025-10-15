import React from 'react';
import { Box, CircularProgress, Typography, Paper } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import VisibilityIcon from '@mui/icons-material/Visibility';

interface LoadingScreenProps {
  message?: string;
}

/**
 * Loading Screen Component
 * 
 * Shows a centered spinner with optional message
 * Uses MUI theme colors for consistent branding
 */
const LoadingScreen: React.FC<LoadingScreenProps> = ({ message }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.palette.background.default,
        zIndex: 9999,
      }}
      data-id-ref="loading-screen-container"
    >
      <Paper
        elevation={3}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: { xs: 3, sm: 4 },
          borderRadius: 3,
          minWidth: { xs: 200, sm: 280 },
        }}
        data-id-ref="loading-screen-content"
      >
        {/* Logo Icon */}
        <Box
          sx={{
            width: { xs: 40, sm: 48 },
            height: { xs: 40, sm: 48 },
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
            borderRadius: 2,
            boxShadow: `0 2px 8px ${theme.palette.primary.main}40`,
          }}
          data-id-ref="loading-screen-logo"
        >
          <VisibilityIcon
            sx={{
              fontSize: { xs: 24, sm: 28 },
              color: theme.palette.primary.contrastText,
            }}
          />
        </Box>

        {/* Spinner */}
        <CircularProgress
          size={56}
          thickness={3.6}
          sx={{
            color: theme.palette.primary.main,
          }}
          data-id-ref="loading-screen-spinner"
        />

        {/* Loading Message */}
        {message && (
          <Typography
            variant="body1"
            sx={{
              mt: 2,
              color: theme.palette.text.primary,
              textAlign: 'center',
              fontWeight: 500,
              fontSize: { xs: '0.9rem', sm: '1rem' },
            }}
            data-id-ref="loading-screen-message"
          >
            {message}
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default LoadingScreen;
