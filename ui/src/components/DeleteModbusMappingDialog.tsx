import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Button,
  Alert,
  CircularProgress,
  Typography,
  Box,
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { batchEditModbusMaps } from '../services/extendedApi';
import type { MapModbus, Item, BatchEditModbusMapsRequestDto } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('DeleteModbusMappingDialog');

interface DeleteModbusMappingDialogProps {
  open: boolean;
  mapping: MapModbus | null;
  controllerId: string;
  modbusItems: Item[];
  onClose: (shouldRefresh: boolean) => void;
  onSuccess: (message: string) => void;
}

const DeleteModbusMappingDialog: React.FC<DeleteModbusMappingDialogProps> = ({
  open,
  mapping,
  controllerId,
  modbusItems,
  onClose,
  onSuccess,
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get item name for display
  const getItemName = (itemId: string): string => {
    const item = modbusItems.find((i) => i.id === itemId);
    return item?.name || itemId;
  };

  const handleDelete = async () => {
    if (!mapping || !mapping.id) {
      logger.error('Cannot delete mapping: mapping or mapping ID is null');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const request: BatchEditModbusMapsRequestDto = {
        controllerId,
        added: [],
        changed: [],
        removed: [mapping.id],
      };

      logger.log('Deleting mapping', { mappingId: mapping.id, position: mapping.position });
      const response = await batchEditModbusMaps(request);

      if (response.isSuccessful) {
        logger.log('Mapping deleted successfully', { mappingId: mapping.id });
        onSuccess(t('modbusControllers.success.mappingDeleted'));
        onClose(true);
      } else {
        setError(response.errorMessage || t('modbusControllers.errors.deleteMappingFailed'));
      }
    } catch (err) {
      logger.error('Failed to delete mapping', { error: err });
      setError(t('modbusControllers.errors.deleteMappingFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setError(null);
    onClose(false);
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
      data-id-ref="delete-modbus-mapping-dialog"
    >
      <DialogTitle data-id-ref="delete-modbus-mapping-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          <Typography variant="h6">
            {t('modbusControllers.mappings.dialogs.deleteTitle')}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent data-id-ref="delete-modbus-mapping-dialog-content">
        {error && (
          <Alert
            data-id-ref="delete-modbus-mapping-error"
            severity="error"
            onClose={() => setError(null)}
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}

        <DialogContentText data-id-ref="delete-modbus-mapping-confirmation-text">
          {t('modbusControllers.mappings.dialogs.deleteMessage', {
            position: mapping?.position ?? '',
            item: getItemName(mapping?.itemId || ''),
          })}
        </DialogContentText>
      </DialogContent>

      <DialogActions data-id-ref="delete-modbus-mapping-dialog-actions">
        <Button
          data-id-ref="cancel-delete-modbus-mapping-btn"
          onClick={handleCancel}
          disabled={loading}
        >
          {t('common.buttons.cancel')}
        </Button>
        <Button
          data-id-ref="confirm-delete-modbus-mapping-btn"
          onClick={handleDelete}
          variant="contained"
          color="error"
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? t('common.loading') : t('common.buttons.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteModbusMappingDialog;
