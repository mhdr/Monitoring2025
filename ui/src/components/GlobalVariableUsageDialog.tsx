import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Typography,
  Box,
  List,
  ListItem,
  Chip,
  CircularProgress,
  Divider,
} from '@mui/material';
import { 
  Visibility as VisibilityIcon, 
  Code as CodeIcon,
  Memory as MemoryIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { getGlobalVariableUsage } from '../services/extendedApi';
import type { GlobalVariable, MemoryUsage } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('GlobalVariableUsageDialog');

interface GlobalVariableUsageDialogProps {
  open: boolean;
  variable: GlobalVariable | null;
  onClose: (shouldRefresh: boolean) => void;
}

/**
 * Get memory type label with localization
 */
const getMemoryTypeLabel = (memoryType: string, t: (key: string) => string): string => {
  const typeKey = `memoryTypes.${memoryType.toLowerCase()}`;
  const translated = t(typeKey);
  // If translation key doesn't exist, return the original type
  return translated === typeKey ? memoryType : translated;
};

/**
 * Get memory type color
 */
const getMemoryTypeColor = (memoryType: string): 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' => {
  const type = memoryType.toLowerCase();
  if (type.includes('average')) return 'primary';
  if (type.includes('comparison')) return 'secondary';
  if (type.includes('deadband')) return 'info';
  if (type.includes('formula')) return 'success';
  if (type.includes('if')) return 'warning';
  if (type.includes('pid')) return 'error';
  return 'primary';
};

const GlobalVariableUsageDialog: React.FC<GlobalVariableUsageDialogProps> = ({
  open,
  variable,
  onClose,
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usages, setUsages] = useState<MemoryUsage[]>([]);

  useEffect(() => {
    if (open && variable) {
      fetchUsage();
    }
  }, [open, variable]);

  const fetchUsage = async () => {
    if (!variable) return;

    setLoading(true);
    setError(null);

    try {
      logger.log('Fetching global variable usage', { variableId: variable.id, name: variable.name });
      const response = await getGlobalVariableUsage({ id: variable.id });

      if (response.isSuccessful) {
        setUsages(response.usages || []);
        logger.log('Global variable usage fetched successfully', { 
          variableId: variable.id, 
          usageCount: response.usages?.length || 0 
        });
      } else {
        setError(response.errorMessage || t('globalVariables.errors.usageFetchFailed'));
      }
    } catch (err: unknown) {
      logger.error('Failed to fetch global variable usage', { error: err });
      setError(t('globalVariables.errors.usageFetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!variable) return null;

  return (
    <Dialog
      open={open}
      onClose={() => onClose(false)}
      maxWidth="md"
      fullWidth
      data-id-ref="globalvariable-usage-dialog"
    >
      <DialogTitle data-id-ref="globalvariable-usage-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VisibilityIcon color="info" />
          <Typography variant="h6">
            {t('globalVariables.usage.title')}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent data-id-ref="globalvariable-usage-dialog-content">
        {/* Variable Info Header */}
        <Box 
          sx={{ 
            mb: 3, 
            p: 2, 
            bgcolor: 'action.hover', 
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
          data-id-ref="globalvariable-usage-info"
        >
          <CodeIcon color="primary" />
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
              {variable.name}
            </Typography>
            {variable.description && (
              <Typography variant="body2" color="text.secondary">
                {variable.description}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }} 
            onClose={() => setError(null)}
            data-id-ref="globalvariable-usage-error"
          >
            {error}
          </Alert>
        )}

        {/* Loading Indicator */}
        {loading && (
          <Box 
            sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}
            data-id-ref="globalvariable-usage-loading"
          >
            <CircularProgress />
          </Box>
        )}

        {/* Usage List */}
        {!loading && usages.length > 0 && (
          <>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MemoryIcon fontSize="small" />
              {t('globalVariables.usage.usedIn', { count: usages.length })}
            </Typography>
            <List sx={{ bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
              {usages.map((usage, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <Divider />}
                  <ListItem 
                    data-id-ref={`globalvariable-usage-item-${index}`}
                    sx={{ 
                      '&:hover': { bgcolor: 'action.hover' },
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <Chip
                        label={getMemoryTypeLabel(usage.memoryType, t)}
                        size="small"
                        color={getMemoryTypeColor(usage.memoryType)}
                        icon={<MemoryIcon />}
                      />
                      <Typography variant="body2" sx={{ fontWeight: 'bold', flex: 1 }}>
                        {usage.memoryName || t('common.unnamed')}
                      </Typography>
                    </Box>
                    {usage.usageContext && (
                      <Box 
                        sx={{ 
                          pl: 2, 
                          width: '100%',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1,
                        }}
                      >
                        <InfoIcon fontSize="small" color="action" sx={{ mt: 0.3 }} />
                        <Typography variant="caption" color="text.secondary">
                          {usage.usageContext}
                        </Typography>
                      </Box>
                    )}
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </>
        )}

        {/* No Usage Message */}
        {!loading && usages.length === 0 && (
          <Alert 
            severity="info" 
            icon={<InfoIcon />}
            data-id-ref="globalvariable-usage-empty"
          >
            {t('globalVariables.usage.noUsage')}
          </Alert>
        )}

        {/* Phase 2 Notice */}
        <Alert 
          severity="info" 
          sx={{ mt: 2 }}
          data-id-ref="globalvariable-usage-phase2-notice"
        >
          {t('globalVariables.usage.phase2Notice')}
        </Alert>
      </DialogContent>

      <DialogActions data-id-ref="globalvariable-usage-dialog-actions">
        <Button
          onClick={() => onClose(false)}
          data-id-ref="close-globalvariable-usage-btn"
        >
          {t('common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GlobalVariableUsageDialog;
