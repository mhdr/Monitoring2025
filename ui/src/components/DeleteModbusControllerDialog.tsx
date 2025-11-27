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
import { deleteModbusController } from '../services/extendedApi';
import type { ControllerModbus } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('DeleteModbusControllerDialog');

interface DeleteModbusControllerDialogProps {
  open: boolean;
  controller: ControllerModbus | null;
  onClose: (shouldRefresh: boolean) => void;
  onSuccess: (message: string) => void;
}

const DeleteModbusControllerDialog: React.FC<DeleteModbusControllerDialogProps> = ({
  open,
  controller,
  onClose,
  onSuccess,
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!controller || !controller.id) {
      logger.error('Cannot delete controller: controller or controller ID is null');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      logger.log('Deleting controller', { controllerId: controller.id, name: controller.name });
      const response = await deleteModbusController({ id: controller.id });

      if (response.isSuccessful) {
        logger.log('Controller deleted successfully', { controllerId: controller.id });
        onSuccess(t('modbusControllers.success.deleted'));
        onClose(true);
      } else {
        setError(response.errorMessage || t('modbusControllers.errors.deleteFailed'));
      }
    } catch (err) {
      logger.error('Failed to delete controller', { error: err });
      setError(t('modbusControllers.errors.deleteFailed'));
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
      data-id-ref="delete-modbus-controller-dialog"
    >
      <DialogTitle data-id-ref="delete-modbus-controller-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          <Typography variant="h6">
            {t('modbusControllers.dialogs.deleteTitle')}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent data-id-ref="delete-modbus-controller-dialog-content">
        {error && (
          <Alert
            data-id-ref="delete-modbus-controller-error"
            severity="error"
            onClose={() => setError(null)}
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}

        <DialogContentText data-id-ref="delete-modbus-controller-confirmation-text">
          {t('modbusControllers.dialogs.deleteMessage', {
            name: controller?.name || '',
          })}
        </DialogContentText>

        <Alert severity="warning" sx={{ mt: 2 }} data-id-ref="delete-modbus-controller-warning">
          {t('modbusControllers.dialogs.deleteWarning')}
        </Alert>
      </DialogContent>

      <DialogActions data-id-ref="delete-modbus-controller-dialog-actions">
        <Button
          data-id-ref="cancel-delete-modbus-controller-btn"
          onClick={handleCancel}
          disabled={loading}
        >
          {t('common.buttons.cancel')}
        </Button>
        <Button
          data-id-ref="confirm-delete-modbus-controller-btn"
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

export default DeleteModbusControllerDialog;
