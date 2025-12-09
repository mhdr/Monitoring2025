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
import { batchEditSharp7Maps } from '../services/extendedApi';
import type { MapSharp7WithController, BatchEditSharp7MapsRequestDto } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('ItemDeleteSharp7MappingDialog');

interface ItemDeleteSharp7MappingDialogProps {
  open: boolean;
  mapping: MapSharp7WithController | null;
  onClose: (shouldRefresh: boolean) => void;
  onSuccess: (message: string) => void;
}

const ItemDeleteSharp7MappingDialog: React.FC<ItemDeleteSharp7MappingDialogProps> = ({
  open,
  mapping,
  onClose,
  onSuccess,
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!mapping || !mapping.id) {
      logger.error('Cannot delete mapping: mapping or mapping ID is null');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const request: BatchEditSharp7MapsRequestDto = {
        controllerId: mapping.controllerId,
        added: [],
        changed: [],
        removed: [mapping.id],
      };

      logger.log('Deleting mapping', { mappingId: mapping.id, position: mapping.position, bit: mapping.bit });
      const response = await batchEditSharp7Maps(request);

      if (response.isSuccessful) {
        logger.log('Mapping deleted successfully', { mappingId: mapping.id });
        onSuccess(t('sharp7Controllers.success.mappingDeleted'));
        onClose(true);
      } else {
        setError(response.errorMessage || t('sharp7Controllers.errors.deleteMappingFailed'));
      }
    } catch (err) {
      logger.error('Failed to delete mapping', { error: err });
      setError(t('sharp7Controllers.errors.deleteMappingFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setError(null);
    onClose(false);
  };

  const getMappingDescription = () => {
    if (!mapping) return '';
    const positionText = mapping.bit !== null && mapping.bit !== undefined
      ? `${mapping.position}.${mapping.bit}`
      : `${mapping.position}`;
    const controller = `${mapping.controllerName} (${mapping.ipAddress} - DB${mapping.dbAddress})`;
    return t('itemSharp7Mappings.deleteMessage', {
      position: positionText,
      controller: controller,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
      data-id-ref="item-delete-sharp7-mapping-dialog"
    >
      <DialogTitle data-id-ref="item-delete-sharp7-mapping-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          <Typography variant="h6">
            {t('sharp7Controllers.mappings.dialogs.deleteTitle')}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent data-id-ref="item-delete-sharp7-mapping-dialog-content">
        {error && (
          <Alert
            data-id-ref="item-delete-sharp7-mapping-error"
            severity="error"
            onClose={() => setError(null)}
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}

        <DialogContentText data-id-ref="item-delete-sharp7-mapping-confirmation-text">
          {getMappingDescription()}
        </DialogContentText>
      </DialogContent>

      <DialogActions data-id-ref="item-delete-sharp7-mapping-dialog-actions">
        <Button
          data-id-ref="item-sharp7-cancel-delete-mapping-btn"
          onClick={handleCancel}
          disabled={loading}
        >
          {t('common.buttons.cancel')}
        </Button>
        <Button
          data-id-ref="item-sharp7-confirm-delete-mapping-btn"
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

export default ItemDeleteSharp7MappingDialog;
