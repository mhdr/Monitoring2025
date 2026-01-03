import React, { useState } from 'react';
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
  ListItemText,
  Chip,
} from '@mui/material';
import { Warning as WarningIcon, Code as CodeIcon } from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { deleteGlobalVariable } from '../services/extendedApi';
import type { GlobalVariable, GlobalVariableType } from '../types/api';
import { GlobalVariableType as GlobalVariableTypeEnum } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('DeleteGlobalVariableDialog');

interface DeleteGlobalVariableDialogProps {
  open: boolean;
  variable: GlobalVariable | null;
  onClose: (shouldRefresh: boolean) => void;
}

/**
 * Get variable type label
 */
const getVariableTypeLabel = (variableType: GlobalVariableType, t: (key: string) => string): string => {
  switch (variableType) {
    case GlobalVariableTypeEnum.Boolean:
      return t('globalVariables.type.boolean');
    case GlobalVariableTypeEnum.Float:
      return t('globalVariables.type.float');
    default:
      return String(variableType);
  }
};

/**
 * Get variable type color
 */
const getVariableTypeColor = (
  variableType: GlobalVariableType
): 'primary' | 'info' => {
  switch (variableType) {
    case GlobalVariableTypeEnum.Boolean:
      return 'info';
    case GlobalVariableTypeEnum.Float:
      return 'primary';
    default:
      return 'primary';
  }
};

/**
 * Format variable value based on type
 */
const formatVariableValue = (variable: GlobalVariable, t: (key: string) => string): string => {
  if (!variable.currentValue) {
    return t('common.notSet');
  }

  if (variable.variableType === GlobalVariableTypeEnum.Boolean) {
    const boolValue = variable.currentValue.toLowerCase();
    if (boolValue === 'true' || boolValue === '1') return t('common.true');
    if (boolValue === 'false' || boolValue === '0') return t('common.false');
    return variable.currentValue;
  }

  // Float type
  const numValue = parseFloat(variable.currentValue);
  if (!isNaN(numValue)) {
    return numValue.toFixed(2);
  }

  return variable.currentValue;
};

const DeleteGlobalVariableDialog: React.FC<DeleteGlobalVariableDialogProps> = ({
  open,
  variable,
  onClose,
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!variable) return;
    
    setLoading(true);
    setError(null);

    try {
      logger.log('Deleting global variable', { variableId: variable.id, name: variable.name });
      const response = await deleteGlobalVariable({ id: variable.id });
      
      if (response.isSuccessful) {
        logger.log('Global variable deleted successfully', { variableId: variable.id });
        onClose(true); // shouldRefresh = true
      } else {
        setError(response.errorMessage || t('globalVariables.errors.deleteFailed'));
      }
    } catch (err: unknown) {
      logger.error('Failed to delete global variable', { error: err });
      setError(t('globalVariables.errors.deleteFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!variable) return null;

  return (
    <Dialog
      open={open}
      onClose={() => !loading && onClose(false)}
      maxWidth="sm"
      fullWidth
      data-id-ref="delete-globalvariable-dialog"
    >
      <DialogTitle data-id-ref="delete-globalvariable-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          <Typography variant="h6">
            {t('globalVariables.deleteTitle')}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent data-id-ref="delete-globalvariable-dialog-content">
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }} 
            onClose={() => setError(null)}
            data-id-ref="delete-globalvariable-error"
          >
            {error}
          </Alert>
        )}

        <Typography variant="body1" gutterBottom>
          {t('globalVariables.deleteMessage')}
        </Typography>

        <List dense sx={{ mt: 2, bgcolor: 'action.hover', borderRadius: 1, p: 1 }}>
          <ListItem data-id-ref="delete-globalvariable-name-item">
            <ListItemText
              primary={t('globalVariables.name')}
              secondary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <CodeIcon fontSize="small" />
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                    {variable.name}
                  </Typography>
                </Box>
              }
            />
          </ListItem>
          
          <ListItem data-id-ref="delete-globalvariable-type-item">
            <ListItemText
              primary={t('globalVariables.type')}
              secondary={
                <Chip
                  label={getVariableTypeLabel(variable.variableType, t)}
                  size="small"
                  color={getVariableTypeColor(variable.variableType)}
                  sx={{ mt: 0.5 }}
                />
              }
            />
          </ListItem>
          
          <ListItem data-id-ref="delete-globalvariable-value-item">
            <ListItemText
              primary={t('globalVariables.currentValue')}
              secondary={
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    mt: 0.5,
                    color: variable.variableType === GlobalVariableTypeEnum.Boolean
                      ? (variable.currentValue === 'true' || variable.currentValue === '1' ? 'success.main' : 'error.main')
                      : 'text.primary'
                  }}
                >
                  {formatVariableValue(variable, t)}
                </Typography>
              }
            />
          </ListItem>
          
          {variable.description && (
            <ListItem data-id-ref="delete-globalvariable-description-item">
              <ListItemText
                primary={t('globalVariables.description')}
                secondary={variable.description}
              />
            </ListItem>
          )}
          
          {variable.isDisabled && (
            <ListItem data-id-ref="delete-globalvariable-disabled-item">
              <ListItemText
                primary={t('common.status')}
                secondary={
                  <Chip
                    label={t('common.disabled')}
                    size="small"
                    color="error"
                    sx={{ mt: 0.5 }}
                  />
                }
              />
            </ListItem>
          )}
        </List>

        <Alert severity="warning" sx={{ mt: 2 }} data-id-ref="delete-globalvariable-warning">
          {t('globalVariables.deleteWarning')}
        </Alert>
      </DialogContent>
      
      <DialogActions data-id-ref="delete-globalvariable-dialog-actions">
        <Button
          onClick={() => onClose(false)}
          disabled={loading}
          data-id-ref="cancel-delete-globalvariable-btn"
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleDelete}
          color="error"
          variant="contained"
          disabled={loading}
          data-id-ref="confirm-delete-globalvariable-btn"
        >
          {loading ? t('common.deleting') : t('common.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteGlobalVariableDialog;
