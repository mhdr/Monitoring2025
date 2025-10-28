import React, { useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  Stack,
  Chip,
  useTheme,
} from '@mui/material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import type { DataDto, LogType } from '../types/api';
import { LogTypeEnum } from '../types/api';
import { formatDate } from '../utils/dateFormatting';
import { createLogger } from '../utils/logger';

const logger = createLogger('AuditTrailDetailDialog');

interface AuditTrailDetailDialogProps {
  open: boolean;
  onClose: () => void;
  data: DataDto | null;
}

const AuditTrailDetailDialog: React.FC<AuditTrailDetailDialogProps> = ({ open, onClose, data }) => {
  const { t, language } = useLanguage();
  const theme = useTheme();
  const { state: monitoringState } = useMonitoring();
  const items = monitoringState.items;

  /**
   * Get point name translation
   */
  const getPointName = (itemId: string | null | undefined): string => {
    if (!itemId) {
      return t('auditTrailPage.detailDialog.notApplicable');
    }
    
    const item = items.find(i => i.id === itemId);
    if (!item) {
      return t('auditTrailPage.detailDialog.unknownPoint');
    }
    
    return language === 'fa' ? (item.nameFa || item.name) : item.name;
  };

  /**
   * Get log type translation
   */
  const getLogTypeLabel = (logType: LogType): string => {
    switch (logType) {
      case LogTypeEnum.EditPoint:
        return t('auditTrailPage.logTypes.EditPoint');
      case LogTypeEnum.EditAlarm:
        return t('auditTrailPage.logTypes.EditAlarm');
      case LogTypeEnum.Login:
        return t('auditTrailPage.logTypes.Login');
      case LogTypeEnum.Logout:
        return t('auditTrailPage.logTypes.Logout');
      case LogTypeEnum.EditGroup:
        return t('auditTrailPage.logTypes.EditGroup');
      case LogTypeEnum.AddAlarm:
        return t('auditTrailPage.logTypes.AddAlarm');
      case LogTypeEnum.DeleteAlarm:
        return t('auditTrailPage.logTypes.DeleteAlarm');
      case LogTypeEnum.AddExternalAlarm:
        return t('auditTrailPage.logTypes.AddExternalAlarm');
      case LogTypeEnum.DeleteExternalAlarm:
        return t('auditTrailPage.logTypes.DeleteExternalAlarm');
      case LogTypeEnum.EditExternalAlarm:
        return t('auditTrailPage.logTypes.EditExternalAlarm');
      case LogTypeEnum.AddPoint:
        return t('auditTrailPage.logTypes.AddPoint');
      case LogTypeEnum.DeletePoint:
        return t('auditTrailPage.logTypes.DeletePoint');
      case LogTypeEnum.DeleteGroup:
        return t('auditTrailPage.logTypes.DeleteGroup');
      default:
        return `${t('auditTrailPage.detailDialog.unknown')} (${logType})`;
    }
  };

  /**
   * Parse and format the logValue field
   */
  const parsedLogValue = useMemo(() => {
    if (!data?.logValue) {
      return null;
    }

    try {
      const parsed = JSON.parse(data.logValue);
      logger.log('Parsed logValue:', parsed);
      return parsed;
    } catch {
      logger.warn('Failed to parse logValue as JSON, returning as-is');
      return data.logValue;
    }
  }, [data?.logValue]);

  /**
   * Check if a string is a UUID
   */
  const isUUID = (value: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  };

  /**
   * Render formatted log value
   */
  const renderLogValue = () => {
    if (!parsedLogValue) {
      return (
        <Typography variant="body2" color="text.secondary">
          {t('auditTrailPage.detailDialog.noDetails')}
        </Typography>
      );
    }

    // If it's a string (not parsed JSON), display it as-is
    if (typeof parsedLogValue === 'string') {
      return (
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {parsedLogValue}
        </Typography>
      );
    }

    // If it's an object, format it nicely with key-value pairs
    return (
      <Stack spacing={1.5}>
        {Object.entries(parsedLogValue).map(([key, value]) => {
          // Skip rendering IDs directly (itemId, userId, groupId, etc.)
          if (key.toLowerCase().endsWith('id') && typeof value === 'string') {
            // Try to resolve the ID to a name
            if (key.toLowerCase() === 'itemid') {
              const resolvedName = getPointName(value as string);
              return (
                <Box key={key} data-id-ref={`audit-detail-field-${key}`}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    {t('auditTrailPage.detailDialog.point')}:
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {resolvedName}
                  </Typography>
                </Box>
              );
            }
            // For other IDs, skip them (don't show raw UUIDs)
            return null;
          }

          // Skip values that look like UUIDs (even if the key doesn't end with "Id")
          if (typeof value === 'string' && isUUID(value)) {
            logger.log(`Skipping UUID value for key: ${key}`);
            return null;
          }

          // Format key: convert camelCase to Title Case
          const formattedKey = key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (str) => str.toUpperCase())
            .trim();

          // Format value based on type
          let formattedValue: React.ReactNode = String(value);
          
          if (value === null || value === undefined) {
            formattedValue = t('auditTrailPage.detailDialog.notApplicable');
          } else if (typeof value === 'boolean') {
            formattedValue = value ? t('common.yes') : t('common.no');
          } else if (typeof value === 'object') {
            formattedValue = JSON.stringify(value, null, 2);
          }

          return (
            <Box key={key} data-id-ref={`audit-detail-field-${key}`}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                {formattedKey}:
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {formattedValue}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    );
  };

  if (!data) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      data-id-ref="audit-trail-detail-dialog"
      PaperProps={{
        sx: {
          minHeight: '400px',
        },
      }}
    >
      <DialogTitle data-id-ref="audit-trail-detail-dialog-title">
        <Typography variant="h5" component="div">
          {t('auditTrailPage.detailDialog.title')}
        </Typography>
      </DialogTitle>

      <DialogContent data-id-ref="audit-trail-detail-dialog-content" dividers>
        <Stack spacing={3}>
          {/* Action Type */}
          <Box data-id-ref="audit-detail-action-type">
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {t('auditTrailPage.columns.actionType')}:
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={getLogTypeLabel(data.actionType)}
                color="primary"
                size="medium"
                data-id-ref="audit-detail-action-type-chip"
              />
            </Box>
          </Box>

          <Divider />

          {/* User Information */}
          <Box data-id-ref="audit-detail-user">
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {t('auditTrailPage.columns.userName')}:
            </Typography>
            <Typography variant="body1" sx={{ mt: 0.5 }}>
              {data.isUser ? (data.userName || t('auditTrailPage.detailDialog.unknownUser')) : t('auditTrailPage.systemUser')}
            </Typography>
          </Box>

          {/* Point Information */}
          <Box data-id-ref="audit-detail-point">
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {t('auditTrailPage.columns.point')}:
            </Typography>
            <Typography variant="body1" sx={{ mt: 0.5 }}>
              {getPointName(data.itemId)}
            </Typography>
          </Box>

          {/* Date & Time */}
          <Box data-id-ref="audit-detail-datetime">
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {t('auditTrailPage.columns.dateTime')}:
            </Typography>
            <Typography variant="body1" sx={{ mt: 0.5 }}>
              {formatDate(data.time, language, 'long')}
            </Typography>
          </Box>

          {/* IP Address */}
          {data.ipAddress && (
            <Box data-id-ref="audit-detail-ip">
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                {t('auditTrailPage.columns.ipAddress')}:
              </Typography>
              <Typography variant="body1" sx={{ mt: 0.5 }}>
                {data.ipAddress}
              </Typography>
            </Box>
          )}

          <Divider />

          {/* Details Section */}
          <Box data-id-ref="audit-detail-details">
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              {t('auditTrailPage.detailDialog.detailsSection')}:
            </Typography>
            <Box
              sx={{
                p: 2,
                borderRadius: 1,
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              }}
            >
              {renderLogValue()}
            </Box>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions data-id-ref="audit-trail-detail-dialog-actions" sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="contained" data-id-ref="audit-trail-detail-close-btn">
          {t('close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AuditTrailDetailDialog;
