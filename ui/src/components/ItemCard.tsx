import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Box,
  Stack,
  Divider,
  Tooltip,
  Fade,
} from '@mui/material';
import { OpenInNew } from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useUrlPrefetch } from '../hooks/useUrlPrefetch';
import { buildDetailTabUrl } from '../utils/detailRoutes';
import { createLogger } from '../utils/logger';

const logger = createLogger('ItemCard');

interface ItemCardProps {
  itemId: string;
  name: string;
  pointNumber: number;
  value: string;
  time: string;
}

const ItemCard: React.FC<ItemCardProps> = ({ itemId, name, pointNumber, value, time }) => {
  const { t } = useLanguage();
  const prefetchUrl = useUrlPrefetch();
  const [elevation, setElevation] = useState<number>(1);

  // Memoize the detail URL to avoid recalculating on every render
  const detailUrl = useMemo(
    () => buildDetailTabUrl('trend-analysis', { itemId }),
    [itemId]
  );

  const handleOpenNewTab = () => {
    // Open a new tab with the item detail page
    try {
      // Open in new tab
      window.open(detailUrl, '_blank');
    } catch (e) {
      // no-op - window may be undefined in some test environments
      // keep silent to avoid breaking UI; log warning in dev
      logger.warn('Could not open new tab', e);
    }
  };

  const handlePrefetch = () => {
    // Start prefetching the detail page when user hovers
    // This loads resources BEFORE the click, significantly improving perceived performance
    prefetchUrl(detailUrl);
  };

  return (
    <Fade in timeout={300}>
      <Card
        elevation={elevation}
        onMouseEnter={() => setElevation(6)}
        onMouseLeave={() => setElevation(1)}
        sx={{
          height: '100%',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-4px)',
          },
        }}
        data-id-ref="item-card-root-container"
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
            data-id-ref="item-card-header"
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
              data-id-ref="item-card-title"
            >
              {name}
            </Typography>
            <Tooltip title={t('openInNewTab')} arrow placement="top">
              <IconButton
                onClick={handleOpenNewTab}
                onMouseEnter={handlePrefetch}
                aria-label={t('openInNewTab')}
                size="small"
                sx={{
                  color: 'text.secondary',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    color: 'primary.main',
                    transform: 'scale(1.1)',
                  },
                }}
                data-id-ref="item-card-open-new-tab-button"
              >
                <OpenInNew fontSize="small" data-id-ref="item-card-open-icon" />
              </IconButton>
            </Tooltip>
          </Box>

          <Divider sx={{ marginBottom: 1.5 }} />

          {/* Body */}
          <Stack
            spacing={1}
            sx={{ flex: 1 }}
            data-id-ref="item-card-body"
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 1,
              }}
              data-id-ref="item-card-row-point-number"
            >
              <Typography
                variant="body2"
                component="span"
                sx={{
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  color: 'text.primary',
                }}
                data-id-ref="item-card-label-point-number"
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
                data-id-ref="item-card-value-point-number"
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
              data-id-ref="item-card-row-value"
            >
              <Typography
                variant="body2"
                component="span"
                sx={{
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  color: 'text.primary',
                }}
                data-id-ref="item-card-label-value"
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
                data-id-ref="item-card-value-value"
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
              data-id-ref="item-card-row-time"
            >
              <Typography
                variant="body2"
                component="span"
                sx={{
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  color: 'text.primary',
                }}
                data-id-ref="item-card-label-time"
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
                data-id-ref="item-card-value-time"
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

export default ItemCard;
