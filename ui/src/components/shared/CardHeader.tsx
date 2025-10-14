/**
 * CardHeader Component
 * 
 * Reusable header component for cards across the application.
 * Provides consistent styling with title, optional subtitle, and optional action buttons.
 * Supports both light and dark themes via MUI theme provider.
 */

import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';

export interface CardHeaderProps {
  /** Main title text */
  title: string;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Optional action buttons or components to display on the right */
  action?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** data-id-ref attribute for testing */
  dataIdRef?: string;
}

/**
 * CardHeader - Consistent header component for all cards
 * 
 * @example
 * <CardHeader 
 *   title="Data Table" 
 *   subtitle="Historical data"
 *   action={<Button>Export</Button>}
 * />
 */
export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  className = '',
  dataIdRef,
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: subtitle ? 'flex-start' : 'center',
        px: 2,
        py: 2,
        borderBottom: 1,
        borderColor: 'divider',
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'background.paper' 
          : 'background.default',
      }}
      className={className}
      data-id-ref={dataIdRef}
    >
      <Box sx={{ flex: 1 }}>
        <Typography 
          variant="h6" 
          component="h4"
          data-id-ref={dataIdRef ? `${dataIdRef}-title` : undefined}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ mt: 0.5 }}
            data-id-ref={dataIdRef ? `${dataIdRef}-subtitle` : undefined}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && (
        <Box 
          sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}
          data-id-ref={dataIdRef ? `${dataIdRef}-action` : undefined}
        >
          {action}
        </Box>
      )}
    </Box>
  );
};

export default CardHeader;
