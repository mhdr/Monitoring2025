/**
 * AlarmBadgePopover - Elegant popover component to display active alarm details
 * Shows alarm messages, priorities, and activation times when hovering over alarm badge
 */

import React from 'react';
import {
  Popover,
  Box,
  Typography,
  Stack,
  Divider,
  Chip,
  Paper,
  alpha,
} from '@mui/material';
import {
  NotificationsActive as NotificationsActiveIcon,
  AccessTime as TimeIcon,
  PriorityHigh as PriorityIcon,
} from '@mui/icons-material';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguage } from '../hooks/useLanguage';
import type { AlarmPriority } from '../types/api';

export interface AlarmDetail {
  /**
   * Unique alarm ID
   */
  alarmId: string;
  
  /**
   * Alarm priority (1=Warning, 2=Alarm)
   */
  priority: AlarmPriority;
  
  /**
   * Alarm message in English
   */
  message?: string | null;
  
  /**
   * Alarm message in Persian
   */
  messageFa?: string | null;
  
  /**
   * Unix timestamp when alarm was activated
   */
  activatedAt: number;
  
  /**
   * ISO 8601 formatted date-time string
   */
  dateTime?: string;
}

interface AlarmBadgePopoverProps {
  /**
   * Anchor element for the popover
   */
  anchorEl: HTMLElement | null;
  
  /**
   * Whether the popover is open
   */
  open: boolean;
  
  /**
   * Callback when popover should close
   */
  onClose: () => void;
  
  /**
   * Array of active alarm details
   */
  alarms: AlarmDetail[];
  
  /**
   * Item name for display in header
   */
  itemName?: string;
}

/**
 * Elegant popover component to display active alarm details
 * Shows alarm messages, priorities, and timestamps when hovering
 */
const AlarmBadgePopover: React.FC<AlarmBadgePopoverProps> = ({
  anchorEl,
  open,
  onClose,
  alarms,
  itemName,
}) => {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const formatDateTime = (timestamp: number, dateTimeStr?: string): string => {
    if (dateTimeStr) {
      // Use the provided ISO 8601 string and format it
      const date = new Date(dateTimeStr);
      if (language === 'fa') {
        return new Intl.DateTimeFormat('fa-IR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(date);
      }
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    }
    
    // Fallback to Unix timestamp
    const date = new Date(timestamp * 1000);
    if (language === 'fa') {
      return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    }
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getPriorityColor = (priority: AlarmPriority): 'error' | 'warning' => {
    return priority === 2 ? 'error' : 'warning';
  };

  const getPriorityLabel = (priority: AlarmPriority): string => {
    return priority === 2 
      ? t('itemCard.highPriorityAlarm') 
      : t('itemCard.lowPriorityAlarm');
  };

  if (alarms.length === 0) {
    return null;
  }

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'center',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
      disableRestoreFocus
      disableAutoFocus
      disableEnforceFocus
      sx={{
        pointerEvents: 'none',
      }}
      slotProps={{
        paper: {
          sx: {
            pointerEvents: 'auto',
            maxWidth: 450,
            minWidth: 320,
            borderRadius: 2,
            boxShadow: (theme) => theme.shadows[8],
            overflow: 'hidden',
          },
        },
      }}
      data-id-ref="alarm-badge-popover"
      aria-hidden={!open}
    >
      <Paper elevation={0} data-id-ref="alarm-badge-popover-paper">
        {/* Header */}
        <Box
          sx={{
            background: (theme) => 
              `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.warning.main, 0.1)} 100%)`,
            px: 2.5,
            py: 2,
            borderBottom: 1,
            borderColor: 'divider',
          }}
          data-id-ref="alarm-badge-popover-header"
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <NotificationsActiveIcon 
              sx={{ 
                color: 'error.main',
                fontSize: 28,
                animation: 'alarm-icon-pulse 2s ease-in-out infinite',
                '@keyframes alarm-icon-pulse': {
                  '0%, 100%': { transform: 'scale(1)' },
                  '50%': { transform: 'scale(1.1)' },
                },
              }}
              data-id-ref="alarm-badge-popover-header-icon"
            />
            <Box sx={{ flex: 1 }}>
              <Typography 
                variant="subtitle1" 
                fontWeight={600}
                data-id-ref="alarm-badge-popover-header-title"
              >
                {t('alarmBadgePopover.title')}
              </Typography>
              {itemName && (
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ mt: 0.25 }}
                  data-id-ref="alarm-badge-popover-header-item-name"
                >
                  {itemName}
                </Typography>
              )}
            </Box>
            <Chip
              label={alarms.length}
              size="small"
              color="error"
              sx={{ 
                fontWeight: 700,
                minWidth: 32,
              }}
              data-id-ref="alarm-badge-popover-header-count"
            />
          </Stack>
        </Box>

        {/* Alarm List */}
        <Box
          sx={{
            maxHeight: 400,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
          data-id-ref="alarm-badge-popover-content"
        >
          <Stack divider={<Divider />} spacing={0}>
            {alarms.map((alarm, index) => {
              const message = language === 'fa' && alarm.messageFa 
                ? alarm.messageFa 
                : alarm.message || t('alarmBadgePopover.noMessage');

              return (
                <Box
                  key={alarm.alarmId || index}
                  sx={{
                    px: 2.5,
                    py: 2,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.04),
                    },
                  }}
                  data-id-ref={`alarm-badge-popover-alarm-${index}`}
                >
                  <Stack spacing={1.5}>
                    {/* Priority Badge */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        icon={<PriorityIcon sx={{ fontSize: 14 }} />}
                        label={getPriorityLabel(alarm.priority)}
                        size="small"
                        color={getPriorityColor(alarm.priority)}
                        sx={{ fontWeight: 600 }}
                        data-id-ref={`alarm-badge-popover-alarm-${index}-priority`}
                      />
                    </Box>

                    {/* Alarm Message */}
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'text.primary',
                        lineHeight: 1.6,
                        wordBreak: 'break-word',
                      }}
                      data-id-ref={`alarm-badge-popover-alarm-${index}-message`}
                    >
                      {message}
                    </Typography>

                    {/* Activation Time */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                      }}
                    >
                      <TimeIcon
                        sx={{
                          fontSize: 16,
                          color: 'text.secondary',
                        }}
                        data-id-ref={`alarm-badge-popover-alarm-${index}-time-icon`}
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontStyle: 'italic' }}
                        data-id-ref={`alarm-badge-popover-alarm-${index}-time`}
                      >
                        {formatDateTime(alarm.activatedAt, alarm.dateTime)}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Box>
      </Paper>
    </Popover>
  );
};

export default AlarmBadgePopover;
