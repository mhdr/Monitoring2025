import React, { useMemo, useCallback } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
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
  const getPointName = useCallback((itemId: string | null | undefined): string => {
    if (!itemId) {
      return t('auditTrailPage.detailDialog.notApplicable');
    }
    
    const item = items.find(i => i.id === itemId);
    if (!item) {
      return t('auditTrailPage.detailDialog.unknownPoint');
    }
    
    return language === 'fa' ? (item.nameFa || item.name) : item.name;
  }, [items, language, t]);

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
      case LogTypeEnum.AddGroup:
        return t('auditTrailPage.logTypes.AddGroup');
      case LogTypeEnum.EditUser:
        return t('auditTrailPage.logTypes.EditUser');
      case LogTypeEnum.AddUser:
        return t('auditTrailPage.logTypes.AddUser');
      case LogTypeEnum.DeleteUser:
        return t('auditTrailPage.logTypes.DeleteUser');
      case LogTypeEnum.EditRole:
        return t('auditTrailPage.logTypes.EditRole');
      case LogTypeEnum.AddRole:
        return t('auditTrailPage.logTypes.AddRole');
      case LogTypeEnum.DeleteRole:
        return t('auditTrailPage.logTypes.DeleteRole');
      default:
        return `${t('auditTrailPage.detailDialog.unknown')} (${logType})`;
    }
  };

  /**
   * Resolve group name from ID
   */
  const getGroupName = useCallback((groupId: string | null | undefined): string => {
    if (!groupId) {
      return t('auditTrailPage.detailDialog.notApplicable');
    }
    
    const group = monitoringState.groups.find(g => g.id === groupId);
    if (!group) {
      return t('auditTrailPage.detailDialog.unknownPoint');
    }
    
    return language === 'fa' ? (group.nameFa || group.name) : group.name;
  }, [monitoringState.groups, language, t]);

  /**
   * Parse and extract changes from logValue
   */
  const changes = useMemo(() => {
    if (!data?.logValue) {
      return null;
    }

    // Helper functions inside useMemo to avoid dependency issues
    const isUUID = (value: string): boolean => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(value);
    };

    const formatFieldName = (key: string): string => {
      return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
    };

    const formatValue = (key: string, value: unknown): string => {
      if (value === null || value === undefined) {
        return t('auditTrailPage.detailDialog.notApplicable');
      }
      
      // Resolve IDs to human-readable names
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'itemid') {
        return getPointName(value as string);
      }
      if (lowerKey === 'groupid' || lowerKey === 'parentid') {
        return getGroupName(value as string);
      }
      
      if (typeof value === 'boolean') {
        return value ? t('common.yes') : t('common.no');
      }
      if (typeof value === 'object') {
        return JSON.stringify(value, null, 2);
      }
      return String(value);
    };

    try {
      const parsed = JSON.parse(data.logValue);
      logger.log('Parsed logValue:', parsed);

      // Check if this is an "Old" and "New" format (nested objects)
      if (parsed.Old !== undefined && parsed.New !== undefined) {
        const oldObj = parsed.Old;
        const newObj = parsed.New;

        // Get all unique keys from both objects
        const allKeys = new Set([
          ...Object.keys(oldObj || {}),
          ...Object.keys(newObj || {}),
        ]);

        const changeList: Array<{
          field: string;
          oldValue: string;
          newValue: string;
          isChanged: boolean;
          isAdded: boolean;
          isRemoved: boolean;
        }> = [];

        allKeys.forEach((key) => {
          const oldVal = oldObj?.[key];
          const newVal = newObj?.[key];
          
          // Skip UUID values (but not IDs we want to resolve)
          const lowerKey = key.toLowerCase();
          const isIdField = lowerKey === 'itemid' || lowerKey === 'groupid' || lowerKey === 'parentid';
          
          if (!isIdField && lowerKey.endsWith('id') && 
              ((typeof oldVal === 'string' && isUUID(oldVal)) || 
               (typeof newVal === 'string' && isUUID(newVal)))) {
            return;
          }

          const oldValue = formatValue(key, oldVal);
          const newValue = formatValue(key, newVal);

          const isAdded = oldVal === undefined || oldVal === null;
          const isRemoved = newVal === undefined || newVal === null;
          const isChanged = oldValue !== newValue;

          if (isChanged || isAdded || isRemoved) {
            changeList.push({
              field: formatFieldName(key),
              oldValue,
              newValue,
              isChanged,
              isAdded,
              isRemoved,
            });
          }
        });

        return changeList.length > 0 ? changeList : null;
      }

      // Check if this is a flat structure with "New" and "Old" suffixes OR prefixes
      const keys = Object.keys(parsed);
      const hasNewOldSuffixes = keys.some(key => key.endsWith('New') || key.endsWith('Old'));
      const hasNewOldPrefixes = keys.some(key => key.startsWith('New') || key.startsWith('Old'));

      if (hasNewOldSuffixes || hasNewOldPrefixes) {
        // Extract base field names
        const baseFields = new Set<string>();
        keys.forEach(key => {
          if (key.endsWith('New')) {
            baseFields.add(key.slice(0, -3));
          } else if (key.endsWith('Old')) {
            baseFields.add(key.slice(0, -3));
          } else if (key.startsWith('New')) {
            baseFields.add(key.slice(3)); // Remove "New" prefix
          } else if (key.startsWith('Old')) {
            baseFields.add(key.slice(3)); // Remove "Old" prefix
          }
        });

        const changeList: Array<{
          field: string;
          oldValue: string;
          newValue: string;
          isChanged: boolean;
          isAdded: boolean;
          isRemoved: boolean;
        }> = [];

        baseFields.forEach((baseField) => {
          // Try both suffix and prefix formats
          const oldKeySuffix = `${baseField}Old`;
          const newKeySuffix = `${baseField}New`;
          const oldKeyPrefix = `Old${baseField}`;
          const newKeyPrefix = `New${baseField}`;
          
          // Determine which format is present
          const oldKey = keys.includes(oldKeySuffix) ? oldKeySuffix : oldKeyPrefix;
          const newKey = keys.includes(newKeySuffix) ? newKeySuffix : newKeyPrefix;
          
          const oldVal = parsed[oldKey];
          const newVal = parsed[newKey];
          
          // Skip UUID values (but not IDs we want to resolve)
          const lowerField = baseField.toLowerCase();
          const isIdField = lowerField === 'itemid' || lowerField === 'groupid' || lowerField === 'parentid';
          
          if (!isIdField && lowerField.endsWith('id') && 
              ((typeof oldVal === 'string' && isUUID(oldVal)) || 
               (typeof newVal === 'string' && isUUID(newVal)))) {
            return;
          }

          const oldValue = formatValue(baseField, oldVal);
          const newValue = formatValue(baseField, newVal);

          const isAdded = oldVal === undefined || oldVal === null;
          const isRemoved = newVal === undefined || newVal === null;
          const isChanged = oldValue !== newValue;

          if (isChanged || isAdded || isRemoved) {
            changeList.push({
              field: formatFieldName(baseField),
              oldValue,
              newValue,
              isChanged,
              isAdded,
              isRemoved,
            });
          }
        });

        return changeList.length > 0 ? changeList : null;
      }

      // If not in "Old/New" format, convert to a simple key-value list
      const simpleList: Array<{
        field: string;
        oldValue: string;
        newValue: string;
        isChanged: boolean;
        isAdded: boolean;
        isRemoved: boolean;
      }> = [];

      Object.keys(parsed).forEach((key) => {
        // Skip ID fields that are UUIDs (but not GroupId/ParentId/ItemId which we resolve)
        const lowerKey = key.toLowerCase();
        const isResolvableId = lowerKey === 'groupid' || lowerKey === 'parentid' || lowerKey === 'itemid';
        const value = parsed[key];
        
        if (!isResolvableId && lowerKey.endsWith('id') && typeof value === 'string' && isUUID(value)) {
          return;
        }

        simpleList.push({
          field: formatFieldName(key),
          oldValue: t('auditTrailPage.detailDialog.notApplicable'),
          newValue: formatValue(key, value),
          isChanged: false,
          isAdded: true,
          isRemoved: false,
        });
      });

      return simpleList.length > 0 ? simpleList : { raw: parsed };
    } catch (err) {
      logger.warn('Failed to parse logValue as JSON:', err);
      return { raw: data.logValue };
    }
  }, [data?.logValue, t, getPointName, getGroupName]);

  /**
   * Render changes as a comparison table
   */
  const renderChangesTable = () => {
    if (!changes) {
      return (
        <Typography variant="body2" color="text.secondary">
          {t('auditTrailPage.detailDialog.noDetails')}
        </Typography>
      );
    }

    // If raw format (not Old/New comparison), display as formatted JSON
    if ('raw' in changes) {
      const rawValue = changes.raw;
      
      if (typeof rawValue === 'string') {
        return (
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {rawValue}
          </Typography>
        );
      }

      return (
        <pre
          style={{
            margin: 0,
            padding: theme.spacing(2),
            fontSize: '13px',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            borderRadius: theme.shape.borderRadius,
            maxHeight: '400px',
            overflow: 'auto',
          }}
        >
          {JSON.stringify(rawValue, null, 2)}
        </pre>
      );
    }

    // Render side-by-side comparison table
    return (
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
        }}
        data-id-ref="audit-changes-table"
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  fontWeight: 600,
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  width: '25%',
                }}
                data-id-ref="audit-changes-header-field"
              >
                {t('auditTrailPage.detailDialog.field')}
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 600,
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  width: '37.5%',
                }}
                data-id-ref="audit-changes-header-old"
              >
                {t('auditTrailPage.detailDialog.oldValue')}
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 600,
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  width: '37.5%',
                }}
                data-id-ref="audit-changes-header-new"
              >
                {t('auditTrailPage.detailDialog.newValue')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {changes.map((change, index) => {
              // Determine background color based on change type
              let backgroundColor = 'transparent';
              if (change.isAdded) {
                backgroundColor = theme.palette.mode === 'dark' 
                  ? 'rgba(76, 175, 80, 0.15)' 
                  : 'rgba(76, 175, 80, 0.08)';
              } else if (change.isRemoved) {
                backgroundColor = theme.palette.mode === 'dark'
                  ? 'rgba(244, 67, 54, 0.15)'
                  : 'rgba(244, 67, 54, 0.08)';
              } else if (change.isChanged) {
                backgroundColor = theme.palette.mode === 'dark'
                  ? 'rgba(33, 150, 243, 0.15)'
                  : 'rgba(33, 150, 243, 0.08)';
              }

              return (
                <TableRow
                  key={index}
                  sx={{
                    backgroundColor,
                    '&:hover': {
                      backgroundColor: theme.palette.mode === 'dark'
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(0,0,0,0.04)',
                    },
                  }}
                  data-id-ref={`audit-change-row-${index}`}
                >
                  <TableCell
                    sx={{
                      fontWeight: 500,
                      verticalAlign: 'top',
                      borderRight: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    {change.field}
                  </TableCell>
                  <TableCell
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      verticalAlign: 'top',
                      borderRight: `1px solid ${theme.palette.divider}`,
                      color: change.isAdded
                        ? theme.palette.text.disabled
                        : theme.palette.text.primary,
                    }}
                  >
                    {change.isAdded ? (
                      <em>{t('auditTrailPage.detailDialog.notApplicable')}</em>
                    ) : (
                      change.oldValue
                    )}
                  </TableCell>
                  <TableCell
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      verticalAlign: 'top',
                      color: change.isRemoved
                        ? theme.palette.text.disabled
                        : theme.palette.text.primary,
                    }}
                  >
                    {change.isRemoved ? (
                      <em>{t('auditTrailPage.detailDialog.notApplicable')}</em>
                    ) : (
                      change.newValue
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  if (!data) {
    return null;
  }

  // Determine if we have a comparison to show
  const hasComparison = changes && !('raw' in changes);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      data-id-ref="audit-trail-detail-dialog"
      PaperProps={{
        sx: {
          minHeight: '500px',
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

          {/* Metadata Section */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: 3,
            }}
          >
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
          </Box>

          <Divider />

          {/* Changes Section */}
          <Box data-id-ref="audit-detail-changes">
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              {hasComparison 
                ? t('auditTrailPage.detailDialog.changesSection')
                : t('auditTrailPage.detailDialog.detailsSection')}:
            </Typography>
            {renderChangesTable()}
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
