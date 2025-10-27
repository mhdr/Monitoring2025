import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  Divider,
  Fade,
} from '@mui/material';
import { useLanguage } from '../hooks/useLanguage';
import { createLogger } from '../utils/logger';

const logger = createLogger('AlarmItemCard');

interface AlarmItemCardProps {
  itemId: string;
  name: string;
  pointNumber: number;
  value: string;
  time: string;
}

/**
 * AlarmItemCard - Displays instantaneous data for items with active alarms
 * Simplified version of ItemCard without navigation features
 * Used in ActiveAlarmsPage to show current values of alarmed items
 */
const AlarmItemCard: React.FC<AlarmItemCardProps> = ({ itemId, name, pointNumber, value, time }) => {
  const { t } = useLanguage();
  const [elevation, setElevation] = useState<number>(1);

  logger.log('Rendering AlarmItemCard', { itemId, name, pointNumber, value, time });

  return (
    <Fade in timeout={300}>
      <Card
        elevation={elevation}
        onMouseEnter={() => setElevation(4)}
        onMouseLeave={() => setElevation(1)}
        sx={{
          height: '100%',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-2px)',
          },
        }}
        data-id-ref={`alarm-item-card-root-${itemId}`}
      >
        <CardContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            padding: 2,
            '&:last-child': {
              paddingBottom: 2,
            },
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 1,
              marginBottom: 1.5,
            }}
            data-id-ref={`alarm-item-card-header-${itemId}`}
          >
            <Typography
              variant="h6"
              component="h6"
              sx={{
                fontWeight: 600,
                wordBreak: 'break-word',
                lineHeight: 1.4,
                flex: 1,
                fontSize: '1rem',
              }}
              data-id-ref={`alarm-item-card-title-${itemId}`}
            >
              {name}
            </Typography>
          </Box>

          <Divider sx={{ marginBottom: 1.5 }} data-id-ref={`alarm-item-card-divider-${itemId}`} />

          {/* Body */}
          <Stack
            spacing={1}
            sx={{ flex: 1 }}
            data-id-ref={`alarm-item-card-body-${itemId}`}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 1,
              }}
              data-id-ref={`alarm-item-card-row-point-number-${itemId}`}
            >
              <Typography
                variant="body2"
                component="span"
                sx={{
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  color: 'text.primary',
                }}
                data-id-ref={`alarm-item-card-label-point-number-${itemId}`}
              >
                {t('pointNumber')}:
              </Typography>
              <Typography
                variant="body2"
                component="span"
                sx={{
                  color: 'text.secondary',
                  wordBreak: 'break-word',
                }}
                data-id-ref={`alarm-item-card-value-point-number-${itemId}`}
              >
                {pointNumber}
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 1,
              }}
              data-id-ref={`alarm-item-card-row-value-${itemId}`}
            >
              <Typography
                variant="body2"
                component="span"
                sx={{
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  color: 'text.primary',
                }}
                data-id-ref={`alarm-item-card-label-value-${itemId}`}
              >
                {t('value')}:
              </Typography>
              <Typography
                variant="body2"
                component="span"
                sx={{
                  color: 'text.secondary',
                  wordBreak: 'break-word',
                }}
                data-id-ref={`alarm-item-card-value-value-${itemId}`}
              >
                {value}
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 1,
              }}
              data-id-ref={`alarm-item-card-row-time-${itemId}`}
            >
              <Typography
                variant="body2"
                component="span"
                sx={{
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  color: 'text.primary',
                }}
                data-id-ref={`alarm-item-card-label-time-${itemId}`}
              >
                {t('time')}:
              </Typography>
              <Typography
                variant="body2"
                component="span"
                sx={{
                  color: 'text.secondary',
                  wordBreak: 'break-word',
                }}
                data-id-ref={`alarm-item-card-value-time-${itemId}`}
              >
                {time}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Fade>
  );
};

export default AlarmItemCard;
